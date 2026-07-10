import { createAdminClient } from '@/lib/supabase/admin';
import { getShippingFee } from '@/lib/design';

// ORD-000145 — sequential, zero-padded, generated atomically via a DB sequence.
export async function nextOrderNumber(): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('next_order_number');
  if (error || !data) {
    // Fallback: timestamp-based unique number if RPC is unavailable
    const ts = Date.now().toString().slice(-6);
    return `ORD-${ts.padStart(6, '0')}`;
  }
  return data as string;
}

// Re-derives shipping_fee_dzd + total_dzd from the current wilaya and line
// items — call after any admin edit that touches wilaya_code or order_items,
// so total_dzd never drifts from what's actually being sold/shipped.
export async function recalcOrderTotal(admin: ReturnType<typeof createAdminClient>, orderId: string): Promise<void> {
  const { data: order } = await admin.from('orders').select('wilaya_code, discount_dzd').eq('id', orderId).single();
  if (!order) return;
  const { data: items } = await admin.from('order_items').select('unit_price_dzd, quantity').eq('order_id', orderId);
  const subtotal = (items ?? []).reduce((sum, i) => sum + i.unit_price_dzd * i.quantity, 0);
  const shippingFee = getShippingFee(order.wilaya_code);
  const total = Math.max(0, subtotal + shippingFee - (order.discount_dzd ?? 0));
  await admin.from('orders').update({ shipping_fee_dzd: shippingFee, total_dzd: total }).eq('id', orderId);
}
