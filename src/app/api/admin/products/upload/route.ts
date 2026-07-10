import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'product-images';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return fail('VALIDATION_ERROR', 'Fichier requis', 422);
    if (!ALLOWED_TYPES.includes(file.type)) return fail('VALIDATION_ERROR', 'Format non supporté (PNG, JPEG, WEBP, GIF)', 422);
    if (file.size > MAX_BYTES) return fail('VALIDATION_ERROR', 'Fichier trop volumineux (max 5MB)', 422);

    const admin = createAdminClient();
    const ext = file.name.split('.').pop() || 'png';
    const path = `${crypto.randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: false });
    if (error) return fail('VALIDATION_ERROR', error.message, 500);

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    return ok({ url: data.publicUrl });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
