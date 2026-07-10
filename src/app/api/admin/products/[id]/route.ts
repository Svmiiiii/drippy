import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, okEmpty, fail, failValidation } from '@/lib/api';
import { upsertProductSchema } from '@/lib/validation';
import { createAdminClient } from '@/lib/supabase/admin';
import { translateCharacteristics } from '@/lib/translate';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await params;
    const { data, error } = await supabase.from('products')
      .select('*, product_variants(id, size, available, unavailable_colors)').eq('id', id).single();
    if (error || !data) return fail('PRODUCT_NOT_FOUND', undefined, 404);
    return ok(data);
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const parsed = upsertProductSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);
    const { sizes, size_color_availability, ...productFields } = parsed.data;

    const admin = createAdminClient();

    // Re-translate when the French text changed, or when it's unchanged but
    // a previous translation attempt left en/ar empty (e.g. a transient
    // MyMemory failure) — otherwise a failed translation gets stuck forever,
    // since resaving the same text would never retry it.
    let translatedFields: { characteristics_en?: string | null; characteristics_ar?: string | null } = {};
    if (parsed.data.characteristics_fr !== undefined) {
      const { data: existing } = await admin.from('products').select('characteristics_fr, characteristics_en, characteristics_ar').eq('id', id).single();
      const textChanged = existing?.characteristics_fr !== parsed.data.characteristics_fr;
      const missingTranslation = !!parsed.data.characteristics_fr && (!existing?.characteristics_en || !existing?.characteristics_ar);
      if (textChanged || missingTranslation) {
        const translated = parsed.data.characteristics_fr
          ? await translateCharacteristics(parsed.data.characteristics_fr)
          : { en: null, ar: null };
        translatedFields = { characteristics_en: translated.en, characteristics_ar: translated.ar };
      }
    }

    // Slug is intentionally left untouched on edit — regenerating it from
    // `name` on every save would silently break the product's existing URL.
    const { data, error } = await admin.from('products')
      .update({ ...productFields, ...translatedFields }).eq('id', id).select().single();
    if (error || !data) return fail('PRODUCT_NOT_FOUND', error?.message, 404);

    if (sizes && sizes.length > 0) {
      // Variants aren't referenced elsewhere yet (order_items stores size as
      // plain text), so a full replace is safe and keeps this simple.
      await admin.from('product_variants').delete().eq('product_id', id);
      const { error: variantsError } = await admin.from('product_variants')
        .insert(sizes.map((size) => ({
          product_id: id, size,
          unavailable_colors: size_color_availability?.find((s) => s.size === size)?.unavailable_colors ?? [],
        })));
      if (variantsError) return fail('VALIDATION_ERROR', variantsError.message, 422);
    }

    return ok(data);
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}

// DB-004: no physical delete — soft delete via status = 'out_of_stock'
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await params;
    const { error } = await supabase.from('products').update({ status: 'out_of_stock' }).eq('id', id);
    if (error) return fail('PRODUCT_NOT_FOUND', error.message, 404);
    return okEmpty();
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
