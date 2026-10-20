-- "Storage used" panel on the Admin dashboard: how much space uploaded photos and the database take.
-- Run once in Supabase -> SQL Editor (choose "Run without RLS" if asked). Safe to run again.
-- Only admins can call it.

create or replace function admin_storage_usage() returns jsonb
language plpgsql security definer set search_path = public, storage as $$
declare
  result jsonb;
begin
  if not is_admin() then
    raise exception 'Admins only';
  end if;
  select jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'buckets', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', b.bucket_id, 'files', b.files, 'bytes', b.bytes) order by b.bytes desc)
      from (
        select bucket_id, count(*) as files, coalesce(sum((metadata->>'size')::bigint), 0) as bytes
        from storage.objects group by bucket_id
      ) b
    ), '[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function admin_storage_usage() from public;
grant execute on function admin_storage_usage() to authenticated;


