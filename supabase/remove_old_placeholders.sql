-- Remove ONLY the old name-only placeholder products from seed_from_website.sql that have no photo,
-- and the old brands that have no logo (Biobase, Lichen, Hach, Hanna Instruments, Hudson).
-- Every product from the brand catalogues (DLAB, LACHOI, Precisa, NEWSTAR, Merck, FSTest, Innova, STIER,
-- Steroglass, Quantek, VIAVI, Hyperpurex, Drawell DC/DCW, Eutech) is KEPT, with or without a photo.
-- Run in Supabase -> SQL Editor AFTER the brand imports. Choose "Run without RLS" if asked. Safe to run again.
-- Old quotations stay complete: each quotation keeps its own copy of the product name and SKU.
--
-- Want to see what will go first? Run only this:
--   select sku, name from products where coalesce(trim(image_url), '') = '' and sku ~ '^(BIO|BWB|DRW|HAC|HAN|HUD|LIC|MEM|SIG|THF)-|^(FST-LIF|INN-EQU|LCH-EQU|MRK-ANA|MRK-LIF|MRK-STA|NEW-CON|PRE-EQU)-' order by sku;

-- 1) Old website placeholders without a photo (SKU codes used only by seed_from_website.sql)
delete from products
where coalesce(trim(image_url), '') = ''
  and sku ~ '^(BIO|BWB|DRW|HAC|HAN|HUD|LIC|MEM|SIG|THF)-|^(FST-LIF|INN-EQU|LCH-EQU|MRK-ANA|MRK-LIF|MRK-STA|NEW-CON|PRE-EQU)-';

-- 2) Old brands without a logo, and anything left under them
delete from products where brand_id in (select id from brands where slug in ('biobase', 'lichen', 'hach', 'hanna-instruments', 'hudson'));
delete from brands where slug in ('biobase', 'lichen', 'hach', 'hanna-instruments', 'hudson');

-- Check: placeholders_left should be 0; catalogue_products shows everything that was kept
select
  (select count(*) from products where coalesce(trim(image_url), '') = ''
     and sku ~ '^(BIO|BWB|DRW|HAC|HAN|HUD|LIC|MEM|SIG|THF)-|^(FST-LIF|INN-EQU|LCH-EQU|MRK-ANA|MRK-LIF|MRK-STA|NEW-CON|PRE-EQU)-') as placeholders_left,
  (select count(*) from products) as products_kept;
