import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { okEmpty, fail, failValidation } from '@/lib/api';
import { resetPasswordSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const parsed = resetPasswordSchema.safeParse(await req.json());
  if (!parsed.success) return failValidation(parsed.error);

  const supabase = await createClient();
  // The Supabase client is configured for the PKCE flow (@supabase/ssr default),
  // so the recovery link carries a `code` param exchanged this way — not the
  // older `token_hash` + verifyOtp() pattern.
  const { error: codeError } = await supabase.auth.exchangeCodeForSession(parsed.data.code);
  if (codeError) return fail('TOKEN_EXPIRED', codeError.message, 400);
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail('TOKEN_EXPIRED', error.message, 400);
  return okEmpty();
}
