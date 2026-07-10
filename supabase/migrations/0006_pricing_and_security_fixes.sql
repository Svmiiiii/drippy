-- ============================================================================
-- 0006 — pre-launch fixes: pricing integrity, RLS gaps, promo enforcement
-- ============================================================================

-- Orders need the shipping fee stored separately from the item subtotal so
-- that total_dzd actually matches what the customer was shown at checkout.
alter table public.orders add column if not exists shipping_fee_dzd integer not null default 0;

-- Referenced by the shipping PUT endpoint but never had a backing column.
alter table public.orders add column if not exists tracking_number text;

-- Atomic promo usage: guards the race where two concurrent orders both read
-- uses_count < max_uses before either has a chance to increment it.
create or replace function public.increment_promo_usage(p_promo_id uuid)
returns boolean as $$
declare
  v_ok boolean;
begin
  update public.promo_codes
     set uses_count = uses_count + 1
   where id = p_promo_id
     and is_active
     and (max_uses is null or uses_count < max_uses)
     and (expires_at is null or expires_at > now())
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$ language plpgsql security definer;

-- Fix promo_codes admin policy: profiles.id is NOT auth.uid() (auth_user_id
-- is), so this policy never matched. Reuse the existing is_admin() helper.
drop policy if exists "admins_manage_promos" on public.promo_codes;
create policy "admins_manage_promos" on public.promo_codes
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- Guest checkout validates a code before any account exists, so anon needs
-- read access to active codes (no policy existed at all before this).
drop policy if exists "promos_public_read" on public.promo_codes;
create policy "promos_public_read" on public.promo_codes
  for select using (is_active);

-- ─── RLS gaps ────────────────────────────────────────────────────────────────
-- These tables were created without RLS enabled, which leaves them open to
-- the public anon key by default under Supabase's standard grants.
alter table public.qr_scan_logs enable row level security;
drop policy if exists "scan_logs_admin_all" on public.qr_scan_logs;
create policy "scan_logs_admin_all" on public.qr_scan_logs for all using (is_admin());

alter table public.welcome_packs enable row level security;
drop policy if exists "welcome_packs_owner_select" on public.welcome_packs;
create policy "welcome_packs_owner_select" on public.welcome_packs for select
  using (profile_id = current_profile_id() or is_admin());
drop policy if exists "welcome_packs_admin_write" on public.welcome_packs;
create policy "welcome_packs_admin_write" on public.welcome_packs for all using (is_admin());

alter table public.order_call_logs enable row level security;
drop policy if exists "call_logs_admin_all" on public.order_call_logs;
create policy "call_logs_admin_all" on public.order_call_logs for all using (is_admin());

alter table public.production_items enable row level security;
drop policy if exists "production_items_admin_all" on public.production_items;
create policy "production_items_admin_all" on public.production_items for all using (is_admin());

alter table public.product_variants enable row level security;
drop policy if exists "product_variants_public_read" on public.product_variants;
create policy "product_variants_public_read" on public.product_variants for select using (true);
drop policy if exists "product_variants_admin_write" on public.product_variants;
create policy "product_variants_admin_write" on public.product_variants for all using (is_admin());

-- ─── Basic abuse protection for the public, no-account order endpoint ───────
create table if not exists public.order_rate_limits (
  id         bigserial primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_rate_limits_ip on public.order_rate_limits(ip_hash, created_at desc);
alter table public.order_rate_limits enable row level security;
-- service role bypasses RLS entirely; this just keeps anon/authenticated out.
drop policy if exists "order_rate_limits_service_only" on public.order_rate_limits;
create policy "order_rate_limits_service_only" on public.order_rate_limits for all using (false);
