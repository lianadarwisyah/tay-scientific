"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { company, whatsappLink } from "@/lib/company";

const nav = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/brands", label: "Brands" },
  { href: "/services", label: "Services" },
  { href: "/events", label: "Events" },
  { href: "/careers", label: "Careers" },
  { href: "/enquiry", label: "Contact" },
];

export default function Header() {
  const { count } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu when the page changes or Escape is pressed
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Utility bar */}
      <div className="no-print border-b border-line bg-mist text-xs text-slate">
        <div className="container-x flex h-9 items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <a href={`tel:${company.phone.replace(/[^+\d]/g, "")}`} className="hover:text-ink">{company.phone}</a>
            <a href={`mailto:${company.email}`} className="hidden hover:text-ink sm:inline">{company.email}</a>
            <a href={whatsappLink("Hi Tay Scientific, I would like to enquire about ")} target="_blank" rel="noopener" className="hover:text-ink">WhatsApp</a>
          </div>
          <div className="hidden items-center gap-5 md:flex">
            <a href={company.links.checkService} target="_blank" rel="noopener" className="hover:text-ink">Check Service</a>
            <Link href="/admin" className="hover:text-ink">Admin</Link>
          </div>
        </div>
      </div>

      <header className="no-print sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="container-x flex h-[72px] items-center justify-between gap-2 sm:gap-4">
          <Link href="/" className="flex shrink-0 items-center" aria-label={`${company.name} home`}>
            <Image src="/logo.png" alt={company.name} width={1527} height={354} priority className="h-7 w-auto min-[400px]:h-8 sm:h-11" />
          </Link>

          <nav className="hidden items-center gap-1 text-[15px] font-semibold md:flex" aria-label="Main">
            {nav.map((n) => (
              <div key={n.href} className="group relative">
                <Link
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-md px-3.5 py-2 hover:text-brand ${isActive(n.href) ? "text-brand" : ""}`}
                >
                  {n.label}
                </Link>
                {isActive(n.href) && <span className="pointer-events-none absolute inset-x-3.5 -bottom-[13px] h-[3px] rounded-full bg-accent" />}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/cart" className="btn-quote relative whitespace-nowrap max-[400px]:gap-1.5 max-[400px]:px-3">
              Quote cart
              <span className="rounded-full bg-ink px-2 py-0.5 text-xs text-white" aria-label={`${count} items`}>{count}</span>
            </Link>
            <button className="btn-line max-[400px]:px-3 md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav">
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {open && (
          <nav id="mobile-nav" className="border-t border-line bg-white md:hidden" aria-label="Mobile">
            <div className="container-x flex flex-col py-2">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined}
                  className={`border-b border-line/60 py-3 text-[15px] font-semibold ${isActive(n.href) ? "text-brand" : ""}`}>
                  {n.label}
                </Link>
              ))}
              <a href={company.links.checkService} target="_blank" rel="noopener" className="border-b border-line/60 py-3 text-sm text-slate">Check Service</a>
              <Link href="/admin" className="py-3 text-sm text-slate">Admin</Link>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
