/**
 * Photo on one side of a banner that fades into the page colour.
 * `photo` is the built-in picture. `slot` is an optional file you can drop in: /public/bg/<slot>.jpg
 * is drawn on top when it exists, and the built-in picture shows when it does not.
 * The parent must be `relative overflow-hidden`; its content should sit above this with `relative z-10`.
 */
export default function BannerArt({ photo, slot, position = "center", side = "right" }: { photo: string; slot?: string; position?: string; side?: "left" | "right" }) {
  const dir = side === "left" ? "left" : "right";
  const fade = `linear-gradient(to ${dir}, transparent, #000 55%)`;
  const box = `pointer-events-none absolute inset-y-0 ${dir}-0 w-full bg-cover bg-no-repeat opacity-30 md:w-[48%] md:opacity-100`;
  const style = (url: string) => ({
    backgroundImage: `linear-gradient(rgba(255,255,255,.12), rgba(255,255,255,.12)), url(${url})`,
    backgroundPosition: position,
    maskImage: fade,
    WebkitMaskImage: fade,
  });
  return (
    <>
      <div aria-hidden="true" className={box} style={style(photo)} />
      {slot && <div aria-hidden="true" className={box} style={style(`/bg/${slot}.jpg`)} />}
    </>
  );
}
