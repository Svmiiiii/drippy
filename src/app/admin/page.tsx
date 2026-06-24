import { createClient } from '@/lib/supabase/server';
import { formatDZD } from '@/lib/utils';
import { OrdersTable } from './orders/OrdersTable';

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
  const pending = (orders ?? []).filter((o) => o.status === 'pending_confirmation').length;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Commandes</h1>
      <p className="text-text-secondary mb-8">{pending} en attente de confirmation</p>
      <OrdersTable orders={orders ?? []} />
    </div>
  );
}
