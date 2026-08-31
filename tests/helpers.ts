import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Integration tests hit a real running dev server (see tests/README.md) and
// a real Supabase project — there is no separate test database for this
// project. Every test that creates data MUST clean up after itself via the
// admin client below.

function loadEnvLocal(): Record<string, string> {
  const file = path.join(process.cwd(), '.env.local');
  const env: Record<string, string> = {};
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

const envLocal = loadEnvLocal();

export const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? envLocal.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? envLocal.SUPABASE_SERVICE_ROLE_KEY;

let _admin: SupabaseClient | null = null;
// Lazy: only throws if a test actually needs DB cleanup and the key is missing.
export function adminClient(): SupabaseClient {
  if (!_admin) {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase env vars — copy .env.local or set NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    }
    _admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  }
  return _admin;
}

interface ApiResult<T = any> {
  status: number;
  body: { success: true; data: T } | { success: false; error: { code: string; message?: string } };
}

export async function apiPost<T = any>(path: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

export async function apiGet<T = any>(path: string): Promise<ApiResult<T>> {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, body: await res.json() };
}

// A random local-part on a real free-mail domain — Resend accepts it as a
// send target (unlike example.com/example.org, which it rejects outright),
// and it's disposable/never actually read.
export function testEmail(tag: string): string {
  return `qa-${tag}-${Date.now()}@gmail.com`;
}
