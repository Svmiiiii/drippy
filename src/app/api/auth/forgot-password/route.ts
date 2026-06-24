import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { okEmpty, failValidation } from '@/lib/api';
import { forgotPasswordSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const parsed = forgotPasswordSchema.safeParse(await req.json());
  if (!parsed.success) return failValidation(parsed.error);

  const supabase = await createClient();
  // Always return success to avoid leaking which emails exist.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });
  return okEmpty();
}
