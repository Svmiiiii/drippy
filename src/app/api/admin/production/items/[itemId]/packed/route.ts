import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { okEmpty, fail } from '@/lib/api';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { supabase } = await requireAdmin();
    const { itemId } = await params;
    const { data: item } = await supabase.from('order_items').select('order_id').eq('id', itemId).single();
    if (!item) return fail('ORDER_NOT_FOUND', 'Item not found', 404);
    const { error } = await supabase.from('orders').update({ status: 'packed' }).eq('id', item.order_id);
    if (error) return fail('VALIDATION_ERROR', error.message, 422);
    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
