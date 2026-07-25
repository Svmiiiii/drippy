'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ProductQrPreview, DEFAULT_PRINT_AREA } from '@/components/ProductQrPreview';
import { LogoPreview } from '@/components/LogoPreview';
import { useCart } from '@/components/CartProvider';
import { QR_PRESETS, QR_FONTS, sortSizes, getQrColors, CUSTOM_QR_PRESET_ID } from '@/lib/design';
import { formatDZD } from '@/lib/utils';
import type { Product } from '@/types';

// CHAPITRE 17 — CUSTOMIZER: the most important screen of the whole project.
// Principle: What You See Is What You Print (UX-004).
export function Customizer({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const t = useTranslations('product');
  const locale = useLocale();
  const characteristics = (product as any)[`characteristics_${locale}`] || product.characteristics_fr;
  const [showDetails, setShowDetails] = useState(false);
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
  const [customColor, setCustomColor] = useState('#7C3AED');
  const [text, setText] = useState('');
  const [textPos, setTextPos] = useState<'above' | 'below' | 'none'>('below');
  const [font, setFont] = useState('Anton');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textSize, setTextSize] = useState(100);
  const [qty, setQty] = useState(1);
  const [logoChoice, setLogoChoice] = useState<'badge' | 'wordmark'>('badge');
  const [logoPosition, setLogoPosition] = useState<'center' | 'top_left'>('center');
  const isAccessory = product.category === 'sacs_accessoires';

  const previewImageUrl = colors.find((c) => c.name === color)?.image ?? product.images?.[0] ?? null;
  const presetColors = getQrColors(preset, customColor);

  const addToCart = () => {
    addItem({
      product_id: product.id, slug: product.slug, name: product.name,
      price: product.price_dzd, image: previewImageUrl, size, qty, preset,
      qrColor: preset === CUSTOM_QR_PRESET_ID ? customColor : undefined,
      garment_color: color || undefined,
      text: { enabled: !!text, content: text, position: text ? textPos : 'none', font, color: textColor, size: textSize },
      logo: { choice: logoChoice, position: isAccessory ? undefined : logoPosition },
    });
    router.push('/cart');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-10 py-14 sm:py-20 grid md:grid-cols-2 gap-16 lg:gap-24 items-start">
      {/* PREVIEW (left on desktop) */}
      <div className="flex flex-col items-center gap-6 md:sticky md:top-24">
        <div className="w-full max-w-md">
          <ProductQrPreview
            imageUrl={previewImageUrl?.startsWith('http') ? previewImageUrl : null}
            printArea={product.print_area ?? DEFAULT_PRINT_AREA}
            preset={preset} color={customColor} text={text} textPosition={text ? textPos : 'none'} font={font} textColor={textColor} textSize={textSize}
          />
        </div>
        <div className="text-center">
          <div className="label-luxe">{t('previewSubtitle')}</div>
        </div>
      </div>

      {/* CONFIG (right) */}
      <div>
        {product.badge && <span className="badge bg-secondary/20 text-pink-300 mb-4 inline-block">{product.badge}</span>}
        <h1 className="font-heading tracking-wide" style={{ fontSize: 'clamp(32px,4vw,44px)' }}>{product.name}</h1>
        <p className="text-text-secondary mt-3 mb-5 leading-relaxed max-w-md">{product.description}</p>
        <div className="flex items-center gap-4">
          <div className="font-heading text-3xl text-secondary">{formatDZD(product.price_dzd)}</div>
          {(characteristics || product.dimensions_image) && (
            <button onClick={() => setShowDetails(true)} className="label-luxe underline underline-offset-4 hover:text-white transition">
              {t('detailsButton')}
            </button>
          )}
        </div>

        {/* SIZE — only shown when the product actually has a choice */}
        {sizes.length > 1 && (
          <div className="mt-10 pt-10 border-t border-border">
            <label className="label-luxe mb-3 block">
              {t('size')}{comboUnavailable && ` — ${t('outOfStock')}`}
            </label>
            <div className="flex gap-2 flex-wrap">
              {sizes.map((s) => {
                const disabled = !!color && !isComboAvailable(s, color);
                return (
                  <button key={s} onClick={() => !disabled && setSize(s)} disabled={disabled}
                    title={disabled ? `${s} — ${t('outOfStock')}` : s}
                    className={`w-11 h-11 text-sm font-medium border transition ${size === s ? 'border-white text-white' : 'border-border text-text-secondary hover:border-white hover:text-white'} ${disabled ? 'opacity-30 cursor-not-allowed line-through' : ''}`}>{s}</button>
                );
              })}
            </div>
          </div>
        )}

        {/* COLOR — only shown when the product actually has color options */}
        {colors.length > 0 && (
          <div className="mt-8">
            <label className="label-luxe mb-3 block">
              {t('color')} {color && `— ${color}`}{(selectedColorOutOfStock || comboUnavailable) && ` — ${t('outOfStock')}`}
            </label>
            <div className="flex gap-2.5 flex-wrap">
              {colors.map((c) => {
                const disabled = !c.available || (!!size && !isComboAvailable(size, c.name));
                return (
                  <button key={c.name} onClick={() => !disabled && setColor(c.name)} title={disabled ? `${c.name} — ${t('outOfStock')}` : c.name}
                    disabled={disabled}
                    className={`relative w-8 h-8 rounded-full transition ${color === c.name ? 'ring-2 ring-offset-2 ring-offset-bg ring-white' : ''} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                    style={{ background: c.hex }}>
                    {disabled && <span className="absolute inset-0 flex items-center justify-center text-white text-xs">✕</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PRESET */}
        <div className="mt-10 pt-10 border-t border-border">
          <label className="label-luxe mb-3 block">{t('qrStyle')}</label>
          <div className="grid grid-cols-6 gap-3">
            {QR_PRESETS.map((p) => (
              <button key={p.id} onClick={() => setPreset(p.id)} title={p.label}
                className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full transition ${preset === p.id ? 'ring-2 ring-offset-2 ring-offset-bg ring-white' : ''}`}
                  style={{ background: `linear-gradient(135deg, ${p.colors.join(', ')})` }} />
              </button>
            ))}
            <div className={`relative w-10 h-10 rounded-full transition ${preset === CUSTOM_QR_PRESET_ID ? 'ring-2 ring-offset-2 ring-offset-bg ring-white' : ''}`}
              title={t('customColor')}>
              <input type="color" value={customColor}
                onChange={(e) => { setCustomColor(e.target.value); setPreset(CUSTOM_QR_PRESET_ID); }}
                className="absolute inset-0 w-full h-full rounded-full cursor-pointer bg-transparent border-0 p-0" />
            </div>
          </div>
        </div>

        {/* DROPIX LOGO — flocked on the garment face, recolored to match the QR style above */}
        <div className="mt-10 pt-10 border-t border-border">
          <label className="label-luxe mb-3 block">{t('logoChoice')}</label>
          <div className="flex gap-4">
            {(['badge', 'wordmark'] as const).map((v) => (
              <button key={v} onClick={() => setLogoChoice(v)}
                className={`p-3 border transition flex flex-col items-center gap-2 ${logoChoice === v ? 'border-white' : 'border-border hover:border-text-secondary'}`}>
                <LogoPreview variant={v} colors={presetColors} size={48} />
                <span className="text-[11px] text-text-secondary">{v === 'badge' ? t('logoBadge') : t('logoWordmark')}</span>
              </button>
            ))}
          </div>
        </div>

        {!isAccessory && (
          <div className="mt-6">
            <label className="label-luxe mb-3 block">{t('logoPosition')}</label>
            <div className="flex gap-2">
              {(['center', 'top_left'] as const).map((v) => (
                <button key={v} onClick={() => setLogoPosition(v)}
                  className={`px-4 py-2 text-sm border transition ${logoPosition === v ? 'border-white text-white' : 'border-border text-text-secondary hover:border-white'}`}>
                  {v === 'center' ? t('positionCenter') : t('positionTopLeft')}
                </button>
              ))}
            </div>
          </div>
        )}
        {isAccessory && (
          <div className="mt-3 text-xs text-text-secondary">{t('logoPositionAccessoryHint')}</div>
        )}

        {/* TEXT */}
        <div className="mt-10 pt-10 border-t border-border">
          <label className="label-luxe mb-3 block">{t('text')}</label>
          <input className="w-full bg-transparent border-0 border-b border-border py-2 text-sm outline-none transition focus:border-primary placeholder:text-text-secondary"
            placeholder={t('textPlaceholder')} value={text}
            onChange={(e) => setText(e.target.value.slice(0, 80))} />
          <div className="text-xs text-text-secondary mt-1.5">{text.length}/80</div>
        </div>

        {text && (
          <>
            <div className="mt-6">
              <label className="label-luxe mb-3 block">{t('position')}</label>
              <div className="flex gap-2">
                {(['above', 'below'] as const).map((v) => (
                  <button key={v} onClick={() => setTextPos(v)}
                    className={`px-4 py-2 text-sm border transition ${textPos === v ? 'border-white text-white' : 'border-border text-text-secondary hover:border-white'}`}>
                    {v === 'above' ? t('above') : t('below')}</button>
                ))}
              </div>
            </div>
            <div className="mt-6">
              <label className="label-luxe mb-3 block">{t('textColor')}</label>
              <div className="flex gap-2.5 flex-wrap items-center">
                {['#FFFFFF', '#000000', '#7C3AED', '#EC4899', '#22D3EE', '#F97316', '#EF4444', '#22C55E'].map((c) => (
                  <button key={c} onClick={() => setTextColor(c)}
                    className={`w-7 h-7 rounded-full transition ${textColor === c ? 'ring-2 ring-offset-2 ring-offset-bg ring-white' : ''}`}
                    style={{ background: c }} title={c} />
                ))}
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                  className="w-7 h-7 rounded-full cursor-pointer bg-transparent" title={t('customColor')} />
              </div>
            </div>
            <div className="mt-6">
              <label className="label-luxe mb-3 block">{t('font')}</label>
              <div className="grid grid-cols-3 gap-2">
                {QR_FONTS.map((f) => (
                  <button key={f.id} onClick={() => setFont(f.id)} style={{ fontFamily: f.id }}
                    className={`px-2 py-2 text-sm border transition ${font === f.id ? 'border-white text-white' : 'border-border text-text-secondary hover:border-white'}`}>
                    {f.id}</button>
                ))}
              </div>
            </div>
            <div className="mt-6">
              <label className="label-luxe mb-3 block">{t('textSize')}</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setTextSize((s) => Math.max(60, s - 10))} className="btn-secondary !px-4 !py-2">A-</button>
                <input type="range" min={60} max={130} step={10} value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))} className="flex-1" />
                <button onClick={() => setTextSize((s) => Math.min(130, s + 10))} className="btn-secondary !px-4 !py-2 !text-lg">A+</button>
                <span className="text-xs text-text-secondary w-10 text-end shrink-0">{textSize}%</span>
              </div>
            </div>
          </>
        )}

        {/* QTY */}
        <div className="mt-10 pt-10 border-t border-border">
          <label className="label-luxe mb-3 block">{t('quantity')}</label>
          <div className="flex items-center gap-4">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 border border-border hover:border-white transition">−</button>
            <span className="text-lg font-medium w-6 text-center">{qty}</span>
            <button onClick={() => setQty(Math.min(50, qty + 1))} className="w-9 h-9 border border-border hover:border-white transition">+</button>
          </div>
        </div>

        <div className="mt-10 flex justify-between items-center">
          <div>
            <div className="label-luxe">{t('total')}</div>
            <div className="font-heading text-3xl text-secondary mt-1">{formatDZD(product.price_dzd * qty)}</div>
          </div>
          <button onClick={addToCart} disabled={selectedColorOutOfStock || comboUnavailable} className="btn-primary !px-7 !py-3.5 !text-base disabled:opacity-50 disabled:cursor-not-allowed">{t('addToCart')} →</button>
        </div>
      </div>

      {showDetails && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={() => setShowDetails(false)}>
          <div className="card-flat bg-bg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-heading text-2xl">{product.name}</h2>
              <button onClick={() => setShowDetails(false)} className="text-text-secondary hover:text-white">✕</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-8">
              {characteristics && (
                <div>
                  <h3 className="label-luxe mb-4">{t('characteristics')}</h3>
                  <p className="text-text-secondary text-sm whitespace-pre-line leading-relaxed">{characteristics}</p>
                </div>
              )}
              {product.dimensions_image && (
                <div>
                  <h3 className="label-luxe mb-4">{t('dimensions')}</h3>
                  <img src={product.dimensions_image} alt={t('dimensions')} className="w-full rounded-sm" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
