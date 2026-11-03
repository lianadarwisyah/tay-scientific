import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tayscientific.com.my";
  return ["", "/products", "/brands", "/services", "/events", "/careers", "/enquiry"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const }));
}
