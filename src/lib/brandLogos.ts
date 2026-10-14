import downloaded from "./brandLogos.generated.json";

/**
 * One place for brand logos, used by the Brands pages and the "Official Distributor Partners" strip.
 * Order: logo_url set on the brand in Supabase → logo saved by `npm run logos:fetch` → remote fallback below
 * → /public/brands/<slug>.png. If none loads, the brand name is shown as text.
 */
const REMOTE: Record<string, string> = {
  "sigma-aldrich": "https://upload.wikimedia.org/wikipedia/commons/7/7d/Sigma-Aldrich_logo.jpg",
  bwb: "https://static.wixstatic.com/media/dcbfd9_ae7fce1e6d5943c4a16e36f39cdc3d5a~mv2.jpg",
};

/** The brand's logo if it really has one (no guessing), otherwise null. Used by the partners strip. */
export function knownBrandLogo(slug: string, logoUrl?: string | null): string | null {
  return logoUrl || (downloaded as Record<string, string>)[slug] || REMOTE[slug] || null;
}

export function brandLogo(slug: string, logoUrl?: string | null): string {
  return logoUrl || (downloaded as Record<string, string>)[slug] || REMOTE[slug] || `/brands/${slug}.png`;
}

/** Partners that are not (yet) brands in the database but should still appear in the partners strip. */
export const EXTRA_PARTNERS: { name: string; slug: string; website: string }[] = [
];

/**
 * Every brand we carry that has a logo in public/brands/ (the brands on the Brands page).
 * The home page "Official Distributor Partners" strip always shows these, even before their SQL import is run.
 * Add a line here when you add a new brand logo.
 */
export const CATALOGUE_BRANDS: { name: string; slug: string; website: string | null }[] = [
  { name: "DLAB", slug: "dlab", website: "https://www.dlabsci.com/" },
  { name: "Drawell", slug: "drawell", website: "https://www.drawellanalytical.com/" },
  { name: "Eutech Instruments", slug: "eutech-instruments", website: "https://www.eutechinst.com/" },
  { name: "FSTest", slug: "fstest", website: "https://www.fstestcorp.com/" },
  { name: "HORIBA", slug: "horiba", website: "https://www.horiba.com/" },
  { name: "Hyperpurex", slug: "hyperpurex", website: null },
  { name: "Innova", slug: "innova", website: null },
  { name: "Lachoi", slug: "lachoi", website: "https://www.lachoitech.com/" },
  { name: "MANTECH", slug: "mantech", website: "https://mantech-inc.com/" },
  { name: "Memmert", slug: "memmert", website: "https://www.memmertusa.com/" },
  { name: "Merck", slug: "merck", website: "https://www.sigmaaldrich.com/" },
  { name: "METTLER TOLEDO", slug: "mettler-toledo", website: "https://www.mt.com/" },
  { name: "NEWSTAR", slug: "newstar", website: null },
  { name: "PEAK Scientific", slug: "peak-scientific", website: "https://www.peakscientific.com/" },
  { name: "Precisa", slug: "precisa", website: "https://www.precisa.com/" },
  { name: "Quantek Instruments", slug: "quantek-instruments", website: "https://www.quantekinstruments.com/" },
  { name: "Steroglass", slug: "steroglass", website: "https://www.steroglass.it/" },
  { name: "STIER", slug: "stier", website: "https://www.stierlabwashers.com/" },
  { name: "Thermo Fisher", slug: "thermo-fisher", website: "https://www.thermofisher.com/" },
  { name: "VIAVI Solutions", slug: "viavi-solutions", website: "https://www.viavisolutions.com/" },
];
