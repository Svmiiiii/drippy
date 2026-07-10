-- Fixed garment-type taxonomy (derived from the flocking partner's catalog,
-- excluding bottoms/pants which Drippy doesn't sell). Nullable so existing
-- products aren't forced into a category until an admin picks one.
alter table public.products add column if not exists category text;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_products_category'
  ) then
    alter table public.products add constraint chk_products_category
      check (category is null or category in ('tshirts', 'polos', 'hoodies_sweats', 'vestes', 'sacs_accessoires'));
  end if;
end $$;
create index if not exists idx_products_category on public.products(category);
