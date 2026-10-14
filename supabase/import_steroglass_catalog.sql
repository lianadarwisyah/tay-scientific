-- Steroglass Waterlab water activity meter: 1 products. Run in Supabase -> SQL Editor (choose "Run without RLS" if asked). Safe to run again.
alter table products add column if not exists features jsonb not null default '[]'::jsonb;
insert into brands (name, slug, website_url) values ('Steroglass', 'steroglass', 'https://www.steroglass.it/')
on conflict (slug) do update set name = excluded.name, website_url = coalesce(excluded.website_url, brands.website_url);
insert into categories (name, slug, sort_order) values ('Equipment','equipment',5), ('Life Science','life-science',4), ('Consumables','consumables',8)
on conflict (slug) do nothing;

insert into products (sku, name, slug, description, specs, features, category_id, brand_id, image_url, is_active)
select v.sku, v.name, v.slug, v.description, v.specs::jsonb, v.features::jsonb, c.id, b.id, v.image_url, true
from (values
  ('STEROGLASS-WATERLAB', 'Steroglass Waterlab Dew Point Water Activity Meter', 'steroglass-waterlab-dew-point-water-activity-meter', 'Waterlab is a benchtop dew point water activity (aW) meter for quality control of products and ingredients in the food, pharmaceutical and cosmetic industries. It measures the actual water activity with a dew point sensor, the benchmark method, to study shelf life and the risk of microbial growth.', '[["Measuring range", "0.030 to 1.000 aW"], ["Accuracy", "±0.003 aW at +25 °C"], ["Repeatability (SD)", "±0.001 aW"], ["Calibration", "Multiple at 5 points (0.250, 0.500, 0.760, 0.920, 0.984) or single point"], ["Measurement time", "< 5 minutes (in equilibrium)"], ["Sensor", "Dew point (ISO 21807 / ISO 18787)"], ["Display resolution", "±0.0001 aW (4 decimal places)"], ["Sample thermostatting", "+25 °C ±1 °C (adjustable +15 to +50 °C)"], ["Operating range", "+5 °C to +50 °C"], ["Temperature resolution", "0.01 °C"], ["Temperature accuracy", "±0.2 °C"], ["Temperature uncertainty", "±0.2 °C"]]', '["Compliant with ISO 21807:2004 and ISO 18787:2017", "7-inch colour touchscreen with easy workflow management", "USB ports for PC connection and data download", "Wi-Fi and Ethernet for local networks and remote control", "Stores data, produces graphs and saves operator names", "Ready for external barcode readers and printers", "Administrator and user passwords (21 CFR part 11 data integrity)"]', 'equipment', '/products/steroglass/waterlab.jpg')
) as v(sku, name, slug, description, specs, features, cat, image_url)
join categories c on c.slug = v.cat
cross join (select id from brands where slug = 'steroglass') b
on conflict (sku) do update set name = excluded.name, slug = excluded.slug, description = excluded.description, specs = excluded.specs,
  features = excluded.features, category_id = excluded.category_id, brand_id = excluded.brand_id, image_url = excluded.image_url, is_active = true;
select count(*) as steroglass_products from products p join brands b on b.id = p.brand_id where b.slug = 'steroglass' and p.is_active;
