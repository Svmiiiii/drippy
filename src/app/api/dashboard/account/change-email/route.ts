import { NextRequest } from 'next/server';
import { requireUser, AuthError } from '@/lib/auth';
import { okEmpty, fail, failValidation } from '@/lib/api';
import { changeEmailSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const { user, profile, supabase } = await requireUser();
    const parsed = changeEmailSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);

    // verify current password
    const { error: pwErr } = await supabase.auth.signInWithPassword({
      email: user!.email!, password: parsed.data.current_password,
    });
    if (pwErr) return fail('INVALID_PASSWORD', undefined, 403);

    // changing email requires re-verification (DRP-BUS-022)
    const { error } = await supabase.auth.updateUser({ email: parsed.data.new_email });
    if (error) return fail('EMAIL_ALREADY_USED', error.message, 409);

    const { error: profileErr } = await supabase.from('profiles')
      .update({ email: parsed.data.new_email, email_verified: false }).eq('id', profile!.id);
    if (profileErr) return fail('VALIDATION_ERROR', profileErr.message, 500);
    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, 401);
    throw e;
  }
}
