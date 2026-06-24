import { createClient } from '@/lib/supabase/server';
import { getAuthProfile } from '@/lib/auth';
import { QrCode } from '@/components/QrCode';
import { formatDZD } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  pending_confirmation: 'En attente', confirmed: 'Confirmée', in_production: 'En production',
  shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée',
};

export default async function OrdersPage() {
  const { profile } = await getAuthProfile();
  const supabase = await createClient();
  const { data: orders } = await supabase.from('orders').select('*, order_items(*)').eq('profile_id', profile!.id).order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Mes commandes</h1>
      <p className="text-text-secondary mb-8">Historique de toutes tes commandes Drippy.</p>
      {(orders ?? []).length === 0 && <div className="card text-center text-text-secondary py-12">Aucune commande pour le moment.</div>}
      {(orders ?? []).map((o) => (
        <div key={o.id} className="card mb-4">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-heading text-xl text-secondary">{o.order_number}</span>
                <span className="badge bg-primary/20 text-purple-300">{STATUS_LABELS[o.status] ?? o.status}</span>
              </div>
              <div className="text-text-secondary text-sm">{new Date(o.created_at).toLocaleDateString('fr-FR')}</div>
            </div>
            <div className="text-right">
              <div className="font-heading text-2xl text-secondary">{formatDZD(o.total_dzd)}</div>
              <div className="text-text-secondary text-sm">Paiement à la livraison</div>
            </div>
          </div>
          {(o.order_items ?? []).map((it: any) => (
            <div key={it.id} className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
              <QrCode preset={it.qr_preset} size={56} text={it.text_content} textPosition={it.text_position} />
              <div>
                <div className="font-semibold">{it.product_name}</div>
                <div className="text-text-secondary text-sm">Taille {it.size} · Qté {it.quantity} · {it.qr_preset}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
