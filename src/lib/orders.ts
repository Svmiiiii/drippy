import { createAdminClient } from '@/lib/supabase/admin';

// ORD-000145 — sequential, zero-padded
export async function nextOrderNumber(): Promise<string> {
  const admin = createAdminClient();
  const { count } = await admin.from('orders').select('*', { count: 'exact', head: true });
  const n = (count ?? 0) + 1;
  return `ORD-${String(n).padStart(6, '0')}`;
}
