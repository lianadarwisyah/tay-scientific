"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Job } from "@/lib/jobs";
import { openApplication } from "./ApplicationForm";

const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const DocIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z" /><path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
);

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-7">
      <h3 className="border-l-4 border-accent pl-3 text-2xl font-bold">{title}</h3>
      <ul className="mt-3 space-y-2 pl-1">
        {items.map((t) => (
          <li key={t} className="flex gap-3 leading-relaxed">
            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CareersBoard({ jobs }: { jobs: Job[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const job = jobs.find((j) => j.slug === slug) ?? null;

  const openJob = useCallback((s: string) => {
    setSlug(s);
    history.replaceState(null, "", `#${s}`);
  }, []);

  const closeJob = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // Open the window whenever a job is selected
  useEffect(() => {
    const d = dialogRef.current;
    if (job && d && !d.open) d.showModal();
  }, [job]);

  // Lock page scroll while the window is open
  useEffect(() => {
    document.body.style.overflow = job ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [job]);

  // Support links like /careers#service-engineer
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (h && jobs.some((j) => j.slug === h)) setSlug(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [jobs]);

  return (
    <div className="theme-roles">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map((j) => (
          <li key={j.slug}>
            <button
              type="button"
              onClick={() => openJob(j.slug)}
              aria-haspopup="dialog"
              className="group flex h-full w-full flex-col rounded-lg border border-line border-t-4 border-t-brand bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-t-accent hover:shadow-md"
            >
              <span className="w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">{j.department}</span>
              <span className="mt-4 font-display text-[28px] font-bold uppercase leading-none tracking-tight">{j.title}</span>
              <span className="mt-3 text-slate">{j.teaser}</span>
              <span className="mt-6 flex items-center justify-between gap-3 border-t border-dashed border-line pt-4 text-sm">
                <span className="flex items-center gap-1.5 text-slate"><PinIcon />{j.location}</span>
                <span className="flex items-center gap-1.5 font-semibold text-brand group-hover:gap-2.5">
                  View role <ArrowIcon />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-labelledby="job-title"
        onClose={() => { setSlug(null); history.replaceState(null, "", window.location.pathname + window.location.search); }}
        onClick={(e) => { if (e.target === dialogRef.current) closeJob(); }}
        className="dialog-in m-auto w-[min(760px,calc(100%-1.5rem))] overflow-hidden rounded-xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/70"
      >
        {job && (
          <div className="flex max-h-[88vh] flex-col">
            {/* Header */}
            <div className="relative border-b border-line px-6 pb-5 pt-7 sm:px-8">
              <button type="button" onClick={closeJob} aria-label="Close" className="absolute right-4 top-4 rounded-md p-2 text-slate hover:bg-mist hover:text-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
              <p className="text-sm font-semibold text-brand">{job.department}</p>
              <h2 id="job-title" className="mt-1 pr-10 text-4xl font-bold uppercase sm:text-5xl">{job.title}</h2>
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate">
                <span className="flex items-center gap-1.5"><PinIcon />{job.location}</span>
                <span>{job.type}</span>
              </p>
            </div>

            {/* Description: what the job is, then details */}
            <div className="overflow-y-auto px-6 pb-6 pt-6 sm:px-8">
              <section>
                <h3 className="border-l-4 border-accent pl-3 text-2xl font-bold">About the role</h3>
                <p className="mt-3 text-lg leading-relaxed">{job.summary}</p>
              </section>
              <Section title="Job responsibilities" items={job.responsibilities} />
              <Section title="Qualifications & requirements" items={job.requirements} />
              <Section title="What we offer" items={job.offer} />
            </div>

            {/* Apply Now at the bottom */}
            <div className="flex flex-col gap-3 border-t border-line bg-bench px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="text-sm text-slate">
                Fill in the form and upload your CV. It takes about 2 minutes.
              </p>
              <button
                type="button"
                onClick={() => { const title = job.title; closeJob(); openApplication(title); }}
                className="btn-quote px-7 py-3 text-base"
              >
                <DocIcon /> Apply Now
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
