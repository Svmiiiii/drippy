import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail, failValidation } from '@/lib/api';
import { upsertProductSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const parsed = upsertProductSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);

    const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data, error } = await supabase.from('products')
      .insert({ ...parsed.data, slug }).select().single();
    if (error) return fail('VALIDATION_ERROR', error.message, 422);
    return ok(data);
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
