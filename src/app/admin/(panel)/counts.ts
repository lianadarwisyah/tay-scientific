import { createClient } from "@/lib/supabase/server";
import { reminderWindowEnd } from "@/lib/calibrations";

/** Numbers shown on the dashboard boxes and area tiles (null = that part is not set up yet). */
export async function getAdminCounts() {
  const supabase = (await createClient())!;
  const count = async (table: string, apply?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (apply) q = apply(q);
    const { count: n, error } = await q;
    return error ? null : n ?? 0;
  };
  const [newQuotes, newEnquiries, products, banners, events, openJobs, newServiceRequests, ongoingJobs, newApplications, calibrationsDue] = await Promise.all([
    count("quotations", (q) => q.eq("status", "new")),
    count("enquiries", (q) => q.eq("status", "new")),
    count("products"),
    count("promotions", (q) => q.eq("is_active", true)),
    count("events"),
    count("jobs", (q) => q.eq("is_open", true)),
    count("service_requests", (q) => q.eq("status", "new")),
    count("service_jobs", (q) => q.neq("status", "completed")),
    count("job_applications", (q) => q.eq("status", "new")),
    count("calibrations", (q) => q.lte("due_date", reminderWindowEnd())),
  ]);
  return { newQuotes, newEnquiries, products, banners, events, openJobs, newServiceRequests, ongoingJobs, newApplications, calibrationsDue } as Record<string, number | null>;
}

/** Short text under each tile's number */
export const COUNT_LABELS: Record<string, string> = {
  newQuotes: "new", newEnquiries: "new", products: "products", banners: "active", events: "events",
  openJobs: "open", newApplications: "new", calibrationsDue: "due / overdue", newServiceRequests: "new", ongoingJobs: "ongoing",
};
