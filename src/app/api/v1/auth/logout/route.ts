import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // Already signed out
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete(ADMIN_COOKIE_NAME);
  // signOut() can fail on an already-dead session and leave its cookies behind; remove them anyway
  // (the middleware sends visitors with a session cookie straight into the app).
  for (const c of (await cookies()).getAll()) {
    if (/^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/.test(c.name)) response.cookies.delete(c.name);
  }
  return response;
}
