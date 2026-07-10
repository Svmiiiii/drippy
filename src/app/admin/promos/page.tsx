'use client';
import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';

export default function AdminPromosPage() {
  const t = useTranslations('admin.promos');
  const locale = useLocale();
  const [promos, setPromos] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', discount_type: 'percent', discount_value: 10, min_order_dzd: 0, max_uses: '', expires_at: '', is_active: true });
  const [saving, setSaving] = useState(false);

  function formatDiscount(p: any) {
    return p.discount_type === 'percent' ? `${p.discount_value}%` : `${p.discount_value} DZD`;
  }

  useEffect(() => {
    fetch('/api/admin/promos').then((r) => r.json()).then((j) => { if (j.success) setPromos(j.data.items); });
  }, [refresh]);

  async function save() {
    setSaving(true);
    try {
      const body = { ...form, discount_value: Number(form.discount_value), min_order_dzd: Number(form.min_order_dzd), max_uses: form.max_uses ? Number(form.max_uses) : undefined, expires_at: form.expires_at || undefined };
      const res = await fetch('/api/admin/promos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      if (j.success) { setToast(t('created')); setShowForm(false); setRefresh((x) => x + 1); }
      else setToast(j.error?.message ?? t('error'));
    } finally { setSaving(false); setTimeout(() => setToast(''), 3000); }
  }

  async function toggle(id: string, current: boolean) {
    await fetch(`/api/admin/promos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !current }) });
    setRefresh((x) => x + 1);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold mb-1">{t('title')}</h1>
          <p className="text-text-secondary">{t('subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">{t('createCode')}</button>
      </div>

      {showForm && (
        <div className="card mb-6 border-primary/30">
          <h2 className="font-bold mb-4">{t('newCode')}</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div><label className="text-xs text-text-secondary mb-1 block">{t('code')} *</label>
              <input className="input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER20" /></div>
            <div><label className="text-xs text-text-secondary mb-1 block">{t('description')}</label>
              <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Promo été 2025" /></div>
            <div><label className="text-xs text-text-secondary mb-1 block">{t('type')}</label>
              <select className="input" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                <option value="percent">{t('percent')}</option>
                <option value="fixed">{t('fixed')}</option>
              </select></div>
            <div><label className="text-xs text-text-secondary mb-1 block">{t('value')} *</label>
              <input type="number" className="input" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
            <div><label className="text-xs text-text-secondary mb-1 block">{t('minOrder')}</label>
              <input type="number" className="input" value={form.min_order_dzd} onChange={(e) => setForm({ ...form, min_order_dzd: Number(e.target.value) })} /></div>
            <div><label className="text-xs text-text-secondary mb-1 block">{t('maxUses')}</label>
              <input type="number" className="input" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder={t('unlimited')} /></div>
            <div><label className="text-xs text-text-secondary mb-1 block">{t('expiresOn')}</label>
              <input type="datetime-local" className="input" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-60">{saving ? t('creating') : t('create')}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">{t('cancel')}</button>
          </div>
        </div>
      )}

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            {[t('colCode'), t('colDiscount'), t('colMinOrder'), t('colUses'), t('colExpires'), t('colStatus'), t('colAction')].map((h) => (
              <th key={h} className="text-start px-4 py-3 text-xs text-text-secondary uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {promos.map((p) => (
              <tr key={p.id} className="border-b border-surface-hover hover:bg-surface-hover">
                <td className="px-4 py-3 font-heading text-secondary">{p.code}</td>
                <td className="px-4 py-3 font-semibold text-sm">{formatDiscount(p)}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{p.min_order_dzd > 0 ? `${p.min_order_dzd} DZD` : '—'}</td>
                <td className="px-4 py-3 text-sm">{p.uses_count}{p.max_uses ? ` / ${p.max_uses}` : ''}</td>
                <td className="px-4 py-3 text-xs text-text-secondary">{p.expires_at ? new Date(p.expires_at).toLocaleDateString(locale) : '∞'}</td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs ${p.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {p.is_active ? t('active') : t('inactive')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(p.id, p.is_active)}
                    className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-white transition">
                    {p.is_active ? t('disable') : t('enable')}
                  </button>
                </td>
              </tr>
            ))}
            {promos.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-text-secondary">{t('noPromos')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <div className="fixed bottom-6 end-6 bg-surface border border-border px-5 py-3 rounded-2xl text-sm z-50">{toast}</div>}
    </div>
  );
}
