import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { okEmpty, fail, failValidation } from '@/lib/api';
import { cancelOrderSchema } from '@/lib/validation';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await params;
    const parsed = cancelOrderSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);

    const { data: order } = await supabase.from('orders').select('status').eq('id', id).single();
    if (!order) return fail('ORDER_NOT_FOUND', undefined, 404);
    if (order.status === 'cancelled') return fail('ORDER_ALREADY_CANCELLED', undefined, 409);
    if (order.status !== 'pending_confirmation')
      return fail('ORDER_ALREADY_CONFIRMED', 'Cannot cancel a confirmed order', 409); // DRP-BUS-027

    const { error } = await supabase.from('orders').update({ status: 'cancelled', cancel_reason: parsed.data.reason }).eq('id', id);
    if (error) return fail('VALIDATION_ERROR', error.message, 500);
    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
