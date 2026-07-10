import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { okEmpty, fail, failValidation } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

// Call outcomes only — actual order decisions (confirm/cancel) go through
// their own dedicated endpoints (with real side effects: account/QR/
// production creation). Logging 'confirmed' here used to just insert a
// label with no effect on the order, which was misleading.
const callLogSchema = z.object({
  result: z.enum(['not_answered', 'reached', 'call_later', 'wrong_number']),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile, supabase } = await requireAdmin();
    const { id } = await params;

    const parsed = callLogSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);

    const { data: order } = await supabase.from('orders').select('id').eq('id', id).single();
    if (!order) return fail('ORDER_NOT_FOUND', undefined, 404);

    const adminClient = createAdminClient();
    const { error } = await adminClient.from('order_call_logs').insert({
      order_id: id,
      admin_id: profile!.id,
      result: parsed.data.result,
      notes: parsed.data.notes ?? null,
    });
    if (error) return fail('VALIDATION_ERROR', error.message, 422);
    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
