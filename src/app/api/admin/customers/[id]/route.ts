import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { generateProductionFiles, getSignedDownloadUrl } from '@/lib/production';

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await params;
    const { data, error } = await supabase.from('profiles')
      .select('*, qr_codes(*, qr_profiles(*)), orders(id, order_number, status, created_at, total_dzd)')
      .eq('id', id).eq('role', 'customer').single();
    if (error || !data) return fail('FORBIDDEN', 'Customer not found', 404);

    // qr_codes.profile_id is UNIQUE (1 client = 1 QR), so Supabase returns
    // it as a single object here, not an array — same for qr_profiles
    // below (qr_code_id is also unique).
    const qrCode = data.qr_codes;
    const qrUrl = qrCode ? `${APP_URL}/qr/${qrCode.qr_uid}` : null;

    // The welcome PDF (Dropix ID + temp password) is only ever baked with
    // real credentials into the FIRST order that created this profile —
    // reorders reuse the existing account, so their welcome.pdf shows a
    // placeholder instead (see generateProductionFiles' credentials fallback).
    const orders = (data.orders ?? []).slice().sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
    const firstOrder = orders[0];
    let welcomePdfUrl: string | null = null;
    if (firstOrder) {
      try {
        const result = await generateProductionFiles(firstOrder.id);
        welcomePdfUrl = await getSignedDownloadUrl(result.welcome_pdf_path, 3600);
      } catch {
        welcomePdfUrl = null;
      }
    }

    return ok({ ...data, orders, qr_url: qrUrl, welcome_pdf_url: welcomePdfUrl });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
