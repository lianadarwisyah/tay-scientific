/** @type {import('next').NextConfig} */

// Supabase project (database API, photos in storage, admin sign-in): allowed by the Content Security Policy below
const supabase = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin; } catch { return "https://*.supabase.co"; }
})();
const dev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy: the browser only loads scripts, styles and data from these places (images from any https site).
 * 'unsafe-inline' is needed by Next.js and Tailwind; 'unsafe-eval' only while developing (npm run dev).
 * If you add a new outside service (e.g. Google Analytics, a chat widget), add its address here.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Images may come from any https address (category photos from Unsplash, brand logos, Supabase uploads,
  // product photos linked from other sites). Images cannot run code, so this stays safe.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabase.replace("https://", "wss://")}${dev ? " ws:" : ""}`,
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },                       // no embedding in other sites (clickjacking)
  { key: "X-Content-Type-Options", value: "nosniff" },             // browsers must respect file types
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }, // always https
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // don't advertise "X-Powered-By: Next.js"
  // Loaded as normal Node packages on the server (not bundled): Excel export and email
  serverExternalPackages: ["exceljs", "nodemailer"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default nextConfig;
