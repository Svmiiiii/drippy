import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { generateProductionFiles } from '@/lib/production';

export async function POST(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    await requireAdmin();
    const { orderId } = await params;
    const result = await generateProductionFiles(orderId);
    return ok({ generated: ['PNG', 'SVG', 'PDF', 'ZIP'], qr_uid: result.qr_uid, qr_url: result.qr_url });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    return fail('PRODUCTION_FAILED', (e as Error).message, 500);
  }
}
