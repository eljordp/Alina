export type DealStatus = 'new' | 'processing' | 'ready_for_review' | 'completed';
export type DocumentStatus = 'pending' | 'parsed' | 'failed';
export type DocumentType = 'w2' | 'paystub' | 'bank_statement' | 'tax_return' | 'id' | 'ssn_card' | 'mortgage_statement' | 'other';

export interface Deal {
  id: string;
  client_name: string;
  client_email: string;
  subject_line: string | null;
  status: DealStatus;
  application_data: LoanApplication;
  raw_email_body: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  deal_id: string;
  file_name: string;
  file_url: string;
  doc_type: DocumentType;
  extracted_data: Record<string, unknown> | null;
  status: DocumentStatus;
  created_at: string;
}

export interface LoanApplication {
  // Loan Details
  loan_amount: string | null;
  property_value: string | null;
  interest_rate: string | null;
  protective_equity: string | null;
  term_months: string | null;
  cltv: string | null;

  // Subject Property
  property_address: string | null;
  property_sqft: string | null;
  property_type: string | null;
  bedrooms: string | null;
  bathrooms: string | null;
  lot_size: string | null;
  year_built: string | null;

  // 1st Trust Deed
  first_td_balance: string | null;
  first_td_monthly_payment: string | null;
  first_td_interest_rate: string | null;
  monthly_hoa_fees: string | null;

  // Borrower
  borrower_name: string | null;
  borrower_ssn: string | null;
  borrower_dob: string | null;
  borrower_phone: string | null;
  borrower_address: string | null;
  employment: string | null;
  employment_income: string | null;
  liquid_assets: string | null;
  rental_income: string | null;
  mid_fico: string | null;

  // Meta
  missing_fields: string[];
  confidence_notes: Record<string, string>;
}

export const EMPTY_APPLICATION: LoanApplication = {
  loan_amount: null,
  property_value: null,
  interest_rate: null,
  protective_equity: null,
  term_months: null,
  cltv: null,
  property_address: null,
  property_sqft: null,
  property_type: null,
  bedrooms: null,
  bathrooms: null,
  lot_size: null,
  year_built: null,
  first_td_balance: null,
  first_td_monthly_payment: null,
  first_td_interest_rate: null,
  monthly_hoa_fees: null,
  borrower_name: null,
  borrower_ssn: null,
  borrower_dob: null,
  borrower_phone: null,
  borrower_address: null,
  employment: null,
  employment_income: null,
  liquid_assets: null,
  rental_income: null,
  mid_fico: null,
  missing_fields: [],
  confidence_notes: {},
};
