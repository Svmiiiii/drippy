import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { createClient } from '@/lib/supabase/server';
import { formatDZD } from '@/lib/utils';
import type { Product } from '@/types';

export default async function ShopPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products').select('*').neq('status', 'archived').order('created_at', { ascending: false });

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="font-heading text-5xl mb-2">LA <span className="gradient-text">COLLECTION</span></h1>
        <p className="text-text-secondary mb-10">V1 — Algérie uniquement · Paiement à la livraison</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(products as Product[] ?? []).map((p) => {
            const out = p.status === 'out_of_stock';
            const card = (
              <div className={`card !p-0 overflow-hidden transition ${out ? 'opacity-70' : 'hover:border-primary hover:-translate-y-1'}`}>
                <div className="h-56 bg-[#0E1320] flex items-center justify-center text-8xl relative">
                  {p.images?.[0]?.startsWith('/') ? '👕' : (p.images?.[0] ?? '👕')}
                  {p.badge && <span className="badge bg-secondary/20 text-pink-300 absolute top-3 right-3">{p.badge}</span>}
                  {out && <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="badge bg-red-500/20 text-red-300 text-sm px-4 py-2">Rupture de stock</span></div>}
                </div>
                <div className="p-5">
                  <h3 className="font-bold mb-1">{p.name}</h3>
                  <p className="text-text-secondary text-sm mb-4 line-clamp-2">{p.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-heading text-2xl text-secondary">{formatDZD(p.price_dzd)}</span>
                    {!out && <span className="btn-primary !px-4 !py-2 !text-[13px]">Personnaliser</span>}
                  </div>
                </div>
              </div>
            );
            return out ? <div key={p.id}>{card}</div>
              : <Link key={p.id} href={`/product/${p.slug}`} className="block">{card}</Link>;
          })}
        </div>
      </div>
      <Footer />
    </>
  );
}
