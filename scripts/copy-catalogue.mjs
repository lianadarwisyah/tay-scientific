/**
 * Makes the NEW Supabase project's website content exactly the same as the OLD project's:
 * categories, brands, products, banners (promotions), events, job openings, services and site text.
 * The new project's copies of these tables are emptied first, then filled with the old project's rows
 * (same IDs, so products keep their brand and category). Customer records (quotations, enquiries,
 * service jobs, calibrations, applications) are NOT touched.
 *
 * Run AFTER the 7 SQL files have been run in the new project.
 * Put this file in the project's "scripts" folder, then in PowerShell, inside the tay-scientific folder:
 *   $env:OLD_URL="https://glnjjjtxnebrjiqeianm.supabase.co"
 *   $env:OLD_SERVICE_KEY="old project's secret / service_role key"
 *   $env:NEW_URL="https://tkgvlrzuwawphwmyecln.supabase.co"
 *   $env:NEW_SERVICE_KEY="new project's secret / service_role key"
 *   node scripts/copy-catalogue.mjs
 * Safe to run again.
 */
import { createClient } from "@supabase/supabase-js";

// Copied in this order (products last, because they point to brands and categories)
const TABLES = [
  { name: "categories", key: "id" },
  { name: "brands", key: "id" },
  { name: "products", key: "id" },
  { name: "promotions", key: "id" },
  { name: "events", key: "id" },
  { name: "jobs", key: "id" },
  { name: "services", key: "id" },
  { name: "site_content", key: "key" },
];

const { OLD_URL, OLD_SERVICE_KEY, NEW_URL, NEW_SERVICE_KEY } = process.env;
if (!OLD_URL || !OLD_SERVICE_KEY || !NEW_URL || !NEW_SERVICE_KEY) {
  console.error("Set OLD_URL, OLD_SERVICE_KEY, NEW_URL and NEW_SERVICE_KEY first (see the top of this file).");
  process.exit(1);
}
if (OLD_URL === NEW_URL) { console.error("OLD_URL and NEW_URL are the same project. Stopping."); process.exit(1); }
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const oldDb = createClient(OLD_URL, OLD_SERVICE_KEY, opts);
const newDb = createClient(NEW_URL, NEW_SERVICE_KEY, opts);

async function readAll(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await oldDb.from(table).select("*").range(from, from + 999);
    if (error) throw new Error(`read ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

/** Insert in batches. If the new project lacks a column the old one has, that column is left out. */
async function insertAll(table, rows) {
  let skip = new Set();
  for (let i = 0; i < rows.length; i += 500) {
    let batch = rows.slice(i, i + 500);
    for (;;) {
      const clean = batch.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !skip.has(k))));
      const { error } = await newDb.from(table).insert(clean);
      if (!error) break;
      const missing = error.message.match(/Could not find the '([^']+)' column/);
      if (missing && !skip.has(missing[1])) { skip.add(missing[1]); console.warn(`  (skipping column "${missing[1]}", not in the new project)`); continue; }
      throw new Error(`insert ${table}: ${error.message}`);
    }
  }
}

// 1) Read everything from the old project first (nothing is changed if this fails)
const data = {};
for (const t of TABLES) {
  try { data[t.name] = await readAll(t.name); console.log(`Read ${t.name}: ${data[t.name].length}`); }
  catch (e) { console.warn(`Skipping ${t.name}: ${e.message}`); }
}
if (!data.products?.length) { console.error("No products read from the old project. Check OLD_URL and OLD_SERVICE_KEY. Nothing was changed."); process.exit(1); }

// 2) Empty the new project's tables (products first), then fill them in order
for (const t of [...TABLES].reverse()) {
  if (!data[t.name]) continue;
  const { error } = await newDb.from(t.name).delete().not(t.key, "is", null);
  if (error) { console.error(`Could not empty ${t.name}: ${error.message}`); process.exit(1); }
}
for (const t of TABLES) {
  if (!data[t.name]) continue;
  await insertAll(t.name, data[t.name]);
  console.log(`Copied ${t.name}: ${data[t.name].length}`);
}

const { count } = await newDb.from("products").select("id", { count: "exact", head: true }).eq("is_active", true);
console.log(`\nDone. Active products in the new project: ${count}`);
