import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderInTransitEmail } from '@/lib/email';

// The partner prints, flocks, and ships the finished order straight to the
// customer themselves — we never see the physical garment. This just records
// that the partner confirmed the shipment; final delivery confirmation still
// goes through the existing shipping page (shipped -> delivered).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id: orderId } = await params;
    const admin = createAdminClient();

    const { data: order } = await admin.from('orders').select('id, status, order_number, customer_name, customer_email, language').eq('id', orderId).single();
    if (!order) return fail('ORDER_NOT_FOUND', undefined, 404);
    if (order.status !== 'in_production') return fail('VALIDATION_ERROR', `Cannot mark shipped from status ${order.status}`, 422);

    const { error } = await admin.from('orders').update({ status: 'shipped' }).eq('id', orderId);
    if (error) return fail('VALIDATION_ERROR', error.message, 500);

    sendOrderInTransitEmail({
      to: order.customer_email, orderNumber: order.order_number, customerName: order.customer_name, language: order.language,
    }).catch((err) => console.error('[partner-shipped] email failed:', err));

    return ok({ id: orderId, status: 'shipped' });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
