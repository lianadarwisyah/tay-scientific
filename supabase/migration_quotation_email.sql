-- Email notification for new quotation requests.
-- Run once in Supabase → SQL Editor (if a warning appears, choose "Run without RLS").
--
-- The website server calls claim_quotation_email(ref) right after a customer submits a quotation.
-- It returns the quotation details ONCE (and only within 15 minutes of submitting), so the email
-- always shows what was really saved and cannot be triggered again or for old quotations.

alter table quotations add column if not exists emailed_at timestamptz;

create or replace function claim_quotation_email(p_ref text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  q quotations%rowtype;
begin
  update quotations
     set emailed_at = now()
   where ref = p_ref
     and emailed_at is null
     and created_at > now() - interval '15 minutes'
  returning * into q;

  if q.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'ref', q.ref, 'customer_name', q.customer_name, 'company', q.company, 'email', q.email,
    'phone', q.phone, 'message', q.message, 'created_at', q.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.product_name, 'sku', i.sku, 'quantity', i.quantity) order by i.product_name)
      from quotation_items i where i.quotation_id = q.id
    ), '[]'::jsonb)
  );
end $$;

revoke all on function claim_quotation_email(text) from public;
grant execute on function claim_quotation_email(text) to anon, authenticated;
