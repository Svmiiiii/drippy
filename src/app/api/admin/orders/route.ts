import { NextRequest } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import { ok, fail } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const status = req.nextUrl.searchParams.get('status');
    let q = supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data } = await q;
    return ok({ items: data ?? [] });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.code, undefined, e.code === 'FORBIDDEN' ? 403 : 401);
    throw e;
  }
}
