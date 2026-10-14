/** Path inside the "product-images" bucket for a photo uploaded from the admin panel (null for other photos). */
export function productImagePath(url: string | null): string | null {
  if (!url) return null;
  const marker = "/storage/v1/object/public/product-images/";
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

/** Turns a product name into a web address part, e.g. "DLAB MS7-H550-Pro Stirrer" → "dlab-ms7-h550-pro-stirrer". */
export function slugify(s: string): string {
  return s.toLowerCase().replace(/\+/g, " plus ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}
