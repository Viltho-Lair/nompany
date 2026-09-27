"use client";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { LockKeyhole } from "lucide-react";
import { Forward } from "@/components/landing/site/Chrome";
import { useSite } from "@/components/landing/site/locale";
import { CELL_IN, Cta, useInViewReveal, useReadyReveal } from "@/components/landing/site/primitives";

/**
 * THE CUSTOMERS PAGE, in the site's design (27/09/2026).
 *
 * THE RULE IS THE SERVER'S, NOT THIS FILE'S. `companies` arrives already
 * filtered by `publicCompanies` — consent in the studio's own settings AND
 * featured in /super — and already reduced to the allow-listed fields. This
 * draws a name, a sector and a logo, never a slug, and adds no filter of its
 * own: a second one would be free to disagree with the home page's band.
 *
 * THE EMPTY STATE IS A REAL PAGE, which is the state it ships in: one card that
 * says why nobody is named, because a blank page reads as "nobody uses this".
 *
 * `tr` is the page's copy, read on the server and handed down as strings, so
 * the copy module does not join the client chunk.
 */
export function CustomersView({ tr, startLabel, companies }) {
  const { locale } = useSite();
  const heading = useReadyReveal(0);
  const lead = useReadyReveal(0.15);
  const note = useInViewReveal(0.1);
  const cta = useInViewReveal(0, CELL_IN, 0.25);

  return (
    <>
      <section className="relative px-6 pt-36 md:px-10 md:pt-44">
        <div className="mx-auto max-w-[1280px]">
          <h1
            {...heading}
            className="max-w-[18ch] text-[2.6rem] font-medium leading-[1.05] tracking-[-0.035em] md:text-[4rem] rtl:tracking-normal"
          >
            {tr.title}
          </h1>
          <p {...lead} className="mt-6 max-w-[52ch] text-[16px] leading-relaxed text-[#9a9aa8] md:text-[18px]">
            {tr.lead}
          </p>
        </div>
      </section>

      <section className="relative px-6 pt-16 md:px-10 md:pt-24">
        <div className="mx-auto max-w-[1280px]">
          {companies.length === 0 ? (
            <Card i={0} className="max-w-3xl p-8 md:p-12" tint={EMPTY_TINT}>
              <h2 className="text-[1.6rem] font-medium leading-tight tracking-[-0.03em] md:text-[2rem] rtl:tracking-normal">
                {tr.emptyHeading}
              </h2>
              <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-[#9a9aa8] md:text-[16px]">{tr.emptyBody}</p>
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((c, k) => (
                <Card key={c.name} as="li" i={k} className="flex min-h-[200px] flex-col justify-between p-7">
                  {c.logo ? (
                    /* A stored data URI or an uploaded file, so next/image
                       cannot fetch it at build time and would only get in the
                       way — a tenant's logo is neither fixed nor ours. */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logo} alt="" className="h-10 w-auto max-w-[10rem] object-contain opacity-90" />
                  ) : (
                    <span aria-hidden="true" className="h-10" />
                  )}
                  <div className="mt-10">
                    <p className="text-[1.2rem] font-medium tracking-[-0.02em] text-[#ececf1] rtl:tracking-normal">{c.name}</p>
                    {c.sector ? <p className="mt-1.5 text-[14px] text-white/50">{c.sector}</p> : null}
                  </div>
                </Card>
              ))}
            </ul>
          )}

          <motion.p {...note} className="mt-8 flex max-w-[64ch] items-start gap-3 text-[14px] leading-relaxed text-white/55">
            <LockKeyhole size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-[#c9c2ff]" />
            <span>{tr.consentNote}</span>
          </motion.p>
        </div>
      </section>

      <section className="relative px-6 pb-36 pt-24 md:px-10 md:pt-32">
        <div className="mx-auto max-w-[1280px]">
          <motion.div
            {...cta}
            className="relative isolate overflow-hidden rounded-3xl bg-white/[0.025] p-8 ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-14"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10"
              style={{ background: locale === "ar" ? CTA_TINT_RTL : CTA_TINT }}
            />
            <h2 className="text-[2.2rem] font-medium leading-[1.05] tracking-[-0.04em] md:text-[3rem] rtl:tracking-normal">
              {tr.ctaHeading}
            </h2>
            <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-white/70 md:text-[16px]">{tr.ctaBody}</p>
            <div className="mt-8">
              <Cta href={`/api/intent?locale=${locale}`}>
                {startLabel}
                <Forward />
              </Cta>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}

const EMPTY_TINT = "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px) 0 0 / 18px 18px";
const CTA_TINT = "radial-gradient(130% 120% at 0% 100%, rgba(139,124,255,0.42), rgba(76,60,190,0.14) 45%, rgba(139,124,255,0) 75%)";
const CTA_TINT_RTL = "radial-gradient(130% 120% at 100% 100%, rgba(139,124,255,0.42), rgba(76,60,190,0.14) 45%, rgba(139,124,255,0) 75%)";

/**
 * A card that arrives out of focus in a short cascade and lights its edge where
 * the cursor is — the home page's bento cell, for a list of names.
 */
function Card({ i, as = "div", className = "", tint, children }) {
  const reveal = useInViewReveal(Math.min(i, 6) * 0.07, CELL_IN, 0.2);
  const mx = useMotionValue(-600);
  const my = useMotionValue(-600);
  const glow = useMotionTemplate`radial-gradient(420px circle at ${mx}px ${my}px, rgba(139,124,255,0.12), transparent 60%)`;
  const edge = useMotionTemplate`radial-gradient(260px circle at ${mx}px ${my}px, rgba(214,208,255,0.55), transparent 70%)`;
  const Tag = as === "li" ? motion.li : motion.div;

  function move(e) {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  }
  function leave() {
    mx.set(-600);
    my.set(-600);
  }

  return (
    <Tag
      {...reveal}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`group relative isolate overflow-hidden rounded-3xl bg-white/[0.025] ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${className}`}
    >
      {tint ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: tint }} /> : null}
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: glow }} />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-3xl p-px"
        style={{
          background: edge,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {children}
    </Tag>
  );
}
