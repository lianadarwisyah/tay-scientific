-- Run once in Supabase → SQL Editor (before the seed file).
alter table brands     add column if not exists website_url text;
alter table brands     add column if not exists description text;
alter table categories add column if not exists description text;
