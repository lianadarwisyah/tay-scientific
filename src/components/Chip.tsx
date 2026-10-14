import Link from "next/link";

/** Filter button. `pill` is a small rounded chip; `tab` is a square tab. The active one is dark. */
export default function Chip({ href, active, children, variant = "pill" }: { href: string; active?: boolean; children: React.ReactNode; variant?: "pill" | "tab" }) {
  const shape = variant === "tab" ? "rounded-sm px-5 py-3 text-[15px]" : "rounded-full px-4 py-1.5 text-sm";
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`border font-medium transition ${shape} ${active ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink/40"}`}
    >
      {children}
    </Link>
  );
}
