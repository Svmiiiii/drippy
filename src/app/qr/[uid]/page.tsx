import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

// Public page hit by scanning a physical QR. Resolves destination,
// redirects for links or renders a styled message page. Always "Powered by Drippy".
export default async function QrScanPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const admin = createAdminClient();

  const { data: qr } = await admin.from('qr_codes')
    .select('id, qr_status, profile_id, qr_profiles(target_type, target_value)')
    .eq('qr_uid', uid).single();

  if (!qr) return <Fallback title="QR introuvable" message="Ce QR code n'existe pas." />;
  if (qr.qr_status === 'disabled') return <Fallback title="QR désactivé" message="Ce QR code est actuellement désactivé." />;

  // record scan (fire and forget) — only for active QR codes
  await admin.from('qr_scan_logs').insert({ qr_code_id: qr.id, scan_date: new Date().toISOString().slice(0, 10) }).then(() => {}, () => {});

  const dest = Array.isArray(qr.qr_profiles) ? qr.qr_profiles[0] : qr.qr_profiles;
  if (dest?.target_type === 'link') redirect(dest.target_value);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="font-heading text-xl text-text-secondary tracking-widest mb-2">{uid}</div>
        <div className="card py-12">
          <p className="text-2xl leading-relaxed">{dest?.target_value ?? 'Bienvenue 👋'}</p>
        </div>
        <div className="mt-10 text-text-secondary text-xs tracking-widest">POWERED BY DRIPPY</div>
      </div>
    </div>
  );
}

function Fallback({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="card py-12">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">{title}</h1>
          <p className="text-text-secondary">{message}</p>
        </div>
        <div className="mt-10 text-text-secondary text-xs tracking-widest">POWERED BY DRIPPY</div>
      </div>
    </div>
  );
}
