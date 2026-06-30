import { NextRequest } from 'next/server';
import { requireUser, AuthError } from '@/lib/auth';
import { okEmpty, fail, failValidation } from '@/lib/api';
import { qrUpdateSchema } from '@/lib/validation';

// DRP-WF-CLI-003 — updating the destination auto-creates a qr_revision (DB trigger).
export async function POST(req: NextRequest) {
  try {
    const { profile, supabase } = await requireUser();
    if (profile!.account_status !== 'active') return fail('ACCOUNT_NOT_ACTIVATED', undefined, 403);

    const parsed = qrUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);

    const { data: qr } = await supabase.from('qr_codes').select('id, qr_status')
      .eq('profile_id', profile!.id).single();
    if (!qr) return fail('QR_NOT_FOUND', undefined, 404);
    if (qr.qr_status === 'disabled') return fail('QR_DISABLED', undefined, 403);

    const { error } = await supabase.from('qr_profiles')
      .upsert(
        { qr_code_id: qr.id, target_type: parsed.data.target_type, target_value: parsed.data.target_value },
        { onConflict: 'qr_code_id' },
      );
    if (error) return fail('INVALID_QR_TARGET', error.message, 400);
    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
