import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await params;
    const { data, error } = await supabase.from('profiles')
      .select('*, qr_codes(*, qr_profiles(*)), orders(id, order_number, status, created_at, total_price)')
      .eq('id', id).eq('role', 'customer').single();
    if (error || !data) return fail('FORBIDDEN', 'Customer not found', 404);
    return ok(data);
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
