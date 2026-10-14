/**
 * Full-width photo background with a dark fade so white text stays readable.
 * `slot` is an optional file you can drop in: /public/bg/<slot>.jpg is drawn on top when it exists,
 * and the built-in picture shows when it does not. Use a wide HD photo (1920 px or more).
 * The parent must be `relative overflow-hidden`; its content should sit above this with `relative z-10`.
 */
export default function CoverPhoto({ src = "/bg/lab-hero.jpg", slot }: { src?: string; slot?: string }) {
  return (
    <>
      {/* Built-in HD picture (2400 px): glassware sits on the right, away from the text. Never enlarged, so it stays sharp. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-no-repeat bg-[position:70%_60%] lg:bg-[position:right_42%]"
        style={{ backgroundImage: `url(${src})` }}
      />
      {slot && (
        <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(/bg/${slot}.jpg)` }} />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundImage: "linear-gradient(90deg, rgba(12,18,30,.86) 0%, rgba(12,18,30,.72) 38%, rgba(12,18,30,.28) 72%, rgba(12,18,30,.12) 100%)" }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[#0c121e]/30 lg:hidden" />
    </>
  );
}
