-- ============================================================================
-- DRIPPY — SEED DATA
-- ============================================================================

insert into products (slug, name, description, price_dzd, status, badge, images) values
('tshirt-oversize-noir',  'T-Shirt Oversize Noir',  'T-shirt oversize premium 100% coton, imprimé avec ton QR personnel.', 4500, 'available',    'best_seller', '["/img/tshirt-noir.png"]'),
('hoodie-premium-blanc',  'Hoodie Premium Blanc',   'Hoodie lourd premium avec capuche, intérieur molletonné doux.',        6500, 'available',    'new',         '["/img/hoodie-blanc.png"]'),
('sweatshirt-urban-gris', 'Sweatshirt Urban Gris',  'Sweatshirt urbain coupe droite, tissu épais et résistant.',            5500, 'available',    null,          '["/img/sweat-gris.png"]'),
('tshirt-oversize-blanc', 'T-Shirt Oversize Blanc', 'T-shirt oversize premium 100% coton, version blanc.',                  4500, 'out_of_stock', null,          '["/img/tshirt-blanc.png"]');

-- variants (sizes) for each product
do $$
declare p record;
begin
  for p in select id, slug from products loop
    insert into product_variants (product_id, size, available)
    select p.id, s, true
    from unnest(array['XS','S','M','L','XL','XXL']) as s;
  end loop;
end $$;

-- NOTE: demo auth users (client@drippy.dz / admin@drippy.dz) must be created
-- via Supabase Auth, then linked here. See README "Demo accounts".
