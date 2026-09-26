import Image from "next/image";

/* ==================================================================
   A REAL SCREEN OF THE PRODUCT, IN A BROWSER FRAME.

   The images are captures, not drawings: scripts/screenshots.mjs builds an
   invented company in the sandbox through the product's own services and
   photographs each screen at 1440×900, 2×, in both languages and both
   themes — `public/screens/<name>-<locale>-<theme>.webp`.

   BOTH THEMES ARE IN THE HTML, and the site's own `dark` class on <html>
   decides which one shows. That needs no JavaScript, never flashes the
   wrong theme on first paint, and follows the theme toggle the instant it
   is pressed. Lazy images under `display:none` are not fetched, so below
   the fold only the visible theme is downloaded; the hero asks for both
   up front because it is above the fold either way.

   THE ADDRESS BAR SAYS WHERE THE SCREEN LIVES in the product, which is
   the honest answer to "is this real": it is a path you can open.
================================================================== */

export const SCREEN_W = 1440;
export const SCREEN_H = 900;

export function screenSrc(name: string, locale: string, theme: "light" | "dark") {
  return `/screens/${name}-${locale === "ar" ? "ar" : "en"}-${theme}.webp`;
}

export function ScreenShot({
  name,
  locale,
  alt,
  path = "",
  priority = false,
  sizes = "(min-width: 1024px) 60vw, 100vw",
  className = "",
  chrome = true,
}: {
  name: string;
  locale: string;
  alt: string;
  path?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  chrome?: boolean;
}) {
  const common = { width: SCREEN_W, height: SCREEN_H, sizes, priority, loading: priority ? undefined : ("lazy" as const) };
  return (
    <figure
      className={`surface overflow-hidden rounded-2xl shadow-2xl shadow-black/30 ${className}`}
      dir="ltr"
    >
      {chrome && (
        <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" aria-hidden="true" />
          <span className="ms-3 truncate rounded-md bg-white/5 px-3 py-1 font-mono text-[11px] text-fg-dim">
            nompany.com/qimam{path}
          </span>
        </div>
      )}
      <div className="relative">
        <Image {...common} alt={alt} src={screenSrc(name, locale, "light")} className="block h-auto w-full dark:hidden" />
        <Image {...common} alt={alt} src={screenSrc(name, locale, "dark")} className="hidden h-auto w-full dark:block" />
      </div>
    </figure>
  );
}
