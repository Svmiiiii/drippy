'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function AdminCustomersPage() {
  const t = useTranslations('admin.customers');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    fetch('/api/admin/customers').then((r) => r.json()).then((j) => { if (j.success) setCustomers(j.data.items); });
  }, [refresh]);

  async function action(customerId: string, path: string) {
    setLoading((prev) => ({ ...prev, [customerId + path]: true }));
    try {
      await fetch(`/api/admin/customers/${customerId}/${path}`, { method: 'POST' });
      setRefresh((x) => x + 1);
    } finally {
      setLoading((prev) => ({ ...prev, [customerId + path]: false }));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-8">{t('title')}</h1>
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            {[t('colDrippyId'), t('colClient'), t('colEmail'), t('colAccount'), t('colQr'), t('colActions')].map((h) => (
              <th key={h} className="text-start px-4 py-3 text-xs text-text-secondary uppercase tracking-wide">{h}</th>))}
          </tr></thead>
          <tbody>
            {customers.map((c: any) => (
              <tr key={c.id} className="border-b border-surface-hover hover:bg-surface-hover">
                <td className="px-4 py-3 font-heading text-primary text-sm">{c.drippy_id}</td>
                <td className="px-4 py-3 font-semibold text-sm">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-text-secondary text-sm">{c.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.account_status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {c.account_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.qr_codes?.[0]?.qr_status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                    {c.qr_codes?.[0]?.qr_status ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {c.account_status === 'active' ? (
                      <button onClick={() => action(c.id, 'disable')}
                        disabled={loading[c.id + 'disable']}
                        className="text-xs px-2 py-1 rounded border border-red-500/40 text-red-400 hover:border-red-400 transition disabled:opacity-50">
                        {t('disable')}
                      </button>
                    ) : (
                      <button onClick={() => action(c.id, 'enable')}
                        disabled={loading[c.id + 'enable']}
                        className="text-xs px-2 py-1 rounded border border-green-500/40 text-green-400 hover:border-green-400 transition disabled:opacity-50">
                        {t('enable')}
                      </button>
                    )}
                    {c.qr_codes?.[0]?.qr_status === 'active' ? (
                      <button onClick={() => action(c.id, 'disable-qr')}
                        disabled={loading[c.id + 'disable-qr']}
                        className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-white transition disabled:opacity-50">
                        {t('blockQr')}
                      </button>
                    ) : c.qr_codes?.[0] ? (
                      <button onClick={() => action(c.id, 'enable-qr')}
                        disabled={loading[c.id + 'enable-qr']}
                        className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-white transition disabled:opacity-50">
                        {t('unblockQr')}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-text-secondary">{t('noCustomers')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
