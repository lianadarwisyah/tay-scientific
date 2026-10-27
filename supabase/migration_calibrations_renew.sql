-- CALIBRATION LOG: "Recalibrate" (renew) an instrument.
-- When an instrument is calibrated again, staff click "Recalibrate": a new record is created for the new
-- calibration, and the old record is marked as recalibrated (no more reminders, no longer counted as overdue).
-- Run once in Supabase -> SQL Editor AFTER migration_calibrations.sql (choose "Run without RLS" if asked). Safe to run again.

alter table calibrations add column if not exists recalibrated_at date;   -- date of the newer calibration
alter table calibrations add column if not exists renewed_by uuid;        -- the newer calibration record
create index if not exists calibrations_recalibrated_idx on calibrations (recalibrated_at);

select count(*) as calibrations from calibrations;
