-- Alina: AI Loan Processing Agent
-- Initial database schema

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Deals table
create table deals (
  id uuid primary key default uuid_generate_v4(),
  client_name text not null,
  client_email text not null,
  subject_line text,
  status text not null default 'new' check (status in ('new', 'processing', 'ready_for_review', 'completed')),
  application_data jsonb default '{}',
  raw_email_body text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Documents table
create table documents (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references deals(id) on delete cascade,
  file_name text not null,
  file_url text,
  doc_type text not null default 'other' check (doc_type in ('w2', 'paystub', 'bank_statement', 'tax_return', 'id', 'mortgage_statement', 'other')),
  extracted_data jsonb,
  status text not null default 'pending' check (status in ('pending', 'parsed', 'failed')),
  gmail_message_id text,
  created_at timestamptz default now()
);

-- Indexes
create index idx_deals_status on deals(status);
create index idx_deals_client_email on deals(client_email);
create index idx_deals_created_at on deals(created_at desc);
create index idx_documents_deal_id on documents(deal_id);
create index idx_documents_gmail_message_id on documents(gmail_message_id);

-- Storage bucket for documents (run in Supabase dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', true);
