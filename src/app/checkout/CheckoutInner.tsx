'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCart } from '@/components/CartProvider';
import { QrCode } from '@/components/QrCode';
import { LogoPreview } from '@/components/LogoPreview';
import { WILAYAS, getShippingFee, getQrColors } from '@/lib/design';
import { formatDZD } from '@/lib/utils';

function CheckoutForm() {
  const router = useRouter();
  const t = useTranslations('checkout');
  const { items, clear } = useCart();

  const [form, setForm] = useState({ name: '', phone: '', email: '', wilaya: '', commune: '', address: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ number: string } | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount_dzd: number; promo_code_id: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  if (items.length === 0 && !done) {
    return <div className="max-w-xl mx-auto px-6 py-20 text-center text-text-secondary">{t('noConfig')} <a href="/shop" className="text-primary">{t('backToShop')}</a></div>;
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = getShippingFee(form.wilaya);
  const discount = promoApplied?.discount_dzd ?? 0;
  const total = Math.max(0, subtotal + (form.wilaya ? shipping : 0) - discount);

  function validateForm(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t('errorNameRequired');
    if (!/^0[5-7]\d{8}$/.test(form.phone)) e.phone = t('errorInvalidPhone');
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t('errorInvalidEmail');
    if (!form.wilaya) e.wilaya = t('errorWilayaRequired');
    if (!form.commune.trim()) e.commune = t('errorCommuneRequired');
    if (!form.address.trim()) e.address = t('errorAddressRequired');
    if (!acceptTerms) e.terms = t('errorTermsRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function requestCode() {
    if (!validateForm()) return;
    setSendingCode(true);
    setErrors((prev) => ({ ...prev, form: '' }));
    try {
      const res = await fetch('/api/checkout/send-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const json = await res.json();
      if (json.success) {
        setStep('code'); setCode(''); setCodeError(''); setCooldown(60);
      } else {
        setErrors({ form: json.error?.message ?? t('errorSendCode') });
      }
    } catch {
      setErrors({ form: t('errorSendCode') });
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyCode() {
    if (code.length !== 6) { setCodeError(t('errorInvalidCode')); return; }
    setVerifyingCode(true); setCodeError('');
    try {
      const res = await fetch('/api/checkout/verify-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code }),
      });
      const json = await res.json();
      if (json.success) await createOrder();
      else setCodeError(json.error?.message ?? t('errorInvalidCode'));
    } catch {
      setCodeError(t('errorInvalidCode'));
    } finally {
      setVerifyingCode(false);
    }
  }

  function backToForm() {
    setStep('form'); setCode(''); setCodeError('');
  }

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

  async function createOrder() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name, customer_phone: form.phone, customer_email: form.email,
          wilaya_code: form.wilaya, commune: form.commune, address: form.address,
          items: items.map((i) => ({
            product_id: i.product_id, quantity: i.qty, size: i.size,
            garment_color: i.garment_color,
            qr_style: { preset: i.preset, color: i.qrColor },
            text: i.text,
            logo: i.logo,
          })),
          ...(promoApplied ? { promo_code: promoApplied.code } : {}),
        }),
      });
      const json = await res.json();
      if (json.success) { setDone({ number: json.data.order_number }); clear(); }
      else { setStep('form'); setErrors({ form: json.error?.message ?? t('errorInvalidPromo') }); }
    } catch {
      setStep('form');
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

  if (step === 'code') {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <div className="text-5xl mb-6">📧</div>
        <h1 className="font-heading text-3xl mb-3">{t('verifyEmailTitle')}</h1>
        <p className="text-text-secondary mb-8">{t('verifyEmailHint', { email: form.email })}</p>
        <input
          className="input text-center text-2xl tracking-[0.4em] font-heading"
          maxLength={6} inputMode="numeric" placeholder="123456"
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setCodeError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
        />
        {codeError && <p className="text-red-400 text-sm mt-2">{codeError}</p>}

        <button onClick={verifyCode} disabled={verifyingCode} className="btn-primary w-full justify-center !py-4 !text-base disabled:opacity-60 mt-6">
          {verifyingCode ? t('verifying') : t('verifyButton')}
        </button>

        <div className="flex justify-between items-center mt-5 text-sm">
          <button onClick={backToForm} className="text-text-secondary hover:text-white transition">{t('changeEmail')}</button>
          <button onClick={requestCode} disabled={cooldown > 0 || sendingCode} className="text-text-secondary hover:text-white transition disabled:opacity-40">
            {cooldown > 0 ? t('resendIn', { s: cooldown }) : t('resendCode')}
          </button>
        </div>
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
        <div className="space-y-4 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <QrCode preset={item.preset} color={item.qrColor} size={64} text={item.text?.content} textPosition={item.text?.position} font={item.text?.font} textColor={item.text?.color} textSize={item.text?.size} />
              {item.logo?.choice && (
                <LogoPreview variant={item.logo.choice} colors={getQrColors(item.preset, item.qrColor)} size={40} />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold">{item.name}</div>
                <div className="text-text-secondary text-sm mt-1">{t('size')} {item.size}{item.garment_color ? ` · ${t('color')} ${item.garment_color}` : ''} · {item.qty}× · {t('style')} {item.preset === 'CUSTOM' ? item.qrColor : item.preset}</div>
                {item.logo?.position && <div className="text-text-secondary text-sm">{item.logo.position === 'center' ? t('logoPositionCenter') : t('logoPositionTopLeft')}</div>}
              </div>
              <span className="font-heading text-secondary shrink-0">{formatDZD(item.price * item.qty)}</span>
            </div>
          ))}
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

      <label className="flex items-start gap-2 text-sm text-text-secondary mb-4">
        <input
          type="checkbox" checked={acceptTerms} className="mt-0.5"
          onChange={(e) => { setAcceptTerms(e.target.checked); setErrors({ ...errors, terms: '' }); }}
        />
        <span>{t('acceptTermsPrefix')} <Link href="/cgv" target="_blank" className="text-primary underline">{t('acceptTermsLink')}</Link></span>
      </label>
      {errors.terms && <p className="text-red-400 text-xs mb-2">{errors.terms}</p>}

      {errors.form && <p className="text-red-400 text-sm mb-4">{errors.form}</p>}
      <button onClick={requestCode} disabled={sendingCode || submitting} className="btn-primary w-full justify-center !py-4 !text-base disabled:opacity-60">
        {sendingCode ? t('sendingCode') : `${t('receiveCode')} →`}
      </button>
    </div>
  );
}

export function CheckoutInner() {
  return <CheckoutForm />;
}
