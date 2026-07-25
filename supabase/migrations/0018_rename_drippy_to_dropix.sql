-- Rebrand: Drippy -> Dropix (identifiers only; DRP- id prefix and DRP-xxx
-- requirement-tracking codes in comments are kept as-is, they're not the
-- brand word itself).

alter table profiles rename column drippy_id to dropix_id;

create or replace function generate_dropix_id() returns text as $$
declare
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := 'DRP-';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

drop function generate_drippy_id();

create or replace function confirm_order(p_order_id uuid, p_auth_user_id uuid)
returns json as $$
declare
  v_order      orders%rowtype;
  v_profile_id uuid;
  v_qr_id      uuid;
  v_qr_uid     text;
  v_dropix_id  text;
  v_production_id uuid;
  v_item       order_items%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'pending_confirmation' then
    raise exception 'ORDER_ALREADY_CONFIRMED';
  end if;

  -- 1. CREATE_ACCOUNT (or reuse if reorder already has a profile)
  if v_order.profile_id is null then
    v_dropix_id := generate_dropix_id();
    while exists (select 1 from profiles where dropix_id = v_dropix_id) loop
      v_dropix_id := generate_dropix_id();
    end loop;

    insert into profiles(auth_user_id, dropix_id, first_name, email, phone,
                         role, account_status, language)
    values (p_auth_user_id, v_dropix_id,
            split_part(v_order.customer_name, ' ', 1),
            v_order.customer_email, v_order.customer_phone,
            'customer', 'active', 'fr')
    returning id into v_profile_id;

    -- 2. CREATE_QR (1 client = 1 QR)
    v_qr_uid := v_dropix_id;
    insert into qr_codes(profile_id, qr_uid, qr_status)
    values (v_profile_id, v_qr_uid, 'active')
    returning id into v_qr_id;

    insert into qr_profiles(qr_code_id, target_type, target_value)
    values (v_qr_id, 'message', 'Bienvenue sur mon Dropix 👋');
  else
    v_profile_id := v_order.profile_id;
    select id into v_qr_id from qr_codes where profile_id = v_profile_id;
  end if;

  -- 3. CREATE_PRODUCTION (frozen snapshot)
  insert into productions(order_id, qr_code_id, snapshot_json, is_locked)
  values (
    p_order_id, v_qr_id,
    json_build_object(
      'order_number', v_order.order_number,
      'items', (select json_agg(row_to_json(oi)) from order_items oi where oi.order_id = p_order_id),
      'frozen_at', now()
    ),
    true
  )
  returning id into v_production_id;

  for v_item in select * from order_items where order_id = p_order_id loop
    insert into production_items(production_id, order_item_id) values (v_production_id, v_item.id);
  end loop;

  -- 4. CREATE_WELCOME_PACK (paths filled by edge function later)
  insert into welcome_packs(order_id, profile_id) values (p_order_id, v_profile_id);

  -- finalize
  update orders set status = 'confirmed', profile_id = v_profile_id,
                    confirmed_at = now() where id = p_order_id;

  return json_build_object('success', true, 'profile_id', v_profile_id, 'qr_id', v_qr_id);
end;
$$ language plpgsql security definer;
