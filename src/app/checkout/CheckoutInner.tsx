'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { QrCode } from '@/components/QrCode';
import { WILAYAS, getShippingFee } from '@/lib/design';
import { formatDZD } from '@/lib/utils';

function CheckoutForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const t = useTranslations('checkout');
  let cfg: Record<string, any> = {};
  try { cfg = JSON.parse(decodeURIComponent(sp.get('cfg') ?? '{}')); } catch { /* invalid param */ }

  const [form, setForm] = useState({ name: '', phone: '', email: '', wilaya: '', commune: '', address: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ number: string } | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount_dzd: number; promo_code_id: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  if (!cfg.product_id) {
    return <div className="max-w-xl mx-auto px-6 py-20 text-center text-text-secondary">{t('noConfig')} <a href="/shop" className="text-primary">{t('backToShop')}</a></div>;
  }

  const subtotal = (cfg.price ?? 0) * (cfg.qty ?? 1);
  const shipping = getShippingFee(form.wilaya);
  const discount = promoApplied?.discount_dzd ?? 0;
  const total = Math.max(0, subtotal + (form.wilaya ? shipping : 0) - discount);

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setPromoError('');
    try {
      const res = await fetch('/api/promos/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: promoCode, order_total: subtotal }) });
      const j = await res.json();
      if (j.success) { setPromoApplied({ code: j.data.code, discount_dzd: j.data.discount_dzd, promo_code_id: j.data.promo_code_id }); }
      else setPromoError(j.error?.message ?? t('errorInvalidPromo'));
    } catch { setPromoError(t('errorInvalidPromo')); }
    finally { setPromoLoading(false); }
  }

  async function submit() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t('errorNameRequired');
    if (!/^0[5-7]\d{8}$/.test(form.phone)) e.phone = t('errorInvalidPhone');
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t('errorInvalidEmail');
    if (!form.wilaya) e.wilaya = t('errorWilayaRequired');
    if (!form.commune.trim()) e.commune = t('errorCommuneRequired');
    if (!form.address.trim()) e.address = t('errorAddressRequired');
    if (Object.keys(e).length) { setErrors(e); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name, customer_phone: form.phone, customer_email: form.email,
          wilaya_code: form.wilaya, commune: form.commune, address: form.address,
          items: [{
            product_id: cfg.product_id, quantity: cfg.qty, size: cfg.size,
            garment_color: cfg.garment_color,
            qr_style: { preset: cfg.preset },
            text: cfg.text,
          }],
          ...(promoApplied ? { promo_code: promoApplied.code } : {}),
        }),
      });
      const json = await res.json();
      if (json.success) setDone({ number: json.data.order_number });
      else setErrors({ form: json.error?.message ?? t('errorInvalidPromo') });
    } catch {
      setErrors({ form: t('errorInvalidPromo') });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="text-7xl mb-6">🎉</div>
        <h1 className="font-heading text-5xl mb-3">{t('orderSentTitle')}</h1>
        <p className="text-text-secondary text-lg mb-8 leading-relaxed">
          {t('orderReceived', { number: done.number })}<br />
          {t('adminWillCall')}
        </p>
        <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 mb-8 text-accent text-sm">
          💡 {t('codBanner')}
        </div>
        <button onClick={() => router.push('/')} className="btn-primary">{t('backHome')}</button>
      </div>
    );
  }

  const field = (k: keyof typeof form) => ({
    className: 'input', value: form[k],
    onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm({ ...form, [k]: ev.target.value }); setErrors({ ...errors, [k]: '' });
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-heading text-4xl mb-2">{t('finalizeOrder')}</h1>
      <p className="text-text-secondary mb-8">{t('subtitle')}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><label className="text-sm text-text-secondary mb-1.5 block">{t('fullName')} *</label>
          <input {...field('name')} placeholder={t('fullNamePlaceholder')} />{errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}</div>
        <div><label className="text-sm text-text-secondary mb-1.5 block">{t('phone')} *</label>
          <input {...field('phone')} placeholder="0555123456" />{errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}</div>
        <div><label className="text-sm text-text-secondary mb-1.5 block">{t('email')} *</label>
          <input {...field('email')} placeholder="karim@example.com" />{errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}</div>
        <div><label className="text-sm text-text-secondary mb-1.5 block">{t('wilaya')} *</label>
          <select {...field('wilaya')} className="input"><option value="">{t('selectWilaya')}</option>
            {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}</select>{errors.wilaya && <p className="text-red-400 text-xs mt-1">{errors.wilaya}</p>}</div>
        <div><label className="text-sm text-text-secondary mb-1.5 block">{t('commune')} *</label>
          <input {...field('commune')} placeholder={t('communePlaceholder')} />{errors.commune && <p className="text-red-400 text-xs mt-1">{errors.commune}</p>}</div>
        <div className="sm:col-span-2"><label className="text-sm text-text-secondary mb-1.5 block">{t('address')} *</label>
          <input {...field('address')} placeholder={t('addressPlaceholder')} />{errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}</div>
      </div>

      <div className="card mt-8 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <QrCode preset={cfg.preset} size={72} text={cfg.text?.content} textPosition={cfg.text?.position} font={cfg.text?.font} />
          <div>
            <div className="font-bold">{cfg.name}</div>
            <div className="text-text-secondary text-sm mt-1">{t('size')} {cfg.size}{cfg.garment_color ? ` · ${t('color')} ${cfg.garment_color}` : ''} · {cfg.qty}× · {t('style')} {cfg.preset}</div>
          </div>
        </div>
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">{t('subtotal')}</span>
            <span>{formatDZD(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">{t('shipping')} {form.wilaya ? `(${form.wilaya.split(' - ')[1] ?? form.wilaya})` : ''}</span>
            <span>{form.wilaya ? formatDZD(shipping) : '—'}</span>
          </div>
          {promoApplied && (
            <div className="flex justify-between text-sm text-green-400">
              <span>{promoApplied.code}</span>
              <span>- {formatDZD(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t border-border pt-2">
            <span>{t('promoTotal')}</span>
            <span className="font-heading text-xl text-secondary">{formatDZD(total)}</span>
          </div>
          <div className="text-text-secondary text-xs text-end">{t('codPayment')}</div>
        </div>

        {/* Code promo */}
        <div className="mt-4 pt-4 border-t border-border">
          {promoApplied ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-400">✓ {t('applied', { code: promoApplied.code })}</span>
              <button onClick={() => { setPromoApplied(null); setPromoCode(''); }} className="text-text-secondary text-xs hover:text-white">{t('remove')}</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input className="input flex-1 !py-2 text-sm" placeholder={t('promoCode')} value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && applyPromo()} />
              <button onClick={applyPromo} disabled={promoLoading} className="px-4 py-2 rounded-xl border border-border text-sm text-text-secondary hover:text-white transition disabled:opacity-50">
                {promoLoading ? t('applying') : t('apply')}
              </button>
            </div>
          )}
          {promoError && <p className="text-red-400 text-xs mt-1">{promoError}</p>}
        </div>
      </div>

      {errors.form && <p className="text-red-400 text-sm mb-4">{errors.form}</p>}
      <button onClick={submit} disabled={submitting} className="btn-primary w-full justify-center !py-4 !text-base disabled:opacity-60">
        {submitting ? t('sending') : `${t('confirmOrder')} →`}
      </button>
    </div>
  );
}

export function CheckoutInner() {
  const t = useTranslations('common');
  return (
    <Suspense fallback={<div className="py-20 text-center text-text-secondary">{t('loading')}</div>}>
      <CheckoutForm />
    </Suspense>
  );
}
