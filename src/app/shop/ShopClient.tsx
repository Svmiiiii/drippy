'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatDZD } from '@/lib/utils';
import { PRODUCT_CATEGORIES, PRODUCT_COLLECTIONS } from '@/lib/validation';
import type { Product, ProductCategory, ProductCollection } from '@/types';

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
      {/* Catégories */}
      {categoriesInUse.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button onClick={() => setCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${category === 'all' ? 'border-secondary bg-secondary/15 text-white' : 'border-border text-text-secondary hover:text-white'}`}>
            {t('allCategories')}
          </button>
          {categoriesInUse.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${category === c ? 'border-secondary bg-secondary/15 text-white' : 'border-border text-text-secondary hover:text-white'}`}>
              {t(`category_${c}`)}
            </button>
          ))}
        </div>
      )}

      {/* Collections */}
      {collectionsInUse.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button onClick={() => setCollection('all')}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${collection === 'all' ? 'border-secondary bg-secondary/15 text-white' : 'border-border text-text-secondary hover:text-white'}`}>
            {t('allCollections')}
          </button>
          {collectionsInUse.map((c) => (
            <button key={c} onClick={() => setCollection(c)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${collection === c ? 'border-secondary bg-secondary/15 text-white' : 'border-border text-text-secondary hover:text-white'}`}>
              {t(`collection_${c}`)}
            </button>
          ))}
        </div>
      )}

      {/* Barre de filtres */}
      <div className="flex flex-wrap gap-3 mb-8 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="input pe-8 w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white">✕</button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
          <input type="checkbox" checked={showAvailable} onChange={(e) => setShowAvailable(e.target.checked)}
            className="rounded border-border" />
          {t('availableOnly')}
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input !w-auto text-sm">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <span className="text-text-secondary text-sm">{t('productCount', { count: filtered.length })}</span>
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-text-secondary">
          <div className="text-5xl mb-4">🔍</div>
          <p>{t('noResults')}</p>
          <button onClick={() => { setSearch(''); setShowAvailable(false); setCategory('all'); }} className="text-primary mt-2 hover:underline text-sm">{t('resetFilters')}</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => {
            const out = p.status === 'out_of_stock';
            const card = (
              <div className={`card !p-0 overflow-hidden transition ${out ? 'opacity-70' : 'hover:border-primary hover:-translate-y-1'}`}>
                <div className="h-56 bg-[#0E1320] flex items-center justify-center text-8xl relative overflow-hidden">
                  {p.images?.[0]?.startsWith('http') ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : '👕'}
                  {p.badge && <span className="badge bg-secondary/20 text-pink-300 absolute top-3 end-3">{p.badge}</span>}
                  {out && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="badge bg-red-500/20 text-red-300 text-sm px-4 py-2">{t('outOfStock')}</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold mb-1">{p.name}</h3>
                  <p className="text-text-secondary text-sm mb-4 line-clamp-2">{p.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-heading text-2xl text-secondary">{formatDZD(p.price_dzd)}</span>
                    {!out && <span className="btn-primary !px-4 !py-2 !text-[13px]">{t('personalize')}</span>}
                  </div>
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
