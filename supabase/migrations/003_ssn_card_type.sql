-- Add ssn_card to document type constraint
ALTER TABLE documents DROP CONSTRAINT documents_doc_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_doc_type_check
  CHECK (doc_type IN ('w2', 'paystub', 'bank_statement', 'tax_return', 'id', 'ssn_card', 'mortgage_statement', 'other'));
