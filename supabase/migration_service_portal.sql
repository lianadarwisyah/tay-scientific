-- SERVICE PORTAL: service jobs for customer instruments (goods received -> in progress -> completed),
-- managed in Admin -> Services -> Service portal. A service report (like TSI/SR/2026/015) can be generated
-- once a job is completed. Replaces the old "Staff Portal" (service-recorder).
-- Run once in Supabase -> SQL Editor (choose "Run without RLS" if asked). Safe to run again.

-- ---------- Report numbers: TSI/SR/<year>/<3-digit number>, restarting each year ----------
create table if not exists service_report_counters (
  year int primary key,
  last_number int not null default 0
);
alter table service_report_counters enable row level security;
drop policy if exists "admin all report counters" on service_report_counters;
create policy "admin all report counters" on service_report_counters for all using (is_admin()) with check (is_admin());

-- To continue from your existing paper/old-system numbers, set the LAST number already used, e.g. 15 for TSI/SR/2026/015:
-- insert into service_report_counters (year, last_number) values (2026, 15)
--   on conflict (year) do update set last_number = excluded.last_number;

create or replace function next_service_report_no() returns text
language plpgsql security definer set search_path = public as $$
declare
  y int := extract(year from (now() at time zone 'Asia/Kuala_Lumpur'))::int;
  n int;
begin
  insert into service_report_counters (year, last_number) values (y, 1)
  on conflict (year) do update set last_number = service_report_counters.last_number + 1
  returning last_number into n;
  return 'TSI/SR/' || y || '/' || lpad(n::text, 3, '0');
end $$;
revoke all on function next_service_report_no() from public;

-- ---------- Service jobs ----------
create table if not exists service_jobs (
  id uuid primary key default gen_random_uuid(),
  sr_no text unique not null,
  status text not null default 'goods received' check (status in ('goods received', 'in progress', 'completed')),
  date_in date,
  date_out date,
  -- Instrument
  instrument text not null,
  brand text not null,
  model text not null,
  serial_number text not null,
  description text,
  condition text,
  -- Customer
  company text not null,
  company_email text not null,
  company_phone text,
  contact_person text,
  delivery_address text,
  -- Service
  service_type text not null,
  serviced_by text,
  po_number text,
  warranty text not null default 'Under warranty',
  invoice_no text,
  remarks text,
  -- Report (filled in as the work is done)
  work_items jsonb not null default '[]'::jsonb,   -- [{ task, result: PASS|FAIL|N/A|'', note, photos: [url] }]
  time_logs jsonb not null default '[]'::jsonb,    -- [{ date, start, stop, working_hours, travel_hours, distance, overnight, ga_gw }]
  job_completed text check (job_completed in ('yes', 'no', 'n/a')),
  repairable text check (repairable in ('repairable', 'non-repairable')),
  continue_on text,
  recommendation text,
  engineer_name text,
  report_date date,
  customer_approval_name text,
  customer_approval_date date,
  service_request_id uuid,                          -- set when created from a website service request
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists service_jobs_created_idx on service_jobs (created_at desc);
create index if not exists service_jobs_status_idx on service_jobs (status);

-- New jobs get the next report number automatically (staff can still change it)
create or replace function service_jobs_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and coalesce(trim(new.sr_no), '') = '' then
    new.sr_no := next_service_report_no();
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists service_jobs_before_write on service_jobs;
create trigger service_jobs_before_write before insert or update on service_jobs
  for each row execute function service_jobs_before_write();

alter table service_jobs enable row level security;
drop policy if exists "admin all service jobs" on service_jobs;
create policy "admin all service jobs" on service_jobs for all using (is_admin()) with check (is_admin());

-- ---------- Photos for the work description (report) ----------
insert into storage.buckets (id, name, public) values ('service-photos', 'service-photos', true) on conflict (id) do nothing;
drop policy if exists "public read service photos" on storage.objects;
create policy "public read service photos" on storage.objects for select using (bucket_id = 'service-photos');
drop policy if exists "admin upload service photos" on storage.objects;
create policy "admin upload service photos" on storage.objects for insert with check (bucket_id = 'service-photos' and is_admin());
drop policy if exists "admin update service photos" on storage.objects;
create policy "admin update service photos" on storage.objects for update using (bucket_id = 'service-photos' and is_admin());
drop policy if exists "admin delete service photos" on storage.objects;
create policy "admin delete service photos" on storage.objects for delete using (bucket_id = 'service-photos' and is_admin());

select count(*) as service_jobs from service_jobs;
