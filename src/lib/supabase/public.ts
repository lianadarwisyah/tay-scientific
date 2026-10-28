import { createClient as createSupabase } from "@supabase/supabase-js";

/** Public website data (products, brands, banners, events, jobs) is cached for this many seconds. */
export const PUBLIC_REVALIDATE = 60;
/** Cache tag: Admin saves clear it so changes show straight away (see /api/revalidate). */
export const PUBLIC_TAG = "public-data";

/**
 * Supabase client for the PUBLIC pages. It does not read the visitor's cookies, so Next.js can cache the
 * results: each query is fetched from the database at most once a minute instead of on every click.
 * Only for data everybody may see. Admin pages and anything private keep using "@/lib/supabase/server".
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabase(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate: PUBLIC_REVALIDATE, tags: [PUBLIC_TAG] } }),
    },
  });
}
