import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_ATTEMPTS, SESSION_COOKIE, SESSION_MINUTES, codeMatches, makeSession } from "@/lib/checkService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const wrong = (error = "That code is not correct or has expired. Please check it, or ask for a new code.") =>
  NextResponse.json({ ok: false, error }, { status: 400 });

/** Check Service, step 2: check the 6-digit code. If correct, a secure cookie signs the customer in for 30 minutes. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (!UUID.test(requestId) || code.length !== 6) return wrong("Please enter the 6-digit code from the email.");

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "Check Service is not available right now." }, { status: 500 });

  const { data: row } = await supabase.from("check_service_codes").select("*").eq("id", requestId).maybeSingle();
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return wrong();
  if (row.attempts >= MAX_ATTEMPTS) return wrong("Too many wrong tries. Please ask for a new code.");

  if (!codeMatches(requestId, code, row.code_hash)) {
    await supabase.from("check_service_codes").update({ attempts: row.attempts + 1 }).eq("id", requestId);
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return wrong(left > 0 ? `That code is not correct. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Please ask for a new code.");
  }

  await supabase.from("check_service_codes").delete().eq("id", requestId); // a code works only once
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, makeSession(row.email), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MINUTES * 60,
  });
  return res;
}
