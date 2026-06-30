import { NextRequest } from 'next/server';
import { requireUser, AuthError } from '@/lib/auth';
import { okEmpty, fail, failValidation } from '@/lib/api';
import { changePhoneSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const { user, profile, supabase } = await requireUser();
    const parsed = changePhoneSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);

    const { error: pwErr } = await supabase.auth.signInWithPassword({
      email: user!.email!, password: parsed.data.current_password,
    });
    if (pwErr) return fail('INVALID_PASSWORD', undefined, 403);

    const { error } = await supabase.from('profiles').update({ phone: parsed.data.phone }).eq('id', profile!.id);
    if (error) return fail('VALIDATION_ERROR', error.message, 500);
    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, 401);
    throw e;
  }
}
