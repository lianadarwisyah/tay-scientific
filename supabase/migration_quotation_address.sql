-- Adds the customer's ADDRESS to quotation requests (the "Address" box in the quote cart).
-- Run once in Supabase -> SQL Editor (choose "Run without RLS" if asked). Safe to run again.
-- Until this is run, the quote cart still works; the address is just not saved.

alter table quotations add column if not exists address text;
alter table quotations add column if not exists emailed_at timestamptz;

create or replace function submit_quotation(payload jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  q_id uuid;
  q_ref text;
  item jsonb;
begin
  if coalesce(trim(payload->>'customer_name'), '') = '' or coalesce(trim(payload->>'email'), '') = '' then
    raise exception 'Name and email are required';
  end if;
  if jsonb_array_length(coalesce(payload->'items', '[]'::jsonb)) = 0 then
    raise exception 'A quotation needs at least one product';
  end if;
  if jsonb_array_length(payload->'items') > 100 then
    raise exception 'Too many products in one quotation';
  end if;
  if char_length(payload->>'customer_name') > 120 or char_length(payload->>'email') > 200
     or char_length(coalesce(payload->>'message', '')) > 4000
     or char_length(coalesce(payload->>'address', '')) > 500 then
    raise exception 'Details are too long';
  end if;

  q_ref := 'TSI-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('quotation_seq')::text, 4, '0');

  insert into quotations (ref, customer_name, company, address, email, phone, message)
  values (q_ref, trim(payload->>'customer_name'), nullif(trim(payload->>'company'), ''), nullif(trim(payload->>'address'), ''),
          trim(payload->>'email'), nullif(trim(payload->>'phone'), ''), nullif(trim(payload->>'message'), ''))
  returning id into q_id;

  for item in select * from jsonb_array_elements(payload->'items') loop
    insert into quotation_items (quotation_id, product_id, product_name, sku, quantity)
    select q_id, p.id, p.name, p.sku, least(greatest((item->>'quantity')::int, 1), 10000)
    from products p where p.id = (item->>'product_id')::uuid;
  end loop;

  return q_ref;
end $$;
grant execute on function submit_quotation(jsonb) to anon, authenticated;

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
    'ref', q.ref, 'customer_name', q.customer_name, 'company', q.company, 'address', q.address, 'email', q.email,
    'phone', q.phone, 'message', q.message, 'created_at', q.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.product_name, 'sku', i.sku, 'quantity', i.quantity) order by i.product_name)
      from quotation_items i where i.quotation_id = q.id
    ), '[]'::jsonb)
  );
end $$;

revoke all on function claim_quotation_email(text) from public;
grant execute on function claim_quotation_email(text) to anon, authenticated;
