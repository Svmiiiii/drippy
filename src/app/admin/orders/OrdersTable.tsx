'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode } from '@/components/QrCode';
import { formatDZD } from '@/lib/utils';

const LABELS: Record<string, string> = {
  pending_confirmation: 'En attente', confirmed: 'Confirmée', in_production: 'En production',
  shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée',
};

export function OrdersTable({ orders }: { orders: any[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  async function confirm(id: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/orders/${id}/confirm`, { method: 'POST' });
    const json = await res.json();
    setBusy(false);
    if (json.success) { setSel(null); setToast('Commande confirmée ! Compte + QR créés.'); router.refresh(); }
    else setToast(json.error?.message ?? 'Erreur');
    setTimeout(() => setToast(''), 3500);
  }

  async function cancel(id: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/orders/${id}/cancel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Refusée par admin' }),
    });
    const json = await res.json();
    setBusy(false);
    if (json.success) { setSel(null); setToast('Commande annulée.'); router.refresh(); }
    else setToast(json.error?.message ?? 'Erreur');
    setTimeout(() => setToast(''), 3500);
  }

  return (
    <>
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            {['Commande', 'Client', 'Wilaya', 'Total', 'Statut', ''].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs text-text-secondary uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-surface-hover hover:bg-surface-hover">
                <td className="px-4 py-3 font-heading text-secondary">{o.order_number}</td>
                <td className="px-4 py-3"><div className="font-semibold text-sm">{o.customer_name}</div><div className="text-text-secondary text-xs">{o.customer_phone}</div></td>
                <td className="px-4 py-3 text-text-secondary text-sm">{o.wilaya_code}</td>
                <td className="px-4 py-3 font-heading text-secondary">{formatDZD(o.total_dzd)}</td>
                <td className="px-4 py-3"><span className="badge bg-primary/20 text-purple-300">{LABELS[o.status] ?? o.status}</span></td>
                <td className="px-4 py-3"><button onClick={() => setSel(o)} className="text-text-secondary hover:text-white text-sm">Voir →</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={() => setSel(null)}>
          <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-5">
              <div><div className="font-heading text-2xl text-secondary">{sel.order_number}</div>
                <span className="badge bg-primary/20 text-purple-300 mt-1">{LABELS[sel.status]}</span></div>
              <button onClick={() => setSel(null)} className="text-text-secondary">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
              {[['Client', sel.customer_name], ['Téléphone', sel.customer_phone], ['Email', sel.customer_email], ['Wilaya', sel.wilaya_code], ['Commune', sel.commune], ['Adresse', sel.address]].map(([l, v]) => (
                <div key={l}><div className="text-text-secondary text-xs">{l}</div><div className="font-medium">{v}</div></div>
              ))}
            </div>
            <div className="bg-bg rounded-2xl p-4 mb-5">
              {(sel.order_items ?? []).map((it: any) => (
                <div key={it.id} className="flex items-center gap-4">
                  <QrCode preset={it.qr_preset} size={64} text={it.text_content} textPosition={it.text_position} />
                  <div><div className="font-semibold">{it.product_name}</div>
                    <div className="text-text-secondary text-sm">Taille {it.size} · Qté {it.quantity} · {it.qr_preset}</div>
                    {it.text_content && <div className="text-secondary text-xs mt-1">&quot;{it.text_content}&quot;</div>}</div>
                </div>
              ))}
            </div>
            {sel.status === 'pending_confirmation' ? (
              <div className="flex gap-3">
                <button onClick={() => confirm(sel.id)} disabled={busy} className="btn-primary flex-1 justify-center disabled:opacity-60">✓ Valider</button>
                <button onClick={() => cancel(sel.id)} disabled={busy} className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold flex-1 disabled:opacity-60">✗ Refuser</button>
              </div>
            ) : (
              <p className="text-text-secondary text-center text-sm">Commande déjà traitée — aucune action possible.</p>
            )}
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 bg-surface border border-border px-5 py-3 rounded-2xl text-sm z-50">{toast}</div>}
    </>
  );
}
