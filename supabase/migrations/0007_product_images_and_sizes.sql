-- ============================================================================
-- 0007 — real product photo uploads + admin-managed size variants
-- ============================================================================

-- Public bucket for product photos (unlike the private 'productions' bucket).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write" on storage.objects
  for all using (bucket_id = 'product-images' and auth.role() = 'service_role');

-- A product should never have two variants for the same size.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'uq_product_variant') then
    alter table public.product_variants add constraint uq_product_variant unique (product_id, size);
  end if;
end $$;
