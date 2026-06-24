'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode } from '@/components/QrCode';
import { QR_PRESETS, QR_FONTS } from '@/lib/design';
import { formatDZD } from '@/lib/utils';
import type { Product } from '@/types';

// CHAPITRE 17 — CUSTOMIZER: the most important screen of the whole project.
// Principle: What You See Is What You Print (UX-004).
export function Customizer({ product }: { product: Product }) {
  const router = useRouter();
  const sizes = product.product_variants?.map((v) => v.size) ?? ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const [size, setSize] = useState(sizes[2] ?? 'M');
  const [preset, setPreset] = useState('NEON');
  const [text, setText] = useState('');
  const [textPos, setTextPos] = useState<'above' | 'below' | 'none'>('below');
  const [font, setFont] = useState('Anton');
  const [qty, setQty] = useState(1);

  const goCheckout = () => {
    const cfg = encodeURIComponent(JSON.stringify({
      product_id: product.id, slug: product.slug, name: product.name,
      price: product.price_dzd, size, qty, preset,
      text: { enabled: !!text, content: text, position: text ? textPos : 'none', font },
    }));
    router.push(`/checkout?cfg=${cfg}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-12 items-start">
      {/* PREVIEW (left on desktop) */}
      <div className="card flex flex-col items-center gap-8 py-10 md:sticky md:top-24">
        <div className="relative">
          <div className="text-9xl">{product.images?.[0]?.startsWith('/') ? '👕' : (product.images?.[0] ?? '👕')}</div>
          <div className="absolute -bottom-2 -right-2">
            <QrCode preset={preset} text={text} textPosition={text ? textPos : 'none'} font={font} size={100} />
          </div>
        </div>
        <div className="text-center">
          <div className="font-heading text-xl text-text-secondary tracking-wide">WHAT YOU SEE IS WHAT YOU PRINT</div>
          <div className="text-sm text-primary mt-1">Aperçu fidèle du rendu final</div>
        </div>
      </div>

      {/* CONFIG (right) */}
      <div>
        {product.badge && <span className="badge bg-secondary/20 text-pink-300 mb-3 inline-block">{product.badge}</span>}
        <h1 className="text-3xl font-extrabold mb-1">{product.name}</h1>
        <p className="text-text-secondary mb-4 leading-relaxed">{product.description}</p>
        <div className="font-heading text-4xl text-secondary">{formatDZD(product.price_dzd)}</div>

        {/* SIZE */}
        <div className="mt-6">
          <label className="text-sm text-text-secondary mb-2 block">Taille</label>
          <div className="flex gap-2 flex-wrap">
            {sizes.map((s) => (
              <button key={s} onClick={() => setSize(s)}
                className={`px-3.5 py-2 rounded-[10px] text-sm font-semibold border transition ${size === s ? 'border-secondary bg-secondary/15 text-white' : 'border-border text-text-secondary hover:text-white'}`}>{s}</button>
            ))}
          </div>
        </div>

        {/* PRESET */}
        <div className="mt-6">
          <label className="text-sm text-text-secondary mb-2 block">Style QR</label>
          <div className="grid grid-cols-5 gap-2">
            {QR_PRESETS.map((p) => (
              <button key={p.id} onClick={() => setPreset(p.id)}
                className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1.5 transition ${preset === p.id ? 'border-secondary bg-secondary/10' : 'border-border hover:border-primary'}`}>
                <div className="w-10 h-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${p.colors.join(', ')})` }} />
                <span className="text-[10px] text-text-secondary">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TEXT */}
        <div className="mt-6">
          <label className="text-sm text-text-secondary mb-2 block">Texte (optionnel, max 80)</label>
          <input className="input" placeholder="Scan me for a date 😏" value={text}
            onChange={(e) => setText(e.target.value.slice(0, 80))} />
          <div className="text-xs text-text-secondary mt-1.5">{text.length}/80</div>
        </div>

        {text && (
          <>
            <div className="mt-4">
              <label className="text-sm text-text-secondary mb-2 block">Position</label>
              <div className="flex gap-2">
                {(['above', 'below'] as const).map((v) => (
                  <button key={v} onClick={() => setTextPos(v)}
                    className={`px-3.5 py-2 rounded-[10px] text-sm font-semibold border transition ${textPos === v ? 'border-secondary bg-secondary/15 text-white' : 'border-border text-text-secondary'}`}>
                    {v === 'above' ? 'Au-dessus' : 'En-dessous'}</button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm text-text-secondary mb-2 block">Police</label>
              <div className="grid grid-cols-3 gap-2">
                {QR_FONTS.map((f) => (
                  <button key={f.id} onClick={() => setFont(f.id)} style={{ fontFamily: f.id }}
                    className={`px-2 py-2 rounded-[10px] text-sm border transition ${font === f.id ? 'border-secondary bg-secondary/15 text-white' : 'border-border text-text-secondary'}`}>
                    {f.id}<div className="text-[10px] text-text-secondary">{f.category}</div></button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* QTY */}
        <div className="mt-6">
          <label className="text-sm text-text-secondary mb-2 block">Quantité</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="btn-secondary !px-4 !py-2">−</button>
            <span className="text-lg font-bold w-8 text-center">{qty}</span>
            <button onClick={() => setQty(Math.min(50, qty + 1))} className="btn-secondary !px-4 !py-2">+</button>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <div>
            <div className="text-text-secondary text-sm">Total</div>
            <div className="font-heading text-3xl text-secondary">{formatDZD(product.price_dzd * qty)}</div>
          </div>
          <button onClick={goCheckout} className="btn-primary !px-7 !py-3.5 !text-base">Commander →</button>
        </div>
      </div>
    </div>
  );
}
