import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthProfile } from '@/lib/auth';
import { QrCode } from '@/components/QrCode';
import { formatDZD } from '@/lib/utils';
import { getUserLocale } from '@/lib/i18n';

function OrderTimeline({ status, steps, t }: { status: string; steps: { key: string; label: string; icon: string }[]; t: (k: string) => string }) {
  if (status === 'cancelled') {
    return (
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <span>✗</span> {t('orderCancelled')}
        </div>
      </div>
    );
  }

  const statusIndex: Record<string, number> = Object.fromEntries(steps.map((s, i) => [s.key, i]));
  const currentIdx = statusIndex[status] ?? 0;

  return (
    <div className="mt-4 pt-4 border-t border-border overflow-x-auto">
      <div className="flex items-center min-w-max">
        {steps.map((step, i) => {
          const done = i <= currentIdx;
          const current = i === currentIdx;
          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all ${current ? 'bg-primary text-white ring-2 ring-primary/40 scale-110' : done ? 'bg-green-500/20 text-green-400' : 'bg-surface text-text-secondary'}`}>
                  {done ? (current ? step.icon : '✓') : step.icon}
                </div>
                <div className={`text-[10px] mt-1 whitespace-nowrap ${current ? 'text-white font-semibold' : done ? 'text-green-400' : 'text-text-secondary'}`}>
                  {step.label}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 rounded-full ${i < currentIdx ? 'bg-green-500' : 'bg-border'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function OrdersPage() {
  const { profile } = await getAuthProfile();
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from('orders').select('*, order_items(*)')
    .eq('profile_id', profile!.id)
    .order('created_at', { ascending: false });
  const t = await getTranslations('dashboard');
  const locale = await getUserLocale();

  const STEPS = [
    { key: 'pending_confirmation', label: t('stepReceived'), icon: '📥' },
    { key: 'confirmed', label: t('stepConfirmed'), icon: '✅' },
    { key: 'in_production', label: t('stepInProduction'), icon: '⚙️' },
    { key: 'printed', label: t('stepPrinted'), icon: '🖨️' },
    { key: 'flocked', label: t('stepFlocked'), icon: '✨' },
    { key: 'packed', label: t('stepPacked'), icon: '📦' },
    { key: 'shipped', label: t('stepShipped'), icon: '🚚' },
    { key: 'delivered', label: t('stepDelivered'), icon: '🎉' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">{t('myOrders')}</h1>
      <p className="text-text-secondary mb-8">{t('ordersSubtitle')}</p>

      {(orders ?? []).length === 0 && (
        <div className="card text-center text-text-secondary py-16">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-semibold mb-2">{t('noOrdersYet')}</p>
          <a href="/shop" className="text-primary text-sm hover:underline">{t('discoverCollection')} →</a>
        </div>
      )}

      {(orders ?? []).map((o) => (
        <div key={o.id} className="card mb-4">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-heading text-xl text-secondary">{o.order_number}</span>
                {o.status !== 'cancelled' && (
                  <span className="badge bg-primary/20 text-purple-300">
                    {STEPS.find((s) => s.key === o.status)?.label ?? o.status}
                  </span>
                )}
                {o.status === 'cancelled' && (
                  <span className="badge bg-red-500/20 text-red-300">{t('cancelled')}</span>
                )}
              </div>
              <div className="text-text-secondary text-sm">
                {t('orderedOn')} {new Date(o.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="text-text-secondary text-xs mt-0.5">{o.wilaya_code} · {o.commune}</div>
            </div>
            <div className="text-end">
              <div className="font-heading text-2xl text-secondary">{formatDZD(o.total_dzd)}</div>
              <div className="text-text-secondary text-xs">{t('codPayment')}</div>
            </div>
          </div>

          {/* Timeline */}
          <OrderTimeline status={o.status} steps={STEPS} t={t} />

          {/* Articles */}
          {(o.order_items ?? []).map((it: any) => (
            <div key={it.id} className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
              <QrCode preset={it.qr_preset} size={56} text={it.text_content} textPosition={it.text_position} />
              <div>
                <div className="font-semibold text-sm">{it.product_name}</div>
                <div className="text-text-secondary text-xs mt-0.5">{t('size')} {it.size} · {t('qty')} {it.quantity} · {t('style')} {it.qr_preset}</div>
                {it.text_content && <div className="text-secondary text-xs mt-0.5">&quot;{it.text_content}&quot;</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
