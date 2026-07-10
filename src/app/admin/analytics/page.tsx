import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { formatDZD } from '@/lib/utils';

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    acc[k] = acc[k] ?? [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const t = await getTranslations('admin.analytics');

  const [{ data: orders }, { data: products }, { data: customers }] = await Promise.all([
    supabase.from('orders').select('status, total_dzd, created_at, wilaya_code, order_items(product_name, quantity)'),
    supabase.from('products').select('id, name, status, price_dzd'),
    supabase.from('profiles').select('id, created_at').eq('role', 'customer'),
  ]);

  const all = orders ?? [];
  const confirmed = all.filter((o) => !['cancelled', 'pending_confirmation'].includes(o.status));
  const revenue = confirmed.reduce((s, o) => s + (o.total_dzd ?? 0), 0);

  // Revenue par jour (30 derniers jours)
  const now = new Date();
  const days: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayOrders = confirmed.filter((o) => (o.created_at ?? '').slice(0, 10) === key);
    days.push({ date: key, revenue: dayOrders.reduce((s, o) => s + (o.total_dzd ?? 0), 0), orders: dayOrders.length });
  }

  const maxRevenue = Math.max(...days.map((d) => d.revenue), 1);

  // Commandes par statut
  const byStatus = groupBy(all, (o) => o.status);
  const statuses = [
    { key: 'pending_confirmation', label: t('statusPending'), color: 'bg-yellow-500' },
    { key: 'confirmed', label: t('statusConfirmed'), color: 'bg-blue-500' },
    { key: 'in_production', label: t('statusInProduction'), color: 'bg-purple-500' },
    { key: 'shipped', label: t('statusShipped'), color: 'bg-cyan-500' },
    { key: 'delivered', label: t('statusDelivered'), color: 'bg-green-500' },
    { key: 'cancelled', label: t('statusCancelled'), color: 'bg-red-500' },
  ];

  // Top wilayas
  const byWilaya = groupBy(confirmed, (o) => o.wilaya_code ?? t('unknown'));
  const topWilayas = Object.entries(byWilaya)
    .map(([w, os]) => ({ wilaya: w, count: os.length, revenue: os.reduce((s, o) => s + (o.total_dzd ?? 0), 0) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // Top produits (approximatif par nom dans les order_items)
  const productCounts: Record<string, { count: number; revenue: number }> = {};
  for (const o of confirmed) {
    for (const item of (o.order_items as any[] ?? [])) {
      const name = item.product_name ?? t('unknownProduct');
      if (!productCounts[name]) productCounts[name] = { count: 0, revenue: 0 };
      productCounts[name].count += item.quantity ?? 1;
      productCounts[name].revenue += (o.total_dzd ?? 0);
    }
  }
  const topProducts = Object.entries(productCounts)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Clients
  const newThisMonth = (customers ?? []).filter((c) => {
    const d = new Date(c.created_at ?? '');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const kpis = [
    { label: t('revenue'), value: formatDZD(revenue), sub: `${confirmed.length} ${t('confirmedOrders')}` },
    { label: t('avgCart'), value: confirmed.length ? formatDZD(Math.round(revenue / confirmed.length)) : '—', sub: t('perOrder') },
    { label: t('cancelRate'), value: `${all.length ? Math.round((byStatus['cancelled']?.length ?? 0) / all.length * 100) : 0}%`, sub: `${byStatus['cancelled']?.length ?? 0} ${t('cancelled')}` },
    { label: t('newCustomers'), value: newThisMonth, sub: t('thisMonth') },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">{t('title')}</h1>
      <p className="text-text-secondary mb-8">{t('subtitle')}</p>

      {/* KPIs synthèse */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="card">
            <div className="text-xs text-text-secondary uppercase tracking-wide mb-1">{k.label}</div>
            <div className="font-heading text-3xl text-secondary mb-1">{k.value}</div>
            <div className="text-xs text-text-secondary">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Graphique revenus 30j */}
      <div className="card mb-6">
        <h2 className="font-bold mb-4">{t('revenue30d')}</h2>
        <div className="flex items-end gap-1 h-32">
          {days.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full bg-primary/40 hover:bg-primary rounded-t transition-all"
                style={{ height: `${Math.max(2, Math.round((d.revenue / maxRevenue) * 100))}%` }}
              />
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-surface border border-border text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {d.date.slice(5)}: {formatDZD(d.revenue)} ({d.orders} {t('orders')})
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-text-secondary mt-2">
          <span>{days[0]?.date.slice(5)}</span>
          <span>{days[14]?.date.slice(5)}</span>
          <span>{days[29]?.date.slice(5)}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Statuts */}
        <div className="card">
          <h2 className="font-bold mb-4">{t('statusBreakdown')}</h2>
          <div className="space-y-2">
            {statuses.map((s) => {
              const count = byStatus[s.key]?.length ?? 0;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-sm text-text-secondary flex-1">{s.label}</span>
                  <span className="font-semibold text-sm">{count}</span>
                  <span className="text-xs text-text-secondary w-8 text-end">{all.length ? Math.round(count / all.length * 100) : 0}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top produits */}
        <div className="card">
          <h2 className="font-bold mb-4">{t('topProducts')}</h2>
          {topProducts.length === 0 ? (
            <p className="text-text-secondary text-sm">{t('noData')}</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center text-xs font-bold text-text-secondary">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-text-secondary">{p.count} {t('sold')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top wilayas */}
        <div className="card">
          <h2 className="font-bold mb-4">{t('topWilayas')}</h2>
          {topWilayas.length === 0 ? (
            <p className="text-text-secondary text-sm">{t('noData')}</p>
          ) : (
            <div className="space-y-2">
              {topWilayas.map((w) => (
                <div key={w.wilaya} className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{w.wilaya}</span>
                  <div className="text-end">
                    <div className="text-sm font-semibold">{w.count} {t('orders')}</div>
                    <div className="text-xs text-text-secondary">{formatDZD(w.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
