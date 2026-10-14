-- Remove every product that has no photo, and every brand that has no logo (with its products).
-- Run in Supabase -> SQL Editor AFTER the brand imports (e.g. import_drawell_dc_series.sql, import_eutech_150_450.sql).
-- Choose "Run without RLS" if asked. Safe to run again.
-- Old quotations stay complete: each quotation keeps its own copy of the product name and SKU.
--
-- Want to see what will go first? Run only these two lines:
--   select sku, name from products where coalesce(trim(image_url), '') = '' order by sku;
--   select slug, name from brands where coalesce(trim(logo_url), '') = '' and slug not in (<the list below>);
--
-- Brands that HAVE a logo in the website code (public/brands/*.png and src/lib/brandLogos.ts).
-- If you add a logo file for a new brand, add its slug here too before running this file again.
drop table if exists pg_temp.brands_with_logo;
create temp table brands_with_logo (slug text primary key);
insert into brands_with_logo (slug) values
  ('dlab'), ('drawell'), ('eutech-instruments'), ('fstest'), ('hyperpurex'), ('innova'), ('lachoi'), ('memmert'), ('merck'),
  ('newstar'), ('precisa'), ('quantek-instruments'), ('steroglass'), ('stier'), ('thermo-fisher'), ('viavi-solutions'),
  ('sigma-aldrich'), ('bwb'), ('peak-scientific'), ('mantech');

-- 1) Brands without a logo (no logo_url and no logo file): delete their products, then the brand
delete from products
where brand_id in (
  select id from brands
  where coalesce(trim(logo_url), '') = '' and slug not in (select slug from brands_with_logo)
);
delete from brands
where coalesce(trim(logo_url), '') = '' and slug not in (select slug from brands_with_logo);

-- 2) Products without a photo
delete from products where coalesce(trim(image_url), '') = '';

-- Check: both should be 0
select
  (select count(*) from products where coalesce(trim(image_url), '') = '') as products_without_photo,
  (select count(*) from brands where coalesce(trim(logo_url), '') = '' and slug not in (select slug from brands_with_logo)) as brands_without_logo;

drop table if exists pg_temp.brands_with_logo;
