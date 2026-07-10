-- Dimensions is a single size-chart image the admin uploads directly (not
-- structured data). Characteristics is free text the admin only ever writes
-- in French — the _en/_ar columns are populated server-side via automatic
-- translation at save time, not typed manually.
alter table public.products add column if not exists dimensions_image text;
alter table public.products add column if not exists characteristics_fr text;
alter table public.products add column if not exists characteristics_en text;
alter table public.products add column if not exists characteristics_ar text;
