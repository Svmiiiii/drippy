'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { formatDZD } from '@/lib/utils';

export default function AdminShippingPage() {
  const t = useTranslations('admin.shipping');
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<'packed' | 'shipped' | 'all'>('packed');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState('');

  const STATUS_LABEL: Record<string, string> = {
    packed: t('statusPacked'),
    shipped: t('statusShipped'),
    delivered: t('statusDelivered'),
  };

  useEffect(() => {
    fetch('/api/admin/orders?status=' + (filter === 'all' ? '' : filter))
      .then((r) => r.json())
      .then((j) => { if (j.success) setOrders(j.data?.items ?? j.data ?? []); });
  }, [refresh, filter]);

  async function updateStatus(orderId: string, newStatus: string) {
    setLoading((p) => ({ ...p, [orderId]: true }));
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const j = await res.json();
      if (j.success) { setToast(t('statusUpdated')); setRefresh((x) => x + 1); }
      else setToast(j.error?.message ?? t('error'));
    } catch { setToast(t('networkError')); }
    finally {
      setLoading((p) => ({ ...p, [orderId]: false }));
      setTimeout(() => setToast(''), 3000);
    }
  }

  const filtered = orders.filter((o) => filter === 'all' ? ['packed', 'shipped', 'delivered'].includes(o.status) : o.status === filter);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">{t('title')}</h1>
      <p className="text-text-secondary mb-6">{t('subtitle')}</p>

      <div className="flex gap-2 mb-6">
        {(['packed', 'shipped', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filter === f ? 'bg-primary text-white' : 'border border-border text-text-secondary hover:text-white'}`}>
            {f === 'packed' ? t('toShip') : f === 'shipped' ? t('shipped') : t('all')}
          </button>
        ))}
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            {[t('colOrder'), t('colClient'), t('colWilaya'), t('colAddress'), t('colTotal'), t('colStatus'), t('colAction')].map((h) => (
              <th key={h} className="text-start px-4 py-3 text-xs text-text-secondary uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-b border-surface-hover hover:bg-surface-hover">
                <td className="px-4 py-3 font-heading text-secondary text-sm">{o.order_number}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-sm">{o.customer_name}</div>
                  <div className="text-xs text-text-secondary">{o.customer_phone}</div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{o.wilaya_code}</td>
                <td className="px-4 py-3 text-xs text-text-secondary max-w-[180px] truncate">{o.commune}, {o.address}</td>
                <td className="px-4 py-3 font-heading text-sm">{formatDZD(o.total_dzd)}</td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs ${o.status === 'packed' ? 'bg-blue-500/20 text-blue-300' : o.status === 'shipped' ? 'bg-purple-500/20 text-purple-300' : 'bg-green-500/20 text-green-300'}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {o.status === 'packed' && (
                    <button onClick={() => updateStatus(o.id, 'shipped')} disabled={loading[o.id]}
                      className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition disabled:opacity-50">
                      {loading[o.id] ? '…' : t('markShipped')}
                    </button>
                  )}
                  {o.status === 'shipped' && (
                    <button onClick={() => updateStatus(o.id, 'delivered')} disabled={loading[o.id]}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition disabled:opacity-50">
                      {loading[o.id] ? '…' : t('markDelivered')}
                    </button>
                  )}
                  {o.status === 'delivered' && (
                    <span className="text-xs text-green-400">✓ {t('delivered')}</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-text-secondary">{t('noOrders')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <div className="fixed bottom-6 end-6 bg-surface border border-border px-5 py-3 rounded-2xl text-sm z-50">{toast}</div>}
    </div>
  );
}
