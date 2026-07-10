import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { generateProductionFiles, getSignedDownloadUrl } from '@/lib/production';

// One call, everything the admin needs to manually re-key this order into the
// partner's flocking portal: a signed, longer-lived URL per item's
// transparent QR PNG (long-lived because the queue view keeps these on
// screen, unlike the one-off download buttons).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    await requireAdmin();
    const { orderId } = await params;

    const result = await generateProductionFiles(orderId);
    const itemImageUrls = await Promise.all(
      result.item_png_paths.map((path) => getSignedDownloadUrl(path, 3600)),
    );
    // The partner also needs the customer's ID card (Drippy ID + temp
    // password) so they can ship the finished order straight to them.
    const welcomePdfUrl = result.welcome_pdf_path ? await getSignedDownloadUrl(result.welcome_pdf_path, 3600) : null;

    return ok({ item_image_urls: itemImageUrls, welcome_pdf_url: welcomePdfUrl });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    return fail('PRODUCTION_FAILED', (e as Error).message, 500);
  }
}
