/**
 * Downloads a logo for every brand that does not have one yet, into public/brands/<slug>.<ext>,
 * and updates src/lib/brandLogos.generated.json so the website uses them.
 * Run from the project folder:  npm run logos:fetch
 * Re-run any time after adding brands. To replace a logo, delete its file in public/brands/ and run again,
 * or just drop your own file there named <brand-slug>.png and run again.
 */
import fs from "node:fs";
import path from "node:path";

const DIR = path.join("public", "brands");
const MAP = path.join("src", "lib", "brandLogos.generated.json");
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" };
const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "image/gif": "gif" };

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const existing = (slug) => fs.readdirSync(DIR).find((f) => f.replace(/\.[a-z]+$/i, "") === slug);

// Brands from the database + extra partners + known remote logos (from src/lib/brandLogos.ts)
const libSrc = fs.readFileSync(path.join("src", "lib", "brandLogos.ts"), "utf8");
const remote = Object.fromEntries([...(libSrc.match(/const REMOTE[\s\S]*?};/)?.[0] ?? "").matchAll(/["']?([a-z0-9-]+)["']?\s*:\s*"(https?:[^"]+)"/g)].map((m) => [m[1], m[2]]));
const extras = [...libSrc.matchAll(/\{\s*name:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*website:\s*"([^"]+)"\s*\}/g)].map((m) => ({ name: m[1], slug: m[2], website_url: m[3] }));
const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/brands?select=name,slug,website_url&order=name`, {
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
}).catch(() => null);
if (!res?.ok) { console.log("✗ Could not read brands from Supabase. Check .env.local and your internet connection."); process.exit(1); }
const brands = [...(await res.json()), ...extras];

async function download(url, slug, referer) {
  const r = await fetch(url, { headers: { ...UA, Referer: referer ?? url }, redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const type = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = EXT[type] || (url.match(/\.(png|jpe?g|webp|svg|gif)(\?|$)/i)?.[1]?.toLowerCase().replace("jpeg", "jpg"));
  if (!ext) throw new Error(`not an image (${type || "unknown type"})`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 300) throw new Error("file too small");
  const file = `${slug}.${ext}`; fs.writeFileSync(path.join(DIR, file), buf); return file;
}

/** Finds the most logo-like <img> on a web page. */
function findLogo(html, base, name) {
  const words = name.toLowerCase().split(/\s+/)[0];
  const cands = [];
  const re = /<img\b[^>]*>/gi; let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const attr = (a) => tag.match(new RegExp(`\\b${a}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] ?? "";
    let src = attr("src"); const lazy = attr("data-src") || attr("data-lazy-src") || attr("data-original");
    if (!src || src.startsWith("data:")) src = lazy || (attr("srcset").split(",")[0] || "").trim().split(/\s+/)[0];
    if (!src || src.startsWith("data:")) continue;
    const before = html.slice(Math.max(0, m.index - 400), m.index).toLowerCase();
    const meta = `${attr("alt")} ${attr("class")} ${attr("id")} ${attr("title")}`.toLowerCase();
    let score = 0;
    if (/logo/i.test(src)) score += 5;
    if (/logo/.test(meta)) score += 4;
    if (/logo|brand|navbar-brand|site-title|header/.test(before)) score += 2;
    if (words && (meta.includes(words) || src.toLowerCase().includes(words))) score += 2;
    if (/icon|banner|slide|product|flag|footer|partner|client|certif|award|payment/i.test(src + meta)) score -= 4;
    score -= Math.min(3, cands.length * 0.3); // earlier on the page = more likely the header logo
    try { cands.push({ url: new URL(src, base).href, score }); } catch { /* bad URL */ }
  }
  cands.sort((a, b) => b.score - a.score);
  return cands[0]?.score >= 4 ? cands[0].url : null;
}

let added = 0;
for (const b of brands) {
  if (existing(b.slug)) { console.log(`• ${b.name}: logo already saved`); continue; }
  try {
    if (remote[b.slug]) { const f = await download(remote[b.slug], b.slug); console.log(`✓ ${b.name}: saved ${f}`); added++; continue; }
    if (!b.website_url || b.website_url.startsWith("/")) { console.log(`– ${b.name}: no website, add public/brands/${b.slug}.png yourself`); continue; }
    const page = await fetch(b.website_url, { headers: UA, redirect: "follow" });
    if (!page.ok) throw new Error(`website returned HTTP ${page.status}`);
    const url = findLogo(await page.text(), page.url || b.website_url, b.name);
    if (!url) { console.log(`– ${b.name}: no logo found on ${b.website_url}; add public/brands/${b.slug}.png yourself`); continue; }
    const f = await download(url, b.slug, b.website_url); console.log(`✓ ${b.name}: saved ${f}`); added++;
  } catch (e) { console.log(`✗ ${b.name}: ${e.message}`); }
}

// Map every saved logo file so the site uses it (png, svg, jpg…)
const map = {};
for (const f of fs.readdirSync(DIR)) { const m = f.match(/^(.+)\.(png|jpg|webp|svg|gif)$/i); if (m) map[m[1]] = `/brands/${f}`; }
fs.writeFileSync(MAP, JSON.stringify(map, null, 2) + "\n");
console.log(`\n${added} new logo(s) saved. ${Object.keys(map).length} brands have a logo file. Check them on the Brands page;`);
console.log("if one looks wrong, delete that file in public/brands/ and put the correct logo there with the same name.");
