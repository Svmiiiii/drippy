import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const { data } = await supabase.from('profiles')
      .select('id, drippy_id, first_name, last_name, email, phone, account_status, created_at, qr_codes(qr_status)')
      .eq('role', 'customer').order('created_at', { ascending: false });
    return ok({ items: data ?? [] });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
