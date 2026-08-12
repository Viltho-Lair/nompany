"use client";
import { motion } from "motion/react";
import { fadeUp, stagger, VIEWPORT } from "@/components/landing/lib/motion";
import { LogoMark, Wordmark } from "./Logo";
import { VIEWS } from "./views/views";
/* `href` marks the entries that resolve to a real route in this app. The rest
   are still design placeholders. Careers and Terms are load-bearing: this
   footer is now their only inbound link. */
const columnsFor = (locale) => [
    {
        title: "Platform",
        links: [
            { label: "Finance" },
            { label: "Human resources" },
            { label: "Inventory" },
            { label: "Manufacturing" },
            { label: "Analytics" },
        ],
    },
    {
        title: "Company",
        links: [
            { label: "About" },
            { label: "Customers" },
            { label: "Careers", href: `/${locale}/careers` },
            { label: "Security" },
            { label: "Status" },
        ],
    },
    {
        title: "Resources",
        links: [
            { label: "Documentation" },
            { label: "API reference" },
            { label: "Implementation guide" },
            { label: "Terms & conditions", href: `/${locale}/terms` },
        ],
    },
];
export function Footer({ onNavigate, locale = "en" }) {
    const COLUMNS = columnsFor(locale);
    return (<footer className="relative border-t border-line">
      <motion.div variants={stagger(0.07)} initial="hidden" whileInView="show" viewport={VIEWPORT} className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2.5">
            <LogoMark size={26}/>
            <Wordmark />
          </div>
          <p className="mt-4 max-w-xs text-sm text-fg-muted">
            The operating system for your enterprise. One ledger, every
            department, in real time.
          </p>
          <div className="mt-5 flex gap-2">
            {VIEWS.map((v) => (<button key={v.id} onClick={() => onNavigate(v.id)} className="rounded-full border border-line px-3 py-1.5 text-xs text-fg-muted transition-colors duration-200 hover:border-iris/50 hover:text-fg">
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
        <p>© {new Date().getFullYear()} Nompany BV. All rights reserved.</p>
        <p className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-mint"/>
          All systems operational
        </p>
      </div>
    </footer>);
}
