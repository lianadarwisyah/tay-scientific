import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tayscientific.com.my";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/cart"] }, sitemap: `${base}/sitemap.xml` };
}
