-- Codes promo
create table public.promo_codes (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  description  text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  min_order_dzd  numeric(10,2) default 0,
  max_uses       integer,
  uses_count     integer not null default 0,
  is_active      boolean not null default true,
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);

alter table public.promo_codes enable row level security;

-- Seuls les admins peuvent lire/écrire
create policy "admins_manage_promos" on public.promo_codes
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin')));

-- Colonne promo_code_id dans orders pour tracker l'utilisation
alter table public.orders add column if not exists promo_code_id uuid references public.promo_codes(id);
alter table public.orders add column if not exists discount_dzd numeric(10,2) default 0;
