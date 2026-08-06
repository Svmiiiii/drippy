-- Brute-force / spam protection for /api/auth/login and
-- /api/auth/forgot-password, mirroring order_rate_limits (0006). A single
-- `kind` column keeps both endpoints' counters separate in one table.
create table if not exists public.auth_rate_limits (
  id         bigserial primary key,
  kind       text not null,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_auth_rate_limits_kind_ip on public.auth_rate_limits(kind, ip_hash, created_at desc);
alter table public.auth_rate_limits enable row level security;
drop policy if exists "auth_rate_limits_service_only" on public.auth_rate_limits;
create policy "auth_rate_limits_service_only" on public.auth_rate_limits for all using (false);
