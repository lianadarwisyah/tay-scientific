import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Check Service: customers enter their email, we email them a private link, and the link shows their history.
 * The link carries the email and an expiry time, signed with a server secret, so it cannot be guessed or changed.
 */
export const LINK_MINUTES = 60;

const secret = () => process.env.CHECK_SERVICE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export const normaliseEmail = (e: string) => e.trim().toLowerCase();

export function makeToken(email: string): string {
  const payload = `${normaliseEmail(email)}|${Date.now() + LINK_MINUTES * 60_000}`;
  return `${b64(payload)}.${sign(payload)}`;
}

/** Returns the email if the link is genuine and not expired, otherwise null. */
export function readToken(token: string): { email: string; expires: number } | null {
  if (!secret()) return null;
  const [p, sig] = token.split(".");
  if (!p || !sig) return null;
  let payload: string;
  try { payload = Buffer.from(p, "base64url").toString(); } catch { return null; }
  const good = sign(payload);
  if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  const [email, exp] = payload.split("|");
  const expires = Number(exp);
  if (!email || !expires || Date.now() > expires) return null;
  return { email, expires };
}

/** Email as an exact, case-insensitive ilike pattern (escapes the % and _ wildcards). */
export const emailPattern = (email: string) => normaliseEmail(email).replace(/[\\%_]/g, (c) => "\\" + c);
