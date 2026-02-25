import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchNewEmails, storeAttachment } from '@/lib/gmail';
import { parseEmailBody, parseDocument, mergeApplicationData } from '@/lib/claude';
import { EMPTY_APPLICATION } from '@/lib/types';

// Gmail Pub/Sub sends POST notifications here
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify the notification (Google Pub/Sub wraps data in message.data)
    const data = body.message?.data
      ? JSON.parse(Buffer.from(body.message.data, 'base64').toString())
      : body;

    console.log('Gmail notification received:', data);

    // Get the stored refresh token (for MVP, using env var)
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN!;

    // Fetch new emails
    const emails = await fetchNewEmails(refreshToken);
    console.log(`Processing ${emails.length} new emails`);

    for (const email of emails) {
      await processEmail(email, refreshToken);
    }

    return NextResponse.json({ success: true, processed: emails.length });
  } catch (error) {
    console.error('Gmail webhook error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

// Also support GET for manual polling / testing
// Use ?rescan=true to re-process previously read emails
export async function GET(request: NextRequest) {
  try {
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN!;
    const rescan = request.nextUrl.searchParams.get('rescan') === 'true';
    const emails = await fetchNewEmails(refreshToken, rescan);

    for (const email of emails) {
      await processEmail(email, refreshToken);
    }

    return NextResponse.json({ success: true, processed: emails.length, rescan });
  } catch (error) {
    console.error('Manual poll error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function processEmail(
  email: {
    messageId: string;
    from: string;
    senderName: string;
    subject: string;
    body: string;
    attachments: { fileName: string; mimeType: string; data: string; size: number }[];
  },
  refreshToken: string
) {
  // Check if this email was already processed
  const { data: existing } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('gmail_message_id', email.messageId)
    .single();

  if (existing) {
    console.log(`Email ${email.messageId} already processed, skipping`);
    return;
  }

  // Find or create deal for this client
  let deal;

  // First: match by sender email
  const { data: existingDeal } = await supabaseAdmin
    .from('deals')
    .select('*')
    .eq('client_email', email.from)
    .in('status', ['new', 'processing', 'ready_for_review'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fallback: match by subject line / property address
  const subjectMatchedDeal = !existingDeal && email.subject
    ? await findDealBySubject(email.subject)
    : null;

  if (existingDeal) {
    deal = existingDeal;
    await supabaseAdmin
      .from('deals')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', deal.id);
    await logActivity(deal.id, 'email_received', `New email from ${email.from}: "${email.subject}"`);
  } else if (subjectMatchedDeal) {
    deal = subjectMatchedDeal;
    await supabaseAdmin
      .from('deals')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', deal.id);
    await logActivity(deal.id, 'email_received', `Follow-up matched by subject from ${email.from}: "${email.subject}"`);
  } else {
    // Create new deal
    const { data: newDeal, error } = await supabaseAdmin
      .from('deals')
      .insert({
        client_name: email.senderName,
        client_email: email.from,
        subject_line: email.subject,
        status: 'processing',
        application_data: EMPTY_APPLICATION,
        raw_email_body: email.body,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create deal: ${error.message}`);
    deal = newDeal;
    await logActivity(deal.id, 'deal_created', `Deal created from email by ${email.from}`);
  }

  let applicationData = deal.application_data || { ...EMPTY_APPLICATION };

  // Step 1: Parse email body for pre-filled fields
  if (email.body && email.body.trim().length > 20) {
    try {
      console.log(`Parsing email body for deal ${deal.id}`);
      const emailFields = await parseEmailBody(email.body);
      applicationData = mergeApplicationData(applicationData, emailFields);
    } catch (err) {
      console.error('Failed to parse email body:', err);
    }
  }

  // Step 2: Process each attachment
  for (const attachment of email.attachments) {
    try {
      console.log(`Processing attachment: ${attachment.fileName}`);

      // Store the file
      const fileUrl = await storeAttachment(deal.id, attachment.fileName, attachment.data, attachment.mimeType);

      // Determine document type from filename/mimetype
      const docType = classifyDocument(attachment.fileName, attachment.mimeType);

      // Create document record
      const { data: doc, error: docError } = await supabaseAdmin
        .from('documents')
        .insert({
          deal_id: deal.id,
          file_name: attachment.fileName,
          file_url: fileUrl,
          doc_type: docType,
          status: 'pending',
          gmail_message_id: email.messageId,
        })
        .select()
        .single();

      if (docError) {
        console.error(`Failed to create document record: ${docError.message}`);
        continue;
      }

      // Parse document with Claude
      const supportedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];

      if (supportedTypes.includes(attachment.mimeType)) {
        const extractedData = await parseDocument(attachment.data, attachment.mimeType, attachment.fileName, docType);

        // Update document with extracted data
        await supabaseAdmin
          .from('documents')
          .update({ extracted_data: extractedData, status: 'parsed' })
          .eq('id', doc.id);

        // Merge into application
        applicationData = mergeApplicationData(applicationData, extractedData);
        await logActivity(deal.id, 'document_parsed', `Parsed ${attachment.fileName} (${docType})`);
      } else {
        // Mark unsupported formats
        await supabaseAdmin
          .from('documents')
          .update({ status: 'failed', extracted_data: { error: `Unsupported format: ${attachment.mimeType}` } })
          .eq('id', doc.id);
      }
    } catch (err) {
      console.error(`Failed to process attachment ${attachment.fileName}:`, err);
    }
  }

  // Step 3: Update deal with merged application data
  const hasRequiredFields =
    applicationData.borrower_name && applicationData.loan_amount && applicationData.property_address;

  await supabaseAdmin
    .from('deals')
    .update({
      application_data: applicationData,
      status: hasRequiredFields ? 'ready_for_review' : 'processing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', deal.id);

  const newStatus = hasRequiredFields ? 'ready_for_review' : 'processing';
  console.log(`Deal ${deal.id} updated. Status: ${newStatus}`);
  await logActivity(deal.id, 'status_changed', `Status updated to ${newStatus}`);
}

async function logActivity(dealId: string, action: string, details: string) {
  try {
    await supabaseAdmin
      .from('activity_log')
      .insert({ deal_id: dealId, action, details });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

function normalizeAddress(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,#\-]/g, ' ')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\blane\b/g, 'ln')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\bcircle\b/g, 'cir')
    .replace(/\bplace\b/g, 'pl')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findDealBySubject(subject: string) {
  const { data: activeDeals } = await supabaseAdmin
    .from('deals')
    .select('*')
    .in('status', ['new', 'processing', 'ready_for_review'])
    .order('created_at', { ascending: false });

  if (!activeDeals || activeDeals.length === 0) return null;

  const normalizedSubject = normalizeAddress(subject);

  for (const deal of activeDeals) {
    // Check if subject contains the deal's property address
    const propertyAddress = deal.application_data?.property_address;
    if (propertyAddress) {
      const normalizedAddress = normalizeAddress(propertyAddress);
      if (normalizedSubject.includes(normalizedAddress) || normalizedAddress.includes(normalizedSubject)) {
        return deal;
      }
      // Extract street portion (before city/state) for partial matching
      const streetPortion = normalizedAddress.split(/\b(apt|unit|suite|ste|city|ca|az|nv|tx|fl|ny|wa|or)\b/)[0].trim();
      if (streetPortion.length >= 5 && normalizedSubject.includes(streetPortion)) {
        return deal;
      }
    }

    // Check if subject matches the deal's original subject line
    if (deal.subject_line) {
      const normalizedDealSubject = normalizeAddress(deal.subject_line);
      if (normalizedSubject === normalizedDealSubject) {
        return deal;
      }
    }
  }

  return null;
}

function classifyDocument(fileName: string, mimeType: string): string {
  const lower = fileName.toLowerCase();

  if (lower.includes('w2') || lower.includes('w-2')) return 'w2';
  if (lower.includes('paystub') || lower.includes('pay_stub') || lower.includes('pay stub')) return 'paystub';
  if (lower.includes('bank') || lower.includes('statement')) return 'bank_statement';
  if (lower.includes('tax') || lower.includes('1040') || lower.includes('1099')) return 'tax_return';
  if (lower.includes('mortgage') || lower.includes('deed')) return 'mortgage_statement';

  // SSN card detection — check before generic ID to avoid confusion
  if (lower.includes('ssn') || lower.includes('social security') || lower.includes('social_security') || lower.includes('social')) return 'ssn_card';

  // Government ID — word-boundary regex to avoid matching "paid", "liquid", etc.
  if (
    /\bid\b/.test(lower) ||
    lower.includes('license') || lower.includes('licence') ||
    lower.includes('passport') ||
    /\bdl\b/.test(lower) ||
    lower.includes('driver')
  ) return 'id';

  return 'other';
}
