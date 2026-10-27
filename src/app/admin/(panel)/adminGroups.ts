/** The three admin areas: shown as boxes on the dashboard, each opening a page of tiles. */
export type AreaTile = { href: string; label: string; text: string; count?: string };
export type Area = { slug: "sales" | "finance" | "services"; title: string; text: string; tiles: AreaTile[] };

export const ADMIN_AREAS: Area[] = [
  {
    slug: "sales", title: "Sales",
    text: "Quotations, enquiries, products and banners.",
    tiles: [
      { href: "/admin/quotations", label: "Quotations", text: "Quote requests from the website cart.", count: "newQuotes" },
      { href: "/admin/enquiries", label: "Enquiries", text: "Messages from the contact form.", count: "newEnquiries" },
      { href: "/admin/products", label: "Products", text: "Add, edit and hide products.", count: "products" },
      { href: "/admin/promotions?area=sales", label: "Banners", text: "Home page banner slider.", count: "banners" },
      { href: "/admin/events", label: "Events", text: "Seminars and events on the Events page.", count: "events" },
    ],
  },
  {
    slug: "finance", title: "Admin / Finance",
    text: "Career jobs and banners.",
    tiles: [
      { href: "/admin/jobs", label: "Career jobs", text: "Who applied for a job, with their CV. Manage openings here too.", count: "newApplications" },
      { href: "/admin/promotions?area=finance", label: "Banners", text: "Home page banner slider.", count: "banners" },
    ],
  },
  {
    slug: "services", title: "Services",
    text: "Service requests, the service portal and the calibration log.",
    tiles: [
      { href: "/admin/service-requests", label: "New service requests", text: "Requests from the Services page form.", count: "newServiceRequests" },
      { href: "/admin/service-portal", label: "Service portal", text: "Instruments in service and service reports.", count: "ongoingJobs" },
      { href: "/admin/calibrations", label: "Calibration log", text: "Calibrations, due dates and automatic due reminders.", count: "calibrationsDue" },
    ],
  },
];

/** Which area a page belongs to (for the "Dashboard / Sales / Quotations" links at the top). */
export function areaFor(pathname: string, areaParam?: string | null): Area | null {
  const seg = pathname.split("/")[2] ?? "";
  if (seg === "sales" || seg === "finance" || seg === "services") return ADMIN_AREAS.find((a) => a.slug === seg) ?? null;
  if (seg === "promotions") return ADMIN_AREAS.find((a) => a.slug === (areaParam === "finance" ? "finance" : "sales")) ?? null;
  return ADMIN_AREAS.find((a) => a.tiles.some((t) => t.href.split("?")[0].split("/")[2] === seg)) ?? null;
}
