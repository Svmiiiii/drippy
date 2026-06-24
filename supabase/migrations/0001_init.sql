-- ============================================================================
-- DRIPPY V1 — DATABASE SCHEMA
-- Implements DATABASE ARCHITECTURE V2 + business rules from DEVELOPER BIBLE V2
-- ============================================================================
-- Core invariants enforced at DB level:
--   DB-001  1 client = 1 QR  (qr_codes.profile_id UNIQUE)
--   DB-002  QR linked to profile, never to orders
--   DB-003  Production snapshot is frozen (immutable after creation)
--   DB-004  No physical deletes on critical data (soft delete via status)
-- ============================================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ─── ENUMS ──────────────────────────────────────────────────────────────────
create type user_role        as enum ('customer', 'admin', 'super_admin');
create type account_status_t  as enum ('pending', 'active', 'disabled');
create type qr_status_t       as enum ('active', 'disabled');
create type qr_target_t       as enum ('link', 'message');
create type order_status_t    as enum (
  'pending_confirmation', 'confirmed', 'in_production',
  'printed', 'flocked', 'packed', 'shipped', 'delivered', 'cancelled'
);
create type product_status_t  as enum ('available', 'out_of_stock', 'archived');
create type text_position_t   as enum ('above', 'below', 'none');

-- ============================================================================
-- 3.1 profiles — a Drippy user
-- ============================================================================
create table profiles (
  id                uuid primary key default uuid_generate_v4(),
  auth_user_id      uuid unique references auth.users(id) on delete restrict,
  drippy_id         text unique not null,                       -- e.g. DRP-X7K92A
  first_name        text,
  last_name         text,
  email             text,
  phone             text,
  role              user_role not null default 'customer',
  account_status    account_status_t not null default 'pending',
  email_verified    boolean not null default false,
  account_activated boolean not null default false,
  language          text not null default 'fr',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deactivated_at    timestamptz,
  constraint chk_language check (language in ('fr', 'ar', 'en'))
);
create index idx_profiles_auth_user on profiles(auth_user_id);
create index idx_profiles_role on profiles(role);
create index idx_profiles_status on profiles(account_status);

-- ============================================================================
-- 3.2 qr_codes — the unique, permanent QR of a client (1 profile = 1 qr)
-- ============================================================================
create table qr_codes (
  id            uuid primary key default uuid_generate_v4(),
  profile_id    uuid unique not null references profiles(id) on delete restrict, -- DB-001
  qr_uid        text unique not null,                              -- e.g. DRP-X7K92A
  qr_status     qr_status_t not null default 'active',
  total_scans   bigint not null default 0,
  unique_scans  bigint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  disabled_at   timestamptz
);
create index idx_qr_codes_uid on qr_codes(qr_uid);

-- ============================================================================
-- 3.3 qr_profiles — the current destination of a QR
-- ============================================================================
create table qr_profiles (
  id            uuid primary key default uuid_generate_v4(),
  qr_code_id    uuid unique not null references qr_codes(id) on delete restrict,
  target_type   qr_target_t not null,
  target_value  text not null,
  theme_json    jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================================
-- 3.4 qr_revisions — history of QR destination changes
-- ============================================================================
create table qr_revisions (
  id                uuid primary key default uuid_generate_v4(),
  qr_code_id        uuid not null references qr_codes(id) on delete restrict,
  old_target_type   qr_target_t,
  old_target_value  text,
  new_target_type   qr_target_t,
  new_target_value  text,
  changed_by        uuid references profiles(id),
  created_at        timestamptz not null default now()
);
create index idx_qr_revisions_qr on qr_revisions(qr_code_id, created_at desc);

-- ============================================================================
-- 3.5 qr_scan_logs — raw scan logs (never queried directly for dashboards)
-- ============================================================================
create table qr_scan_logs (
  id          bigserial primary key,
  qr_code_id  uuid not null references qr_codes(id) on delete restrict,
  device_hash text,
  ip_hash     text,
  user_agent  text,
  country     text,
  city        text,
  scanned_at  timestamptz not null default now(),
  scan_date   date not null default current_date
);
create index idx_scan_logs_qr_date on qr_scan_logs(qr_code_id, scan_date);
-- DRP-BUS-036: unique scan = same QR + same device + same day
create unique index idx_scan_unique on qr_scan_logs(qr_code_id, device_hash, scan_date)
  where device_hash is not null;

-- ============================================================================
-- 3.6 daily_qr_stats — aggregated stats (powers the dashboards)
-- ============================================================================
create table daily_qr_stats (
  id            uuid primary key default uuid_generate_v4(),
  qr_code_id    uuid not null references qr_codes(id) on delete restrict,
  date          date not null,
  total_scans   bigint not null default 0,
  unique_scans  bigint not null default 0,
  constraint uq_daily_stats unique (qr_code_id, date)
);
create index idx_daily_stats_qr on daily_qr_stats(qr_code_id, date desc);

-- ============================================================================
-- PRODUCTS
-- ============================================================================
create table products (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  description text,
  price_dzd   integer not null check (price_dzd >= 0),
  status      product_status_t not null default 'available',
  badge       text,                                              -- 'new' | 'best_seller'
  images      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_products_status on products(status);

create table product_variants (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references products(id) on delete cascade,
  size        text not null,                                     -- XS..XXL
  available   boolean not null default true
);

-- ============================================================================
-- ORDERS
-- ============================================================================
create table orders (
  id             uuid primary key default uuid_generate_v4(),
  order_number   text unique not null,                           -- ORD-000145
  profile_id     uuid references profiles(id),                   -- null until confirmed
  status         order_status_t not null default 'pending_confirmation',
  -- customer snapshot (from checkout, before account exists)
  customer_name  text not null,
  customer_phone text not null,
  customer_email text not null,
  wilaya_code    text not null,
  commune        text not null,
  address        text not null,
  total_dzd      integer not null check (total_dzd >= 0),
  cancel_reason  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  confirmed_at   timestamptz
);
create index idx_orders_status on orders(status);
create index idx_orders_profile on orders(profile_id);
create index idx_orders_created on orders(created_at desc);

create table order_items (
  id             uuid primary key default uuid_generate_v4(),
  order_id       uuid not null references orders(id) on delete cascade,
  product_id     uuid not null references products(id),
  variant_id     uuid references product_variants(id),
  product_name   text not null,                                  -- snapshot
  size           text not null,
  quantity       integer not null check (quantity between 1 and 50),
  unit_price_dzd integer not null,
  -- QR customization
  qr_preset      text not null,                                  -- NEON, SUNSET, ...
  qr_color       text,
  text_enabled   boolean not null default false,
  text_content   text,
  text_position  text_position_t not null default 'none',
  text_font      text,
  text_color     text,
  text_size      integer,
  constraint chk_text_len check (text_content is null or char_length(text_content) <= 80) -- DRP-BUS-030
);

-- ============================================================================
-- PRODUCTION — frozen snapshot (DB-003 / DRP-BUS-018,019)
-- ============================================================================
create table productions (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid unique not null references orders(id) on delete restrict,
  qr_code_id    uuid not null references qr_codes(id),
  snapshot_json jsonb not null,                                  -- frozen full spec
  png_path      text,
  svg_path      text,
  pdf_path      text,
  zip_path      text,
  is_locked     boolean not null default true,                   -- always frozen
  created_at    timestamptz not null default now()
);

create table production_items (
  id            uuid primary key default uuid_generate_v4(),
  production_id uuid not null references productions(id) on delete cascade,
  order_item_id uuid not null references order_items(id),
  printed       boolean not null default false,
  flocked       boolean not null default false,
  packed        boolean not null default false,
  printed_at    timestamptz,
  flocked_at    timestamptz,
  packed_at     timestamptz
);

-- ============================================================================
-- WELCOME PACK
-- ============================================================================
create table welcome_packs (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid unique not null references orders(id),
  profile_id  uuid not null references profiles(id),
  pdf_fr_path text,
  pdf_en_path text,
  pdf_ar_path text,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- ADMIN CALL LOGS
-- ============================================================================
create table order_call_logs (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references orders(id) on delete restrict,
  admin_id    uuid references profiles(id),
  result      text not null,                                     -- answered | not_answered
  notes       text,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- updated_at auto-touch
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_profiles_touch    before update on profiles    for each row execute function touch_updated_at();
create trigger trg_qr_codes_touch    before update on qr_codes    for each row execute function touch_updated_at();
create trigger trg_qr_profiles_touch before update on qr_profiles for each row execute function touch_updated_at();
create trigger trg_products_touch    before update on products    for each row execute function touch_updated_at();
create trigger trg_orders_touch      before update on orders      for each row execute function touch_updated_at();

-- DRP-WF-CLI-004: every qr_profiles change must create a revision
create or replace function log_qr_revision() returns trigger as $$
begin
  if (tg_op = 'UPDATE' and (old.target_type, old.target_value)
        is distinct from (new.target_type, new.target_value)) then
    insert into qr_revisions(qr_code_id, old_target_type, old_target_value,
                             new_target_type, new_target_value)
    values (new.qr_code_id, old.target_type, old.target_value,
            new.target_type, new.target_value);
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_qr_revision after update on qr_profiles
  for each row execute function log_qr_revision();

-- DB-003: block any update to a frozen production snapshot
create or replace function block_production_update() returns trigger as $$
begin
  if old.is_locked then
    raise exception 'Production snapshot is frozen and cannot be modified';
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_block_production before update on productions
  for each row when (old.snapshot_json is distinct from new.snapshot_json)
  execute function block_production_update();

-- ============================================================================
-- HELPER: generate a unique DRP id
-- ============================================================================
create or replace function generate_drippy_id() returns text as $$
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

-- ============================================================================
-- ATOMIC ORDER CONFIRMATION (DRP-WF-ADM-004)
-- Triggers: CREATE_ACCOUNT, CREATE_QR, CREATE_PRODUCTION, CREATE_WELCOME_PACK
-- ============================================================================
create or replace function confirm_order(p_order_id uuid, p_auth_user_id uuid)
returns json as $$
declare
  v_order      orders%rowtype;
  v_profile_id uuid;
  v_qr_id      uuid;
  v_qr_uid     text;
  v_drippy_id  text;
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
    v_drippy_id := generate_drippy_id();
    while exists (select 1 from profiles where drippy_id = v_drippy_id) loop
      v_drippy_id := generate_drippy_id();
    end loop;

    insert into profiles(auth_user_id, drippy_id, first_name, email, phone,
                         role, account_status, language)
    values (p_auth_user_id, v_drippy_id,
            split_part(v_order.customer_name, ' ', 1),
            v_order.customer_email, v_order.customer_phone,
            'customer', 'active', 'fr')
    returning id into v_profile_id;

    -- 2. CREATE_QR (1 client = 1 QR)
    v_qr_uid := v_drippy_id;
    insert into qr_codes(profile_id, qr_uid, qr_status)
    values (v_profile_id, v_qr_uid, 'active')
    returning id into v_qr_id;

    insert into qr_profiles(qr_code_id, target_type, target_value)
    values (v_qr_id, 'message', 'Bienvenue sur mon Drippy 👋');
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

-- ============================================================================
-- ROW LEVEL SECURITY  (DRP-FORB-009,010)
-- ============================================================================
alter table profiles        enable row level security;
alter table qr_codes        enable row level security;
alter table qr_profiles     enable row level security;
alter table qr_revisions    enable row level security;
alter table daily_qr_stats  enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table productions     enable row level security;

-- helper: is the current user an admin?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles
    where auth_user_id = auth.uid()
      and role in ('admin', 'super_admin')
      and account_status = 'active'
  );
$$ language sql security definer stable;

-- helper: current user's profile id
create or replace function current_profile_id() returns uuid as $$
  select id from profiles where auth_user_id = auth.uid();
$$ language sql security definer stable;

-- profiles: a user sees only their own row; admins see all
create policy profiles_self_select on profiles for select
  using (auth_user_id = auth.uid() or is_admin());
create policy profiles_self_update on profiles for update
  using (auth_user_id = auth.uid());

-- qr_codes: owner or admin
create policy qr_owner_select on qr_codes for select
  using (profile_id = current_profile_id() or is_admin());

-- qr_profiles: owner can read/update their own destination
create policy qrp_owner_select on qr_profiles for select
  using (qr_code_id in (select id from qr_codes where profile_id = current_profile_id()) or is_admin());
create policy qrp_owner_update on qr_profiles for update
  using (qr_code_id in (select id from qr_codes where profile_id = current_profile_id()));

-- qr_revisions: owner read-only
create policy qrr_owner_select on qr_revisions for select
  using (qr_code_id in (select id from qr_codes where profile_id = current_profile_id()) or is_admin());

-- daily stats: owner read-only
create policy stats_owner_select on daily_qr_stats for select
  using (qr_code_id in (select id from qr_codes where profile_id = current_profile_id()) or is_admin());

-- orders: owner reads their own; admins read/write all
create policy orders_owner_select on orders for select
  using (profile_id = current_profile_id() or is_admin());
create policy orders_admin_all on orders for all using (is_admin());

-- order_items inherit order visibility
create policy items_select on order_items for select
  using (order_id in (select id from orders where profile_id = current_profile_id()) or is_admin());

-- productions: admin only
create policy prod_admin on productions for all using (is_admin());

-- products are public — handled in API with the anon key (no RLS needed for read).
alter table products enable row level security;
create policy products_public_read on products for select using (true);
create policy products_admin_write on products for all using (is_admin());
