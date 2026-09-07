"use client";

import Link from "next/link";
import { useLandingLocale } from "@/components/landing/locale";
import { getDict } from "@/shared/i18n";
import { companyCopy } from "@/shared/marketing/company";
import { heroCopy } from "@/shared/marketing/hero";
import { CONTACT } from "@/lib/site";
import { LogoMark, Wordmark } from "../Logo";

/* ==================================================================
   THE FOOTER, REBUILT.

   WHAT IT REPLACED, twice over. The landing page carried a four-column
   footer in which twelve of fifteen entries were `<span>`s styled to
   look like links — Finance, HR, Inventory, Manufacturing, Analytics,
   About, Customers, Security, Status, Documentation, API Reference,
   Implementation. Clicking did nothing, which reads as a broken site
   rather than an unfinished one, and one of them offered Manufacturing:
   a section that renders nothing. Beneath them sat "© Nompany BV",
   naming a Dutch legal entity for a company that is not incorporated
   anywhere, with the brand capitalised; and a green dot reading "all
   systems operational", an uptime claim with no monitor behind it.

   The other footer — the editorial one on the account pages — printed
   an office address in Riyadh for a company that has never had one.

   THIS IS ONE FOOTER FOR THE WHOLE PUBLIC SITE, so the two cannot drift
   apart again, and EVERY ENTRY IN IT RESOLVES. A link is added the day
   its page ships, never before. Names come from the site dictionary, so
   the nav, the footer and the page itself cannot call one page three
   different things.

   NO COLUMN OF PLACEHOLDERS. Four thin columns were what made twelve
   dead links look reasonable — the shape wanted filling. Two groups of
   what genuinely exists is an honest shape, and it grows sideways
   rather than needing to be filled.
================================================================== */

export function SiteFooter({ locale: localeProp }) {
  // The provider is the authority inside the landing tree; the prop is for the
  // marketing routes, which render this outside it.
  const ctx = useLandingLocale();
  const locale = localeProp || ctx;
  const nav = getDict(locale).nav;
  const hero = heroCopy(locale);

  const groups = [
    {
      title: nav.platform,
      links: [
        { href: `/${locale}/platform`, label: nav.platform },
        { href: `/${locale}/pricing`, label: nav.pricing },
        { href: `/${locale}/security`, label: nav.security },
      ],
    },
    {
      title: nav.about,
      links: [
        { href: `/${locale}/about`, label: nav.about },
        { href: `/${locale}/careers`, label: nav.careers },
        { href: `/${locale}/terms`, label: nav.terms },
        { href: `/${locale}/privacy`, label: nav.privacy },
      ],
    },
  ];

  return (
    <footer className="relative mt-24 border-t border-line/70">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <div className="grid gap-12 md:grid-cols-[minmax(0,1.3fr)_repeat(2,minmax(0,1fr))] lg:gap-16">
          {/* Identity. The canonical description, the same sentence every
              external profile will carry — not a second tagline written for
              this corner of this page. */}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <LogoMark size={28} />
              <Wordmark />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-fg-muted">
              {companyCopy(locale).description}
            </p>
            <Link
              href={`/${locale}/signup`}
              className="mt-7 inline-flex items-center rounded-full bg-gradient-to-br from-iris to-violet px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-iris/20 transition-transform hover:scale-[1.02]"
            >
              {hero.ctaPrimary}
            </Link>
          </div>

          {groups.map((g) => (
            <nav key={g.title} className="min-w-0">
              <p className="text-xs font-medium tracking-[0.14em] text-fg-dim uppercase">
                {g.title}
              </p>
              <ul className="mt-5 space-y-3">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-fg-muted transition-colors hover:text-fg"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line/70 pt-7 text-xs text-fg-dim sm:flex-row sm:items-center sm:justify-between">
          {/* NO LEGAL ENTITY AND NO STATUS DOT. The company is not incorporated
              anywhere, so there is no entity to name; and nothing measures
              uptime, so there is no figure to imply with a green light. */}
          <p>© {new Date().getFullYear()} nompany</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a href={`mailto:${CONTACT.sales}`} className="transition-colors hover:text-fg">
              {CONTACT.sales}
            </a>
            <a href={`mailto:${CONTACT.support}`} className="transition-colors hover:text-fg">
              {CONTACT.support}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
