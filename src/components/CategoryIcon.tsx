// Simple line icons for product categories. Falls back to a flask for any new category.
const paths: Record<string, React.ReactNode> = {
  "analytical-chemicals": <><path d="M9 3h6M10 3v6L4.8 18.3A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.7L14 9V3" /><path d="M7.5 15h9" /></>,
  "standard-chemicals": <><path d="M8 3h5M9 3v13a3 3 0 0 0 6 0V3" /><path d="M9 9h3M9 13h3" /></>,
  "industrial-chemicals": <><path d="M3 21V10l6 4v-4l6 4V5h3v16H3Z" /><path d="M7 17h2M12 17h2" /></>,
  "life-science": <><path d="M5 19c0-8 4-13 14-14 0 10-5 14-13 14" /><path d="M5 19c3-5 6-8 10-10" /></>,
  "equipment": <><path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></>,
  "environmental-equipment": <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />,
  "spectrophotometer": <path d="M3 12h3l2-6 4 12 3-9 2 3h4" />,
  "consumables": <><path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z" /><path d="m3 7 9 4 9-4M12 11v10" /></>,
};
const fallback = paths["analytical-chemicals"];

export default function CategoryIcon({ slug, size = 28 }: { slug: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[slug] ?? fallback}
    </svg>
  );
}
