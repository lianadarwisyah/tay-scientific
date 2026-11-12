import { company } from "@/lib/company";

/** The live website address, used to make full links for Google (e.g. https://tayscientific.com.my/products/x). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tayscientific.com.my").replace(/\/$/, "");
export const absoluteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

/** "+607-353 9250" → "+60-7-353-9250"-style digits Google accepts: keep + and digits only. */
const tel = (s: string) => s.replace(/[^\d+]/g, "");

/** Johor main office as structured data: name, address, phone, opening hours and the Sabah branch. */
export function organizationSchema() {
  const [main, sabah] = company.branches;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: company.name,
    alternateName: company.shortName,
    url: SITE_URL,
    logo: absoluteUrl("/logo.png"),
    image: absoluteUrl("/tay-scientific-building.jpg"),
    email: company.email,
    telephone: tel(company.phone),
    description: company.about[0],
    foundingDate: "1979",
    areaServed: "MY",
    contactPoint: [
      { "@type": "ContactPoint", contactType: "sales", telephone: tel(company.phone), email: company.email, areaServed: "MY", availableLanguage: ["en", "ms"] },
      { "@type": "ContactPoint", contactType: "customer service", telephone: `+${company.whatsapp}`, areaServed: "MY" },
    ],
    department: [main, sabah].filter(Boolean).map((b, i) => ({
      "@type": "LocalBusiness",
      "@id": `${SITE_URL}/#location-${i + 1}`,
      name: `${company.name} – ${b.name}`,
      image: absoluteUrl("/tay-scientific-building.jpg"),
      telephone: tel(b.phones[0]),
      email: b.email,
      address: i === 0
        ? { "@type": "PostalAddress", streetAddress: "No. 6, Jalan Mutiara 4, Taman Perindustrian Plentong", addressLocality: "Masai", postalCode: "81750", addressRegion: "Johor", addressCountry: "MY" }
        : { "@type": "PostalAddress", streetAddress: "Lot 3, Block C, Ground Floor & 1st Floor, Lorong Buah Salak 4, Hiong Tiong Industrial Centre, Mile 7, Jalan Tuaran", addressLocality: "Inanam", postalCode: "88450", addressRegion: "Sabah", addressCountry: "MY" },
      openingHoursSpecification: [{
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: i === 0 ? "08:30" : "08:00",
        closes: i === 0 ? "17:30" : "17:00",
      }],
    })),
  };
}

/** The website itself (lets Google offer a search box that searches the product catalogue). */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: company.name,
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/products?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** "Home / Products / pH meters / LAQUAtwin pH-22" for Google. */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

/** Short plain-text description (search results show about 155 characters). */
export function snippet(text: string | null | undefined, max = 155): string | undefined {
  if (!text) return undefined;
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : t;
}
