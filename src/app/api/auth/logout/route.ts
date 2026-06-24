import { createClient } from '@/lib/supabase/server';
import { okEmpty } from '@/lib/api';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return okEmpty();
}
