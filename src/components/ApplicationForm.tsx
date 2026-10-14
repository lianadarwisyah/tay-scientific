"use client";
import { useEffect, useRef, useState } from "react";
import type { Job } from "@/lib/jobs";
import { company } from "@/lib/company";

const MAX_MB = 4;
const ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Other components call this to pick a role in the form and scroll to it. */
export function openApplication(jobTitle?: string) {
  window.dispatchEvent(new CustomEvent("careers:apply", { detail: jobTitle ?? "" }));
}

const UploadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
);
const FileIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z" /><path d="M14 3v5h5" />
  </svg>
);

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ApplicationForm({ jobs }: { jobs: Job[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  // "Apply Now" in a job window picks that role here and scrolls down
  useEffect(() => {
    const onApply = (e: Event) => {
      const title = (e as CustomEvent<string>).detail;
      setPosition(title || "General application");
      setState((s) => (s === "sent" ? "idle" : s));
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => document.getElementById("app-name")?.focus({ preventScroll: true }), 500);
      });
    };
    window.addEventListener("careers:apply", onApply);
    return () => window.removeEventListener("careers:apply", onApply);
  }, []);

  function pickFile(f: File | null | undefined) {
    setFileError("");
    if (!f) return setFile(null);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "doc", "docx"].includes(ext)) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      return setFileError("Please upload a PDF or Word file (.pdf, .doc, .docx).");
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      return setFileError(`This file is ${formatSize(f.size)}. The maximum is ${MAX_MB} MB.`);
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setFileError("Please attach your CV.");
      fileRef.current?.focus();
      return;
    }
    setState("busy");
    setError("");
    const data = new FormData(e.currentTarget);
    data.set("cv", file); // covers files added by drag and drop
    try {
      const res = await fetch("/api/careers", { method: "POST", body: data });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setState("sent");
        formRef.current?.reset();
        setFile(null);
        setPosition("");
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        setError(json.error || (res.status === 413 ? `Your CV is too large. Please upload a file under ${MAX_MB} MB.` : "Your application could not be sent. Please try again."));
        setState("error");
      }
    } catch {
      setError("Your application could not be sent. Please check your connection and try again.");
      setState("error");
    }
  }

  return (
    <section id="apply" ref={sectionRef} className="scroll-mt-24 border-y border-line bg-white py-16">
      <div className="container-x grid gap-10 md:grid-cols-[1fr_1.6fr] md:gap-16">
        <div>
          <h2 className="text-4xl font-bold sm:text-5xl">Apply now</h2>
          <p className="mt-4 text-lg text-slate">
            Fill in your details, upload your CV and press Submit. Your application goes straight to our hiring team.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate">
            <li>CV in PDF or Word format, up to {MAX_MB} MB.</li>
            <li>We contact shortlisted applicants by phone or email.</li>
            <li>
              Trouble with the form? Email your CV to{" "}
              <a href={`mailto:${company.careersEmail}`} className="font-medium text-brand underline">{company.careersEmail}</a>.
            </li>
          </ul>
        </div>

        {state === "sent" ? (
          <div className="h-fit rounded-lg bg-brand-soft p-8" role="status">
            <p className="font-display text-3xl font-bold">Application sent</p>
            <p className="mt-2">Thank you for applying to {company.shortName}. Our team will review your CV and contact you if you are shortlisted.</p>
            <button type="button" onClick={() => setState("idle")} className="btn-line mt-6 px-5 py-2.5">Send another application</button>
          </div>
        ) : (
          <form ref={formRef} onSubmit={onSubmit} className="space-y-4 rounded-lg border border-line bg-bench p-6 sm:p-8">
            <div>
              <label className="label" htmlFor="app-position">Position applying for *</label>
              <select id="app-position" name="position" required value={position} onChange={(e) => setPosition(e.target.value)} className="field">
                <option value="" disabled>Choose a position</option>
                {jobs.map((j) => <option key={j.slug} value={j.title}>{j.title}</option>)}
                <option value="General application">Other / General application</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="app-name">Full name *</label><input id="app-name" name="name" required maxLength={120} autoComplete="name" className="field" /></div>
              <div><label className="label" htmlFor="app-email">Email *</label><input id="app-email" name="email" type="email" required maxLength={200} autoComplete="email" className="field" /></div>
              <div><label className="label" htmlFor="app-phone">Phone / WhatsApp *</label><input id="app-phone" name="phone" type="tel" required maxLength={40} autoComplete="tel" placeholder="e.g. 012-345 6789" className="field" /></div>
              <div><label className="label" htmlFor="app-location">Current location</label><input id="app-location" name="location" maxLength={120} placeholder="e.g. Johor Bahru" className="field" /></div>
              <div><label className="label" htmlFor="app-salary">Expected salary (RM)</label><input id="app-salary" name="salary" maxLength={60} placeholder="e.g. 3,000" className="field" /></div>
              <div><label className="label" htmlFor="app-start">Available to start</label><input id="app-start" name="start" maxLength={60} placeholder="e.g. Immediately / 1 month notice" className="field" /></div>
            </div>

            <div>
              <label className="label" htmlFor="app-message">Tell us about yourself</label>
              <textarea id="app-message" name="message" rows={4} maxLength={4000} placeholder="Your experience, skills, or why you want to join us (optional)" className="field" />
            </div>

            {/* CV upload */}
            <div>
              <span className="label" id="cv-label">Upload your CV *</span>
              <label
                htmlFor="app-cv"
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
                className={`flex cursor-pointer items-center gap-4 rounded-md border-2 border-dashed px-4 py-5 transition ${
                  dragging ? "border-brand bg-brand-soft" : fileError ? "border-red-400 bg-white" : "border-line bg-white hover:border-brand"
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
                  {file ? <FileIcon /> : <UploadIcon />}
                </span>
                {file ? (
                  <span className="min-w-0 text-sm">
                    <span className="block truncate font-semibold">{file.name}</span>
                    <span className="text-slate">{formatSize(file.size)} · click to change</span>
                  </span>
                ) : (
                  <span className="text-sm">
                    <span className="block font-semibold">Click to choose a file, or drag it here</span>
                    <span className="text-slate">PDF, DOC or DOCX, up to {MAX_MB} MB</span>
                  </span>
                )}
              </label>
              <input
                ref={fileRef}
                id="app-cv"
                name="cv"
                type="file"
                accept={ACCEPT}
                aria-labelledby="cv-label"
                aria-describedby={fileError ? "cv-error" : undefined}
                onChange={(e) => pickFile(e.target.files?.[0])}
                className="sr-only"
              />
              {file && (
                <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="mt-2 text-sm text-slate underline hover:text-ink">
                  Remove file
                </button>
              )}
              {fileError && <p id="cv-error" role="alert" className="mt-2 text-sm font-medium text-red-700">{fileError}</p>}
            </div>

            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="consent" value="yes" required className="mt-0.5 h-4 w-4 shrink-0 accent-brand" />
              <span className="text-slate">
                I agree that {company.name} may use my details and CV to assess my job application, in line with the Personal Data Protection Act 2010. *
              </span>
            </label>

            {/* Honeypot: hidden from people, filled in by spam bots */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="app-website">Leave this field empty</label>
              <input id="app-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>

            {state === "error" && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}

            <button type="submit" disabled={state === "busy"} className="btn-quote w-full px-7 py-3 text-base sm:w-auto disabled:opacity-60">
              {state === "busy" ? "Sending application..." : "Submit application"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
