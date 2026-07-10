import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const { data } = await supabase.from('orders')
      .select('id, order_number, customer_name, wilaya_code, status, confirmed_at, order_items(id, size, quantity), productions(png_path, svg_path, pdf_path, zip_path, is_locked)')
      .in('status', ['confirmed', 'in_production', 'printed', 'flocked', 'packed', 'shipped'])
      .order('confirmed_at', { ascending: false });
    return ok({ items: data ?? [] });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
