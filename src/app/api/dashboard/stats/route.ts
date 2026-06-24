import { requireUser, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';

export async function GET() {
  try {
    const { profile, supabase } = await requireUser();
    const { data: qr } = await supabase.from('qr_codes')
      .select('id, total_scans, unique_scans').eq('profile_id', profile!.id).single();
    if (!qr) return fail('QR_NOT_FOUND', undefined, 404);

    const today = new Date().toISOString().slice(0, 10);
    const { data: todayStat } = await supabase.from('daily_qr_stats')
      .select('total_scans, unique_scans').eq('qr_code_id', qr.id).eq('date', today).single();

    return ok({
      today: todayStat?.total_scans ?? 0,
      unique_today: todayStat?.unique_scans ?? 0,
      total: qr.total_scans,
      unique_total: qr.unique_scans,
    });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, 401);
    throw e;
  }
}
