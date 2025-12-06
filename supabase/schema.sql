-- RytFlow Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Workspaces (One import session)
create table if not exists workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default now(),
  status text default 'active' check (status in ('active', 'completed', 'archived'))
);

-- 2. Target Columns (The Schema Blueprint / Rules Engine)
-- Defines expected columns and natural language validation rules
create table if not exists target_columns (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  key text not null,
  label text not null,
  type text default 'string' check (type in ('string', 'number', 'date', 'phone')),
  rules text,
  required boolean default false,
  sort_order int default 0,
  created_at timestamp with time zone default now(),
  unique(workspace_id, key)
);

-- 3. Spreadsheet Rows (State Isolation: raw_data vs clean_data)
create table if not exists spreadsheet_rows (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  
  -- State Isolation: Never mutate raw_data, only clean_data
  raw_data jsonb not null,
  clean_data jsonb not null default '{}',
  
  -- Validation state
  validation_status text default 'pending' check (validation_status in ('pending', 'valid', 'invalid', 'processing')),
  flags jsonb default '[]',
  
  -- WhatsApp integration
  whatsapp_status text default 'idle' check (whatsapp_status in ('idle', 'sent', 'replied')),
  whatsapp_thread_id text,
  phone_number text,
  
  -- Ordering
  row_index int not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. WhatsApp Requests (Track form links sent)
create table if not exists whatsapp_requests (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  row_id uuid references spreadsheet_rows(id) on delete cascade,
  
  phone_number text not null,
  missing_fields text[] not null,
  
  status text default 'sent' check (status in ('sent', 'clicked', 'submitted', 'expired')),
  form_url text,
  
  sent_at timestamp with time zone default now(),
  submitted_at timestamp with time zone,
  submitted_data jsonb
);

-- 5. Transaction History (For duplicate detection)
create table if not exists transaction_history (
  id uuid default gen_random_uuid() primary key,
  fingerprint text not null,
  workspace_id uuid references workspaces(id) on delete cascade,
  row_id uuid references spreadsheet_rows(id) on delete cascade,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Create index for duplicate detection
create index if not exists idx_transaction_fingerprint on transaction_history(fingerprint);
create index if not exists idx_rows_workspace on spreadsheet_rows(workspace_id);
create index if not exists idx_whatsapp_row on whatsapp_requests(row_id);

-- Enable Realtime for live updates
alter publication supabase_realtime add table spreadsheet_rows;
alter publication supabase_realtime add table whatsapp_requests;

-- Function to update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for auto-updating updated_at
drop trigger if exists spreadsheet_rows_updated_at on spreadsheet_rows;
create trigger spreadsheet_rows_updated_at
  before update on spreadsheet_rows
  for each row
  execute function update_updated_at();

-- Default target columns for payroll (seed data)
-- Run this after creating a workspace to set up the default schema
/*
insert into target_columns (workspace_id, key, label, type, rules, required, sort_order) values
  ('YOUR_WORKSPACE_ID', 'name', 'Payee Name', 'string', 'Capitalize properly. Remove titles like Mr/Mrs. Must not be empty.', true, 1),
  ('YOUR_WORKSPACE_ID', 'amount', 'Amount (RM)', 'number', 'Remove currency symbols (RM/MYR). Format as decimal with 2 places. Must be positive.', true, 2),
  ('YOUR_WORKSPACE_ID', 'accountNumber', 'Account Number', 'string', 'Must be 10-16 digits. Remove dashes and spaces. Format as groups of 4.', true, 3),
  ('YOUR_WORKSPACE_ID', 'bank', 'Bank Code', 'string', 'Convert to 3-letter code: Maybank=MBB, Public Bank=PBB, CIMB=CIMB, RHB=RHB, Hong Leong=HLB, AmBank=AMB.', false, 4),
  ('YOUR_WORKSPACE_ID', 'date', 'Date', 'date', 'Convert to YYYY-MM-DD format. Accept DD/MM/YYYY, DD-MM-YYYY, or text dates.', false, 5),
  ('YOUR_WORKSPACE_ID', 'phone', 'Phone Number', 'phone', 'Malaysian format: +60XXXXXXXXX. Remove spaces and dashes.', false, 6);
*/



