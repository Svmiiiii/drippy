import { createClient as createSb } from '@supabase/supabase-js';

// Server-only. Uses the service role key — NEVER expose to the browser.
export function createAdminClient() {
  return createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
