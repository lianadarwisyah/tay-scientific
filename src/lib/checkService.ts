import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Check Service: the customer enters their email, receives a 6-digit code, types it on the website,
 * and then sees their history. After the code is accepted, a signed cookie keeps them signed in for 30 minutes.
 */
export const CODE_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
export const SESSION_MINUTES = 30;
export const SESSION_COOKIE = "cs_session";

const secret = () => process.env.CHECK_SERVICE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const normaliseEmail = (e: string) => e.trim().toLowerCase();
export const hasSecret = () => !!secret();

/** A new random 6-digit code, e.g. "048213". */
export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
/** Keyed hash of a code (the code itself is never stored). */
export const hashCode = (requestId: string, code: string) => sign(`code|${requestId}|${code}`);
export const codeMatches = (requestId: string, code: string, hash: string) => same(hashCode(requestId, code), hash);

/** Signed session value for the cookie: email + expiry. */
export function makeSession(email: string): string {
  const payload = `${normaliseEmail(email)}|${Date.now() + SESSION_MINUTES * 60_000}`;
  return `${b64(payload)}.${sign(payload)}`;
}

/** Returns the email if the session is genuine and not expired, otherwise null. */
export function readSession(value: string | undefined): { email: string; expires: number } | null {
  if (!value || !secret()) return null;
  const [p, sig] = value.split(".");
  if (!p || !sig) return null;
  let payload: string;
  try { payload = Buffer.from(p, "base64url").toString(); } catch { return null; }
  if (!same(sign(payload), sig)) return null;
  const [email, exp] = payload.split("|");
  const expires = Number(exp);
  if (!email || !expires || Date.now() > expires) return null;
  return { email, expires };
}

/** Email as an exact, case-insensitive ilike pattern (escapes the % and _ wildcards). */
export const emailPattern = (email: string) => normaliseEmail(email).replace(/[\\%_]/g, (c) => "\\" + c);
