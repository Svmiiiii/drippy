import { requireUser, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';

export async function GET() {
  try {
    const { profile, supabase } = await requireUser();
    const { data } = await supabase.from('orders')
      .select('*, order_items(*)').eq('profile_id', profile!.id)
      .order('created_at', { ascending: false });
    return ok({ items: data ?? [] });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, 401);
    throw e;
  }
}
