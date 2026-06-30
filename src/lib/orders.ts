import { createAdminClient } from '@/lib/supabase/admin';

// ORD-000145 — sequential, zero-padded, generated atomically via a DB sequence.
export async function nextOrderNumber(): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('next_order_number');
  if (error || !data) {
    // Fallback: timestamp-based unique number if RPC is unavailable
    const ts = Date.now().toString().slice(-6);
    return `ORD-${ts.padStart(6, '0')}`;
  }
  return data as string;
}
