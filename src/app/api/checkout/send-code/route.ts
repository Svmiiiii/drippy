import { NextRequest } from 'next/server';
import { randomInt } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, fail, failValidation } from '@/lib/api';
import { sendCheckoutCodeSchema } from '@/lib/validation';
import { sendCheckoutVerificationCode } from '@/lib/email';
import { getUserLocale } from '@/lib/i18n';

const CODE_TTL_MS = 10 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;

// Sends a 6-digit code to the address the customer typed at checkout. The
// order itself isn't created until POST /api/checkout/verify-code succeeds —
// this is the gate that keeps typoed/fake emails out of `orders` (DRP-BUS
// ask: "évite de tomber sur des commandes invalides").
export async function POST(req: NextRequest) {
  const parsed = sendCheckoutCodeSchema.safeParse(await req.json());
  if (!parsed.success) return failValidation(parsed.error);
  const email = parsed.data.email.toLowerCase();

  const admin = createAdminClient();

  const { data: recent } = await admin
    .from('checkout_email_verifications')
    .select('created_at')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent && Date.now() - new Date(recent.created_at).getTime() < RESEND_COOLDOWN_MS) {
    return fail('RATE_LIMITED', 'Merci de patienter avant de redemander un code', 429);
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const language = await getUserLocale();

  try {
    await sendCheckoutVerificationCode({ to: email, code, language });
  } catch (err) {
    console.error('[checkout] verification code email failed:', err);
    return fail('SERVICE_UNAVAILABLE', "L'envoi de l'email a échoué, réessaie", 503);
  }

  const { error } = await admin.from('checkout_email_verifications').insert({
    email, code, expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  if (error) return fail('VALIDATION_ERROR', error.message, 500);

  return ok({});
}
