import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const WINDOW_MINUTES = 15;
const MAX_REQUESTS = 5;

export function getRequestIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// Returns true if the request is allowed and records it. Uses the DB (not
// in-memory) since serverless functions don't share memory across instances.
export async function checkOrderRateLimit(admin: SupabaseClient, ip: string): Promise<boolean> {
  const ipHash = createHash('sha256').update(ip).digest('hex');
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { count } = await admin
    .from('order_rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since);

  if ((count ?? 0) >= MAX_REQUESTS) return false;

  await admin.from('order_rate_limits').insert({ ip_hash: ipHash });
  return true;
}

// Same shape as checkOrderRateLimit, generalized with a `kind` so login and
// forgot-password (different abuse profiles — mistyped passwords vs. inbox
// spam) can share one table with their own thresholds.
export async function checkAuthRateLimit(
  admin: SupabaseClient, kind: 'login' | 'forgot_password', ip: string, maxRequests: number,
): Promise<boolean> {
  const ipHash = createHash('sha256').update(ip).digest('hex');
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { count } = await admin
    .from('auth_rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('kind', kind)
    .eq('ip_hash', ipHash)
    .gte('created_at', since);

  if ((count ?? 0) >= maxRequests) return false;

  await admin.from('auth_rate_limits').insert({ kind, ip_hash: ipHash });
  return true;
}
