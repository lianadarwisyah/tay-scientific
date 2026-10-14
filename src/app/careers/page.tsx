import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import CareersBoard from "@/components/CareersBoard";
import ApplicationForm from "@/components/ApplicationForm";
import { jobs } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join Tay Scientific Instruments. See our open roles in sales, accounts, operations, store, service and customer service in Johor Bahru.",
};

const reasons = [
  { title: "Work that matters to labs", text: "Our instruments, reagents and service keep research, testing and teaching labs running across Malaysia." },
  { title: "People from all backgrounds", text: "We welcome driven and dedicated professionals, whether you are a fresh graduate or have years of experience." },
  { title: "Room to learn and grow", text: "Learn the products and brands we carry, and grow your career with a global company with an inspiring work environment." },
];

const steps = [
  { title: "Choose a role", text: "Open any role below to read what the job involves." },
  { title: "Fill in the form", text: "Click Apply Now, enter your details and upload your CV (PDF or Word)." },
  { title: "Submit", text: "Your application goes straight to our hiring team, who contact you if you are shortlisted." },
];

export default function CareersPage() {
  return (
    <>
      <PageHeader
        photo="/tay-scientific-building.jpg"
        slot="careers"
        photoPosition="center 12%"
        title="Careers"
        crumbs={[{ label: "Careers" }]}
        intro="Tay Scientific Instruments attracts driven and talented professionals from all backgrounds."
      />

      {/* Why join */}
      <section className="container-x py-16">
        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16">
          <div>
            <h2 className="text-4xl font-bold sm:text-5xl">Build your career with us</h2>
            <p className="mt-4 text-lg text-slate">
              We welcome driven and dedicated professionals eager to grow their careers with us. We value diversity, foster innovation and offer an inspiring work environment.
            </p>
          </div>
          <dl className="grid gap-px overflow-hidden rounded-lg border border-line bg-line">
            {reasons.map((r) => (
              <div key={r.title} className="bg-white p-6">
                <dt className="font-display text-2xl font-semibold">{r.title}</dt>
                <dd className="mt-1 text-slate">{r.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Open roles */}
      <section id="roles" className="scroll-mt-24 border-y border-line bg-white py-16">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-4xl font-bold sm:text-5xl">Open roles</h2>
            <p className="text-slate">{jobs.length} openings in Johor Bahru</p>
          </div>
          <p className="mt-2 max-w-2xl text-slate">Select a role to see what the job is about, what we look for and what we offer.</p>
          <div className="mt-8">
            <CareersBoard jobs={jobs} />
          </div>
        </div>
      </section>

      {/* How to apply: a real sequence */}
      <section className="container-x py-16">
        <h2 className="text-4xl font-bold sm:text-5xl">How to apply</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink font-display text-2xl font-bold text-white" aria-hidden="true">{i + 1}</span>
              <div>
                <h3 className="text-2xl font-semibold">{s.title}</h3>
                <p className="mt-1 text-slate">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* General application */}
      <section className="container-x pb-16">
        <div className="rounded-lg bg-ink px-8 py-12 text-white md:flex md:items-center md:justify-between md:gap-10">
          <div>
            <h2 className="text-4xl font-bold">Do not see your role?</h2>
            <p className="mt-2 max-w-lg text-white/75">Send us your CV anyway and tell us what you are good at. We keep it in mind for future openings.</p>
          </div>
          <a href="#apply" className="btn-quote mt-6 px-7 py-3 text-base md:mt-0">Send your CV</a>
        </div>
      </section>
      {/* Application form: sends details + CV to company.careersEmail */}
      <ApplicationForm jobs={jobs} />

    </>
  );
}
