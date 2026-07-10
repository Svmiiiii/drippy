import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail, failValidation } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { recalcOrderTotal } from '@/lib/orders';
import { z } from 'zod';

const updateItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    size: z.string().min(1),
    quantity: z.number().int().min(1).max(50),
    garment_color: z.string().nullable(),
    qr_preset: z.string().min(1),
    text_content: z.string().max(80).nullable(),
    text_position: z.enum(['above', 'below', 'none']),
    text_font: z.string().nullable(),
    text_color: z.string().nullable(),
  })).min(1),
  removed_item_ids: z.array(z.string().uuid()).optional(),
});

// Order content (items, sizes, quantities) is only ever editable while the
// order is still 'pending_confirmation' — once admin validates, confirm/
// route.ts freezes a production snapshot (DB-003) from whatever the items
// were at that moment, so edits after that point would silently desync.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id: orderId } = await params;
    const parsed = updateItemsSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);

    const admin = createAdminClient();

    const { data: order } = await admin.from('orders').select('status').eq('id', orderId).single();
    if (!order) return fail('ORDER_NOT_FOUND', undefined, 404);
    if (order.status !== 'pending_confirmation') {
      return fail('VALIDATION_ERROR', `Cannot edit items once order is ${order.status}`, 422);
    }

    const { data: existingItems } = await admin.from('order_items').select('id').eq('order_id', orderId);
    const existingIds = new Set((existingItems ?? []).map((i) => i.id));
    const removedIds = parsed.data.removed_item_ids ?? [];

    for (const item of parsed.data.items) {
      if (!existingIds.has(item.id)) return fail('VALIDATION_ERROR', `Item ${item.id} does not belong to this order`, 422);
    }
    for (const id of removedIds) {
      if (!existingIds.has(id)) return fail('VALIDATION_ERROR', `Item ${id} does not belong to this order`, 422);
    }
    const remainingCount = existingIds.size - removedIds.length;
    if (remainingCount < 1) return fail('VALIDATION_ERROR', 'An order must keep at least one item', 422);

    for (const item of parsed.data.items) {
      const hasText = !!item.text_content;
      const { error } = await admin.from('order_items').update({
        size: item.size,
        quantity: item.quantity,
        garment_color: item.garment_color || null,
        qr_preset: item.qr_preset,
        text_content: hasText ? item.text_content : null,
        text_enabled: hasText,
        text_position: hasText ? item.text_position : 'none',
        text_font: hasText ? item.text_font : null,
        text_color: hasText ? item.text_color : null,
      }).eq('id', item.id);
      if (error) return fail('VALIDATION_ERROR', error.message, 500);
    }
    if (removedIds.length > 0) {
      const { error } = await admin.from('order_items').delete().in('id', removedIds);
      if (error) return fail('VALIDATION_ERROR', error.message, 500);
    }

    await recalcOrderTotal(admin, orderId);

    return ok({ id: orderId });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
