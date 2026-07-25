import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail, failValidation } from '@/lib/api';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const createAdminSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'super_admin']),
});

function generateDropixId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'DRP-';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function GET() {
  try {
    const { profile, supabase } = await requireAdmin();
    if (profile!.role !== 'super_admin') return fail('FORBIDDEN', undefined, 403);
    const { data } = await supabase.from('profiles')
      .select('id, dropix_id, email, role, account_status, created_at')
      .in('role', ['admin', 'super_admin']).order('created_at', { ascending: false });
    return ok({ items: data ?? [] });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile } = await requireAdmin();
    if (profile!.role !== 'super_admin') return fail('FORBIDDEN', undefined, 403);

    const parsed = createAdminSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);

    const admin = createAdminClient();
    // 12+ chars, upper+lower+digit, cryptographically random (DRP-BUS password rule).
    const base = crypto.randomUUID().replace(/-/g, '').slice(0, 9);
    const tempPassword = `Drp${base.charAt(0).toUpperCase()}${base.slice(1)}9!`;
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: parsed.data.email, password: tempPassword, email_confirm: true,
    });
    if (authErr) return fail('VALIDATION_ERROR', authErr.message, 422);

    let dropixId = generateDropixId();
    while (true) {
      const { data: existing } = await admin.from('profiles').select('id').eq('dropix_id', dropixId).maybeSingle();
      if (!existing) break;
      dropixId = generateDropixId();
    }

    const { error: profileErr } = await admin.from('profiles').insert({
      auth_user_id: authUser.user.id,
      dropix_id: dropixId,
      email: parsed.data.email,
      role: parsed.data.role,
      account_status: 'active',
    });
    if (profileErr) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return fail('VALIDATION_ERROR', profileErr.message, 422);
    }

    return ok({ email: parsed.data.email, role: parsed.data.role, temp_password: tempPassword });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
