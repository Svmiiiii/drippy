-- ============================================================================
-- 0008 — where the QR sits on the product photo, so the customer sees a real
-- WYSIWYG mockup (QR composited on the actual shirt photo) instead of a
-- generic floating overlay.
-- ============================================================================
alter table public.products add column if not exists print_area jsonb;
comment on column public.products.print_area is
  '{ top, left, width } as percentages of the photo — top/left = QR center, width = QR size relative to photo width.';
