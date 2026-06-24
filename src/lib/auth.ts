import { createClient } from '@/lib/supabase/server';

export async function getAuthProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, supabase };
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();
  return { user, profile, supabase };
}

export async function requireUser() {
  const ctx = await getAuthProfile();
  if (!ctx.user || !ctx.profile) throw new AuthError('UNAUTHORIZED');
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireUser();
  if (!['admin', 'super_admin'].includes(ctx.profile!.role)) throw new AuthError('FORBIDDEN');
  return ctx;
}

export class AuthError extends Error {
  constructor(public code: 'UNAUTHORIZED' | 'FORBIDDEN') { super(code); }
}
