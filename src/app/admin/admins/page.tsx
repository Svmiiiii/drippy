'use client';
import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';

interface AdminUser {
  id: string;
  dropix_id: string;
  email: string;
  role: 'admin' | 'super_admin';
  account_status: string;
  created_at: string;
}

export default function AdminAdminsPage() {
  const t = useTranslations('admin.admins');
  const locale = useLocale();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'admin' as 'admin' | 'super_admin' });
  const [creating, setCreating] = useState(false);
  const [createdCred, setCreatedCred] = useState<{ email: string; temp_password: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/admins').then((r) => r.json()).then((j) => { if (j.success) setAdmins(j.data.items); });
  }, [refresh]);

  async function createAdmin() {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (j.success) {
        setCreatedCred({ email: j.data.email, temp_password: j.data.temp_password });
        setShowForm(false);
        setForm({ email: '', role: 'admin' });
        setRefresh((x) => x + 1);
      } else {
        setToast(j.error?.message ?? t('error'));
        setTimeout(() => setToast(''), 3000);
      }
    } catch {
      setToast(t('networkError'));
      setTimeout(() => setToast(''), 3000);
    } finally {
      setCreating(false);
    }
  }

  async function toggle(id: string, currentStatus: string) {
    const action = currentStatus === 'active' ? 'disable' : 'enable';
    setLoading((p) => ({ ...p, [id]: true }));
    try {
      await fetch(`/api/admin/admins/${id}/${action}`, { method: 'POST' });
      setRefresh((x) => x + 1);
    } finally {
      setLoading((p) => ({ ...p, [id]: false }));
    }
  }

  function copyCreds() {
    if (!createdCred) return;
    navigator.clipboard.writeText(`${createdCred.email}\n${createdCred.temp_password}`);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold mb-1">{t('title')}</h1>
          <p className="text-text-secondary">{t('subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">{t('newAdmin')}</button>
      </div>

      {createdCred && (
        <div className="card mb-6 border-primary/30">
          <h2 className="font-bold mb-2">{t('createdTitle')}</h2>
          <p className="text-text-secondary text-sm mb-3">{t('createdNotice')}</p>
          <div className="bg-bg rounded-xl p-4 text-sm space-y-1 mb-4">
            <div><span className="text-text-secondary">{t('email')}:</span> {createdCred.email}</div>
            <div><span className="text-text-secondary">{t('tempPassword')}:</span> <span className="font-mono">{createdCred.temp_password}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={copyCreds} className="btn-secondary !py-2">{t('copy')}</button>
            <button onClick={() => setCreatedCred(null)} className="px-4 py-2 rounded-xl border border-border text-sm text-text-secondary hover:text-white transition">{t('close')}</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card mb-6 border-primary/30">
          <h2 className="font-bold mb-4">{t('newAdmin')}</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">{t('email')} *</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@dropix.dz" />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">{t('role')}</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'super_admin' })}>
                <option value="admin">{t('roleAdmin')}</option>
                <option value="super_admin">{t('roleSuperAdmin')}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={createAdmin} disabled={creating || !form.email} className="btn-primary disabled:opacity-60">{creating ? t('creating') : t('create')}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">{t('cancel')}</button>
          </div>
        </div>
      )}

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            {[t('colDropixId'), t('colEmail'), t('colRole'), t('colStatus'), t('colCreated'), t('colActions')].map((h) => (
              <th key={h} className="text-start px-4 py-3 text-xs text-text-secondary uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-b border-surface-hover hover:bg-surface-hover">
                <td className="px-4 py-3 font-heading text-primary text-sm">{a.dropix_id}</td>
                <td className="px-4 py-3 text-sm">{a.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs ${a.role === 'super_admin' ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-300'}`}>
                    {a.role === 'super_admin' ? t('roleSuperAdmin') : t('roleAdmin')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs ${a.account_status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {a.account_status === 'active' ? t('active') : t('disabled')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">{new Date(a.created_at).toLocaleDateString(locale)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(a.id, a.account_status)} disabled={loading[a.id]}
                    className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-white transition disabled:opacity-50">
                    {a.account_status === 'active' ? t('disable') : t('enable')}
                  </button>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-text-secondary">{t('noAdmins')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <div className="fixed bottom-6 end-6 bg-surface border border-border px-5 py-3 rounded-2xl text-sm z-50">{toast}</div>}
    </div>
  );
}
