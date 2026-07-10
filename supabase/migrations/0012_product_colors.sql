-- A single product can be offered in several garment colors (e.g. a
-- T-shirt in black/white/red) without needing a separate product per
-- color. `colors` is a flat list of {name, hex} the admin curates per
-- product, mirroring how `images` is already a jsonb array on this table.
alter table public.products add column if not exists colors jsonb not null default '[]'::jsonb;

-- The customer's chosen garment color for that line item — distinct from
-- order_items.qr_color, which is the QR gradient's own color, not the
-- physical garment's color.
alter table public.order_items add column if not exists garment_color text;
