import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, fail, failValidation } from '@/lib/api';
import { verifyCheckoutCodeSchema } from '@/lib/validation';

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const parsed = verifyCheckoutCodeSchema.safeParse(await req.json());
  if (!parsed.success) return failValidation(parsed.error);
  const { code } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const admin = createAdminClient();

  const { data: row } = await admin
    .from('checkout_email_verifications')
    .select('id, code, attempts, verified, expires_at')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row || new Date(row.expires_at) < new Date()) {
    return fail('TOKEN_EXPIRED', 'Ce code a expiré, redemande-en un', 410);
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return fail('RATE_LIMITED', 'Trop de tentatives, redemande un code', 429);
  }
  if (row.code !== code) {
    await admin.from('checkout_email_verifications').update({ attempts: row.attempts + 1 }).eq('id', row.id);
    return fail('VALIDATION_ERROR', 'Code incorrect', 422);
  }

  await admin.from('checkout_email_verifications').update({ verified: true }).eq('id', row.id);
  return ok({});
}
