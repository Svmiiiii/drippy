import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail, failValidation } from '@/lib/api';
import { siteSettingsSchema } from '@/lib/validation';
import { createAdminClient } from '@/lib/supabase/admin';
import { translateCharacteristics } from '@/lib/translate';

export async function GET() {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { data } = await admin.from('site_settings').select('*').eq('id', 1).single();
    return ok(data);
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const parsed = siteSettingsSchema.safeParse(await req.json());
    if (!parsed.success) return failValidation(parsed.error);

    const admin = createAdminClient();
    const { data: existing } = await admin.from('site_settings').select('hero_scan_text_fr, hero_scan_text_en, hero_scan_text_ar').eq('id', 1).single();
    const textChanged = existing?.hero_scan_text_fr !== parsed.data.hero_scan_text_fr;
    const missingTranslation = !existing?.hero_scan_text_en || !existing?.hero_scan_text_ar;

    let translatedFields = {};
    if (textChanged || missingTranslation) {
      const translated = await translateCharacteristics(parsed.data.hero_scan_text_fr);
      translatedFields = { hero_scan_text_en: translated.en, hero_scan_text_ar: translated.ar };
    }

    const { error } = await admin.from('site_settings').update({
      hero_scan_text_fr: parsed.data.hero_scan_text_fr,
      ...translatedFields,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    if (error) return fail('VALIDATION_ERROR', error.message, 500);

    return ok({ updated: true });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
