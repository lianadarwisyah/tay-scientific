-- Run once in Supabase → SQL Editor. Safe to re-run.
-- Puts sensible size limits on the public forms so they cannot be filled with junk.

alter table enquiries drop constraint if exists enquiries_size_limits;
alter table enquiries add constraint enquiries_size_limits check (
  char_length(name) <= 120 and char_length(email) <= 200 and char_length(message) <= 4000
  and char_length(coalesce(phone, '')) <= 40 and char_length(coalesce(subject, '')) <= 200
) not valid;

-- Quotation requests: cap the number of lines and the quantity per line
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
     or char_length(coalesce(payload->>'message', '')) > 4000 then
    raise exception 'Details are too long';
  end if;

  q_ref := 'TSI-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('quotation_seq')::text, 4, '0');

  insert into quotations (ref, customer_name, company, email, phone, message)
  values (q_ref, trim(payload->>'customer_name'), nullif(trim(payload->>'company'), ''),
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
