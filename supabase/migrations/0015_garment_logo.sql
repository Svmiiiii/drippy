-- Customer-selectable Drippy brand logo, flocked on the garment face
-- alongside the personal QR. Recolored server-side to match the QR
-- preset colors (see src/lib/production.ts generateLogoPng).
alter table order_items add column logo_choice text check (logo_choice in ('badge', 'wordmark'));
alter table order_items add column logo_position text check (logo_position in ('center', 'top_left'));
