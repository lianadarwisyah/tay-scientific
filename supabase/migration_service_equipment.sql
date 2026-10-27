-- SERVICE PORTAL: more than one instrument on the same service report (Section D gets one column per instrument).
-- The first instrument stays in the normal fields; extra instruments are stored here.
-- Run once in Supabase -> SQL Editor AFTER migration_service_portal.sql (choose "Run without RLS" if asked). Safe to run again.

alter table service_jobs add column if not exists extra_equipment jsonb not null default '[]'::jsonb;  -- [{ instrument, brand, model, serial_number }]

select count(*) as service_jobs from service_jobs;
