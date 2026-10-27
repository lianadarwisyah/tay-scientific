import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendCalibrationReminders } from "@/lib/calibrationReminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Send due reminders now" button in Admin → Calibration log (logged-in admins only). */
export async function POST() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "Not set up" }, { status: 500 });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  const result = await sendCalibrationReminders(supabase);
  return NextResponse.json({ ok: result.errors.length === 0, ...result });
}
