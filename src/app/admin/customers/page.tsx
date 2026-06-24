import { createClient } from '@/lib/supabase/server';

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase.from('profiles')
    .select('id, drippy_id, first_name, last_name, email, account_status, qr_codes(qr_status)')
    .eq('role', 'customer').order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-8">Clients</h1>
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            {['ID Drippy', 'Client', 'Email', 'Compte', 'QR'].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs text-text-secondary uppercase tracking-wide">{h}</th>))}
          </tr></thead>
          <tbody>
            {(customers ?? []).map((c: any) => (
              <tr key={c.id} className="border-b border-surface-hover hover:bg-surface-hover">
                <td className="px-4 py-3 font-heading text-primary">{c.drippy_id}</td>
                <td className="px-4 py-3 font-semibold text-sm">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-text-secondary text-sm">{c.email}</td>
                <td className="px-4 py-3"><span className={`badge ${c.account_status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{c.account_status}</span></td>
                <td className="px-4 py-3"><span className={`badge ${c.qr_codes?.[0]?.qr_status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>{c.qr_codes?.[0]?.qr_status ?? '—'}</span></td>
              </tr>
            ))}
            {(customers ?? []).length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-text-secondary">Aucun client. Confirme une commande pour créer le premier compte.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
