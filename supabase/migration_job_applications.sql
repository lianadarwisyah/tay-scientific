-- JOB APPLICATIONS from the Careers page: saved here (with the CV file) as well as emailed,
-- so staff can see who applied in Admin -> Admin / Finance -> Career jobs.
-- Run once in Supabase -> SQL Editor (choose "Run without RLS" if asked). Safe to run again.

create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  position text not null,
  name text not null,
  email text not null,
  phone text not null,
  location text,
  salary text,
  start_date text,
  message text,
  cv_path text,            -- file in the private "cvs" storage bucket
  cv_name text,            -- original file name
  status text not null default 'new' check (status in ('new', 'shortlisted', 'interview', 'rejected', 'hired')),
  staff_notes text,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists job_applications_created_idx on job_applications (created_at desc);

alter table job_applications enable row level security;
drop policy if exists "admin all job applications" on job_applications;
create policy "admin all job applications" on job_applications for all using (is_admin()) with check (is_admin());

-- Called by the website when someone applies. Returns the application id.
create or replace function submit_job_application(payload jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  if coalesce(trim(payload->>'name'), '') = '' or coalesce(trim(payload->>'email'), '') = ''
     or coalesce(trim(payload->>'phone'), '') = '' or coalesce(trim(payload->>'position'), '') = '' then
    raise exception 'Please fill in all required fields';
  end if;
  if char_length(payload->>'name') > 120 or char_length(payload->>'email') > 200 or char_length(payload->>'phone') > 40
     or char_length(payload->>'position') > 160 or char_length(coalesce(payload->>'location', '')) > 120
     or char_length(coalesce(payload->>'salary', '')) > 60 or char_length(coalesce(payload->>'start_date', '')) > 60
     or char_length(coalesce(payload->>'message', '')) > 4000 or char_length(coalesce(payload->>'cv_path', '')) > 300
     or char_length(coalesce(payload->>'cv_name', '')) > 200 then
    raise exception 'Details are too long';
  end if;
  if coalesce(payload->>'cv_path', '') <> '' and (payload->>'cv_path') !~ '^[0-9]{4}-[0-9]{2}/[0-9a-f-]{36}\.(pdf|doc|docx)$' then
    raise exception 'Invalid CV file';
  end if;
  insert into job_applications (position, name, email, phone, location, salary, start_date, message, cv_path, cv_name)
  values (trim(payload->>'position'), trim(payload->>'name'), trim(payload->>'email'), trim(payload->>'phone'),
          nullif(trim(payload->>'location'), ''), nullif(trim(payload->>'salary'), ''), nullif(trim(payload->>'start_date'), ''),
          nullif(trim(payload->>'message'), ''), nullif(payload->>'cv_path', ''), nullif(trim(payload->>'cv_name'), ''))
  returning id into new_id;
  return new_id;
end $$;
revoke all on function submit_job_application(jsonb) from public;
grant execute on function submit_job_application(jsonb) to anon, authenticated;

-- The website marks an application as emailed (only once, only for an application made in the last 10 minutes).
create or replace function mark_job_application_emailed(app_id uuid) returns void
language sql security definer set search_path = public as $$
  update job_applications set emailed_at = now()
  where id = app_id and emailed_at is null and created_at > now() - interval '10 minutes';
$$;
revoke all on function mark_job_application_emailed(uuid) from public;
grant execute on function mark_job_application_emailed(uuid) to anon, authenticated;

-- CV files: PRIVATE bucket. The website can upload; only admins can open or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 4194304, array[
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "website uploads cvs" on storage.objects;
create policy "website uploads cvs" on storage.objects for insert to anon, authenticated with check (bucket_id = 'cvs');
drop policy if exists "admin reads cvs" on storage.objects;
create policy "admin reads cvs" on storage.objects for select using (bucket_id = 'cvs' and is_admin());
drop policy if exists "admin deletes cvs" on storage.objects;
create policy "admin deletes cvs" on storage.objects for delete using (bucket_id = 'cvs' and is_admin());

select count(*) as job_applications from job_applications;
