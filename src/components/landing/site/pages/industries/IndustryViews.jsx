import Link from "next/link";
import { Forward } from "@/components/landing/site/Chrome";
import { Reveal } from "@/components/landing/site/Reveal";
import { Cta } from "@/components/landing/site/primitives";

/* THE INDUSTRIES PAGES' BODIES (29/09/2026), organised the way the owner
   asked — Salesforce's industries — and fed by the product's own list, so a
   visitor is offered exactly the industries and specialisms the create-studio
   screen offers.

   SERVER COMPONENTS. Every word is in the server HTML; the only client pieces
   are the reveal and the call-to-action buttons, which add nothing a crawler
   needs. Everything arrives already in the reader's language. */

const CARD = "rounded-3xl bg-white/[0.025] ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";
const CHIP = "rounded-full bg-white/[0.04] px-3 py-1 text-[13px] text-white/65 ring-1 ring-inset ring-white/[0.08]";

/**
 * The index: every industry as a card — its sentence, its specialisms, a link.
 * @param industries [{ key, name, lead, specialisms: string[], count }]
 */
export function IndustriesGrid({ industries, locale, explore }) {
  return (
    <section className="px-6 pb-28 md:px-10 md:pb-40">
      <ul className="mx-auto grid max-w-[1280px] gap-4 md:grid-cols-2">
        {industries.map((ind, i) => (
          <li key={ind.key}>
            <Reveal delay={Math.min(i, 6) * 0.04} className={`group relative flex h-full flex-col p-7 md:p-9 ${CARD}`}>
              <p className="text-[13px] text-white/45">{ind.count}</p>
              <h2 className="mt-3 text-[1.5rem] font-medium leading-snug tracking-[-0.025em] text-[#ececf1] md:text-[1.75rem] rtl:tracking-normal">
                <Link href={`/${locale}/industries/${ind.key}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                  {ind.name}
                </Link>
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#9a9aa8]">{ind.lead}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {ind.specialisms.map((s) => (
                  <li key={s} className={CHIP}>{s}</li>
                ))}
              </ul>
              <span className="mt-auto inline-flex items-center gap-2 pt-7 text-[14px] text-[#c9c2ff] group-hover:text-white">
                {explore}
                <Forward size={14} />
              </span>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One industry: who it is for, the departments a new studio in it starts
 * with (computed from the product, never written), and a way in.
 */
export function IndustryBody({ tr, locale, specialisms, departments, others }) {
  return (
    <>
      <section className="px-6 pb-20 md:px-10 md:pb-28">
        <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-2">
          <Reveal className={`p-7 md:p-9 ${CARD}`}>
            <h2 className="text-[1.35rem] font-medium tracking-[-0.025em] rtl:tracking-normal">{tr.specialismsTitle}</h2>
            <ul className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {specialisms.map((s) => (
                <li key={s} className="flex gap-3 text-[15px] leading-relaxed text-white/75">
                  <span aria-hidden="true" className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-[#8b7cff]" />
                  <span className="min-w-0">{s}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.06} className={`p-7 md:p-9 ${CARD}`}>
            <h2 className="text-[1.35rem] font-medium tracking-[-0.025em] rtl:tracking-normal">{tr.departmentsTitle}</h2>
            <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-[#9a9aa8]">{tr.departmentsLead}</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {departments.map((d) => (
                <li key={d} className={CHIP}>{d}</li>
              ))}
            </ul>
            <Link href={`/${locale}/platform`} className="mt-7 inline-flex items-center gap-2 text-[14px] text-[#c9c2ff] hover:text-white">
              {tr.explore}
              <Forward size={14} />
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-20 md:px-10 md:pb-28">
        <Reveal className={`mx-auto max-w-[1280px] p-8 md:p-12 ${CARD}`}>
          <p className="max-w-[48ch] text-[1.25rem] leading-snug text-[#ececf1] md:text-[1.5rem]">{tr.closing}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Cta href={`/api/intent?locale=${locale}`}>
              {tr.start}
              <Forward size={15} />
            </Cta>
            <Cta href={`/${locale}/contact`} variant="ghost">
              {tr.contact}
            </Cta>
          </div>
        </Reveal>
      </section>

      <section className="px-6 pb-28 md:px-10 md:pb-40">
        <div className="mx-auto max-w-[1280px]">
          <Link href={`/${locale}/industries`} className="inline-flex items-center gap-2 text-[14px] text-white/60 hover:text-white">
            {tr.all}
            <Forward size={14} />
          </Link>
          <ul className="mt-5 flex flex-wrap gap-2">
            {others.map((o) => (
              <li key={o.key}>
                <Link href={`/${locale}/industries/${o.key}`} className={`${CHIP} inline-block transition-colors hover:text-white`}>
                  {o.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
