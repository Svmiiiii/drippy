import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { okEmpty, fail } from '@/lib/api';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await params;
    const { data: qr } = await supabase.from('qr_codes').select('id').eq('profile_id', id).single();
    if (!qr) return fail('QR_NOT_FOUND', undefined, 404);
    const { error } = await supabase.from('qr_codes')
      .update({ qr_status: 'active', disabled_at: null }).eq('id', qr.id);
    if (error) return fail('VALIDATION_ERROR', error.message, 422);
    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
