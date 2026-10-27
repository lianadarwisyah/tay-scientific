import Link from "next/link";
import { ADMIN_AREAS, type Area } from "./adminGroups";
import { getAdminCounts, COUNT_LABELS } from "./counts";

/** One area (Sales, Admin / Finance or Services): a tile for each section; click a tile to open its list. */
export default async function AreaPage({ slug, children }: { slug: Area["slug"]; children?: React.ReactNode }) {
  const area = ADMIN_AREAS.find((a) => a.slug === slug)!;
  const counts = await getAdminCounts();
  return (
    <>
      <h1 className="text-4xl font-bold">{area.title}</h1>
      <p className="mt-1 text-slate">{area.text}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {area.tiles.map((t) => {
          const n = t.count ? counts[t.count] : null;
          return (
            <Link key={t.href} href={t.href} className="group rounded-xl border border-line bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-2xl font-bold group-hover:text-brand">{t.label}</h2>
                {n !== null && n !== undefined && (
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${n > 0 && COUNT_LABELS[t.count!] === "new" ? "bg-accent text-ink" : "bg-mist text-slate"}`}>
                    {n} {COUNT_LABELS[t.count!]}
                  </span>
                )}
              </div>
              <p className="mt-2 text-slate">{t.text}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-brand">Open →</span>
            </Link>
          );
        })}
      </div>
      {children}
    </>
  );
}
