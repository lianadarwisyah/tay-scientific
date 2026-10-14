import Link from "next/link";
import BannerArt from "./BannerArt";
import CoverPhoto from "./CoverPhoto";

/**
 * Page banner with breadcrumb.
 * - default: white banner with a photo fading in from one side (`photo`); `flip` puts the photo on the left and the text on the right
 * - cover: full-width photo with the title on top in white (`cover`)
 * `slot` names an optional HD photo: /public/bg/<slot>.jpg (see public/bg/README.txt)
 */
export default function PageHeader({
  title, intro, crumbs = [], photo = "/bg/lab-glassware.jpg", photoPosition = "center 55%", cover, slot, flip = false,
}: {
  title: string; intro?: string; crumbs?: { label: string; href?: string }[];
  photo?: string; photoPosition?: string; cover?: string; slot?: string; flip?: boolean;
}) {
  const on = !!cover; // text sits on a dark photo
  const align = flip && !on ? "md:text-right" : "";
  return (
    <section className={`relative overflow-hidden ${on ? "bg-ink text-white" : "border-b border-line bg-white"}`}>
      {on ? <CoverPhoto src={cover} slot={slot} /> : <BannerArt photo={photo} slot={slot} position={photoPosition} side={flip ? "left" : "right"} />}
      <div className={`container-x relative z-10 ${on ? "py-14 md:py-20" : "py-10 md:py-14"} ${align}`}>
        <nav aria-label="Breadcrumb" className={`text-sm ${on ? "text-white/75" : "text-slate"}`}>
          <Link href="/" className={on ? "hover:text-white" : "hover:text-ink"}>Home</Link>
          {crumbs.map((c) => (
            <span key={c.label}>
              {" / "}
              {c.href
                ? <Link href={c.href} className={on ? "hover:text-white" : "hover:text-ink"}>{c.label}</Link>
                : <span aria-current="page" className={on ? "text-white" : "text-ink"}>{c.label}</span>}
            </span>
          ))}
        </nav>
        <h1 className="mt-3 text-5xl font-bold sm:text-6xl">{title}</h1>
        {intro && <p className={`mt-3 max-w-2xl text-lg ${on ? "text-white/85" : "text-slate"} ${flip && !on ? "md:ml-auto" : ""}`}>{intro}</p>}
      </div>
    </section>
  );
}
