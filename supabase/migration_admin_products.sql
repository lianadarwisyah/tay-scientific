-- Admin → Products: lets staff add, edit, hide and delete products and upload product photos.
-- Run once in Supabase → SQL Editor (choose "Run without RLS" if asked).

-- Key features list (already added by the catalogue imports; safe to run again)
alter table products add column if not exists features jsonb not null default '[]'::jsonb;

-- Public photo storage for products uploaded from the admin panel
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects for insert with check (bucket_id = 'product-images' and is_admin());
drop policy if exists "admin update product images" on storage.objects;
create policy "admin update product images" on storage.objects for update using (bucket_id = 'product-images' and is_admin());
drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images" on storage.objects for delete using (bucket_id = 'product-images' and is_admin());

-- Faster admin search by name / SKU
create index if not exists products_name_idx on products (lower(name));
create index if not exists products_created_idx on products (created_at desc);
