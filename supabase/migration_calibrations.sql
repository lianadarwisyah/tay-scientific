-- CALIBRATION LOG (Admin -> Services -> Calibration log).
-- Staff record each calibration with its validity; the due date is worked out automatically.
-- One month before the due date the customer (and the service inbox) get a reminder email.
-- Run once in Supabase -> SQL Editor (choose "Run without RLS" if asked). Safe to run again.

-- ---------- Sticker numbers: TSI/CR/<year>/<3 digits>, restarting each year ----------
create table if not exists calibration_sticker_counters (
  year int primary key,
  last_number int not null default 0
);
alter table calibration_sticker_counters enable row level security;
drop policy if exists "admin all sticker counters" on calibration_sticker_counters;
create policy "admin all sticker counters" on calibration_sticker_counters for all using (is_admin()) with check (is_admin());

-- To continue from your existing numbers, set the LAST number already used, e.g. 15 for TSI/CR/2026/015:
-- insert into calibration_sticker_counters (year, last_number) values (2026, 15)
--   on conflict (year) do update set last_number = excluded.last_number;

create or replace function next_calibration_sticker_no() returns text
language plpgsql security definer set search_path = public as $$
declare
  y int := extract(year from (now() at time zone 'Asia/Kuala_Lumpur'))::int;
  n int;
begin
  insert into calibration_sticker_counters (year, last_number) values (y, 1)
  on conflict (year) do update set last_number = calibration_sticker_counters.last_number + 1
  returning last_number into n;
  return 'TSI/CR/' || y || '/' || lpad(n::text, 3, '0');
end $$;
revoke all on function next_calibration_sticker_no() from public;

-- ---------- Calibration records ----------
create table if not exists calibrations (
  id uuid primary key default gen_random_uuid(),
  sticker_no text unique not null,
  date_in date,
  instrument text not null,
  brand text,
  model text,
  serial_number text,
  company text not null,
  contact_person text,
  contact_no text,
  email text,                                   -- customer email for the due reminder
  calibration_date date not null,
  validity_months int not null default 12 check (validity_months between 1 and 120),
  due_date date,                                -- calibration_date + validity (set automatically)
  service_provider text,                        -- e.g. In-House (TAN YH), Trescal
  cert_no text,
  price numeric(12, 2),
  remarks text,
  reminders_enabled boolean not null default true,
  reminder_sent_at timestamptz,
  reminder_log jsonb not null default '[]'::jsonb,   -- [{ at, to, ok }]
  service_job_id uuid,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists calibrations_due_idx on calibrations (due_date);
create index if not exists calibrations_caldate_idx on calibrations (calibration_date desc);

-- Sticker number on insert, due date from date + validity, and a new reminder when the due date changes
create or replace function calibrations_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and coalesce(trim(new.sticker_no), '') = '' then
    new.sticker_no := next_calibration_sticker_no();
  end if;
  new.due_date := (new.calibration_date + make_interval(months => new.validity_months))::date;
  if tg_op = 'UPDATE' and new.due_date is distinct from old.due_date then
    new.reminder_sent_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists calibrations_before_write on calibrations;
create trigger calibrations_before_write before insert or update on calibrations
  for each row execute function calibrations_before_write();

alter table calibrations enable row level security;
drop policy if exists "admin all calibrations" on calibrations;
create policy "admin all calibrations" on calibrations for all using (is_admin()) with check (is_admin());

select count(*) as calibrations from calibrations;
