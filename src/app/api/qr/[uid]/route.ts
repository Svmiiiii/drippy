import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// GET /api/qr/{uid} — called when a QR is scanned. Returns redirect or message.
export async function GET(_req: Request, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const admin = createAdminClient();

  const { data: qr } = await admin.from('qr_codes')
    .select('id, qr_status, qr_profiles(target_type, target_value)')
    .eq('qr_uid', uid).single();

  if (!qr) return NextResponse.json({ error: { code: 'QR_NOT_FOUND' } }, { status: 404 });
  if (qr.qr_status === 'disabled') return NextResponse.json({ error: { code: 'QR_DISABLED' } }, { status: 403 });

  const dest = Array.isArray(qr.qr_profiles) ? qr.qr_profiles[0] : qr.qr_profiles;
  if (!dest) return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503 });

  if (dest.target_type === 'link') {
    return NextResponse.json({ action: 'redirect', url: dest.target_value });
  }
  return NextResponse.json({ action: 'message', message: dest.target_value });
}
