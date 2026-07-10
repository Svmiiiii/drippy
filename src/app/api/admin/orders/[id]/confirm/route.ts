import { requireAdmin, AuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { okEmpty, fail } from '@/lib/api';
import { generateProductionFiles } from '@/lib/production';

function generateDrippyId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'DRP-';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// DRP-WF-ADM-004 — Atomic confirmation: account + QR + production created in one flow.
// Uses createAdminClient() (service role) throughout → RLS is bypassed entirely.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id: orderId } = await params;
    const admin = createAdminClient();

    // 1. Load and lock the order
    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) return fail('ORDER_NOT_FOUND', undefined, 404);
    if (order.status !== 'pending_confirmation') return fail('ORDER_ALREADY_CONFIRMED', undefined, 409);

    let profileId: string = order.profile_id;
    let qrId: string;
    let drippyId: string | undefined;
    let tempPassword: string | undefined;

    // 2. CREATE_ACCOUNT if first order
    if (!profileId) {
      // Generate unique drippy_id
      let candidate = generateDrippyId();
      while (true) {
        const { data: existing } = await admin.from('profiles').select('id').eq('drippy_id', candidate).maybeSingle();
        if (!existing) break;
        candidate = generateDrippyId();
      }
      drippyId = candidate;

      // Password: 12+ chars, upper + lower + digit (DRP-BUS validation)
      const base = crypto.randomUUID().replace(/-/g, '').slice(0, 9);
      tempPassword = `Drp${base.charAt(0).toUpperCase()}${base.slice(1)}9!`;

      const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
        email: order.customer_email,
        password: tempPassword,
        email_confirm: true,
      });
      if (authErr) return fail('PRODUCTION_FAILED', authErr.message, 500);

      const { data: profile, error: profileErr } = await admin
        .from('profiles')
        .insert({
          auth_user_id: authUser.user.id,
          drippy_id: drippyId,
          first_name: order.customer_name.split(' ')[0],
          email: order.customer_email,
          phone: order.customer_phone,
          role: 'customer',
          account_status: 'active',
          language: order.language ?? 'fr',
        })
        .select('id')
        .single();

      if (profileErr || !profile) {
        await admin.auth.admin.deleteUser(authUser.user.id).catch(() => {});
        return fail('PRODUCTION_FAILED', profileErr?.message ?? 'Profile creation failed', 500);
      }
      profileId = profile.id;

      // 3. CREATE_QR (DRP-BUS-001: 1 client = 1 QR permanent)
      const { data: qr, error: qrErr } = await admin
        .from('qr_codes')
        .insert({ profile_id: profileId, qr_uid: drippyId, qr_status: 'active' })
        .select('id')
        .single();

      if (qrErr || !qr) {
        await admin.auth.admin.deleteUser(authUser.user.id).catch(() => {});
        try { await admin.from('profiles').delete().eq('id', profileId); } catch { /* cleanup best-effort */ }
        return fail('PRODUCTION_FAILED', qrErr?.message ?? 'QR creation failed', 500);
      }
      qrId = qr.id;

      // 4. SET initial QR destination
      await admin.from('qr_profiles').insert({
        qr_code_id: qrId,
        target_type: 'message',
        target_value: 'Bienvenue sur mon Drippy !',
      });
    } else {
      const { data: qr } = await admin.from('qr_codes').select('id').eq('profile_id', profileId).single();
      qrId = qr!.id;
    }

    // 5. Update order status + link profile
    await admin.from('orders').update({ status: 'confirmed', profile_id: profileId }).eq('id', orderId);

    // 6. CREATE_PRODUCTION snapshot (frozen, DB-003)
    const { data: production, error: prodErr } = await admin
      .from('productions')
      .insert({
        order_id: orderId,
        qr_code_id: qrId,
        snapshot_json: {
          order_number: order.order_number,
          items: order.order_items,
          frozen_at: new Date().toISOString(),
        },
        is_locked: true,
      })
      .select('id')
      .single();

    if (prodErr || !production) return fail('PRODUCTION_FAILED', prodErr?.message ?? 'Production failed', 500);

    // 7. CREATE production_items
    const productionItems = (order.order_items ?? []).map((item: any) => ({
      production_id: production.id,
      order_item_id: item.id,
    }));
    if (productionItems.length > 0) {
      await admin.from('production_items').insert(productionItems);
    }

    // 8. Generate production files + welcome PDF with credentials (fire-and-forget)
    generateProductionFiles(orderId, drippyId && tempPassword ? {
      drippyId,
      tempPassword,
      customerName: order.customer_name,
    } : undefined).catch((err) => {
      console.error('[confirm_order] file generation failed:', err);
    });

    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
