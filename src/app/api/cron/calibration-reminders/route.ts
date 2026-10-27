import { NextResponse } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { sendCalibrationReminders } from "@/lib/calibrationReminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily job (see vercel.json "crons"): emails calibration due reminders.
 * Vercel calls it with "Authorization: Bearer <CRON_SECRET>". Needs CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY
 * in the Vercel environment variables (the service role key reads the log without an admin login; keep it secret).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 500 });
  const supabase = createSupabase(url, key, { auth: { persistSession: false } });
  const result = await sendCalibrationReminders(supabase);
  return NextResponse.json({ ok: result.errors.length === 0, ...result });
}
