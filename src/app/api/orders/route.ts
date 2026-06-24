import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, fail, failValidation } from '@/lib/api';
import { createOrderSchema } from '@/lib/validation';
import { nextOrderNumber } from '@/lib/orders';

// DRP-WF-VIS-007 — creates an order in pending_confirmation.
// No account, no QR, no production until an admin validates (DRP-WF-VIS-008).
export async function POST(req: NextRequest) {
  const parsed = createOrderSchema.safeParse(await req.json());
  if (!parsed.success) return failValidation(parsed.error);
  const body = parsed.data;

  const admin = createAdminClient();

  // price + stock check
  const ids = body.items.map((i) => i.product_id);
  const { data: products } = await admin.from('products').select('id, price_dzd, status, name').in('id', ids);
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  let total = 0;
  for (const item of body.items) {
    const p = byId.get(item.product_id);
    if (!p) return fail('PRODUCT_NOT_FOUND', undefined, 404);
    if (p.status === 'out_of_stock') return fail('PRODUCT_OUT_OF_STOCK', `${p.name} is out of stock`, 409);
    total += p.price_dzd * item.quantity;
  }

  const orderNumber = await nextOrderNumber();
  const { data: order, error } = await admin.from('orders').insert({
    order_number: orderNumber,
    customer_name: body.customer_name,
    customer_phone: body.customer_phone,
    customer_email: body.customer_email,
    wilaya_code: body.wilaya_code,
    commune: body.commune,
    address: body.address,
    total_dzd: total,
    status: 'pending_confirmation',
  }).select().single();
  if (error || !order) return fail('VALIDATION_ERROR', error?.message, 500);

  const items = body.items.map((i) => {
    const p = byId.get(i.product_id)!;
    return {
      order_id: order.id, product_id: i.product_id, variant_id: i.variant_id ?? null,
      product_name: p.name, size: 'M', quantity: i.quantity, unit_price_dzd: p.price_dzd,
      qr_preset: i.qr_style.preset, qr_color: i.qr_style.color ?? null,
      text_enabled: i.text?.enabled ?? false,
      text_content: i.text?.content ?? null,
      text_position: i.text?.position ?? 'none',
      text_font: i.text?.font ?? null, text_color: i.text?.color ?? null, text_size: i.text?.size ?? null,
    };
  });
  await admin.from('order_items').insert(items);

  // TODO: send "order received" email via Resend + add to admin queue.
  return ok({ order_id: order.id, order_number: orderNumber, status: 'pending_confirmation' });
}
