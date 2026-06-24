import { NextRequest } from 'next/server';
import { requireUser, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const { profile, supabase } = await requireUser();
    const period = req.nextUrl.searchParams.get('period') ?? '7d';
    const days = period === '90d' ? 90 : period === '30d' ? 30 : 7;

    const { data: qr } = await supabase.from('qr_codes').select('id').eq('profile_id', profile!.id).single();
    if (!qr) return fail('QR_NOT_FOUND', undefined, 404);

    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase.from('daily_qr_stats')
      .select('date, total_scans').eq('qr_code_id', qr.id).gte('date', from).order('date');

    return ok((data ?? []).map((d) => ({ date: d.date, scans: d.total_scans })));
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, 401);
    throw e;
  }
}
