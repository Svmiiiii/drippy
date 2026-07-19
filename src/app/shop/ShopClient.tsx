'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatDZD } from '@/lib/utils';
import { PRODUCT_CATEGORIES, PRODUCT_COLLECTIONS } from '@/lib/validation';
import type { Product, ProductCategory, ProductCollection } from '@/types';

function TabRow<T extends string>({ value, onChange, all, options, labelFor }: {
  value: T | 'all'; onChange: (v: T | 'all') => void; all: string; options: readonly T[]; labelFor: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      <button onClick={() => onChange('all')}
        className={`label-luxe pb-1.5 border-b transition ${value === 'all' ? 'text-white border-secondary' : 'border-transparent hover:text-white'}`}>
        {all}
      </button>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)}
          className={`label-luxe pb-1.5 border-b transition ${value === o ? 'text-white border-secondary' : 'border-transparent hover:text-white'}`}>
          {labelFor(o)}
        </button>
      ))}
    </div>
  );
}

export function ShopClient({ products }: { products: Product[] }) {
  const t = useTranslations('shop');
  const [search, setSearch] = useState('');
  const [showAvailable, setShowAvailable] = useState(false);
  const [sort, setSort] = useState('newest');
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [collection, setCollection] = useState<ProductCollection | 'all'>('all');

  const SORTS = [
    { value: 'newest', label: t('sortNewest') },
    { value: 'price_asc', label: t('sortPriceAsc') },
    { value: 'price_desc', label: t('sortPriceDesc') },
    { value: 'name', label: t('sortNameAsc') },
  ];

  const categoriesInUse = useMemo(
    () => PRODUCT_CATEGORIES.filter((c) => products.some((p) => p.category === c)),
    [products],
  );

  const collectionsInUse = useMemo(
    () => PRODUCT_COLLECTIONS.filter((c) => products.some((p) => p.collection === c)),
    [products],
  );

  const filtered = useMemo(() => {
    let list = [...products];
    if (category !== 'all') list = list.filter((p) => p.category === category);
    if (collection !== 'all') list = list.filter((p) => p.collection === collection);
    if (search.trim()) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.description ?? '').toLowerCase().includes(search.toLowerCase()));
    if (showAvailable) list = list.filter((p) => p.status === 'available');
    if (sort === 'price_asc') list.sort((a, b) => a.price_dzd - b.price_dzd);
    else if (sort === 'price_desc') list.sort((a, b) => b.price_dzd - a.price_dzd);
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, category, collection, search, showAvailable, sort]);

  return (
    <>
      {/* Catégories & Collections */}
      <div className="space-y-4 pb-8 mb-10 border-b border-border">
        {categoriesInUse.length > 0 && (
          <TabRow value={category} onChange={setCategory} all={t('allCategories')} options={categoriesInUse} labelFor={(c) => t(`category_${c}`)} />
        )}
        {collectionsInUse.length > 0 && (
          <TabRow value={collection} onChange={setCollection} all={t('allCollections')} options={collectionsInUse} labelFor={(c) => t(`collection_${c}`)} />
        )}
      </div>

      {/* Barre de filtres */}
      <div className="flex flex-wrap gap-4 mb-12 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-transparent border-0 border-b border-border pe-8 py-2 text-sm outline-none transition focus:border-primary placeholder:text-text-secondary"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute end-0 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white">✕</button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
          <input type="checkbox" checked={showAvailable} onChange={(e) => setShowAvailable(e.target.checked)}
            className="rounded border-border" />
          {t('availableOnly')}
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="bg-transparent border-0 border-b border-border py-2 text-sm outline-none focus:border-primary">
          {SORTS.map((s) => <option key={s.value} value={s.value} className="bg-surface">{s.label}</option>)}
        </select>
        <span className="text-text-secondary text-xs ms-auto">{t('productCount', { count: filtered.length })}</span>
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-text-secondary">
          <div className="text-5xl mb-4">🔍</div>
          <p>{t('noResults')}</p>
          <button onClick={() => { setSearch(''); setShowAvailable(false); setCategory('all'); }} className="text-primary mt-2 hover:underline text-sm">{t('resetFilters')}</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-14">
          {filtered.map((p) => {
            const out = p.status === 'out_of_stock';
            const card = (
              <div className="group">
                <div className="aspect-[4/5] bg-[#0E1320] relative overflow-hidden rounded-[4px]">
                  {p.images?.[0]?.startsWith('http') ? (
                    <img src={p.images[0]} alt={p.name}
                      className={`w-full h-full object-cover transition duration-700 ${out ? 'opacity-40' : 'group-hover:scale-[1.04]'}`} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-8xl">👕</div>
                  )}
                  {p.badge && <span className="badge bg-secondary/20 text-pink-300 absolute top-3 end-3">{p.badge}</span>}
                  {out && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="badge bg-black/70 text-white text-[11px] px-4 py-2">{t('outOfStock')}</span>
                    </div>
                  )}
                  {!out && (
                    <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition translate-y-2 group-hover:translate-y-0">
                      <span className="label-luxe text-white inline-flex items-center gap-1.5 bg-black/60 px-3 py-2 rounded-sm">
                        {t('personalize')} →
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-medium tracking-wide">{p.name}</h3>
                  <span className="font-heading text-lg text-secondary shrink-0">{formatDZD(p.price_dzd)}</span>
                </div>
              </div>
            );
            return out
              ? <div key={p.id}>{card}</div>
              : <Link key={p.id} href={`/product/${p.slug}`} className="block">{card}</Link>;
          })}
        </div>
      )}
    </>
  );
}
