-- Remove brands the company no longer carries: Apera Instrument, ONILAB and Sartorius.
-- Run once in Supabase → SQL Editor. Their products are deleted too.
-- Old quotations stay complete: each quotation keeps its own copy of the product name and SKU.

delete from products
where brand_id in (select id from brands where slug in ('apera-instrument', 'onilab', 'sartorius'));

delete from brands where slug in ('apera-instrument', 'onilab', 'sartorius');

-- Check: both should be 0
select
  (select count(*) from brands where slug in ('apera-instrument', 'onilab', 'sartorius')) as brands_left,
  (select count(*) from products where sku like 'SAR-%' or sku like 'ONI-%' or sku like 'APE-%') as products_left;
