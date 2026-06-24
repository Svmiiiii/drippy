import { createClient } from '@/lib/supabase/server';
import { formatDZD } from '@/lib/utils';

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase.from('products').select('*, product_variants(size)').order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-extrabold">Produits</h1>
        <button className="btn-primary">+ Nouveau produit</button>
      </div>
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            {['Produit', 'Prix', 'Stock'].map((h) => (<th key={h} className="text-left px-4 py-3 text-xs text-text-secondary uppercase tracking-wide">{h}</th>))}
          </tr></thead>
          <tbody>
            {(products ?? []).map((p: any) => (
              <tr key={p.id} className="border-b border-surface-hover hover:bg-surface-hover">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="text-2xl">👕</span>
                  <div><div className="font-semibold text-sm">{p.name}</div><div className="text-text-secondary text-xs">{[...new Set((p.product_variants ?? []).map((v: any) => v.size))].join(', ')}</div></div></div></td>
                <td className="px-4 py-3 font-heading text-secondary">{formatDZD(p.price_dzd)}</td>
                <td className="px-4 py-3"><span className={`badge ${p.status === 'available' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{p.status === 'available' ? 'Disponible' : 'Rupture'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
