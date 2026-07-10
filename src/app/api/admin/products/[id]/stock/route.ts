import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { okEmpty, fail, failValidation } from '@/lib/api';
import { z } from 'zod';

const stockSchema = z.object({
  status: z.enum(['available', 'out_of_stock']),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await params;
    const parsed = stockSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);

    const { error } = await supabase.from('products').update({ status: parsed.data.status }).eq('id', id);
    if (error) return fail('PRODUCT_NOT_FOUND', error.message, 404);
    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
