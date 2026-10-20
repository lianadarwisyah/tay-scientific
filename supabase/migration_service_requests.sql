-- Service requests from the "Request a service" form on the Services page.
-- Every request is saved here first, then emailed to service@tayscientific.com.my.
-- Staff see and manage them in Admin -> Service requests.
-- Run once in Supabase -> SQL Editor (choose "Run without RLS" if asked). Safe to run again.

create sequence if not exists service_request_seq;

create table if not exists service_requests (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  service_type text not null,
  service_type_other text,
  description text not null,
  brand text,
  model text,
  serial text,
  details text,
  company text not null,
  address text not null,
  pic_name text not null,
  email text not null,
  contact text not null,
  status text not null default 'new' check (status in ('new', 'in progress', 'done', 'cancelled')),
  staff_notes text,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists service_requests_created_idx on service_requests (created_at desc);

-- Only staff can read, update or delete. Customers can only submit, through the function below.
alter table service_requests enable row level security;
drop policy if exists "admin all service requests" on service_requests;
create policy "admin all service requests" on service_requests for all using (is_admin()) with check (is_admin());

-- Called by the website when a customer submits the form. Checks the details and returns the reference (e.g. SR-2026-0001).
create or replace function submit_service_request(payload jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  r_ref text;
  t text := trim(coalesce(payload->>'service_type', ''));
begin
  if t not in ('Calibration', 'Diagnostic', 'Training', 'Preventive maintenance', 'Others') then
    raise exception 'Please choose the type of service';
  end if;
  if t = 'Others' and coalesce(trim(payload->>'service_type_other'), '') = '' then
    raise exception 'Please specify the service';
  end if;
  if coalesce(trim(payload->>'description'), '') = '' or coalesce(trim(payload->>'company'), '') = ''
     or coalesce(trim(payload->>'address'), '') = '' or coalesce(trim(payload->>'pic_name'), '') = ''
     or coalesce(trim(payload->>'email'), '') = '' or coalesce(trim(payload->>'contact'), '') = '' then
    raise exception 'Please fill in all required fields';
  end if;
  if char_length(payload->>'description') > 200 or char_length(payload->>'company') > 200
     or char_length(payload->>'address') > 500 or char_length(payload->>'pic_name') > 120
     or char_length(payload->>'email') > 200 or char_length(payload->>'contact') > 40
     or char_length(coalesce(payload->>'details', '')) > 4000
     or char_length(coalesce(payload->>'brand', '')) > 120 or char_length(coalesce(payload->>'model', '')) > 120
     or char_length(coalesce(payload->>'serial', '')) > 120 or char_length(coalesce(payload->>'service_type_other', '')) > 120 then
    raise exception 'Details are too long';
  end if;

  r_ref := 'SR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('service_request_seq')::text, 4, '0');

  insert into service_requests (ref, service_type, service_type_other, description, brand, model, serial, details,
                                company, address, pic_name, email, contact)
  values (r_ref, t, nullif(trim(payload->>'service_type_other'), ''), trim(payload->>'description'),
          nullif(trim(payload->>'brand'), ''), nullif(trim(payload->>'model'), ''), nullif(trim(payload->>'serial'), ''),
          nullif(trim(payload->>'details'), ''), trim(payload->>'company'), trim(payload->>'address'),
          trim(payload->>'pic_name'), trim(payload->>'email'), trim(payload->>'contact'));
  return r_ref;
end $$;
revoke all on function submit_service_request(jsonb) from public;
grant execute on function submit_service_request(jsonb) to anon, authenticated;

-- The website marks a request as emailed (only once, only for a request made in the last 10 minutes).
create or replace function mark_service_request_emailed(r_ref text) returns void
language sql security definer set search_path = public as $$
  update service_requests set emailed_at = now()
  where ref = r_ref and emailed_at is null and created_at > now() - interval '10 minutes';
$$;
revoke all on function mark_service_request_emailed(text) from public;
grant execute on function mark_service_request_emailed(text) to anon, authenticated;

select count(*) as service_requests from service_requests;
