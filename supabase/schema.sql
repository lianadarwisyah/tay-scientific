-- =====================================================================
-- Tay Scientific Instrument Sdn Bhd — labstoreonline.com
-- Run this whole file once in Supabase → SQL Editor.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tables ----------
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references categories(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  description text,
  specs jsonb not null default '{}'::jsonb,
  category_id uuid references categories(id) on delete set null,
  brand_id uuid references brands(id) on delete set null,
  image_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists products_category_idx on products(category_id);
create index if not exists products_brand_idx on products(brand_id);

create sequence if not exists quotation_seq start 1;

create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  customer_name text not null,
  company text,
  email text not null,
  phone text,
  message text,
  status text not null default 'new'
    check (status in ('new','reviewing','quoted','accepted','rejected','expired')),
  created_at timestamptz not null default now()
);

create table if not exists quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  sku text,
  quantity int not null default 1 check (quantity > 0)
);

create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new','replied','closed')),
  created_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- Editable website text (about, contact, etc.), one row per key
create table if not exists site_content (
  key text primary key,
  value jsonb not null
);

-- Who counts as an admin (add a row after creating the user in Auth)
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ---------- Helper ----------
create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

-- ---------- Customer actions (guest quotation, no login needed) ----------
create or replace function submit_quotation(payload jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  q_id uuid;
  q_ref text;
  item jsonb;
begin
  if coalesce(trim(payload->>'customer_name'), '') = '' or coalesce(trim(payload->>'email'), '') = '' then
    raise exception 'Name and email are required';
  end if;
  if jsonb_array_length(coalesce(payload->'items', '[]'::jsonb)) = 0 then
    raise exception 'A quotation needs at least one product';
  end if;

  q_ref := 'TSI-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('quotation_seq')::text, 4, '0');

  insert into quotations (ref, customer_name, company, email, phone, message)
  values (q_ref, trim(payload->>'customer_name'), nullif(trim(payload->>'company'), ''),
          trim(payload->>'email'), nullif(trim(payload->>'phone'), ''), nullif(trim(payload->>'message'), ''))
  returning id into q_id;

  for item in select * from jsonb_array_elements(payload->'items') loop
    insert into quotation_items (quotation_id, product_id, product_name, sku, quantity)
    select q_id, p.id, p.name, p.sku, greatest((item->>'quantity')::int, 1)
    from products p where p.id = (item->>'product_id')::uuid;
  end loop;

  return q_ref;
end $$;
grant execute on function submit_quotation(jsonb) to anon, authenticated;

-- ---------- Row Level Security ----------
alter table brands enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table quotations enable row level security;
alter table quotation_items enable row level security;
alter table enquiries enable row level security;
alter table services enable row level security;
alter table site_content enable row level security;
alter table admin_users enable row level security;

-- Public can read the catalogue
create policy "public read brands" on brands for select using (true);
create policy "public read categories" on categories for select using (true);
create policy "public read active products" on products for select using (is_active or is_admin());
create policy "public read active services" on services for select using (is_active or is_admin());
create policy "public read site content" on site_content for select using (true);

-- Public can send an enquiry (but never read them)
create policy "anyone can send enquiry" on enquiries for insert with check (true);

-- Admin can do everything
create policy "admin all brands" on brands for all using (is_admin()) with check (is_admin());
create policy "admin all categories" on categories for all using (is_admin()) with check (is_admin());
create policy "admin all products" on products for all using (is_admin()) with check (is_admin());
create policy "admin all quotations" on quotations for all using (is_admin()) with check (is_admin());
create policy "admin all quotation items" on quotation_items for all using (is_admin()) with check (is_admin());
create policy "admin all enquiries" on enquiries for all using (is_admin()) with check (is_admin());
create policy "admin all services" on services for all using (is_admin()) with check (is_admin());
create policy "admin all site content" on site_content for all using (is_admin()) with check (is_admin());
create policy "admin reads admin list" on admin_users for select using (user_id = auth.uid());

-- ---------- Product image storage ----------
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "public read product images" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "admin upload product images" on storage.objects for insert
  with check (bucket_id = 'product-images' and is_admin());
create policy "admin update product images" on storage.objects for update
  using (bucket_id = 'product-images' and is_admin());
create policy "admin delete product images" on storage.objects for delete
  using (bucket_id = 'product-images' and is_admin());

-- ---------- Starter data (safe to edit or delete) ----------
insert into categories (name, slug, sort_order) values
  ('Analytical Instruments', 'analytical-instruments', 1),
  ('Microscopes & Imaging', 'microscopes-imaging', 2),
  ('Balances & Weighing', 'balances-weighing', 3),
  ('Centrifuges & Mixers', 'centrifuges-mixers', 4),
  ('Glassware & Plasticware', 'glassware-plasticware', 5),
  ('Chemicals & Reagents', 'chemicals-reagents', 6)
on conflict do nothing;

insert into brands (name, slug) values
  ('Sample Brand A', 'sample-brand-a'),
  ('Sample Brand B', 'sample-brand-b')
on conflict do nothing;

insert into services (title, description, sort_order) values
  ('Equipment supply', 'Laboratory instruments, consumables and reagents sourced for your lab.', 1),
  ('Quotation support', 'Send us your list and we prepare a formal quotation for you.', 2),
  ('Installation & training', 'Setup and hands-on training for the equipment you purchase.', 3),
  ('Servicing & calibration', 'Maintenance and calibration to keep your instruments accurate.', 4)
on conflict do nothing;

insert into products (sku, name, slug, description, specs, category_id, brand_id, is_featured)
select 'DEMO-001', 'Analytical Balance 220 g / 0.1 mg', 'analytical-balance-220g',
  'Sample product. Replace or delete from the admin panel.',
  '{"Capacity":"220 g","Readability":"0.1 mg","Pan size":"90 mm"}'::jsonb,
  (select id from categories where slug='balances-weighing'),
  (select id from brands where slug='sample-brand-a'), true
where not exists (select 1 from products where sku='DEMO-001');

insert into products (sku, name, slug, description, specs, category_id, brand_id, is_featured)
select 'DEMO-002', 'Benchtop Centrifuge 6 x 50 mL', 'benchtop-centrifuge-6x50',
  'Sample product. Replace or delete from the admin panel.',
  '{"Max speed":"5,000 rpm","Capacity":"6 x 50 mL","Timer":"1 - 99 min"}'::jsonb,
  (select id from categories where slug='centrifuges-mixers'),
  (select id from brands where slug='sample-brand-b'), true
where not exists (select 1 from products where sku='DEMO-002');

-- After creating your admin user in Authentication → Users, run:
-- insert into admin_users (user_id) select id from auth.users where email = 'YOUR-ADMIN-EMAIL';
