import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { formatDZD } from '@/lib/utils';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const t = await getTranslations('admin.dash');

  const STATUS_LABEL: Record<string, string> = {
    pending_confirmation: t('statusPending'),
    confirmed: t('statusConfirmedFull'),
    in_production: t('statusInProductionFull'),
    printed: t('statusPrinted'),
    flocked: t('statusFlocked'),
    packed: t('statusPacked'),
    shipped: t('statusShipped'),
    delivered: t('statusDelivered'),
    cancelled: t('statusCancelled'),
  };

  const [
    { data: orders },
    { data: customers },
    { data: products },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('orders').select('status, total_dzd, created_at'),
    supabase.from('profiles').select('id, created_at, account_status').eq('role', 'customer'),
    supabase.from('products').select('id, name, status, price_dzd'),
    supabase.from('orders').select('id, order_number, customer_name, status, total_dzd, created_at').order('created_at', { ascending: false }).limit(8),
  ]);

  const allOrders = orders ?? [];
  const allCustomers = customers ?? [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const revenue = allOrders.filter((o) => !['cancelled', 'pending_confirmation'].includes(o.status)).reduce((s, o) => s + (o.total_dzd ?? 0), 0);
  const revenueMonth = allOrders.filter((o) => !['cancelled', 'pending_confirmation'].includes(o.status) && o.created_at >= startOfMonth).reduce((s, o) => s + (o.total_dzd ?? 0), 0);

  const pending = allOrders.filter((o) => o.status === 'pending_confirmation').length;
  const inProgress = allOrders.filter((o) => ['confirmed', 'in_production', 'printed', 'flocked', 'packed'].includes(o.status)).length;
  const shipped = allOrders.filter((o) => o.status === 'shipped').length;
  const delivered = allOrders.filter((o) => o.status === 'delivered').length;
  const cancelled = allOrders.filter((o) => o.status === 'cancelled').length;

  const newCustomersWeek = allCustomers.filter((c) => c.created_at >= startOfWeek).length;
  const activeCustomers = allCustomers.filter((c) => c.account_status === 'active').length;

  const lowStock = (products ?? []).filter((p) => p.status === 'out_of_stock');
  const available = (products ?? []).filter((p) => p.status === 'available');

  const kpis = [
    { label: t('totalRevenue'), value: formatDZD(revenue), sub: `${formatDZD(revenueMonth)} ${t('thisMonth')}`, color: 'text-purple-300', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: t('orders'), value: allOrders.length, sub: `${pending} ${t('pending')}`, color: 'text-pink-300', bg: 'bg-pink-500/10 border-pink-500/20' },
    { label: t('customers'), value: allCustomers.length, sub: `+${newCustomersWeek} ${t('newThisWeek')}`, color: 'text-cyan-300', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    { label: t('activeProducts'), value: available.length, sub: `${lowStock.length} ${t('outOfStock')}`, color: 'text-green-300', bg: 'bg-green-500/10 border-green-500/20' },
  ];

  const pipeline = [
    { label: t('statusPending'), count: pending, color: 'bg-yellow-500', href: '/admin/orders' },
    { label: t('statusInProgress'), count: inProgress, color: 'bg-blue-500', href: '/admin/production' },
    { label: t('statusShipped'), count: shipped, color: 'bg-purple-500', href: '/admin/orders' },
    { label: t('statusDelivered'), count: delivered, color: 'bg-green-500', href: '/admin/orders' },
    { label: t('statusCancelled'), count: cancelled, color: 'bg-red-500', href: '/admin/orders' },
  ];

  const total = allOrders.length || 1;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">{t('title')}</h1>
      <p className="text-text-secondary mb-8">{t('subtitle')}</p>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className={`card border ${k.bg}`}>
            <div className="text-xs text-text-secondary uppercase tracking-wide mb-1">{k.label}</div>
            <div className={`font-heading text-3xl mb-1 ${k.color}`}>{k.value}</div>
            <div className="text-xs text-text-secondary">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Pipeline */}
        <div className="card lg:col-span-1">
          <h2 className="font-bold mb-4">{t('pipeline')}</h2>
          <div className="space-y-3">
            {pipeline.map((p) => (
              <Link key={p.label} href={p.href} className="flex items-center gap-3 hover:opacity-80 transition">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">{p.label}</span>
                    <span className="font-semibold">{p.count}</span>
                  </div>
                  <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <div className={`h-full ${p.color} rounded-full transition-all`} style={{ width: `${Math.round((p.count / total) * 100)}%` }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Commandes récentes */}
        <div className="card lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">{t('recentOrders')}</h2>
            <Link href="/admin/orders" className="text-xs text-primary hover:underline">{t('viewAll')} →</Link>
          </div>
          <div className="space-y-2">
            {(recentOrders ?? []).map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="font-semibold text-sm">{o.order_number}</div>
                  <div className="text-text-secondary text-xs">{o.customer_name}</div>
                </div>
                <div className="text-end">
                  <div className="font-heading text-sm text-secondary">{formatDZD(o.total_dzd)}</div>
                  <span className="text-xs text-text-secondary">{STATUS_LABEL[o.status] ?? o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alertes stock */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">{t('stockAlerts')}</h2>
            <Link href="/admin/products" className="text-xs text-primary hover:underline">{t('manage')} →</Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-text-secondary text-sm">{t('allInStock')}</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map((p) => (
                <div key={p.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <span className="text-sm">{p.name}</span>
                  <span className="badge bg-red-500/20 text-red-300 text-xs">{t('outOfStockBadge')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clients récents */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">{t('customersCard')}</h2>
            <Link href="/admin/customers" className="text-xs text-primary hover:underline">{t('viewAll')} →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface rounded-xl p-4 text-center">
              <div className="font-heading text-3xl text-purple-300">{allCustomers.length}</div>
              <div className="text-xs text-text-secondary mt-1">{t('totalCustomers')}</div>
            </div>
            <div className="bg-surface rounded-xl p-4 text-center">
              <div className="font-heading text-3xl text-cyan-300">{activeCustomers}</div>
              <div className="text-xs text-text-secondary mt-1">{t('activeAccounts')}</div>
            </div>
            <div className="bg-surface rounded-xl p-4 text-center">
              <div className="font-heading text-3xl text-green-300">{newCustomersWeek}</div>
              <div className="text-xs text-text-secondary mt-1">{t('newLast7d')}</div>
            </div>
            <div className="bg-surface rounded-xl p-4 text-center">
              <div className="font-heading text-3xl text-pink-300">{allCustomers.length - activeCustomers}</div>
              <div className="text-xs text-text-secondary mt-1">{t('disabled')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
