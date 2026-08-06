import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { okEmpty, fail, failValidation } from '@/lib/api';
import { forgotPasswordSchema } from '@/lib/validation';
import { checkAuthRateLimit, getRequestIp } from '@/lib/rateLimit';

const MAX_RESET_REQUESTS = 5;

export async function POST(req: NextRequest) {
  const parsed = forgotPasswordSchema.safeParse(await req.json());
  if (!parsed.success) return failValidation(parsed.error);

  const allowed = await checkAuthRateLimit(createAdminClient(), 'forgot_password', getRequestIp(req), MAX_RESET_REQUESTS);
  if (!allowed) return fail('RATE_LIMITED', undefined, 429);

  const supabase = await createClient();
  // Always return success to avoid leaking which emails exist.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });
  return okEmpty();
}
