import { createClient } from '@/lib/supabase/server';

export default async function AdminProductionPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase.from('orders').select('*').eq('status', 'confirmed').order('confirmed_at', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-8">Production</h1>
      {(orders ?? []).length === 0 && (
        <div className="card text-center text-text-secondary py-16">
          <div className="text-5xl mb-4">⚙</div>Aucune commande confirmée en production.
        </div>
      )}
      {(orders ?? []).map((o) => (
        <div key={o.id} className="card mb-4">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div><div className="font-heading text-xl text-secondary mb-1">{o.order_number}</div>
              <div className="text-text-secondary text-sm">{o.customer_name} · {o.wilaya_code}</div></div>
            <div className="flex gap-2 flex-wrap">
              {['PNG', 'SVG', 'PDF', 'ZIP'].map((f) => (
                <button key={f} className="border border-border rounded-[10px] px-3 py-2 text-sm text-text-secondary hover:text-white hover:border-primary transition">⬇ {f}</button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
