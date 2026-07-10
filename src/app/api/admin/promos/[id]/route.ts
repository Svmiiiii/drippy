import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, okEmpty, fail } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.from('promo_codes').update(body).eq('id', id).select().single();
    if (error) return fail('VALIDATION_ERROR', error.message, 422);
    return ok(data);
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const adminClient = createAdminClient();
    await adminClient.from('promo_codes').update({ is_active: false }).eq('id', id);
    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
