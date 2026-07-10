import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail, failValidation } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const promoSchema = z.object({
  code: z.string().min(2).max(32).toUpperCase(),
  description: z.string().optional(),
  discount_type: z.enum(['percent', 'fixed']),
  discount_value: z.number().positive(),
  min_order_dzd: z.number().min(0).default(0),
  max_uses: z.number().int().positive().optional(),
  expires_at: z.string().datetime().optional(),
  is_active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const active = req.nextUrl.searchParams.get('active');
    let q = supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    if (active === 'true') q = q.eq('is_active', true);
    const { data } = await q;
    return ok({ items: data ?? [] });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const parsed = promoSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.from('promo_codes').insert(parsed.data).select().single();
    if (error) return fail('VALIDATION_ERROR', error.message, 422);
    return ok(data, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
