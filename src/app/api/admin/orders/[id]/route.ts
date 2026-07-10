import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { phoneSchema, emailSchema } from '@/lib/validation';
import { recalcOrderTotal } from '@/lib/orders';
import { getWelcomePdfBuffer } from '@/lib/production';
import { sendOrderDeliveredEmail } from '@/lib/email';

// 'confirmed' is deliberately excluded — that transition must go through
// POST /api/admin/orders/[id]/confirm, which atomically creates the
// account/QR/production snapshot. Setting it here would desync those.
const ORDER_FLOW = ['in_production', 'printed', 'flocked', 'packed', 'shipped', 'delivered'] as const;
const VALID_STATUSES = [...ORDER_FLOW, 'cancelled'] as const;

const updateSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  tracking_number: z.string().optional(),
  customer_name: z.string().min(1).optional(),
  customer_phone: phoneSchema.optional(),
  customer_email: emailSchema.optional(),
  wilaya_code: z.string().min(1).optional(),
  commune: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
});

// Contact details can no longer matter once the order is done (delivered) or
// abandoned (cancelled) — the physical handoff has already happened or won't.
const CONTACT_FIELDS = ['customer_name', 'customer_phone', 'customer_email', 'wilaya_code', 'commune', 'address'] as const;
const CONTACT_EDIT_LOCKED_STATUSES = ['delivered', 'cancelled'];

function isValidTransition(current: string, next: string): boolean {
  if (next === 'cancelled') return current !== 'delivered' && current !== 'cancelled';
  const curIdx = ORDER_FLOW.indexOf(current as (typeof ORDER_FLOW)[number]);
  const nextIdx = ORDER_FLOW.indexOf(next as (typeof ORDER_FLOW)[number]);
  if (nextIdx === -1) return false;
  // 'confirmed' (curIdx -1) may only advance to the first production step.
  if (curIdx === -1) return current === 'confirmed' && nextIdx === 0;
  return nextIdx === curIdx + 1;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await params;
    const { data, error } = await supabase.from('orders')
      .select('*, order_items(*), productions(*, production_items(*)), order_call_logs(*)')
      .eq('id', id).single();
    if (error || !data) return fail('ORDER_NOT_FOUND', undefined, 404);
    return ok(data);
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail('VALIDATION_ERROR', parsed.error.message, 422);

    const adminClient = createAdminClient();

    const editsContact = CONTACT_FIELDS.some((f) => parsed.data[f] !== undefined);
    let profileId: string | null = null;
    if (parsed.data.status || editsContact) {
      const { data: existing } = await adminClient.from('orders').select('status, profile_id').eq('id', id).single();
      if (!existing) return fail('ORDER_NOT_FOUND', undefined, 404);
      if (parsed.data.status && !isValidTransition(existing.status, parsed.data.status)) {
        return fail('VALIDATION_ERROR', `Cannot move from ${existing.status} to ${parsed.data.status}`, 422);
      }
      if (editsContact && CONTACT_EDIT_LOCKED_STATUSES.includes(existing.status)) {
        return fail('VALIDATION_ERROR', `Cannot edit contact info once order is ${existing.status}`, 422);
      }
      profileId = existing.profile_id;
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.status) updates.status = parsed.data.status;
    if (parsed.data.tracking_number !== undefined) updates.tracking_number = parsed.data.tracking_number;
    for (const f of CONTACT_FIELDS) if (parsed.data[f] !== undefined) updates[f] = parsed.data[f];

    const { error } = await adminClient.from('orders').update(updates).eq('id', id);
    if (error) return fail('ORDER_NOT_FOUND', error.message, 404);

    if (parsed.data.wilaya_code !== undefined) await recalcOrderTotal(adminClient, id);

    if (parsed.data.status === 'delivered') {
      const { data: deliveredOrder } = await adminClient.from('orders').select('order_number, customer_name, customer_email, language').eq('id', id).single();
      if (deliveredOrder) {
        getWelcomePdfBuffer(id)
          .then((welcomePdfBuffer) => sendOrderDeliveredEmail({
            to: deliveredOrder.customer_email, orderNumber: deliveredOrder.order_number, customerName: deliveredOrder.customer_name, welcomePdfBuffer, language: deliveredOrder.language,
          }))
          .catch((err) => console.error('[orders PUT] delivered email failed:', err));
      }
    }

    // The order's contact fields are a snapshot — once the account/QR exist
    // (profile_id set), the customer's actual profile + login email need the
    // same fix, or the correction is cosmetic and the account stays wrong.
    if (editsContact && profileId) {
      const { data: profile } = await adminClient.from('profiles').select('auth_user_id').eq('id', profileId).single();
      const profileUpdates: Record<string, unknown> = {};
      if (parsed.data.customer_name !== undefined) profileUpdates.first_name = parsed.data.customer_name.split(' ')[0];
      if (parsed.data.customer_phone !== undefined) profileUpdates.phone = parsed.data.customer_phone;
      if (parsed.data.customer_email !== undefined) profileUpdates.email = parsed.data.customer_email;
      if (Object.keys(profileUpdates).length > 0) {
        await adminClient.from('profiles').update(profileUpdates).eq('id', profileId);
      }
      if (parsed.data.customer_email !== undefined && profile?.auth_user_id) {
        await adminClient.auth.admin.updateUserById(profile.auth_user_id, { email: parsed.data.customer_email, email_confirm: true });
      }
    }

    return ok({ id });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
