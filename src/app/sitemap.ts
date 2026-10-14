import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://labstoreonline.com";
  return ["", "/products", "/brands", "/services", "/careers", "/enquiry"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const }));
}
