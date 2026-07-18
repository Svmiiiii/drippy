-- Singleton table for small pieces of site copy the admin can edit without
-- a code change/redeploy — starting with the homepage hero's QR caption.
create table site_settings (
  id int primary key default 1,
  hero_scan_text_fr text not null default 'Scan me for a date 😏',
  hero_scan_text_en text,
  hero_scan_text_ar text,
  updated_at timestamptz not null default now(),
  constraint site_settings_single_row check (id = 1)
);

insert into site_settings (id) values (1);

alter table site_settings enable row level security;

create policy "site_settings_public_read" on site_settings
  for select using (true);
