'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { formatDZD } from '@/lib/utils';

interface OrderItem {
  id: string;
  product_name: string;
  size: string;
  quantity: number;
  garment_color: string | null;
  qr_preset: string;
  text_content: string | null;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  wilaya_code: string;
  commune: string;
  address: string;
  confirmed_at: string | null;
  updated_at: string;
  sent_to_partner_at: string | null;
  total_dzd: number;
  order_items: OrderItem[];
}

function useOrderAssets(orderId: string, enabled: boolean) {
  const [images, setImages] = useState<string[] | null>(null);
  const [welcomePdfUrl, setWelcomePdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || images) return;
    setLoading(true);
    fetch(`/api/admin/production/${orderId}/assets`)
      .then((r) => r.json())
      .then((j) => { if (j.success) { setImages(j.data.item_image_urls); setWelcomePdfUrl(j.data.welcome_pdf_url); } })
      .finally(() => setLoading(false));
  }, [orderId, enabled, images]);

  return { images, welcomePdfUrl, loading };
}

function OrderCard({ order, mode, onAction, busy }: {
  order: Order;
  mode: 'toSend' | 'atPartner';
  onAction: (id: string) => void;
  busy: boolean;
}) {
  const t = useTranslations('admin.partner');
  const locale = useLocale();
  const { images, welcomePdfUrl, loading: imagesLoading } = useOrderAssets(order.id, true);
  const [copied, setCopied] = useState(false);

  const firstItem = order.order_items[0];

  function copyInfo() {
    const lines = [
      `${order.order_number}`,
      `${t('customer')}: ${order.customer_name} — ${order.customer_phone}`,
      `${t('address')}: ${order.address}, ${order.commune}, ${order.wilaya_code}`,
      `${t('total')}: ${formatDZD(order.total_dzd)}`,
      '',
      `${t('sameQrNote')}`,
      `${t('style')}: ${firstItem?.qr_preset ?? ''}`,
      `${t('text')}: ${firstItem?.text_content ?? t('noText')}`,
      '',
      ...order.order_items.map((it, i) =>
        `${t('item')} ${i + 1}: ${it.product_name} — ${t('size')} ${it.size}${it.garment_color ? ` — ${t('color')} ${it.garment_color}` : ''} — ${t('qty')} ${it.quantity}`,
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const daysAgo = mode === 'atPartner' && order.sent_to_partner_at
    ? Math.floor((Date.now() - new Date(order.sent_to_partner_at).getTime()) / 86400000)
    : null;

  return (
    <div className="card">
      <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
        <div>
          <div className="font-heading text-xl text-secondary">{order.order_number}</div>
          <div className="text-sm font-semibold mt-1">{order.customer_name} · {order.customer_phone}</div>
          <div className="text-text-secondary text-xs mt-0.5">{order.address}, {order.commune}, {order.wilaya_code}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="badge text-xs bg-green-500/20 text-green-300 font-semibold">{formatDZD(order.total_dzd)}</span>
          {mode === 'atPartner' && daysAgo !== null && (
            <span className={`badge text-xs ${daysAgo >= 5 ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
              {t('sentOn')} {new Date(order.sent_to_partner_at!).toLocaleDateString(locale)} · {t('daysAgo', { days: daysAgo })}
            </span>
          )}
        </div>
      </div>

      {mode === 'toSend' && (
        <div className="mb-4">
          {imagesLoading ? (
            <span className="text-xs text-text-secondary">{t('loadingImage')}</span>
          ) : welcomePdfUrl ? (
            <a href={welcomePdfUrl} download className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-pink-500/40 text-pink-300 hover:border-pink-400 hover:bg-pink-500/10 transition">
              🪪 {t('downloadClientCard')}
            </a>
          ) : null}
        </div>
      )}

      <div className="bg-bg rounded-2xl p-4 mb-4 space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="w-24 h-24 rounded-xl bg-[repeating-conic-gradient(#2a2f3a_0%_25%,transparent_0%_50%)] bg-[length:12px_12px] border border-border flex items-center justify-center overflow-hidden shrink-0">
            {imagesLoading ? (
              <span className="text-[10px] text-text-secondary">{t('loadingImage')}</span>
            ) : images?.[0] ? (
              <img src={images[0]} alt="" className="w-full h-full object-contain" />
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-text-secondary font-semibold uppercase tracking-wide">{t('flockImageLabel')}</div>
            <div className="text-xs text-text-secondary mt-0.5">{t('sameQrNote')}</div>
            <div className="text-sm font-semibold mt-0.5">{t('style')} {firstItem?.qr_preset}</div>
            {firstItem?.text_content && <div className="text-secondary text-xs mt-0.5">&quot;{firstItem.text_content}&quot;</div>}
          </div>
          {images?.[0] && (
            <a href={images[0]} download className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-white transition shrink-0">
              {t('downloadImage')}
            </a>
          )}
        </div>
        {order.order_items.map((it) => (
          <div key={it.id} className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{it.product_name}</div>
              <div className="text-text-secondary text-xs mt-0.5">{t('size')} {it.size}{it.garment_color ? ` · ${t('color')} ${it.garment_color}` : ''} · {t('qty')} {it.quantity}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        {mode === 'toSend' && (
          <>
            <button onClick={copyInfo} className="px-4 py-2 rounded-xl border border-border text-sm text-text-secondary hover:text-white transition">
              {copied ? `✓ ${t('copied')}` : t('copyInfo')}
            </button>
            <button onClick={() => onAction(order.id)} disabled={busy} className="btn-primary !py-2 disabled:opacity-60">
              {busy ? '…' : `✓ ${t('markSent')}`}
            </button>
          </>
        )}
        {mode === 'atPartner' && (
          <button onClick={() => onAction(order.id)} disabled={busy} className="btn-primary !py-2 disabled:opacity-60">
            {busy ? '…' : `✓ ${t('markShipped')}`}
          </button>
        )}
      </div>
    </div>
  );
}

export function PartnerQueue({ toSend, atPartner }: { toSend: Order[]; atPartner: Order[] }) {
  const t = useTranslations('admin.partner');
  const router = useRouter();
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  async function markSent(id: string) {
    if (!confirm(t('confirmMarkSent'))) return;
    setBusy((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/admin/orders/${id}/send-partner`, { method: 'POST' });
      const j = await res.json();
      if (j.success) router.refresh();
      else showToast(j.error?.message ?? t('error'));
    } catch { showToast(t('networkError')); }
    finally { setBusy((p) => ({ ...p, [id]: false })); }
  }

  async function markShipped(id: string) {
    if (!confirm(t('confirmMarkShipped'))) return;
    setBusy((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/admin/orders/${id}/partner-shipped`, { method: 'POST' });
      const j = await res.json();
      if (j.success) router.refresh();
      else showToast(j.error?.message ?? t('error'));
    } catch { showToast(t('networkError')); }
    finally { setBusy((p) => ({ ...p, [id]: false })); }
  }

  async function markAllSent() {
    if (toSend.length === 0) return;
    if (!confirm(t('confirmMarkAllSent', { count: toSend.length }))) return;
    setBusy((p) => ({ ...p, ...Object.fromEntries(toSend.map((o) => [o.id, true])) }));
    try {
      await Promise.all(toSend.map((o) => fetch(`/api/admin/orders/${o.id}/send-partner`, { method: 'POST' })));
      router.refresh();
    } finally {
      setBusy({});
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">{t('toSend')} {toSend.length > 0 && `(${toSend.length})`}</h2>
          {toSend.length > 0 && (
            <button onClick={markAllSent} className="text-sm px-4 py-2 rounded-xl border border-border text-text-secondary hover:text-white transition">
              {t('markAllSent')}
            </button>
          )}
        </div>
        {toSend.length === 0 ? (
          <div className="card text-center text-text-secondary py-10">{t('toSendEmpty')}</div>
        ) : (
          <div className="flex flex-col gap-4">
            {toSend.map((o) => (
              <OrderCard key={o.id} order={o} mode="toSend" onAction={markSent} busy={!!busy[o.id]} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold text-lg mb-4">{t('atPartner')} {atPartner.length > 0 && `(${atPartner.length})`}</h2>
        {atPartner.length === 0 ? (
          <div className="card text-center text-text-secondary py-10">{t('atPartnerEmpty')}</div>
        ) : (
          <div className="flex flex-col gap-4">
            {atPartner.map((o) => (
              <OrderCard key={o.id} order={o} mode="atPartner" onAction={markShipped} busy={!!busy[o.id]} />
            ))}
          </div>
        )}
      </section>

      {toast && <div className="fixed bottom-6 end-6 bg-surface border border-border px-5 py-3 rounded-2xl text-sm z-50">{toast}</div>}
    </div>
  );
}
