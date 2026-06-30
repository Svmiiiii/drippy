import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHash } from 'crypto';

// POST /api/qr/{uid}/scan — records a scan. DRP-BUS-036:
// unique scan = same QR + same device + same day.
export async function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  const { data: qr } = await admin.from('qr_codes').select('id').eq('qr_uid', uid).single();
  if (!qr) return NextResponse.json({ error: { code: 'QR_NOT_FOUND' } }, { status: 404 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const deviceHash = body.device_hash ?? createHash('sha256').update(`${ip}:${body.user_agent ?? ''}`).digest('hex');
  const ipHash = createHash('sha256').update(ip).digest('hex');
  const today = new Date().toISOString().slice(0, 10);

  // raw log — unique index quietly dedupes same device/day
  const { error: logErr } = await admin.from('qr_scan_logs').insert({
    qr_code_id: qr.id, device_hash: deviceHash, ip_hash: ipHash,
    user_agent: body.user_agent ?? null, scan_date: today,
  });
  const isUnique = !logErr; // insert succeeded => first scan for this device today

  // increment aggregates (totals always; unique only when new)
  await admin.rpc('increment_scan', { p_qr_id: qr.id, p_date: today, p_unique: isUnique })
    .then(() => {}, async () => {
      // fallback if RPC not present: upsert daily + bump qr_codes
      await admin.from('daily_qr_stats').upsert(
        { qr_code_id: qr.id, date: today, total_scans: 1, unique_scans: isUnique ? 1 : 0 },
        { onConflict: 'qr_code_id,date', ignoreDuplicates: false },
      );
    });

  return NextResponse.json({ success: true });
}
