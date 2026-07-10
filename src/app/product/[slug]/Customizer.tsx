'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ProductQrPreview, DEFAULT_PRINT_AREA } from '@/components/ProductQrPreview';
import { QR_PRESETS, QR_FONTS, sortSizes } from '@/lib/design';
import { formatDZD } from '@/lib/utils';
import type { Product } from '@/types';

// CHAPITRE 17 — CUSTOMIZER: the most important screen of the whole project.
// Principle: What You See Is What You Print (UX-004).
export function Customizer({ product }: { product: Product }) {
  const router = useRouter();
  const t = useTranslations('product');
  const variants = (product.product_variants ?? []).filter((v) => v.available !== false);
  const sizes = variants.length > 0 ? sortSizes(variants.map((v) => v.size)) : ['Unique'];
  const [size, setSize] = useState(sizes[Math.min(2, sizes.length - 1)]);
  const colors = product.colors ?? [];
  const [color, setColor] = useState(colors.find((c) => c.available)?.name ?? colors[0]?.name ?? '');
  const selectedColorOutOfStock = colors.length > 0 && colors.find((c) => c.name === color)?.available === false;

  // A color can be sold out for one size but not another — check the
  // specific (size, color) combo, not just each independently.
  function isComboAvailable(s: string, colorName: string): boolean {
    const variant = product.product_variants?.find((v) => v.size === s);
    return !variant?.unavailable_colors?.includes(colorName);
  }
  const comboUnavailable = !!color && !isComboAvailable(size, color);
  const [preset, setPreset] = useState('NEON');
  const [text, setText] = useState('');
  const [textPos, setTextPos] = useState<'above' | 'below' | 'none'>('below');
  const [font, setFont] = useState('Anton');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [qty, setQty] = useState(1);

  const previewImageUrl = colors.find((c) => c.name === color)?.image ?? product.images?.[0] ?? null;

  const goCheckout = () => {
    const cfg = encodeURIComponent(JSON.stringify({
      product_id: product.id, slug: product.slug, name: product.name,
      price: product.price_dzd, size, qty, preset,
      garment_color: color || undefined,
      text: { enabled: !!text, content: text, position: text ? textPos : 'none', font, color: textColor },
    }));
    router.push(`/checkout?cfg=${cfg}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-12 items-start">
      {/* PREVIEW (left on desktop) */}
      <div className="card flex flex-col items-center gap-8 py-10 md:sticky md:top-24">
        <div className="w-full max-w-sm">
          <ProductQrPreview
            imageUrl={previewImageUrl?.startsWith('http') ? previewImageUrl : null}
            printArea={product.print_area ?? DEFAULT_PRINT_AREA}
            preset={preset} text={text} textPosition={text ? textPos : 'none'} font={font} textColor={textColor}
          />
        </div>
        <div className="text-center">
          <div className="font-heading text-xl text-text-secondary tracking-wide">WHAT YOU SEE IS WHAT YOU PRINT</div>
          <div className="text-sm text-primary mt-1">{t('previewSubtitle')}</div>
        </div>
      </div>

      {/* CONFIG (right) */}
      <div>
        {product.badge && <span className="badge bg-secondary/20 text-pink-300 mb-3 inline-block">{product.badge}</span>}
        <h1 className="text-3xl font-extrabold mb-1">{product.name}</h1>
        <p className="text-text-secondary mb-4 leading-relaxed">{product.description}</p>
        <div className="font-heading text-4xl text-secondary">{formatDZD(product.price_dzd)}</div>

        {/* SIZE — only shown when the product actually has a choice */}
        {sizes.length > 1 && (
          <div className="mt-6">
            <label className="text-sm text-text-secondary mb-2 block">
              {t('size')}{comboUnavailable && ` (${t('outOfStock')})`}
            </label>
            <div className="flex gap-2 flex-wrap">
              {sizes.map((s) => {
                const disabled = !!color && !isComboAvailable(s, color);
                return (
                  <button key={s} onClick={() => !disabled && setSize(s)} disabled={disabled}
                    title={disabled ? `${s} — ${t('outOfStock')}` : s}
                    className={`px-3.5 py-2 rounded-[10px] text-sm font-semibold border transition ${size === s ? 'border-secondary bg-secondary/15 text-white' : 'border-border text-text-secondary hover:text-white'} ${disabled ? 'opacity-30 cursor-not-allowed line-through' : ''}`}>{s}</button>
                );
              })}
            </div>
          </div>
        )}

        {/* COLOR — only shown when the product actually has color options */}
        {colors.length > 0 && (
          <div className="mt-6">
            <label className="text-sm text-text-secondary mb-2 block">
              {t('color')} {color && `— ${color}`}{(selectedColorOutOfStock || comboUnavailable) && ` (${t('outOfStock')})`}
            </label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => {
                const disabled = !c.available || (!!size && !isComboAvailable(size, c.name));
                return (
                  <button key={c.name} onClick={() => !disabled && setColor(c.name)} title={disabled ? `${c.name} — ${t('outOfStock')}` : c.name}
                    disabled={disabled}
                    className={`relative w-9 h-9 rounded-full border-2 transition ${color === c.name ? 'border-secondary scale-110' : 'border-border'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                    style={{ background: c.hex }}>
                    {disabled && <span className="absolute inset-0 flex items-center justify-center text-white text-xs">✕</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PRESET */}
        <div className="mt-6">
          <label className="text-sm text-text-secondary mb-2 block">{t('qrStyle')}</label>
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
          <label className="text-sm text-text-secondary mb-2 block">{t('text')}</label>
          <input className="input" placeholder={t('textPlaceholder')} value={text}
            onChange={(e) => setText(e.target.value.slice(0, 80))} />
          <div className="text-xs text-text-secondary mt-1.5">{text.length}/80</div>
        </div>

        {text && (
          <>
            <div className="mt-4">
              <label className="text-sm text-text-secondary mb-2 block">{t('position')}</label>
              <div className="flex gap-2">
                {(['above', 'below'] as const).map((v) => (
                  <button key={v} onClick={() => setTextPos(v)}
                    className={`px-3.5 py-2 rounded-[10px] text-sm font-semibold border transition ${textPos === v ? 'border-secondary bg-secondary/15 text-white' : 'border-border text-text-secondary'}`}>
                    {v === 'above' ? t('above') : t('below')}</button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm text-text-secondary mb-2 block">{t('textColor')}</label>
              <div className="flex gap-2 flex-wrap">
                {['#FFFFFF', '#000000', '#7C3AED', '#EC4899', '#22D3EE', '#F97316', '#EF4444', '#22C55E'].map((c) => (
                  <button key={c} onClick={() => setTextColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition ${textColor === c ? 'border-white scale-110' : 'border-border'}`}
                    style={{ background: c }} title={c} />
                ))}
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded-full border-2 border-border cursor-pointer bg-transparent" title={t('customColor')} />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm text-text-secondary mb-2 block">{t('font')}</label>
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
          <label className="text-sm text-text-secondary mb-2 block">{t('quantity')}</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="btn-secondary !px-4 !py-2">−</button>
            <span className="text-lg font-bold w-8 text-center">{qty}</span>
            <button onClick={() => setQty(Math.min(50, qty + 1))} className="btn-secondary !px-4 !py-2">+</button>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <div>
            <div className="text-text-secondary text-sm">{t('total')}</div>
            <div className="font-heading text-3xl text-secondary">{formatDZD(product.price_dzd * qty)}</div>
          </div>
          <button onClick={goCheckout} disabled={selectedColorOutOfStock || comboUnavailable} className="btn-primary !px-7 !py-3.5 !text-base disabled:opacity-50 disabled:cursor-not-allowed">{t('order')} →</button>
        </div>
      </div>
    </div>
  );
}
