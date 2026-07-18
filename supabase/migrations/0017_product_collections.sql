-- Seasonal collections (Été/Automne/Hiver/Printemps) — a second, independent
-- classification from category (garment type), used for merchandising/filtering.
alter table products add column collection text check (collection in ('ete', 'automne', 'hiver', 'printemps'));
