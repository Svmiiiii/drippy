import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ok } from '@/lib/api';
import { paginationSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const { page, limit } = paginationSchema.parse({
    page: sp.get('page') ?? undefined, limit: sp.get('limit') ?? undefined,
  });
  const status = sp.get('status');

  const supabase = await createClient();
  let q = supabase
    .from('products')
    .select('*, product_variants(*)', { count: 'exact' })
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (status) q = q.eq('status', status);

  const { data, count } = await q;
  return ok({
    items: data ?? [],
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}
