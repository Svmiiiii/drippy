import { NextRequest } from 'next/server';
import { requireUser, AuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, fail, failValidation } from '@/lib/api';
import { createOrderSchema } from '@/lib/validation';
import { nextOrderNumber } from '@/lib/orders';

// Same payload as POST /api/orders, but attaches to the existing profile,
// so confirmation reuses the existing QR (DRP-BUS-005, DRP-BUS-040).
export async function POST(req: NextRequest) {
  try {
    const { profile } = await requireUser();
    const parsed = createOrderSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);
    const body = parsed.data;

    const admin = createAdminClient();
    const ids = body.items.map((i) => i.product_id);
    const { data: products } = await admin.from('products').select('id, price_dzd, status, name').in('id', ids);
    const byId = new Map((products ?? []).map((p) => [p.id, p]));
    let total = 0;
    for (const item of body.items) {
      const p = byId.get(item.product_id);
      if (!p) return fail('PRODUCT_NOT_FOUND', undefined, 404);
      if (p.status === 'out_of_stock') return fail('PRODUCT_OUT_OF_STOCK', undefined, 409);
      total += p.price_dzd * item.quantity;
    }

    const orderNumber = await nextOrderNumber();
    const { data: order, error: orderError } = await admin.from('orders').insert({
      order_number: orderNumber, profile_id: profile!.id,
      customer_name: body.customer_name, customer_phone: body.customer_phone,
      customer_email: body.customer_email, wilaya_code: body.wilaya_code,
      commune: body.commune, address: body.address, total_dzd: total,
      status: 'pending_confirmation',
    }).select().single();
    if (orderError || !order) return fail('VALIDATION_ERROR', orderError?.message, 500);

    const { error: itemsError } = await admin.from('order_items').insert(body.items.map((i) => {
      const p = byId.get(i.product_id)!;
      return {
        order_id: order.id, product_id: i.product_id, product_name: p.name, size: 'M',
        quantity: i.quantity, unit_price_dzd: p.price_dzd, qr_preset: i.qr_style.preset,
        text_enabled: i.text?.enabled ?? false, text_content: i.text?.content ?? null,
        text_position: i.text?.position ?? 'none',
      };
    }));
    if (itemsError) return fail('VALIDATION_ERROR', itemsError.message, 500);

    return ok({ order_id: order.id, order_number: orderNumber, status: 'pending_confirmation' });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, 401);
    throw e;
  }
}
