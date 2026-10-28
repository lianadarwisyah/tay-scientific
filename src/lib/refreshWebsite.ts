/**
 * After an admin change (products, banners, events, jobs), clear the public website cache so the change
 * shows straight away instead of within a minute. Safe to call any time; never throws.
 */
export function refreshWebsite(): void {
  fetch("/api/revalidate", { method: "POST" }).catch(() => {});
}
