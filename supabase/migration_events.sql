-- Events page: seminars, talks, exhibitions and collaborations (upcoming and past).
-- Staff add and edit events in Admin -> Events. Photos are uploaded to the "events" storage bucket.
-- Run once in Supabase -> SQL Editor (choose "Run without RLS" if asked). Safe to run again.

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 160),
  slug text unique not null check (char_length(slug) <= 200),
  event_date date not null,
  time_text text check (char_length(time_text) <= 120),          -- e.g. "9.00 am – 11.30 am (registration 8.45 am)"
  location text check (char_length(location) <= 300),
  partners text check (char_length(partners) <= 300),            -- "In collaboration with ..."
  summary text check (char_length(summary) <= 400),              -- short text on the event card
  body text check (char_length(body) <= 12000),                  -- full write-up (line breaks are kept)
  images jsonb not null default '[]'::jsonb,                     -- list of image URLs; the first is the cover
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists events_date_idx on events (event_date desc);

alter table events enable row level security;
drop policy if exists "public read published events" on events;
create policy "public read published events" on events for select using (is_published or is_admin());
drop policy if exists "admin all events" on events;
create policy "admin all events" on events for all using (is_admin()) with check (is_admin());

-- Photo storage
insert into storage.buckets (id, name, public) values ('events', 'events', true) on conflict (id) do nothing;
drop policy if exists "public read event images" on storage.objects;
create policy "public read event images" on storage.objects for select using (bucket_id = 'events');
drop policy if exists "admin upload event images" on storage.objects;
create policy "admin upload event images" on storage.objects for insert with check (bucket_id = 'events' and is_admin());
drop policy if exists "admin update event images" on storage.objects;
create policy "admin update event images" on storage.objects for update using (bucket_id = 'events' and is_admin());
drop policy if exists "admin delete event images" on storage.objects;
create policy "admin delete event images" on storage.objects for delete using (bucket_id = 'events' and is_admin());

-- First event (photos are in public/events/2026-09-30-product-knowledge-sharing/)
insert into events (title, slug, event_date, time_text, location, partners, summary, body, images)
values (
  'Product Knowledge Sharing Session: Johor Private Sector Seminar',
  '2026-09-30-product-knowledge-sharing-session',
  '2026-09-30',
  '9.00 am – 11.30 am (registration 8.45 am)',
  'ONEC - Semangat Space and Co-Office, 43, Jalan Kota 2, Taman Kota Putri, 81750 Masai, Johor',
  'Nexbio Asia',
  'Tay Scientific and Nexbio Asia hosted an industrial talk on maximizing equipment lifespan: calibration and maintenance workflows for modern laboratory hardware.',
  E'On 30 September 2026, Tay Scientific Instruments Sdn. Bhd., in collaboration with Nexbio Asia, successfully hosted a Product Knowledge Sharing Seminar as part of the Johor Private Sector Seminar.\n\nTopic: Maximizing Equipment Lifespan – Precision Calibration and Maintenance Workflows for Modern Laboratory Hardware\n\nA big thank you to Mr. Prakash for delivering an insightful and engaging session covering:\n1. Maintenance of pH, Conductivity, and ISE Probes\n2. Core Principles of Water Purification Systems\n3. The Yamato Scientific Product Line\n\nProduct presentations were given on HORIBA and Human, with Yamato, Adam and Aquaread instruments, including the multiparameter meter, on display. Halal food was served after the session.\n\nWe truly appreciate everyone who attended and look forward to connecting with all our valued customers again soon!',
  '["/events/2026-09-30-product-knowledge-sharing/group-photo.jpg", "/events/2026-09-30-product-knowledge-sharing/seminar-poster.jpg", "/events/2026-09-30-product-knowledge-sharing/session-1.jpg", "/events/2026-09-30-product-knowledge-sharing/session-2.jpg"]'::jsonb
)
on conflict (slug) do nothing;

select title, event_date from events order by event_date desc;
