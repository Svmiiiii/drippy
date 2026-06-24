import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { QrCode } from '@/components/QrCode';
import { QR_PRESETS } from '@/lib/design';
import { createClient } from '@/lib/supabase/server';
import { formatDZD } from '@/lib/utils';
import type { Product } from '@/types';

// DRP-WF-VIS-002 — Landing: concept in <5s, discover products, understand QR, start an order.
export default async function HomePage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products').select('*').neq('status', 'archived').limit(3);

  return (
    <>
      <Navbar />

      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 60% at 80% 50%, rgba(124,58,237,.2), transparent 70%)' }} />
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center py-24">
          <div>
            <span className="badge bg-primary/20 text-purple-300 mb-6">Streetwear × Digital Identity</span>
            <h1 className="font-heading leading-[0.9] tracking-wide" style={{ fontSize: 'clamp(56px,9vw,110px)' }}>
              <span className="gradient-text">YOUR QR.</span><br />
              <span className="text-white">YOUR</span><br />
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">STORY.</span>
            </h1>
            <p className="text-text-secondary text-lg leading-relaxed mt-6 mb-10 max-w-md">
              Porte ton identité numérique dans le monde réel. Un QR permanent, unique, qui t&apos;appartient à vie.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link href="/shop" className="btn-primary">Créer mon Drippy →</Link>
              <Link href="/shop" className="btn-secondary">Voir la collection</Link>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-80 h-[420px] bg-surface border border-border rounded-[32px] flex flex-col items-center justify-center gap-6 shadow-glow-lg">
                <div className="text-6xl">👕</div>
                <QrCode preset="NEON" size={160} text="Scan me for a date 😏" textPosition="below" />
              </div>
              <div className="absolute -top-5 -right-5 bg-gradient-neon rounded-2xl px-4 py-2.5 text-xs font-bold">Powered by Drippy</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-[#0E1320]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-heading text-center mb-16" style={{ fontSize: 'clamp(36px,6vw,56px)' }}>
            COMMENT ÇA <span className="gradient-text">MARCHE ?</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { s: '01', i: '🛒', t: 'Tu choisis', d: 'Sélectionne ton vêtement, ton style QR et ton texte.' },
              { s: '02', i: '📞', t: 'On confirme', d: 'Un admin t\u2019appelle pour valider ta commande.' },
              { s: '03', i: '⚡', t: 'On produit', d: 'Ton QR unique est généré et imprimé.' },
              { s: '04', i: '🚀', t: 'Tu le portes', d: 'Active ton compte et contrôle ton QR à vie.' },
            ].map((x) => (
              <div key={x.s} className="card text-center">
                <div className="font-heading text-5xl text-border mb-2">{x.s}</div>
                <div className="text-4xl mb-4">{x.i}</div>
                <h3 className="font-bold mb-2">{x.t}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center mb-12">
            <h2 className="font-heading" style={{ fontSize: 'clamp(36px,6vw,56px)' }}>LA <span className="gradient-text">COLLECTION</span></h2>
            <Link href="/shop" className="text-text-secondary hover:text-white">Voir tout →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(products as Product[] ?? []).map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`} className="card !p-0 overflow-hidden hover:border-primary hover:-translate-y-1 transition block">
                <div className="h-52 bg-[#0E1320] flex items-center justify-center text-7xl relative">
                  {p.images?.[0]?.startsWith('/') ? '👕' : (p.images?.[0] ?? '👕')}
                  {p.badge && <span className="badge bg-secondary/20 text-pink-300 absolute top-3 right-3">{p.badge}</span>}
                </div>
                <div className="p-5">
                  <h3 className="font-bold mb-1">{p.name}</h3>
                  <p className="text-text-secondary text-sm mb-4 line-clamp-2">{p.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-heading text-2xl text-secondary">{formatDZD(p.price_dzd)}</span>
                    <span className="btn-primary !px-4 !py-2 !text-[13px]">Personnaliser</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PRESETS */}
      <section className="py-20 bg-[#0E1320]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-heading text-center mb-12" style={{ fontSize: 'clamp(36px,6vw,56px)' }}>TES <span className="gradient-text">STYLES QR</span></h2>
          <div className="flex gap-4 flex-wrap justify-center">
            {QR_PRESETS.map((p) => (
              <div key={p.id} className="text-center">
                <div className="w-20 h-20 rounded-2xl mb-2" style={{ background: `linear-gradient(135deg, ${p.colors.join(', ')})` }} />
                <div className="text-xs text-text-secondary font-semibold">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
