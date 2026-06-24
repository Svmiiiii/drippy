import { createClient } from '@/lib/supabase/server';
import { ok, fail } from '@/lib/api';

export async function GET(_req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('orders').select('status').eq('order_number', orderNumber).single();
  if (!data) return fail('ORDER_NOT_FOUND', undefined, 404);
  return ok({ status: data.status });
}
