import { createClient } from '@/lib/supabase/server';
import { ok, fail } from '@/lib/api';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('slug', slug)
    .single();
  if (!data) return fail('PRODUCT_NOT_FOUND', undefined, 404);
  return ok(data);
}
