import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { okEmpty, fail, failValidation } from '@/lib/api';
import { resetPasswordSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const parsed = resetPasswordSchema.safeParse(await req.json());
  if (!parsed.success) return failValidation(parsed.error);

  const supabase = await createClient();
  // Exchange the recovery token to establish a session before calling updateUser.
  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.token,
    type: 'recovery',
  });
  if (otpError) return fail('TOKEN_EXPIRED', otpError.message, 400);
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail('TOKEN_EXPIRED', error.message, 400);
  return okEmpty();
}
