'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { QrCode } from '@/components/QrCode';
import { WILAYAS } from '@/lib/design';
import { formatDZD } from '@/lib/utils';

function CheckoutInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const cfg = JSON.parse(decodeURIComponent(sp.get('cfg') ?? '{}'));

  const [form, setForm] = useState({ name: '', phone: '', email: '', wilaya: '', commune: '', address: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ number: string } | null>(null);

  if (!cfg.product_id) {
    return <div className="max-w-xl mx-auto px-6 py-20 text-center text-text-secondary">Aucune configuration. <a href="/shop" className="text-primary">Retour à la boutique</a></div>;
  }

  const total = (cfg.price ?? 0) * (cfg.qty ?? 1);

  async function submit() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nom requis';
    if (!/^0[5-7]\d{8}$/.test(form.phone)) e.phone = 'Numéro invalide (0555...)';
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email invalide';
    if (!form.wilaya) e.wilaya = 'Wilaya requise';
    if (!form.commune.trim()) e.commune = 'Commune requise';
    if (!form.address.trim()) e.address = 'Adresse requise';
    if (Object.keys(e).length) { setErrors(e); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name, customer_phone: form.phone, customer_email: form.email,
          wilaya_code: form.wilaya, commune: form.commune, address: form.address,
          items: [{
            product_id: cfg.product_id, quantity: cfg.qty,
            qr_style: { preset: cfg.preset },
            text: cfg.text,
          }],
        }),
      });
      const json = await res.json();
      if (json.success) setDone({ number: json.data.order_number });
      else setErrors({ form: json.error?.message ?? 'Erreur' });
    } catch {
      setErrors({ form: 'Erreur réseau' });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="text-7xl mb-6">🎉</div>
        <h1 className="font-heading text-5xl mb-3">COMMANDE <span className="gradient-text">ENVOYÉE !</span></h1>
        <p className="text-text-secondary text-lg mb-8 leading-relaxed">
          Ta commande <strong className="text-secondary">{done.number}</strong> a été reçue.<br />
          Un administrateur va t&apos;appeler pour la confirmer.
        </p>
        <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 mb-8 text-accent text-sm">
          💡 Paiement à la livraison · Livraison partout en Algérie
        </div>
        <button onClick={() => router.push('/')} className="btn-primary">Retour à l&apos;accueil</button>
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
      <h1 className="font-heading text-4xl mb-2">FINALISER <span className="gradient-text">LA COMMANDE</span></h1>
      <p className="text-text-secondary mb-8">Paiement à la livraison · Confirmation par téléphone</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><label className="text-sm text-text-secondary mb-1.5 block">Nom complet *</label>
          <input {...field('name')} placeholder="Karim Boudiaf" />{errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}</div>
        <div><label className="text-sm text-text-secondary mb-1.5 block">Téléphone *</label>
          <input {...field('phone')} placeholder="0555123456" />{errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}</div>
        <div><label className="text-sm text-text-secondary mb-1.5 block">Email *</label>
          <input {...field('email')} placeholder="karim@example.com" />{errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}</div>
        <div><label className="text-sm text-text-secondary mb-1.5 block">Wilaya *</label>
          <select {...field('wilaya')} className="input"><option value="">Sélectionner...</option>
            {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}</select>{errors.wilaya && <p className="text-red-400 text-xs mt-1">{errors.wilaya}</p>}</div>
        <div><label className="text-sm text-text-secondary mb-1.5 block">Commune *</label>
          <input {...field('commune')} placeholder="Hydra" />{errors.commune && <p className="text-red-400 text-xs mt-1">{errors.commune}</p>}</div>
        <div className="sm:col-span-2"><label className="text-sm text-text-secondary mb-1.5 block">Adresse complète *</label>
          <input {...field('address')} placeholder="Cité des pins, bât 3, apt 12" />{errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}</div>
      </div>

      <div className="card mt-8 mb-6 flex items-center gap-4">
        <QrCode preset={cfg.preset} size={72} text={cfg.text?.content} textPosition={cfg.text?.position} font={cfg.text?.font} />
        <div>
          <div className="font-bold">{cfg.name}</div>
          <div className="text-text-secondary text-sm mt-1">Taille {cfg.size} · {cfg.qty}× · Style {cfg.preset}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="font-heading text-2xl text-secondary">{formatDZD(total)}</div>
          <div className="text-text-secondary text-xs">À la livraison</div>
        </div>
      </div>

      {errors.form && <p className="text-red-400 text-sm mb-4">{errors.form}</p>}
      <button onClick={submit} disabled={submitting} className="btn-primary w-full justify-center !py-4 !text-base disabled:opacity-60">
        {submitting ? 'Envoi...' : 'Confirmer la commande →'}
      </button>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="py-20 text-center text-text-secondary">Chargement...</div>}>
        <CheckoutInner />
      </Suspense>
      <Footer />
    </>
  );
}
