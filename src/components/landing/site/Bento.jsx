"use client";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { LockKeyhole } from "lucide-react";
import { BRAND, BRAND_AR } from "@/shared/marketing/company";
import { homeCopy } from "@/shared/marketing/home";
import { tourCopy } from "@/shared/marketing/tour";
import { Forward } from "./Chrome";
import { useSite } from "./locale";
import { CELL_IN, Cta, Shot, useInViewReveal } from "./primitives";

/**
 * WHAT ONE SYSTEM CHANGES — five cells, each a claim the site already makes.
 * The cells arrive out of focus in a short cascade, and a light follows the
 * cursor across whichever one it is over, lighting its edge.
 */
export function Bento() {
  const { locale, rtl } = useSite();
  const tr = homeCopy(locale);
  const tour = tourCopy(locale);
  const title = useInViewReveal(0);
  // The language cell shows the brand in the OTHER script: its point is that
  // the product is both, so it shows the one the reader is not reading.
  const other = rtl ? { text: BRAND, dir: "ltr", lang: "en" } : { text: BRAND_AR, dir: "rtl", lang: "ar" };

  return (
    <section className="relative px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[1280px]">
        <motion.h2 {...title} className="max-w-[20ch] text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] md:text-[3.25rem] rtl:tracking-normal">
          {tr.bentoTitle}
        </motion.h2>

        <div className="mt-14 grid grid-cols-1 gap-4 md:auto-rows-[minmax(280px,auto)] md:grid-cols-6">
          <Cell i={0} className="md:col-span-4 md:row-span-2 md:min-h-[600px]">
            <div className="relative z-10 max-w-[30ch]">
              <h3 className="text-[1.6rem] font-medium leading-tight tracking-[-0.03em] md:text-[2rem] rtl:tracking-normal">{tr.modelTitle}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#9a9aa8]">{tr.modelBody}</p>
            </div>
            <div className="relative mt-10 md:absolute md:-bottom-10 md:-end-12 md:mt-0 md:w-[78%]">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_40px_100px_-30px_rgba(24,16,80,0.9)] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] md:-rotate-[4deg] md:group-hover:rotate-0 rtl:md:rotate-[4deg]">
                <Shot name="projects" alt={tour.screens.projects.title} sizes="(min-width: 768px) 45vw, 100vw" />
              </div>
            </div>
          </Cell>

          <Cell i={1} className="md:col-span-2" tint="radial-gradient(120% 90% at 100% 0%, rgba(139,124,255,0.28), rgba(139,124,255,0) 60%)">
            <p dir={other.dir} lang={other.lang} className="text-[3.25rem] font-medium leading-none text-white/90" style={{ fontFamily: "var(--f-readex)" }}>
              {other.text}
            </p>
            <h3 className="mt-8 text-[1.2rem] font-medium tracking-[-0.02em] rtl:tracking-normal">{tr.languageTitle}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[#9a9aa8]">{tr.languageBody}</p>
          </Cell>

          <Cell i={2} className="md:col-span-2" tint="radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px) 0 0 / 18px 18px">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10">
              <LockKeyhole size={22} strokeWidth={1.5} className="text-[#c9c2ff]" />
            </span>
            <h3 className="mt-8 text-[1.2rem] font-medium tracking-[-0.02em] rtl:tracking-normal">{tr.rowsTitle}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[#9a9aa8]">{tr.rowsBody}</p>
          </Cell>

          <Cell i={3} className="md:col-span-3">
            <h3 className="text-[1.2rem] font-medium tracking-[-0.02em] rtl:tracking-normal">{tr.installTitle}</h3>
            <p className="mt-2 max-w-[40ch] text-[14px] leading-relaxed text-[#9a9aa8]">{tr.installBody}</p>
            <div className="relative mt-8 aspect-[16/7] overflow-hidden rounded-2xl ring-1 ring-white/10">
              <Shot name="clients" alt={tour.screens.clients.title} sizes="(min-width: 768px) 40vw, 100vw" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0b11] via-transparent to-transparent" />
            </div>
          </Cell>

          <Cell
            i={4}
            className="md:col-span-3"
            tint="radial-gradient(130% 120% at 0% 100%, rgba(139,124,255,0.42), rgba(76,60,190,0.14) 45%, rgba(139,124,255,0) 75%)"
          >
            <h3 className="text-[2.2rem] font-medium leading-[1.05] tracking-[-0.04em] md:text-[3rem] rtl:tracking-normal">{tr.pricingTitle}</h3>
            <p className="mt-5 max-w-[42ch] text-[15px] leading-relaxed text-white/70">{tr.pricingLead}</p>
            <div className="mt-8">
              <Cta href={`/${locale}/pricing`}>
                {tr.pricingCta}
                <Forward />
              </Cta>
            </div>
          </Cell>
        </div>
      </div>
    </section>
  );
}

function Cell({ i, className = "", tint, children }) {
  const reveal = useInViewReveal(i * 0.08, CELL_IN, 0.2);
  const mx = useMotionValue(-600);
  const my = useMotionValue(-600);
  const glow = useMotionTemplate`radial-gradient(440px circle at ${mx}px ${my}px, rgba(139,124,255,0.13), transparent 60%)`;
  const edge = useMotionTemplate`radial-gradient(280px circle at ${mx}px ${my}px, rgba(214,208,255,0.6), transparent 70%)`;

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
    <motion.article
      {...reveal}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`group relative isolate overflow-hidden rounded-3xl bg-white/[0.025] p-7 ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-9 ${className}`}
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
    </motion.article>
  );
}
