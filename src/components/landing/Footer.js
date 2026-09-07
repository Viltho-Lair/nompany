"use client";
import { motion } from "motion/react";
import { fadeUp, stagger, VIEWPORT } from "@/components/landing/lib/motion";
import { LogoMark, Wordmark } from "./Logo";
import { viewsFor } from "./views/views";
import { useLandingLocale } from "@/components/landing/locale";
import { landingDict } from "@/shared/landing";
/* EVERY LINK HERE RESOLVES. It did not: twelve of fifteen were `<span>`s
   styled to look like links — Finance, HR, Inventory, Manufacturing,
   Analytics, About, Customers, Security, Status, Documentation, API
   Reference, Implementation. A visitor clicked and nothing happened,
   which reads as a broken site rather than an unfinished one, and one of
   them offered Manufacturing, a section that renders nothing at all.

   A dead link is REMOVED, never left pointing at a "coming soon". These
   come back one at a time as each page ships, and the columns collapse
   to whatever genuinely exists meanwhile. */
const columnsFor = (locale, tr) => [
    {
        title: tr.colPlatform,
        links: [
            { label: tr.viewOverview, href: `/${locale}/platform` },
            { label: tr.viewPricing, href: `/${locale}/pricing` },
        ],
    },
    {
        title: tr.colCompany,
        links: [
            { label: tr.lnkCareers, href: `/${locale}/careers` },
        ],
    },
    {
        title: tr.colResources,
        links: [
            { label: tr.lnkTerms, href: `/${locale}/terms` },
            { label: tr.lnkPrivacy, href: `/${locale}/privacy` },
        ],
    },
];
export function Footer({ onNavigate, locale = "en" }) {
    const tr = landingDict(useLandingLocale());
    const COLUMNS = columnsFor(locale, tr);
    return (<footer className="relative border-t border-line">
      <motion.div variants={stagger(0.07)} initial="hidden" whileInView="show" viewport={VIEWPORT} className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2.5">
            <LogoMark size={26}/>
            <Wordmark />
          </div>
          <p className="mt-4 max-w-xs text-sm text-fg-muted">
            {tr.footerTagline}
          </p>
          <div className="mt-5 flex gap-2">
            {viewsFor(tr).map((v) => (<button key={v.id} onClick={() => onNavigate(v.id)} className="rounded-full border border-line px-3 py-1.5 text-xs text-fg-muted transition-colors duration-200 hover:border-iris/50 hover:text-fg">
                {v.label}
              </button>))}
          </div>
        </motion.div>

        {COLUMNS.map((col) => (<motion.div key={col.title} variants={fadeUp}>
            <p className="text-xs tracking-[0.16em] text-fg-dim uppercase">
              {col.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => {
                const inner = (<>
                    {link.label}
                    <span className="ml-1.5 inline-block -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                      →
                    </span>
                  </>);
                const className = "group inline-flex cursor-pointer items-center text-sm text-fg-muted transition-colors duration-200 hover:text-fg";
                return (<li key={link.label}>
                    {link.href ? (<a href={link.href} className={className}>
                        {inner}
                      </a>) : (<span className={className}>{inner}</span>)}
                  </li>);
            })}
            </ul>
          </motion.div>))}
      </motion.div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-6 text-xs text-fg-dim">
        {/* "Nompany BV" NAMED A DUTCH LEGAL ENTITY, on every page, for a
            company that is not incorporated anywhere yet and will be based in
            Jordan — and it spelled the brand with a capital, which is the one
            thing the brand string is never allowed to do.

            AND THE STATUS LINE WENT WITH IT. A green dot reading "all systems
            operational" is an uptime claim, and nothing measures uptime: there
            is no monitor, no status page, and the cron budget cannot compute a
            credible figure. The claim is dropped rather than estimated, which
            is the same decision that deleted /status from the footer. */}
        <p>© {new Date().getFullYear()} nompany. {tr.rightsReserved}</p>
      </div>
    </footer>);
}
