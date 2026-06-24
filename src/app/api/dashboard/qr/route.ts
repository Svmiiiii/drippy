import { requireUser, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';

export async function GET() {
  try {
    const { profile, supabase } = await requireUser();
    const { data: qr } = await supabase.from('qr_codes').select('id, qr_uid, qr_status')
      .eq('profile_id', profile!.id).single();
    if (!qr) return fail('QR_NOT_FOUND', undefined, 404);
    if (qr.qr_status === 'disabled') return fail('QR_DISABLED', undefined, 403);

    const { data: dest } = await supabase.from('qr_profiles')
      .select('target_type, target_value').eq('qr_code_id', qr.id).single();

    return ok({ qr_uid: qr.qr_uid, target_type: dest?.target_type, target_value: dest?.target_value });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
