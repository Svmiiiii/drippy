import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, fail, failValidation } from '@/lib/api';
import { createOrderSchema } from '@/lib/validation';
import { nextOrderNumber } from '@/lib/orders';
import { getShippingFee } from '@/lib/design';
import { checkOrderRateLimit, getRequestIp } from '@/lib/rateLimit';
import { sendOrderReceivedEmail } from '@/lib/email';
import { getUserLocale } from '@/lib/i18n';

// DRP-WF-VIS-007 — creates an order in pending_confirmation.
// No account, no QR, no production until an admin validates (DRP-WF-VIS-008).
export async function POST(req: NextRequest) {
  const parsed = createOrderSchema.safeParse(await req.json());
  if (!parsed.success) return failValidation(parsed.error);
  const body = parsed.data;

  const admin = createAdminClient();

  const allowed = await checkOrderRateLimit(admin, getRequestIp(req));
  if (!allowed) return fail('RATE_LIMITED', undefined, 429);

  // price + stock check
  const ids = body.items.map((i) => i.product_id);
  const { data: products } = await admin.from('products').select('id, price_dzd, status, name').in('id', ids);
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  let subtotal = 0;
  for (const item of body.items) {
    const p = byId.get(item.product_id);
    if (!p) return fail('PRODUCT_NOT_FOUND', undefined, 404);
    if (p.status === 'out_of_stock') return fail('PRODUCT_OUT_OF_STOCK', `${p.name} is out of stock`, 409);
    subtotal += p.price_dzd * item.quantity;
  }

  const shippingFee = getShippingFee(body.wilaya_code);

  // promo code: re-validated and applied server-side — the client-side
  // preview is cosmetic only, this is the number that actually gets stored.
  let promoCodeId: string | null = null;
  let discount = 0;
  if (body.promo_code) {
    const { data: promo } = await admin
      .from('promo_codes')
      .select('*')
      .eq('code', body.promo_code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (!promo) return fail('VALIDATION_ERROR', 'Code promo invalide ou expiré', 422);
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) return fail('TOKEN_EXPIRED', 'Code promo expiré', 410);
    if (subtotal < (promo.min_order_dzd ?? 0)) return fail('VALIDATION_ERROR', `Commande minimum ${promo.min_order_dzd} DZD`, 422);

    const { data: incremented } = await admin.rpc('increment_promo_usage', { p_promo_id: promo.id });
    if (!incremented) return fail('VALIDATION_ERROR', 'Code promo épuisé', 422);

    promoCodeId = promo.id;
    discount = promo.discount_type === 'percent'
      ? Math.round(subtotal * (promo.discount_value / 100))
      : Math.min(promo.discount_value, subtotal);
  }

  const total = Math.max(0, subtotal + shippingFee - discount);
  const language = await getUserLocale();

  const orderNumber = await nextOrderNumber();
  const { data: order, error } = await admin.from('orders').insert({
    order_number: orderNumber,
    customer_name: body.customer_name,
    customer_phone: body.customer_phone,
    customer_email: body.customer_email,
    wilaya_code: body.wilaya_code,
    commune: body.commune,
    address: body.address,
    shipping_fee_dzd: shippingFee,
    discount_dzd: discount,
    promo_code_id: promoCodeId,
    total_dzd: total,
    status: 'pending_confirmation',
    language,
  }).select().single();
  if (error || !order) return fail('VALIDATION_ERROR', error?.message, 500);

  const items = body.items.map((i) => {
    const p = byId.get(i.product_id)!;
    return {
      order_id: order.id, product_id: i.product_id, variant_id: i.variant_id ?? null,
      product_name: p.name, size: i.size, quantity: i.quantity, unit_price_dzd: p.price_dzd,
      garment_color: i.garment_color ?? null,
      qr_preset: i.qr_style.preset, qr_color: i.qr_style.color ?? null,
      text_enabled: i.text?.enabled ?? false,
      text_content: i.text?.content ?? null,
      text_position: i.text?.position ?? 'none',
      text_font: i.text?.font ?? null, text_color: i.text?.color ?? null, text_size: i.text?.size ?? null,
    };
  });
  const { error: itemsError } = await admin.from('order_items').insert(items);
  if (itemsError) return fail('VALIDATION_ERROR', itemsError.message, 500);

  sendOrderReceivedEmail({
    to: body.customer_email,
    orderNumber,
    customerName: body.customer_name,
    items: body.items.map((i) => ({ name: byId.get(i.product_id)!.name, quantity: i.quantity })),
    totalDzd: total,
    language,
  }).catch((err) => console.error('[orders] confirmation email failed:', err));

  return ok({ order_id: order.id, order_number: orderNumber, status: 'pending_confirmation' });
}
