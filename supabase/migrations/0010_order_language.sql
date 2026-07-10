-- Captures the customer's site locale at checkout time, so every subsequent
-- order email (in production, in transit, delivered) can be sent in the
-- language the customer was actually browsing in — not the admin's own
-- locale, which is what the request's cookie would otherwise reflect when
-- these emails fire from an admin-triggered action.
alter table public.orders add column if not exists language text not null default 'fr';
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_orders_language'
  ) then
    alter table public.orders add constraint chk_orders_language check (language in ('fr', 'ar', 'en'));
  end if;
end $$;
