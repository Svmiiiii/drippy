import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { okEmpty, fail, failValidation } from '@/lib/api';
import { resetPasswordSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const parsed = resetPasswordSchema.safeParse(await req.json());
  if (!parsed.success) return failValidation(parsed.error);

  const supabase = await createClient();
  // Deliberately NOT the PKCE code/exchangeCodeForSession() flow: that binds
  // the link to the browser that requested it (via a locally-stored code
  // verifier), which breaks the very common case of opening a password-reset
  // email on a different device/browser/app than the one that requested it.
  // token_hash verification has no such binding — the Supabase email template
  // must use {{ .TokenHash }} (not the default {{ .ConfirmationURL }}) to match.
  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.code, type: 'recovery',
  });
  if (otpError) return fail('TOKEN_EXPIRED', otpError.message, 400);
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail('TOKEN_EXPIRED', error.message, 400);
  return okEmpty();
}
