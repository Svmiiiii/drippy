'use client';
import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { QrCode } from '@/components/QrCode';
import { formatDZD } from '@/lib/utils';

export default function AdminCustomersPage() {
  const t = useTranslations('admin.customers');
  const locale = useLocale();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [refresh, setRefresh] = useState(0);
  const [sel, setSel] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/customers').then((r) => r.json()).then((j) => { if (j.success) setCustomers(j.data.items); });
  }, [refresh]);

  async function openDetail(c: any) {
    setSel(c);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${c.id}`);
      const j = await res.json();
      if (j.success) setDetail(j.data);
    } finally {
      setDetailLoading(false);
    }
  }

  async function action(customerId: string, path: string) {
    setLoading((prev) => ({ ...prev, [customerId + path]: true }));
    try {
      await fetch(`/api/admin/customers/${customerId}/${path}`, { method: 'POST' });
      setRefresh((x) => x + 1);
      if (sel?.id === customerId) openDetail(sel);
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
            {[t('colDropixId'), t('colClient'), t('colEmail'), t('colAccount'), t('colQr'), t('colActions')].map((h) => (
              <th key={h} className="text-start px-4 py-3 text-xs text-text-secondary uppercase tracking-wide">{h}</th>))}
          </tr></thead>
          <tbody>
            {customers.map((c: any) => (
              <tr key={c.id} className="border-b border-surface-hover hover:bg-surface-hover">
                <td className="px-4 py-3 font-heading text-primary text-sm">
                  <button onClick={() => openDetail(c)} className="hover:underline">{c.dropix_id}</button>
                </td>
                <td className="px-4 py-3 font-semibold text-sm">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-text-secondary text-sm">{c.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.account_status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {c.account_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.qr_codes?.qr_status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                    {c.qr_codes?.qr_status ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => openDetail(c)} className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-white transition">
                      {t('view')}
                    </button>
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
                    {c.qr_codes?.qr_status === 'active' ? (
                      <button onClick={() => action(c.id, 'disable-qr')}
                        disabled={loading[c.id + 'disable-qr']}
                        className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-white transition disabled:opacity-50">
                        {t('blockQr')}
                      </button>
                    ) : c.qr_codes ? (
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

      {sel && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={() => setSel(null)}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-5">
              <div>
                <div className="font-heading text-2xl text-secondary">{sel.dropix_id}</div>
                <div className="font-semibold">{sel.first_name} {sel.last_name}</div>
              </div>
              <button onClick={() => setSel(null)} className="text-text-secondary">✕</button>
            </div>

            {detailLoading ? (
              <p className="text-text-secondary text-sm">{t('loading')}</p>
            ) : !detail ? (
              <p className="text-red-400 text-sm">{t('loadError')}</p>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-3 text-sm mb-6">
                  <div><span className="text-text-secondary">{t('colEmail')}</span><div>{detail.email}</div></div>
                  <div><span className="text-text-secondary">{t('phone')}</span><div>{detail.phone ?? '—'}</div></div>
                </div>

                <div className="bg-bg rounded-2xl p-5 mb-6 flex flex-col items-center gap-3">
                  {detail.qr_url ? (
                    <>
                      <QrCode value={detail.qr_url} preset="NEON" size={140} />
                      <span className={`badge text-xs ${detail.qr_codes?.qr_status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                        {detail.qr_codes?.qr_status ?? '—'}
                      </span>
                      {detail.qr_codes?.qr_profiles && (
                        <div className="text-xs text-text-secondary text-center">
                          {t('currentDestination')}: {detail.qr_codes.qr_profiles.target_type} — {detail.qr_codes.qr_profiles.target_value}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-text-secondary text-sm">{t('noQr')}</p>
                  )}
                </div>

                {detail.welcome_pdf_url && (
                  <a href={detail.welcome_pdf_url} download
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-pink-500/40 text-pink-300 hover:border-pink-400 hover:bg-pink-500/10 transition mb-6">
                    🪪 {t('downloadWelcomePdf')}
                  </a>
                )}

                <h3 className="font-bold text-sm mb-3">{t('orders')} ({detail.orders?.length ?? 0})</h3>
                <div className="space-y-2 mb-2">
                  {(detail.orders ?? []).map((o: any) => (
                    <div key={o.id} className="flex justify-between items-center bg-bg rounded-xl px-3 py-2 text-sm">
                      <div>
                        <div className="font-heading text-secondary">{o.order_number}</div>
                        <div className="text-text-secondary text-xs">{new Date(o.created_at).toLocaleDateString(locale)}</div>
                      </div>
                      <div className="text-end">
                        <div className="font-semibold">{formatDZD(o.total_dzd)}</div>
                        <div className="text-text-secondary text-xs">{o.status}</div>
                      </div>
                    </div>
                  ))}
                  {(!detail.orders || detail.orders.length === 0) && (
                    <p className="text-text-secondary text-sm">{t('noOrders')}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
