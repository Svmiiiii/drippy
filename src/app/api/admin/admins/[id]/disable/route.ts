import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { okEmpty, fail } from '@/lib/api';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile, supabase } = await requireAdmin();
    if (profile!.role !== 'super_admin') return fail('FORBIDDEN', undefined, 403);
    const { id } = await params;
    const { error } = await supabase.from('profiles')
      .update({ account_status: 'disabled', deactivated_at: new Date().toISOString() })
      .eq('id', id).in('role', ['admin', 'super_admin']);
    if (error) return fail('VALIDATION_ERROR', error.message, 422);
    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
