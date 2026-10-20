import { createClient } from "@/lib/supabase/server";
import { formatBytes } from "@/lib/compressImage";

/**
 * Supabase plan limits used for the bars below. These are the Free plan amounts;
 * change them if you move to a paid plan (Pro: 100 GB file storage, 8 GB database).
 */
const FILE_LIMIT = 1 * 1024 * 1024 * 1024; // 1 GB
const DB_LIMIT = 500 * 1024 * 1024; // 500 MB

const BUCKET_NAMES: Record<string, string> = {
  "product-images": "Product photos", promotions: "Banners", events: "Event photos",
};

function Bar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, (used / limit) * 100);
  const color = pct >= 90 ? "bg-red-600" : pct >= 70 ? "bg-accent" : "bg-brand";
  return (
    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <div className={`h-full ${color}`} style={{ width: `${Math.max(pct, 1)}%` }} />
    </div>
  );
}

/** "Storage used" panel on the Admin dashboard. */
export default async function StorageUsage() {
  const supabase = (await createClient())!;
  const { data, error } = await supabase.rpc("admin_storage_usage");
  if (error || !data) {
    return (
      <section className="mt-10 rounded-lg border border-line bg-white p-5">
        <h2 className="text-2xl font-bold">Storage used</h2>
        <p className="mt-2 text-sm text-slate">To see how much space photos use, run <code>supabase/migration_storage_usage.sql</code> once in Supabase → SQL Editor.</p>
      </section>
    );
  }
  const usage = data as { database_bytes: number; buckets: { bucket: string; files: number; bytes: number }[] };
  const fileBytes = usage.buckets.reduce((s, b) => s + Number(b.bytes), 0);
  const filePct = (fileBytes / FILE_LIMIT) * 100;

  return (
    <section className="mt-10 rounded-lg border border-line bg-white p-5">
      <h2 className="text-2xl font-bold">Storage used</h2>
      <p className="mt-1 text-sm text-slate">Photos uploaded through Admin (products, banners, events). Photos that came with the website are not counted here.</p>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div>
          <p className="flex justify-between text-sm"><b>Uploaded photos</b><span>{formatBytes(fileBytes)} of {formatBytes(FILE_LIMIT)} ({filePct.toFixed(1)}%)</span></p>
          <Bar used={fileBytes} limit={FILE_LIMIT} />
          <ul className="mt-3 space-y-1 text-sm text-slate">
            {usage.buckets.length === 0 && <li>No photos uploaded yet.</li>}
            {usage.buckets.map((b) => (
              <li key={b.bucket} className="flex justify-between"><span>{BUCKET_NAMES[b.bucket] ?? b.bucket} ({b.files} files)</span><span>{formatBytes(Number(b.bytes))}</span></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="flex justify-between text-sm"><b>Database</b><span>{formatBytes(usage.database_bytes)} of {formatBytes(DB_LIMIT)}</span></p>
          <Bar used={usage.database_bytes} limit={DB_LIMIT} />
          <p className="mt-3 text-sm text-slate">Products, quotations, service requests, events text and settings.</p>
        </div>
      </div>
      {filePct >= 70 && (
        <p className="mt-4 rounded-md bg-accent/20 p-3 text-sm">
          Photo storage is {filePct >= 90 ? "almost full" : "filling up"}. Delete old banners or event photos you no longer need, or upgrade the Supabase plan.
        </p>
      )}
      <p className="mt-4 text-xs text-slate">Limits shown are Supabase Free plan amounts. Exact figures: Supabase → Project → Settings → Usage.</p>
    </section>
  );
}
