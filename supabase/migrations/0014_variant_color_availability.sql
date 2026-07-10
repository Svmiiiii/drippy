-- A color can be out of stock for one size but still available in another
-- (e.g. "Noir" sold out in M but fine in L). Rather than exploding
-- product_variants into a full size×color row matrix, each size row just
-- lists which of the product's colors are unavailable for that size —
-- colors themselves (name/hex/image/overall available) stay on
-- products.colors as the single source of truth.
alter table public.product_variants add column if not exists unavailable_colors jsonb not null default '[]'::jsonb;
