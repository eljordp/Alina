-- Multi-tenant auth: per-user Gmail accounts + data isolation

-- Store per-user Gmail refresh tokens (replaces GOOGLE_REFRESH_TOKEN env var)
create table user_gmail_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gmail_email text not null,
  refresh_token text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Add user_id to deals (nullable for existing data)
alter table deals add column user_id uuid references auth.users(id) on delete cascade;
create index idx_deals_user_id on deals(user_id);

-- RLS: deals
alter table deals enable row level security;
create policy "Users see own deals" on deals for select using (auth.uid() = user_id);
create policy "Users insert own deals" on deals for insert with check (auth.uid() = user_id);
create policy "Users update own deals" on deals for update using (auth.uid() = user_id);
create policy "Users delete own deals" on deals for delete using (auth.uid() = user_id);

-- RLS: documents (via deal ownership)
alter table documents enable row level security;
create policy "Users see own documents" on documents for select
  using (deal_id in (select id from deals where user_id = auth.uid()));
create policy "Users insert own documents" on documents for insert
  with check (deal_id in (select id from deals where user_id = auth.uid()));
create policy "Users update own documents" on documents for update
  using (deal_id in (select id from deals where user_id = auth.uid()));
create policy "Users delete own documents" on documents for delete
  using (deal_id in (select id from deals where user_id = auth.uid()));

-- RLS: activity_log (via deal ownership)
alter table activity_log enable row level security;
create policy "Users see own activity" on activity_log for select
  using (deal_id in (select id from deals where user_id = auth.uid()));
create policy "Users insert own activity" on activity_log for insert
  with check (deal_id in (select id from deals where user_id = auth.uid()));

-- RLS: user_gmail_accounts
alter table user_gmail_accounts enable row level security;
create policy "Users see own gmail" on user_gmail_accounts for select using (auth.uid() = user_id);
create policy "Users insert own gmail" on user_gmail_accounts for insert with check (auth.uid() = user_id);
create policy "Users update own gmail" on user_gmail_accounts for update using (auth.uid() = user_id);
create policy "Users delete own gmail" on user_gmail_accounts for delete using (auth.uid() = user_id);
