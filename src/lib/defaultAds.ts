import type { Slide } from "@/components/HeroBanner";

/**
 * Ready-made banners (1920 × 800 images in /public/ads/).
 *
 * All home page banners are managed in Admin → Promotions: add, hide, delete and reorder them there.
 * These ready-made banners appear in Admin → Promotions under "Ready-made banners" with an "Add to slider" button,
 * so staff can put them back at any time without uploading anything.
 *
 * Fallback: only while Admin → Promotions has no banners at all, the home page shows the first three below,
 * so the slider is never empty on a fresh site.
 */
export type BuiltInBanner = Slide & { ends_on?: string | null; note?: string };

export const builtInBanners: BuiltInBanner[] = [
  { id: "ad-tay", title: "Tay Scientific: your one-stop laboratory supply centre, Johor Bahru and Sabah", image_url: "/ads/banner-tay.jpg", link_url: "/#about" },
  { id: "ad-lachoi", title: "LACHOI: new generation lab equipment, now at Tay Scientific", image_url: "/ads/banner-lachoi.jpg", link_url: "/brands/lachoi" },
  { id: "ad-fstest", title: "FSTest: food safety testing made fast", image_url: "/ads/banner-fstest.jpg", link_url: "/brands/fstest" },
  {
    id: "ad-mantech-promo", title: "MANTECH MT3 & MT4: save 25%", image_url: "/ads/banner-mantech-promo.jpg", link_url: "/brands/mantech",
    ends_on: "2026-12-31", note: "Offer ends 31 Dec 2026",
  },
];

/** Shown only when no banners have been added in Admin → Promotions yet. */
export const defaultAds: Slide[] = builtInBanners.slice(0, 3).map(({ id, title, image_url, link_url }) => ({ id, title, image_url, link_url }));
