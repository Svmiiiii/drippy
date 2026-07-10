import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { OrdersTable } from './OrdersTable';

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*), order_call_logs(id, result, notes, created_at, admin:profiles(first_name))')
    .order('created_at', { ascending: false });
  const t = await getTranslations('admin.orders');

  const pending = (orders ?? []).filter((o) => o.status === 'pending_confirmation').length;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">{t('title')}</h1>
      <p className="text-text-secondary mb-8">{pending} {t('pendingConfirmation')}</p>
      <OrdersTable orders={orders ?? []} />
    </div>
  );
}
