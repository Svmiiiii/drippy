import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { okEmpty, fail, failValidation } from '@/lib/api';
import { verifyEmailSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const parsed = verifyEmailSchema.safeParse(await req.json());
  if (!parsed.success) return failValidation(parsed.error);

  const supabase = await createClient();
  // Same PKCE `code` flow as reset-password — see the comment there.
  const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.data.code);
  if (error || !data.user) return fail('TOKEN_EXPIRED', undefined, 400);

  await supabase.from('profiles').update({ email_verified: true })
    .eq('auth_user_id', data.user.id);
  return okEmpty();
}
