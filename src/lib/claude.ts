import OpenAI from 'openai';
import { LoanApplication } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder',
});

const EXTRACTION_PROMPT = `You are a loan document processing AI for a private lending company. Your job is to extract structured data from loan-related documents and emails.

You will receive either:
1. An email body containing a loan request template (partially filled)
2. A document (W-2, pay stub, bank statement, tax return, ID, mortgage statement)

Extract ALL relevant information and return it as JSON matching this exact schema. Use null for any field you cannot determine. All monetary values should be numbers only (no $ or commas). Percentages should be numbers only (no %).

{
  "loan_amount": "number or null",
  "property_value": "number or null",
  "interest_rate": "number or null",
  "protective_equity": "number or null",
  "term_months": "number or null",
  "cltv": "number or null",
  "property_address": "string or null",
  "property_sqft": "string or null",
  "property_type": "string or null",
  "bedrooms": "string or null",
  "bathrooms": "string or null",
  "lot_size": "string or null",
  "year_built": "string or null",
  "first_td_balance": "number or null",
  "first_td_monthly_payment": "number or null",
  "first_td_interest_rate": "number or null",
  "monthly_hoa_fees": "number or null",
  "borrower_name": "string or null",
  "borrower_ssn": "string or null",
  "borrower_dob": "string or null",
  "borrower_phone": "string or null",
  "borrower_address": "string or null",
  "employment": "string or null",
  "employment_income": "number or null",
  "liquid_assets": "number or null",
  "rental_income": "number or null",
  "mid_fico": "number or null",
  "confidence_notes": { "field_name": "note about extraction confidence or source" }
}

DOCUMENT-SPECIFIC EXTRACTION GUIDANCE:

For GOVERNMENT ID (driver's license, state ID, passport):
- Extract borrower_name (full legal name as printed)
- Extract borrower_dob (date of birth)
- Extract borrower_address (residential address as printed on the ID)
- Note the ID/license number and issuing state in confidence_notes under "id_document"
- Do NOT extract SSN from an ID card

For SOCIAL SECURITY CARD:
- Extract borrower_name (full name as printed on the card)
- Extract borrower_ssn (the 9-digit Social Security Number, format: XXX-XX-XXXX)
- Note in confidence_notes that the SSN was extracted from a Social Security card

For PAY STUBS / W-2s:
- Extract employment, employment_income, borrower_name, borrower_ssn (if visible)

For BANK STATEMENTS:
- Extract liquid_assets (total balance), borrower_name

IMPORTANT:
- Extract ONLY what is explicitly stated in the document. Do not calculate or infer values.
- For SSN: extract it if visible but note it in confidence_notes.
- For FICO scores: only extract if explicitly stated.
- If a field appears in multiple places with different values, use the most recent one and note the discrepancy.
- Return ONLY valid JSON, no other text.`;

export async function parseEmailBody(emailBody: string): Promise<Partial<LoanApplication>> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: EXTRACTION_PROMPT,
      },
      {
        role: 'user',
        content: `Here is a loan request email. Extract all filled-in fields:\n\n${emailBody}`,
      },
    ],
  });

  const text = response.choices[0].message.content || '{}';
  return JSON.parse(text);
}

export async function parseDocument(
  base64Content: string,
  mimeType: string,
  fileName: string,
  docType?: string
): Promise<Partial<LoanApplication>> {
  const isImage = mimeType.startsWith('image/');

  if (isImage) {
    // Gmail API returns base64url encoding — convert to standard base64 for data URIs
    const standardBase64 = Buffer.from(base64Content, 'base64url').toString('base64');

    // Use GPT-4o vision for images
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: EXTRACTION_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${standardBase64}`,
              },
            },
            {
              type: 'text',
              text: `This document is "${fileName}". Extract all relevant loan application fields. Document type: ${docType || 'unknown'}.`,
            },
          ],
        },
      ],
    });

    const text = response.choices[0].message.content || '{}';
    return JSON.parse(text);
  }

  // For PDFs: use the file upload approach
  const standardBase64 = Buffer.from(base64Content, 'base64url').toString('base64');
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: EXTRACTION_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'file',
            file: {
              filename: fileName,
              file_data: `data:${mimeType};base64,${standardBase64}`,
            },
          },
          {
            type: 'text',
            text: `This document is "${fileName}". Extract all relevant loan application fields. Document type: ${docType || 'unknown'}.`,
          },
        ],
      },
    ],
  });

  const text = response.choices[0].message.content || '{}';
  return JSON.parse(text);
}

export function mergeApplicationData(
  existing: Partial<LoanApplication>,
  newData: Partial<LoanApplication>
): Partial<LoanApplication> {
  const merged = { ...existing };

  for (const [key, value] of Object.entries(newData)) {
    if (key === 'confidence_notes') {
      merged.confidence_notes = {
        ...(existing.confidence_notes || {}),
        ...(value as Record<string, string>),
      };
      continue;
    }
    if (key === 'missing_fields') continue;

    // Only overwrite if existing value is null/undefined and new value exists
    const existingVal = existing[key as keyof LoanApplication];
    if ((existingVal === null || existingVal === undefined) && value !== null && value !== undefined) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }

  // Recalculate missing fields
  const applicationFields = [
    'loan_amount', 'property_value', 'interest_rate', 'term_months',
    'property_address', 'borrower_name', 'employment', 'employment_income',
    'mid_fico', 'liquid_assets',
  ];
  merged.missing_fields = applicationFields.filter(
    (f) => merged[f as keyof LoanApplication] === null || merged[f as keyof LoanApplication] === undefined
  );

  return merged;
}
