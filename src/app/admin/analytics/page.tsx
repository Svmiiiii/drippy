import { createClient } from '@/lib/supabase/server';
import { formatDZD } from '@/lib/utils';

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase.from('orders').select('status, total_dzd');
  const list = orders ?? [];
  const revenue = list.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total_dzd, 0);

  const cards = [
    { label: 'Commandes totales', value: list.length },
    { label: 'En attente', value: list.filter((o) => o.status === 'pending_confirmation').length },
    { label: 'Livrées', value: list.filter((o) => o.status === 'delivered').length },
    { label: 'Revenus estimés', value: formatDZD(revenue) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-8">Analytics globaux</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <div className="text-xs text-text-secondary uppercase tracking-wide mb-2">{c.label}</div>
            <div className="font-heading text-3xl">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
