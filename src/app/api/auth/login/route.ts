import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ok, fail, failValidation } from '@/lib/api';
import { loginSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const parsed = loginSchema.safeParse(await req.json());
  if (!parsed.success) return failValidation(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return fail('INVALID_CREDENTIALS', undefined, 401);

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('auth_user_id', data.user.id).single();

  if (!profile) return fail('INVALID_CREDENTIALS', undefined, 401);
  if (profile.account_status === 'disabled') return fail('ACCOUNT_DISABLED', undefined, 403);
  if (!profile.email_verified) return fail('EMAIL_NOT_VERIFIED', undefined, 403);

  return ok({
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
    user: profile,
  });
}
