-- CHECK SERVICE with a one-time code (OTP): the customer enters their email, receives a 6-digit code by email,
-- types it on the website and sees their service history without leaving the site.
-- Run once in Supabase -> SQL Editor (choose "Run without RLS" if asked). Safe to run again.

create table if not exists check_service_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,             -- the code is never stored, only a keyed hash of it
  attempts int not null default 0,     -- wrong guesses (max 5)
  expires_at timestamptz not null,     -- codes work for 10 minutes
  created_at timestamptz not null default now()
);
create index if not exists check_service_codes_email_idx on check_service_codes (email, created_at desc);

-- Row security ON with no policies: only the website server (service role key) can read or write codes.
alter table check_service_codes enable row level security;

select count(*) as check_service_codes from check_service_codes;
