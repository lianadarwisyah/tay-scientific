-- SERVICE PORTAL: customer email updates + online service report link.
-- When staff save a service record with "Email the customer" ticked, the customer gets an email for
-- goods received / in progress / completed. The completed email links to the report at /service-report/<code>.
-- Run once in Supabase -> SQL Editor AFTER migration_service_portal.sql (choose "Run without RLS" if asked). Safe to run again.

alter table service_jobs add column if not exists public_token uuid not null default gen_random_uuid();
create unique index if not exists service_jobs_public_token_idx on service_jobs (public_token);
alter table service_jobs add column if not exists last_notified_status text;
alter table service_jobs add column if not exists notifications jsonb not null default '[]'::jsonb; -- [{ status, to, at, ok }]

-- Customers open their report with the secret code in the email link. Only completed jobs; staff-only fields left out.
create or replace function get_service_report(code uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(j) - 'remarks' - 'created_by' - 'notifications' - 'last_notified_status' - 'service_request_id' - 'public_token'
  from service_jobs j
  where j.public_token = code and j.status = 'completed';
$$;
revoke all on function get_service_report(uuid) from public;
grant execute on function get_service_report(uuid) to anon, authenticated;

select count(*) as service_jobs from service_jobs;
