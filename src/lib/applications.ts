/** Statuses staff can set on a job application (must match supabase/migration_job_applications.sql). */
export const APPLICATION_STATUSES = ["new", "shortlisted", "interview", "rejected", "hired"] as const;

export const APPLICATION_STATUS_STYLE: Record<string, string> = {
  new: "bg-accent/25 text-ink", shortlisted: "bg-brand-soft text-brand-dark", interview: "bg-purple-100 text-purple-800",
  rejected: "bg-mist text-slate", hired: "bg-green-100 text-green-800",
};
