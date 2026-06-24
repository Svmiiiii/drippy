import { createClient } from '@/lib/supabase/server';
import { getAuthProfile } from '@/lib/auth';
import { StatsChart } from './StatsChart';

export default async function StatsPage() {
  const { profile } = await getAuthProfile();
  const supabase = await createClient();
  const { data: qr } = await supabase.from('qr_codes').select('id, total_scans, unique_scans').eq('profile_id', profile!.id).single();
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const { data: todayStat } = qr ? await supabase.from('daily_qr_stats').select('total_scans, unique_scans').eq('qr_code_id', qr.id).eq('date', today).single() : { data: null };
  const { data: series } = qr ? await supabase.from('daily_qr_stats').select('date, total_scans').eq('qr_code_id', qr.id).gte('date', from).order('date') : { data: [] };

  const cards = [
    { label: "Aujourd'hui", value: todayStat?.total_scans ?? 0, sub: `${todayStat?.unique_scans ?? 0} uniques` },
    { label: 'Total scans', value: qr?.total_scans ?? 0, sub: "depuis l'activation" },
    { label: 'Scans uniques', value: qr?.unique_scans ?? 0, sub: 'appareils distincts' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Mes statistiques</h1>
      <p className="text-text-secondary mb-8">Combien de personnes ont scanné ton QR.</p>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <div className="text-xs text-text-secondary uppercase tracking-wide mb-2">{c.label}</div>
            <div className="font-heading text-4xl">{c.value}</div>
            <div className="text-xs text-text-secondary mt-1">{c.sub}</div>
          </div>
        ))}
      </div>
      <StatsChart data={(series ?? []).map((d) => ({ date: d.date, scans: d.total_scans }))} />
    </div>
  );
}
