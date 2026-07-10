import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ok, fail } from '@/lib/api';

export async function POST(req: NextRequest) {
  const { code, order_total } = await req.json();
  if (!code) return fail('VALIDATION_ERROR', 'Code requis', 422);

  const supabase = await createClient();
  const { data: promo } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (!promo) return fail('QR_NOT_FOUND', 'Code promo invalide ou expiré', 404);
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return fail('TOKEN_EXPIRED', 'Code promo expiré', 410);
  if (promo.max_uses && promo.uses_count >= promo.max_uses) return fail('VALIDATION_ERROR', 'Code promo épuisé', 422);
  if (order_total < (promo.min_order_dzd ?? 0)) return fail('VALIDATION_ERROR', `Commande minimum ${promo.min_order_dzd} DZD`, 422);

  const discount = promo.discount_type === 'percent'
    ? Math.round(order_total * (promo.discount_value / 100))
    : Math.min(promo.discount_value, order_total);

  return ok({ promo_code_id: promo.id, code: promo.code, discount_type: promo.discount_type, discount_value: promo.discount_value, discount_dzd: discount });
}
