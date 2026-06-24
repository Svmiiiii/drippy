import { QrManager } from './QrManager';
import { createClient } from '@/lib/supabase/server';
import { getAuthProfile } from '@/lib/auth';

export default async function DashboardQrPage() {
  const { profile } = await getAuthProfile();
  const supabase = await createClient();
  const { data: qr } = await supabase.from('qr_codes').select('id, qr_uid, qr_status').eq('profile_id', profile!.id).single();
  const { data: dest } = qr ? await supabase.from('qr_profiles').select('target_type, target_value').eq('qr_code_id', qr.id).single() : { data: null };
  const { data: history } = qr ? await supabase.from('qr_revisions').select('*').eq('qr_code_id', qr.id).order('created_at', { ascending: false }).limit(5) : { data: [] };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Mon QR</h1>
      <p className="text-text-secondary mb-8">1 QR · toute la vie. Modifie la destination quand tu veux.</p>
      <QrManager qrUid={qr?.qr_uid ?? 'DRP-XXXXXX'} initialDest={dest} history={history ?? []} />
    </div>
  );
}
