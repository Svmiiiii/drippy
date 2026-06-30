import { requireAdmin, AuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { okEmpty, fail } from '@/lib/api';

// DRP-WF-ADM-004 — critical route. Calls confirm_order() which atomically runs
// CREATE_ACCOUNT, CREATE_QR, CREATE_PRODUCTION, CREATE_WELCOME_PACK.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const admin = createAdminClient();

    // Create the Supabase auth user for the customer (temp password sent only in Welcome Pack).
    const { data: order } = await admin.from('orders').select('customer_email, profile_id').eq('id', id).single();
    if (!order) return fail('ORDER_NOT_FOUND', undefined, 404);

    let authUserId: string | null = null;
    if (!order.profile_id) {
      const tempPassword = crypto.randomUUID().slice(0, 16) + 'A1!';
      const { data: created, error: authErr } = await admin.auth.admin.createUser({
        email: order.customer_email, password: tempPassword, email_confirm: true,
      });
      if (authErr) return fail('PRODUCTION_FAILED', authErr.message, 500);
      authUserId = created.user.id;
      // tempPassword goes into the Welcome Pack PDF (DRP-BUS-038) — never emailed (DRP-FORB-011).
    }

    const { data, error } = await admin.rpc('confirm_order', {
      p_order_id: id, p_auth_user_id: authUserId,
    });
    if (error) {
      // Clean up the orphaned Supabase auth user if the DB transaction failed.
      if (authUserId) await admin.auth.admin.deleteUser(authUserId).catch(() => {});
      if (error.message.includes('ALREADY_CONFIRMED')) return fail('ORDER_ALREADY_CONFIRMED', undefined, 409);
      if (error.message.includes('NOT_FOUND')) return fail('ORDER_NOT_FOUND', undefined, 404);
      return fail('PRODUCTION_FAILED', error.message, 500);
    }
    // TODO: trigger Welcome Pack PDF generation + SEND_CONFIRMATION_EMAIL via edge function.
    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
