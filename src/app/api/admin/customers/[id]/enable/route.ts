import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { okEmpty, fail } from '@/lib/api';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await params;
    const { error } = await supabase.from('profiles')
      .update({ account_status: 'active', deactivated_at: null })
      .eq('id', id).eq('role', 'customer');
    if (error) return fail('FORBIDDEN', error.message, 404);
    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
