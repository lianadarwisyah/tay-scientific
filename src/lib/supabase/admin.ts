import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with the SERVICE ROLE key (full access, ignores row security).
 * Only use inside API routes / server pages for tasks that check access themselves
 * (calibration cron job, Check Service). Never import this in a "use client" file.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
