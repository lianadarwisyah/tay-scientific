import Link from "next/link";
import Image from "next/image";
import { createPublicClient as createClient } from "@/lib/supabase/public";
import { company } from "@/lib/company";
import { jobs } from "@/lib/jobs";
import OurProducts from "@/components/OurProducts";
import PartnersMarquee, { type PartnerBrand } from "@/components/PartnersMarquee";
import HeroBanner from "@/components/HeroBanner";
import { defaultAds } from "@/lib/defaultAds";
import { todayMY, type Product, type Service, type Promotion } from "@/lib/types";

export const revalidate = 60; // cached for speed; Admin saves refresh it straight away

export default async function Home() {
  const supabase = createClient();
  let featured: Product[] = [], services: Service[] = [], promos: Promotion[] = [], partnerBrands: PartnerBrand[] = [];
  let usePromotionsOnly = false;

  if (supabase) {
    const today = todayMY();
    const [f, s, pr, br, anyPromo] = await Promise.all([
      // "Our Products" row: featured products first, then others that have a photo
      supabase.from("products").select("id,sku,name,slug,image_url,brand:brands(name,slug)").eq("is_active", true)
        .not("image_url", "is", null).order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(80),
      supabase.from("services").select("id,title,description").eq("is_active", true).order("sort_order"),
      // Promotions running today (set in Admin → Promotions)
      supabase.from("promotions").select("*").eq("is_active", true).lte("starts_on", today)
        .or(`ends_on.is.null,ends_on.gte.${today}`).order("sort_order").order("created_at", { ascending: false }).limit(12),
      // Every brand, for the "Official Distributor Partners" strip
      supabase.from("brands").select("name,slug,website_url,logo_url").order("name"),
      // Has staff added any banner in Admin → Promotions (live or not)? If so, the slider shows only those.
      supabase.from("promotions").select("id", { count: "exact", head: true }),
    ]);
    usePromotionsOnly = !anyPromo.error && (anyPromo.count ?? 0) > 0;
    partnerBrands = (br.data as PartnerBrand[]) ?? [];
    // One card per photo (several models share a catalogue photo), up to 12 cards
    const seen = new Set<string>();
    featured = ((f.data as unknown as Product[]) ?? []).filter((p) => {
      if (!p.image_url || seen.has(p.image_url)) return false;
      seen.add(p.image_url);
      return true;
    }).slice(0, 12);
    services = s.data ?? [];
    // Live banners, in the order set in Admin → Promotions
    promos = (pr.data as Promotion[]) ?? [];
  }

  return (
    <>
      {/* Hero: full-width banner slider (uploaded promotions first, then the built-in company banners) */}
      <section className="bg-white">
        <div className="container-x pb-12 pt-6">
          <h1 className="sr-only">{company.name}: laboratory instruments and supplies, quoted for your lab</h1>
          <HeroBanner
            slides={[
              ...promos.map((p) => ({ id: p.id, title: p.title, image_url: p.image_url, link_url: p.link_url })),
              // Ready-made banners only until staff manage banners in Admin → Promotions
              ...(usePromotionsOnly ? [] : defaultAds),
            ]}
          />
        </div>
      </section>

      {/* About */}
      <section id="about" className="container-x scroll-mt-20 py-20">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <h2 className="text-4xl font-bold sm:text-5xl">About {company.shortName}</h2>
            <p className="mt-1 text-sm text-slate">{company.name}</p>
            <div className="mt-6 space-y-5 text-lg leading-relaxed">
              {company.about.map((p) => <p key={p}>{p}</p>)}
            </div>
          </div>
          <figure>
            <Image
              src="/tay-scientific-building.jpg"
              alt="The Tay Scientific Instruments Sdn Bhd building in Masai, Johor"
              width={636}
              height={424}
              sizes="(min-width: 768px) 560px, 100vw"
              className="h-auto w-full rounded-lg border border-line"
            />
            <figcaption className="mt-2 text-sm text-slate">Our main office in Masai, Johor</figcaption>
          </figure>
        </div>
        <dl className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
          {company.highlights.map((h) => (
            <div key={h.title} className="bg-white p-6">
              <dt className="font-display text-2xl font-semibold text-brand">{h.title}</dt>
              <dd className="mt-1 text-slate">{h.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Our Products (sliding row) */}
      {featured.length > 0 && <OurProducts products={featured} />}

      {/* Services */}
      {services.length > 0 && (
        <section className="container-x py-20">
          <h2 className="text-4xl font-bold sm:text-5xl">What we do for your lab</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {services.map((s) => (
              <div key={s.id} className="rounded-lg border border-line border-l-4 border-l-accent bg-white p-6">
                <h3 className="text-2xl font-semibold">{s.title}</h3>
                <p className="mt-1 max-w-md text-slate">{s.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Careers + quote CTAs */}
      <section className="container-x pb-4 pt-4">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-lg bg-ink px-8 py-10 text-white">
            <h2 className="text-4xl font-bold">Have a list of items?</h2>
            <p className="mt-2 max-w-md text-white/75">Add products to your quote cart, or send us an enquiry if you cannot find what you need.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/cart" className="btn-quote px-6 py-3">Request a quotation</Link>
              <Link href="/enquiry" className="btn border border-white/40 px-6 py-3 text-white hover:bg-white/10">Send an enquiry</Link>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-white px-8 py-10">
            <h2 className="text-4xl font-bold">Join our team</h2>
            <p className="mt-2 max-w-md text-slate">We have {jobs.length} open roles in Johor Bahru, from sales to service engineering.</p>
            <Link href="/careers" className="btn-quote mt-6 px-6 py-3">See open roles</Link>
          </div>
        </div>
      </section>

      {/* Official distributor partners (scrolling logos, sits right above the footer) */}
      <div className="mt-16">
        <PartnersMarquee brands={partnerBrands} />
      </div>
    </>
  );
}
