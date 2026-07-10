import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail, failValidation } from '@/lib/api';
import { upsertProductSchema } from '@/lib/validation';
import { createAdminClient } from '@/lib/supabase/admin';
import { translateCharacteristics } from '@/lib/translate';

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase.from('products').select('*, product_variants(id, size, available, unavailable_colors)').order('created_at', { ascending: false });
    if (error) return fail('VALIDATION_ERROR', error.message, 500);
    return ok(data);
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const parsed = upsertProductSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);
    const { sizes, size_color_availability, ...productFields } = parsed.data;

    const admin = createAdminClient();
    const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const translated = parsed.data.characteristics_fr
      ? await translateCharacteristics(parsed.data.characteristics_fr)
      : { en: null, ar: null };

    const { data, error } = await admin.from('products')
      .insert({ ...productFields, slug, characteristics_en: translated.en, characteristics_ar: translated.ar }).select().single();
    if (error) return fail('VALIDATION_ERROR', error.message, 422);

    const finalSizes = sizes && sizes.length > 0 ? sizes : ['Unique'];
    const { error: variantsError } = await admin.from('product_variants')
      .insert(finalSizes.map((size) => ({
        product_id: data.id, size,
        unavailable_colors: size_color_availability?.find((s) => s.size === size)?.unavailable_colors ?? [],
      })));
    if (variantsError) return fail('VALIDATION_ERROR', variantsError.message, 422);

    return ok(data);
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
