/**
 * Forgiving product search, used by the public Products page and Admin → Products.
 *
 * Spaces, dashes, slashes, dots and letter/number joins don't matter, and word order doesn't matter:
 *   "uv vis", "uv-vis", "UV/VIS", "uvvis"      → find "UV-VIS Spectrophotometer"
 *   "dc1006", "dc 1006", "DC-1006"             → find "Drawell DC-1006 …"
 *   "meter ph", "ph meters"                    → find "Eutech pH 150 Waterproof pH Meter"
 * It looks in the product name, SKU, brand and category.
 *
 * How it works: text is split into words (at spaces/punctuation and between letters and numbers).
 * Every word you type must match the START of a word in the product — or the start of several words
 * run together, which is what makes "uvvis" find "UV-VIS". If that finds nothing, it falls back to
 * looser "appears anywhere" matching (so "photometer" still finds "spectrophotometer").
 */

export type Searchable = {
  name: string;
  sku: string;
  brand?: { name: string } | null;
  category?: { name: string } | null;
};

/** "UV-VIS 1800A, pH150" → ["uv","vis","1800","a","ph","150"] */
export function searchWords(text: string | null | undefined): string[] {
  return (text ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // é → e
    .toLowerCase()
    .replace(/µ/g, "u")
    .replace(/([a-z])(\d)/g, "$1 $2") // ph150 → ph 150
    .replace(/(\d)([a-z])/g, "$1 $2") // 1800a → 1800 a
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Does `token` match the start of a word, or the start of a run of joined words ("uvvis" ↔ "uv","vis")? */
function matchesWordStart(token: string, words: string[]): boolean {
  for (let i = 0; i < words.length; i++) {
    if (words[i][0] !== token[0]) continue; // quick skip
    let joined = "";
    for (let j = i; j < words.length && joined.length < token.length; j++) joined += words[j];
    if (joined.startsWith(token)) return true;
  }
  return false;
}

/** The token, plus its singular form ("meters" → "meter") */
function variants(token: string): string[] {
  return token.length > 3 && token.endsWith("s") ? [token, token.slice(0, -1)] : [token];
}

/** Returns the products that match `query`, best matches first. An empty query returns the list unchanged. */
export function searchProducts<T extends Searchable>(items: T[], query: string): T[] {
  const tokens = searchWords(query);
  if (tokens.length === 0) return items;
  const compactQuery = tokens.join("");

  const prepared = items.map((p) => {
    const nameWords = searchWords(p.name);
    const allWords = [...nameWords, ...searchWords(p.sku), ...searchWords(p.brand?.name), ...searchWords(p.category?.name)];
    return { p, nameWords, allWords, compactName: nameWords.join(""), compactAll: allWords.join("") };
  });

  const score = (x: (typeof prepared)[number]) => {
    let s = 0;
    if (x.compactName.startsWith(compactQuery)) s += 100;
    else if (x.compactName.includes(compactQuery)) s += 50;
    for (const t of tokens) if (variants(t).some((v) => matchesWordStart(v, x.nameWords))) s += 10;
    return s;
  };

  // 1) Strict: every typed word starts a word (or run of words) in the product
  let hits = prepared.filter((x) => tokens.every((t) => variants(t).some((v) => matchesWordStart(v, x.allWords))));
  // 2) Nothing found: every typed word appears anywhere (ignoring spaces and punctuation)
  if (hits.length === 0) hits = prepared.filter((x) => tokens.every((t) => variants(t).some((v) => x.compactAll.includes(v))));

  return hits
    .map((x) => ({ x, s: score(x) }))
    .sort((a, b) => b.s - a.s || a.x.p.name.localeCompare(b.x.p.name))
    .map(({ x }) => x.p);
}

/** Reads every row of a Supabase query in pages of 1,000 (Supabase's per-request limit). */
export async function fetchAllRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await page(from, from + 999);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}
