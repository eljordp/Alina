import { google } from 'googleapis';
import { supabaseAdmin } from './supabase';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Set credentials from stored refresh token
export function getGmailClient(refreshToken: string) {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function fetchNewEmails(refreshToken: string) {
  const gmail = getGmailClient(refreshToken);

  // Get unread messages that look like loan requests (have attachments or contain loan keywords)
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread (subject:(1003 OR "loan amount" OR "trust deed" OR FICO OR "property value" OR "protective equity") OR ("loan amount" "property value" "interest rate"))',
    maxResults: 20,
  });

  const messages = response.data.messages || [];
  const results = [];

  for (const msg of messages) {
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'full',
    });

    const headers = full.data.payload?.headers || [];
    const from = headers.find((h) => h.name === 'From')?.value || '';
    const subject = headers.find((h) => h.name === 'Subject')?.value || '';
    const date = headers.find((h) => h.name === 'Date')?.value || '';

    // Extract email address from "Name <email>" format
    const emailMatch = from.match(/<(.+?)>/) || [null, from];
    const senderEmail = emailMatch[1] || from;
    const senderName = from.replace(/<.+?>/, '').trim().replace(/"/g, '') || senderEmail;

    // Get email body
    const body = extractBody(full.data.payload);

    // Get attachments
    const attachments = await extractAttachments(gmail, msg.id!, full.data.payload);

    results.push({
      messageId: msg.id!,
      from: senderEmail,
      senderName,
      subject,
      date,
      body,
      attachments,
    });

    // Mark as read
    await gmail.users.messages.modify({
      userId: 'me',
      id: msg.id!,
      requestBody: { removeLabelIds: ['UNREAD'] },
    });
  }

  return results;
}

function extractBody(payload: any): string {
  if (!payload) return '';

  // Simple text body
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }

  // Multipart - recurse
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
    }
    // Fallback to HTML if no plain text
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
    }
    // Recurse into nested parts
    for (const part of payload.parts) {
      const body = extractBody(part);
      if (body) return body;
    }
  }

  return '';
}

interface Attachment {
  fileName: string;
  mimeType: string;
  data: string; // base64
  size: number;
}

async function extractAttachments(gmail: any, messageId: string, payload: any): Promise<Attachment[]> {
  const attachments: Attachment[] = [];

  if (!payload?.parts) return attachments;

  for (const part of payload.parts) {
    if (part.filename && part.body?.attachmentId) {
      const attachment = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: part.body.attachmentId,
      });

      attachments.push({
        fileName: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        data: attachment.data.data!, // base64url encoded
        size: attachment.data.size || 0,
      });
    }

    // Recurse into nested parts
    if (part.parts) {
      const nested = await extractAttachments(gmail, messageId, part);
      attachments.push(...nested);
    }
  }

  return attachments;
}

export async function setupGmailWatch(refreshToken: string) {
  const gmail = getGmailClient(refreshToken);

  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: process.env.GOOGLE_PUBSUB_TOPIC!,
      labelIds: ['INBOX'],
    },
  });

  return response.data;
}

export async function storeAttachment(
  dealId: string,
  fileName: string,
  base64Data: string,
  mimeType: string
): Promise<string> {
  const buffer = Buffer.from(base64Data, 'base64url');
  const path = `deals/${dealId}/${Date.now()}-${fileName}`;

  const { error } = await supabaseAdmin.storage
    .from('documents')
    .upload(path, buffer, { contentType: mimeType });

  if (error) throw new Error(`Failed to upload ${fileName}: ${error.message}`);

  const { data } = supabaseAdmin.storage.from('documents').getPublicUrl(path);
  return data.publicUrl;
}
