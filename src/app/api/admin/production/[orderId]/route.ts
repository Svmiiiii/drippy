import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { supabase } = await requireAdmin();
    const { orderId } = await params;
    const { data, error } = await supabase.from('orders')
      .select('*, order_items(*), productions(*, production_items(*))')
      .eq('id', orderId).single();
    if (error || !data) return fail('ORDER_NOT_FOUND', undefined, 404);
    return ok(data);
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
