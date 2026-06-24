import { requireUser, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';

export async function GET() {
  try {
    const { profile, supabase } = await requireUser();
    const { data: qr } = await supabase.from('qr_codes').select('id').eq('profile_id', profile!.id).single();
    if (!qr) return fail('QR_NOT_FOUND', undefined, 404);
    const { data } = await supabase.from('qr_revisions').select('*')
      .eq('qr_code_id', qr.id).order('created_at', { ascending: false });
    return ok(data ?? []);
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, 401);
    throw e;
  }
}
