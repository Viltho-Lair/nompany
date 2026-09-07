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

   THE LIST IS RENDERED TWICE and the track translates by exactly -50%,
   which is what makes the loop seamless. The second copy is
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
          clipped. Logical inset so it mirrors with the document direction. */}
      <div
        className="relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
        <div className="marquee-track flex w-max gap-4">
          {[false, true].map((isClone) => (
            <div
              key={String(isClone)}
              className="flex shrink-0 gap-4"
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
