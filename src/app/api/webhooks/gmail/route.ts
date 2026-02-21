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
  const { data: existingDeal } = await supabaseAdmin
    .from('deals')
    .select('*')
    .eq('client_email', email.from)
    .in('status', ['new', 'processing', 'ready_for_review'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existingDeal) {
    deal = existingDeal;
    // Update status to processing
    await supabaseAdmin
      .from('deals')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', deal.id);
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
        const extractedData = await parseDocument(attachment.data, attachment.mimeType, attachment.fileName);

        // Update document with extracted data
        await supabaseAdmin
          .from('documents')
          .update({ extracted_data: extractedData, status: 'parsed' })
          .eq('id', doc.id);

        // Merge into application
        applicationData = mergeApplicationData(applicationData, extractedData);
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

  console.log(`Deal ${deal.id} updated. Status: ${hasRequiredFields ? 'ready_for_review' : 'processing'}`);
}

function classifyDocument(fileName: string, mimeType: string): string {
  const lower = fileName.toLowerCase();

  if (lower.includes('w2') || lower.includes('w-2')) return 'w2';
  if (lower.includes('paystub') || lower.includes('pay_stub') || lower.includes('pay stub')) return 'paystub';
  if (lower.includes('bank') || lower.includes('statement')) return 'bank_statement';
  if (lower.includes('tax') || lower.includes('1040') || lower.includes('1099')) return 'tax_return';
  if (lower.includes('id') || lower.includes('license') || lower.includes('passport')) return 'id';
  if (lower.includes('mortgage') || lower.includes('deed')) return 'mortgage_statement';

  return 'other';
}
