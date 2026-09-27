"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { homeCopy } from "@/shared/marketing/home";
import { Forward } from "./Chrome";
import { useSite } from "./locale";
import { CELL_IN, useInViewReveal } from "./primitives";

/**
 * WHERE THE PRODUCT STANDS, AND WHO RUNS ON IT.
 *
 * The three lines are decided on the server by `platformStatLines` — the same
 * function /platform uses — so a figure replaces a fact only once its nightly
 * count clears its threshold, rounded down, and the note saying so appears only
 * when there is a figure to qualify.
 *
 * The customer band DEGRADES TO NOTHING: no studio that has both consented and
 * been featured means no band, no heading and no link to /customers, never a
 * wall of placeholder logos. It shows a name and a sector, never a slug.
 */
export function Proof({ stats, companies }) {
  const { locale } = useSite();
  const home = homeCopy(locale);
  const head = useInViewReveal(0);
  const band = useInViewReveal(0.1);

  return (
    <section className="relative px-6 pb-36 pt-20 md:px-10">
      <div className="mx-auto max-w-[1280px]">
        <motion.h2 {...head} className="text-[15px] text-white/45">
          {stats.heading}
        </motion.h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {stats.slots.map((line, k) => (
            <Slot key={line} line={line} i={k} />
          ))}
        </ul>
        {stats.note ? <p className="mt-5 text-[13px] text-white/40">{stats.note}</p> : null}

        {companies.length > 0 ? (
          <motion.div {...band} className="mt-24">
            <h2 className="text-[15px] text-white/45">{home.customersTitle}</h2>
            <ul className="mt-8 flex flex-wrap items-center gap-x-12 gap-y-6">
              {companies.map((c) => (
                <li key={c.name} className="flex items-center gap-3">
                  {c.logo ? (
                    // A stored data URI or an uploaded file: next/image cannot
                    // optimise what is neither fixed nor ours.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logo} alt="" className="h-8 w-auto max-w-[9rem] object-contain opacity-80" />
                  ) : null}
                  <span className="text-[15px] font-medium text-white/80">{c.name}</span>
                  {c.sector ? <span className="text-[13px] text-white/40">{c.sector}</span> : null}
                </li>
              ))}
            </ul>
            <Link href={`/${locale}/customers`} className="group mt-8 inline-flex items-center gap-2 text-[14px] text-[#c9c2ff] hover:text-white">
              {home.customersAll}
              <Forward size={14} />
            </Link>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}

function Slot({ line, i }) {
  const reveal = useInViewReveal(i * 0.08, CELL_IN, 0.3);
  return (
    <motion.li
      {...reveal}
      className="rounded-3xl bg-white/[0.025] p-7 text-[1.25rem] font-medium leading-snug tracking-[-0.015em] ring-1 ring-inset ring-white/[0.07] md:text-[1.4rem] rtl:tracking-normal"
    >
      {line}
    </motion.li>
  );
}
