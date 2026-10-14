-- Monthly promotions shown in the home page hero (e.g. "Buy 1 Free 1").
-- Run once in Supabase → SQL Editor.

create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 120),
  subtitle text check (char_length(subtitle) <= 300),
  image_url text not null,
  link_url text check (char_length(link_url) <= 500),
  button_label text check (char_length(button_label) <= 40),
  starts_on date not null default current_date,
  ends_on date,                       -- empty = no end date
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

alter table promotions enable row level security;

drop policy if exists "public read active promotions" on promotions;
create policy "public read active promotions" on promotions for select using (is_active or is_admin());
drop policy if exists "admin all promotions" on promotions;
create policy "admin all promotions" on promotions for all using (is_admin()) with check (is_admin());

-- Image storage for promotion posters
insert into storage.buckets (id, name, public) values ('promotions', 'promotions', true)
on conflict (id) do nothing;

drop policy if exists "public read promotion images" on storage.objects;
create policy "public read promotion images" on storage.objects for select using (bucket_id = 'promotions');
drop policy if exists "admin upload promotion images" on storage.objects;
create policy "admin upload promotion images" on storage.objects for insert with check (bucket_id = 'promotions' and is_admin());
drop policy if exists "admin update promotion images" on storage.objects;
create policy "admin update promotion images" on storage.objects for update using (bucket_id = 'promotions' and is_admin());
drop policy if exists "admin delete promotion images" on storage.objects;
create policy "admin delete promotion images" on storage.objects for delete using (bucket_id = 'promotions' and is_admin());
