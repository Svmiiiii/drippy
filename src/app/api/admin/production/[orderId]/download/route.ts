import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { generateProductionFiles, getSignedDownloadUrl } from '@/lib/production';

const PATH_KEY: Record<string, keyof Awaited<ReturnType<typeof generateProductionFiles>>> = {
  PNG:     'png_path',
  SVG:     'svg_path',
  PDF:     'pdf_path',
  WELCOME: 'welcome_pdf_path',
  ZIP:     'zip_path',
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    await requireAdmin();
    const { orderId } = await params;
    const { format } = await req.json();
    const key = PATH_KEY[format?.toUpperCase()];
    if (!key) return fail('VALIDATION_ERROR', 'Format must be PNG, SVG, PDF, WELCOME or ZIP', 422);

    const result = await generateProductionFiles(orderId);
    const filePath = result[key] as string;
    if (!filePath) return fail('PRODUCTION_FAILED', `Fichier ${format} introuvable pour cette commande`, 404);

    const signedUrl = await getSignedDownloadUrl(filePath);
    const ext = format.toLowerCase() === 'welcome' ? 'pdf' : format.toLowerCase();
    const filename = `${result.qr_uid}_${format.toUpperCase()}.${ext}`;

    return ok({ url: signedUrl, filename });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    return fail('PRODUCTION_FAILED', (e as Error).message, 500);
  }
}
