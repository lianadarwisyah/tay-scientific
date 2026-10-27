import { REPORT_JOB_TYPES, REPORT_LETTERHEAD as L, longDate, shortDate, type ServiceJob } from "@/lib/serviceJobs";

/** Same order as the paper form */
const REPORT_WARRANTY_ORDER = ["Over warranty", "Maintenance contract", "Under warranty", "Non-TSI sales"];

/** The printable service report (same layout as the paper form SR V2.0). */
const Box = ({ on }: { on: boolean }) => <span className="mr-1 inline-block w-4 text-center">{on ? "☒" : "☐"}</span>;
const SectionLabel = ({ code, title, tight }: { code: string; title: string; tight?: boolean }) => (
  <div className={`${tight ? "mt-3" : "mt-5"} flex items-center gap-3`}>
    <span className="inline-block w-28 bg-[#FFC000] px-2 py-0.5 text-[11px] font-bold">{code}</span>
    <span className="text-[12px]">{title}</span>
  </div>
);

function Letterhead() {
  return (
    <div className="flex items-start gap-3 text-[10.5px] leading-snug">
      <div className="flex h-[86px] w-[86px] shrink-0 items-center justify-center bg-[#FFC000] p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="" className="h-full w-full object-contain" />
      </div>
      <div>
        <p className="text-[17px] font-bold">{L.name} <sup className="text-[8px]">{L.regNo}</sup></p>
        <p>[{L.hq.label}] {L.hq.address}</p>
        <p className="pl-6">Tel. No.: {L.hq.tel}</p>
        <p className="pl-6">Email: <span className="text-[#0563C1] underline">{L.hq.email}</span></p>
        <p>[{L.branch.label}] {L.branch.address}</p>
        <p className="pl-6">Tel. No.: {L.branch.tel}</p>
        <p className="pl-6">Email: <span className="text-[#0563C1] underline">{L.branch.email}</span></p>
      </div>
    </div>
  );
}

export default function ReportSheet({ j }: { j: ServiceJob }) {
  const otherType = !(REPORT_JOB_TYPES as readonly string[]).includes(j.service_type);
  const work = j.work_items.filter((w) => w.task || w.photos.length);
  const equipment = [
    { instrument: j.instrument, brand: j.brand, model: j.model, serial_number: j.serial_number },
    ...(j.extra_equipment ?? []).filter((e) => e.instrument || e.brand || e.model || e.serial_number),
  ];
  const td = "border border-black px-1.5 py-0.5";
  return (
      <article className="report-sheet mx-auto bg-white p-8 text-[11.5px] leading-snug text-black shadow-sm print:p-0 print:shadow-none" style={{ fontFamily: "Verdana, Tahoma, Arial, sans-serif", maxWidth: "210mm" }}>
        {/* The letterhead is in a table header so the browser repeats it at the top of every printed page */}
        <table className="w-full border-collapse">
          <thead><tr><td className="p-0 pb-3"><Letterhead /></td></tr></thead>
          <tbody><tr><td className="p-0 align-top">

        <div className="mt-4 flex items-start justify-between gap-4">
          <p className="text-[54px] font-bold leading-none text-[#A6A6A6]">Service Report</p>
          <div className="pt-2 text-[15px] font-bold">
            <p>SR No.: {j.sr_no}</p>
            <p>Issue Date: {longDate(j.report_date) || longDate(j.date_out)}</p>
          </div>
        </div>

        {/* A: Warranty */}
        <SectionLabel code="SECTION A" title="Warranty Status" />
        <div className="mt-2 grid grid-cols-5 gap-2">
          <span><Box on={!!j.invoice_no} />Invoice</span>
          {REPORT_WARRANTY_ORDER.map((w) => <span key={w}><Box on={j.warranty === w} />{w.replace("Maintenance contract", "Maintenance Contract")}</span>)}
        </div>
        <p className="mt-1">[Document No.: <span className="inline-block min-w-[140px] border-b border-black text-center">{j.invoice_no ?? ""}</span>]</p>

        {/* B: Job type */}
        <SectionLabel code="SECTION B" title="Job Type" />
        <div className="mt-2 grid grid-cols-4 gap-2">
          {REPORT_JOB_TYPES.map((t) => <span key={t}><Box on={j.service_type === t} />{t.replace("New unit installation", "New Unit Installation")}</span>)}
        </div>
        {otherType && <p className="mt-1"><Box on />Other: {j.service_type}</p>}

        {/* C: Customer */}
        <SectionLabel code="SECTION C" title="Customer Details" />
        <table className="mt-2 w-full border-collapse">
          <tbody>
            {[["Company Name", j.company.toUpperCase()], ["Delivery Address", (j.delivery_address ?? "").toUpperCase()], ["Contact Person", (j.contact_person ?? "").toUpperCase()],
              ["Contact No.", j.company_phone ?? ""], ["Email", j.company_email]].map(([k, v]) => (
              <tr key={k}>
                <td className={`${td} w-[150px] border-r-0`}>{k}</td>
                <td className="w-3 border-y border-black align-top">:</td>
                <td className={`${td} whitespace-pre-line border-l-0`}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* D: Equipment */}
        <SectionLabel code="SECTION D" title="Equipment Details" />
        {/* One column per instrument: only the instruments on this job, no empty columns */}
        <table className="mt-2 border-collapse" style={{ width: equipment.length > 1 ? "100%" : "auto" }}>
          <tbody>
            {([["Equipment/Item Description", "instrument"], ["Brand", "brand"], ["Model", "model"], ["Serial Number", "serial_number"]] as const).map(([label, key]) => (
              <tr key={key}>
                <td className={`${td} w-[190px] font-bold`}>{label}</td>
                {equipment.map((e, i) => (
                  <td key={i} className={`${td} min-w-[150px] text-center`}>{key === "brand" ? e.brand.toUpperCase() : e[key] || "-"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* E: Work */}
        <SectionLabel code="SECTION E" title="Work Description" />
        {/* One bordered row per item: every row has its own lines, so the table is closed on both pages
            when it runs onto the next page, and an item (with its photos) is never split between pages. */}
        <table className="mt-2 w-full border-collapse">
          <tbody>
            <tr><td className="border border-black px-2 py-1 font-bold">Work scope:</td></tr>
            {work.map((w, i) => (
              <tr key={i} className="break-inside-avoid">
                <td className="border border-black px-2 py-1.5 pl-6">
                  <p>{i + 1}.&nbsp; {w.task}{w.result ? ` – ${w.result}` : ""}{w.note ? ` (${w.note})` : ""}</p>
                  {w.photos.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 pl-4">
                      {w.photos.map((p) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={p} src={p} alt="" className="max-h-[230px] max-w-[45%] object-contain" />
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {work.length === 0 && <tr><td className="h-16 border border-black" /></tr>}
          </tbody>
        </table>

        {/* F: Time */}
        <SectionLabel code="SECTION F" title="Working/Travelling Time" />
        <table className="mt-2 w-full border-collapse text-center">
          <thead>
            <tr>{["Date", "Start", "Stop", "Working Hours", "Travelling Hours", "Distance (km)", "Overnight stay", "GA/GW"].map((h) => <th key={h} className={td}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {(j.time_logs.length ? j.time_logs : [null]).map((t, i) => (
              <tr key={i}>
                <td className={td}>{t ? shortDate(t.date) : "\u00a0"}</td>
                <td className={td}>{t?.start}</td><td className={td}>{t?.stop}</td><td className={td}>{t?.working_hours}</td>
                <td className={td}>{t?.travel_hours}</td><td className={td}>{t?.distance}</td><td className={td}>{t?.overnight}</td><td className={td}>{t?.ga_gw}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* G, H, I and the computer-generated note are kept together on the same page */}
        <div className="break-inside-avoid">
        <div className="mt-1 grid grid-cols-[1fr_330px] gap-2">
          <div>
            <SectionLabel code="SECTION G" title="Service" tight />
            <p className="mt-1">The service job is completed. The customer was informed about any changes made.</p>
            <div className="mt-1 grid grid-cols-3"><span><Box on={j.job_completed === "yes"} />Yes</span><span><Box on={j.job_completed === "no"} />No</span><span><Box on={j.job_completed === "n/a"} />N/A</span></div>
            <p className="mt-1">The instrument is <span className="ml-4"><Box on={j.repairable === "repairable"} />repairable</span><span className="ml-6"><Box on={j.repairable === "non-repairable"} />non-repairable.</span></p>
            <p className="mt-1">The service will continue on: {j.continue_on ?? ""}</p>
            <SectionLabel code="SECTION H" title="Recommendation" tight />
            <div className="mt-1 min-h-[44px] whitespace-pre-line border border-black p-1.5">{j.recommendation}</div>
          </div>
          <div className="mt-3 border border-black p-2">
            <div className="flex items-center gap-3"><span className="inline-block w-28 bg-[#FFC000] px-2 py-0.5 text-[11px] font-bold">SECTION I</span><span>Declaration</span></div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <p>Service Engineer</p>
                <p className="mt-1 italic">Name</p>
                <p className="font-bold underline">{(j.engineer_name || j.serviced_by || "").toUpperCase() || "\u00a0"}</p>
                <p className="mt-2 italic">Date</p>
                <p className="font-bold underline">{longDate(j.report_date) || "\u00a0"}</p>
              </div>
              <div>
                <p>Customer Approval</p>
                <div className="mt-1 flex h-14 items-center justify-center rounded-lg border border-[#1F3864] text-[16px] font-bold italic text-[#D9D9D9]">Signature</div>
                <p className="mt-1 italic">Name</p>
                <p className="min-h-[1.2em] border-b border-black font-bold">{j.customer_approval_name?.toUpperCase() ?? ""}</p>
                <p className="mt-1 italic">Date</p>
                <p className="min-h-[1.2em] border-b border-black font-bold">{longDate(j.customer_approval_date)}</p>
              </div>
            </div>

          </div>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-4 text-[10px]">
          <p className="italic text-[#C00000]">This is a computer-generated report by {L.name}. Only the customer&apos;s signature is required.</p>
          <p className="shrink-0 text-[9px] font-bold italic">{L.formVersion}</p>
        </div>
        </div>
          </td></tr></tbody>
        </table>
      </article>
  );
}
