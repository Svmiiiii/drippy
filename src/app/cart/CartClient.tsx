'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCart } from '@/components/CartProvider';
import { QrCode } from '@/components/QrCode';
import { LogoPreview } from '@/components/LogoPreview';
import { getQrColors } from '@/lib/design';
import { formatDZD } from '@/lib/utils';

export function CartClient() {
  const t = useTranslations('cart');
  const router = useRouter();
  const { items, removeItem, updateQty } = useCart();

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="text-5xl mb-6">🛒</div>
        <h1 className="font-heading text-3xl mb-3">{t('empty')}</h1>
        <p className="text-text-secondary mb-8">{t('emptyHint')}</p>
        <Link href="/shop" className="btn-primary">{t('backToShop')} →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-10 py-14 sm:py-20">
      <h1 className="font-heading mb-12" style={{ fontSize: 'clamp(36px,5vw,56px)' }}>{t('title')}</h1>

      <div className="space-y-8">
        {items.map((item) => {
          const presetColors = getQrColors(item.preset, item.qrColor);
          return (
            <div key={item.id} className="flex gap-3 sm:gap-5 pb-8 border-b border-border">
              <div className="relative w-20 h-24 sm:w-24 sm:h-28 shrink-0 bg-[#0E1320] rounded-sm overflow-hidden">
                {item.image?.startsWith('http') && (
                  <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-3">
                  <h3 className="font-medium">{item.name}</h3>
                  <span className="font-heading text-secondary shrink-0">{formatDZD(item.price * item.qty)}</span>
                </div>
                <div className="text-text-secondary text-sm mt-1">
                  {t('size')} {item.size}{item.garment_color ? ` · ${t('color')} ${item.garment_color}` : ''} · {t('style')} {item.preset === 'CUSTOM' ? item.qrColor : item.preset}
                </div>
                {item.text?.content && <div className="text-text-secondary text-sm mt-0.5">&quot;{item.text.content}&quot;</div>}
                {item.logo?.choice && (
                  <div className="text-text-secondary text-sm mt-0.5">
                    {t('logo')} {item.logo.choice === 'wordmark' ? t('logoWordmark') : t('logoBadge')}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-8 h-8 border border-border hover:border-white transition">−</button>
                    <span className="w-5 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-8 h-8 border border-border hover:border-white transition">+</button>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="label-luxe text-red-400 hover:text-red-300 transition">{t('remove')}</button>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 shrink-0">
                <QrCode preset={item.preset} color={item.qrColor} size={44} />
                {item.logo?.choice && <LogoPreview variant={item.logo.choice} colors={presetColors} size={26} />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex justify-between items-center">
        <div>
          <div className="label-luxe">{t('subtotal')}</div>
          <div className="font-heading text-3xl text-secondary mt-1">{formatDZD(subtotal)}</div>
        </div>
        <div className="flex gap-3">
          <Link href="/shop" className="btn-secondary">{t('continueShopping')}</Link>
          <button onClick={() => router.push('/checkout')} className="btn-primary !px-7">{t('checkout')} →</button>
        </div>
      </div>
    </div>
  );
}
