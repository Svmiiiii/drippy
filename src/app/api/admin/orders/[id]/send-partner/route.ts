import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateProductionFiles } from '@/lib/production';
import { sendOrderInProductionEmail } from '@/lib/email';

// Admin manually re-enters the order into the external flocking partner's own
// portal (no API access to it), then calls this once done. 'in_production'
// means "handed off to the partner, awaiting the finished garments back".
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id: orderId } = await params;
    const admin = createAdminClient();

    const { data: order } = await admin.from('orders').select('id, status, order_number, customer_name, customer_email, language').eq('id', orderId).single();
    if (!order) return fail('ORDER_NOT_FOUND', undefined, 404);
    if (order.status !== 'confirmed') return fail('VALIDATION_ERROR', `Cannot send to partner from status ${order.status}`, 422);

    // Make sure the transparent QR image the admin needs to upload actually
    // exists before marking this as handled.
    await generateProductionFiles(orderId);

    const { error } = await admin.from('orders')
      .update({ status: 'in_production', sent_to_partner_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) return fail('VALIDATION_ERROR', error.message, 500);

    sendOrderInProductionEmail({
      to: order.customer_email, orderNumber: order.order_number, customerName: order.customer_name, language: order.language,
    }).catch((err) => console.error('[send-partner] email failed:', err));

    return ok({ id: orderId, status: 'in_production' });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    return fail('PRODUCTION_FAILED', (e as Error).message, 500);
  }
}
