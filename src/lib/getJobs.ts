import { createClient } from "@/lib/supabase/server";
import { jobs as fallbackJobs, type Job } from "@/lib/jobs";

const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);

/**
 * Open jobs for the Careers page, managed in Admin → Career jobs (table "jobs").
 * Falls back to src/lib/jobs.ts until supabase/migration_jobs.sql has been run.
 */
export async function getOpenJobs(): Promise<Job[]> {
  const supabase = await createClient();
  if (!supabase) return fallbackJobs;
  const { data, error } = await supabase.from("jobs").select("*").eq("is_open", true).order("sort_order").order("title");
  if (error) return fallbackJobs;
  return (data ?? []).map((j) => ({
    slug: j.slug, title: j.title, department: j.department, location: j.location, type: j.type,
    teaser: j.teaser, summary: j.summary,
    responsibilities: list(j.responsibilities), requirements: list(j.requirements), offer: list(j.offer),
  }));
}
