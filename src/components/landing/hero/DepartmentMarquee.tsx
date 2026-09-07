"use client";

import { liveDepartments } from "@/shared/marketing/departments";
import { heroCopy } from "@/shared/marketing/hero";

/* ==================================================================
   THE ELEVEN DEPARTMENTS, STREAMING.
   Sits beneath whichever hero variant wins.

   WHAT IT MUST NEVER SAY. The treatment this borrows is an integration
   strip — "connect your favourite tools". There are no integrations,
   and writing that sentence would be 180+ connectors in a new coat.
   What streams past is the eleven departments the product has, named
   from the software's own list.

   CSS, NOT motion/react. A continuous scroll is a linear infinite
   transform with no state: the compositor does it for free, and
   prefers-reduced-motion stops it with a media query rather than a
   hook. The library would cost bundle and frames for nothing.

   THE LIST IS RENDERED TWICE and the track translates by exactly -50%
   — but -50% of the TRACK is only the seam it needs when the gap
   between the two copies is the same width as the gap between two
   chips. A flex `gap` on the track sits BETWEEN its two children, so
   without this the second copy lands half a gap short of where the
   first began and the loop visibly jumps once a cycle. Each copy
   carries its OWN trailing gap (`pe-4`, logical so it survives RTL)
   instead, so the repeating unit is "chips + one gap" and -50% of two
   identical units is exactly one unit — no jump. The second copy is
   aria-hidden: a screen reader should hear eleven departments, not
   twenty-two.
================================================================== */

export function DepartmentMarquee({ locale }: { locale: string }) {
  const tr = heroCopy(locale);
  const departments = liveDepartments(locale);

  return (
    <section id="departments" className="relative border-y border-line py-10">
      <p className="mb-6 text-center text-xs tracking-wider text-fg-dim uppercase">
        {tr.marqueeLabel}
      </p>

      {/* The mask fades both ends so names enter and leave rather than being
          clipped. `to right` is a PHYSICAL direction, not a logical one — CSS
          gradients have no logical keyword — but the fade needs none: it is
          symmetric (12% in from each edge), so the identical string reads the
          same whether the track is scrolling ltr or rtl. */}
      <div
        className="relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
        {/* No gap here on the track itself — see the header comment. Each
            copy below carries its own trailing gap instead, so the two
            copies plus their gaps repeat as one unit and -50% is seamless. */}
        <div className="marquee-track flex w-max">
          {[false, true].map((isClone) => (
            <div
              key={String(isClone)}
              className="flex shrink-0 gap-4 pe-4"
              aria-hidden={isClone || undefined}
            >
              {departments.map((d) => (
                <span
                  key={d.key}
                  className="surface whitespace-nowrap rounded-full px-5 py-2.5 text-sm text-fg-muted"
                >
                  {d.name}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
