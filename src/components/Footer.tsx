import Link from "next/link";
import Image from "next/image";
import { company, whatsappLink } from "@/lib/company";

export default function Footer() {
  return (
    <footer id="contact" className="no-print mt-24 bg-ink text-white">
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr]">
        <div>
          <div className="inline-block rounded-md bg-white px-3 py-2">
            <Image src="/logo.png" alt={company.name} width={1527} height={354} className="h-9 w-auto" />
          </div>
          <p className="mt-4 max-w-xs text-sm text-white/70">{company.tagline}</p>
          <a href={whatsappLink("Hi Tay Scientific, I would like to enquire about ")} target="_blank" rel="noopener" className="btn-wa mt-5">
            Chat on WhatsApp
          </a>
        </div>

        {company.branches.map((b) => (
          <div key={b.name} className="text-sm text-white/80">
            <p className="font-display text-lg font-semibold text-white">{b.name}</p>
            <address className="mt-3 not-italic">{b.address}</address>
            {b.phones.map((p) => (
              <p key={p} className="mt-1"><a className="hover:text-white" href={`tel:${p.replace(/[^+\d]/g, "")}`}>{p}</a></p>
            ))}
            <p className="mt-1"><a className="underline decoration-white/30 hover:decoration-white" href={`mailto:${b.email}`}>{b.email}</a></p>
            <p className="mt-2 text-white/60">{b.hours}</p>
          </div>
        ))}

        <div className="text-sm">
          <p className="font-display text-lg font-semibold">Explore</p>
          <ul className="mt-3 space-y-2 text-white/80">
            <li><Link className="hover:text-white" href="/products">All products</Link></li>
            <li><Link className="hover:text-white" href="/brands">Brands</Link></li>
            <li><Link className="hover:text-white" href="/services">Services</Link></li>
            <li><Link className="hover:text-white" href="/careers">Careers</Link></li>
            <li><Link className="hover:text-white" href="/enquiry">Send an enquiry</Link></li>
            <li><a className="hover:text-white" href={company.mainSite} target="_blank" rel="noopener">Company website</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} {company.name}. All rights reserved.
      </div>
    </footer>
  );
}
