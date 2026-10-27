import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_AREAS } from "./adminGroups";
import { getAdminCounts } from "./counts";
import SignOutButton from "./SignOutButton";
import StorageUsage from "./StorageUsage";

export const dynamic = "force-dynamic";

/** What each dashboard box highlights */
const HIGHLIGHTS: Record<string, { key: string; label: string }[]> = {
  sales: [{ key: "newQuotes", label: "new quotations" }, { key: "newEnquiries", label: "new enquiries" }],
  finance: [{ key: "newApplications", label: "new applications" }, { key: "openJobs", label: "open jobs" }],
  services: [{ key: "newServiceRequests", label: "new requests" }, { key: "ongoingJobs", label: "jobs in service" }, { key: "calibrationsDue", label: "calibrations due" }],
};

export default async function Dashboard() {
  const supabase = (await createClient())!;
  const [{ data: { user } }, counts] = await Promise.all([supabase.auth.getUser(), getAdminCounts()]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="mt-1 text-slate">Choose an area to manage.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/" className="font-semibold text-brand hover:underline">View website ↗</Link>
          <span className="text-slate">{user?.email}</span>
          <SignOutButton />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_AREAS.map((a) => (
          <Link key={a.slug} href={`/admin/${a.slug}`}
            className="group rounded-xl border border-line bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md">
            <h2 className="text-2xl font-bold group-hover:text-brand">{a.title}</h2>
            <p className="mt-2 text-slate">{a.tiles.map((t) => t.label).join(" · ")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {HIGHLIGHTS[a.slug].map((h) => counts[h.key] !== null && (
                <span key={h.key} className={`rounded-full px-3 py-1 text-sm font-semibold ${(counts[h.key] ?? 0) > 0 ? "bg-accent text-ink" : "bg-mist text-slate"}`}>
                  {counts[h.key]} {h.label}
                </span>
              ))}
            </div>
            <span className="mt-4 inline-block text-sm font-semibold text-brand">Open →</span>
          </Link>
        ))}
      </div>

      <StorageUsage />
    </>
  );
}
