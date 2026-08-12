"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONTACT } from "@/lib/site";

// Editorial footer (adapted from the reference site): a big "Let's connect"
// band, then a minimal dark strip with an Explore nav list, the office / contact
// block, and a thin copyright bar. Solid navy on every page.
export default function Footer({ locale, dict }) {
  const pathname = usePathname();
  // Two routes own their whole viewport and bring their own chrome (Nav.js
  // does the same): the full-screen account hub, and the landing page, which
  // carries its own dark footer.
  const isBare =
    pathname === `/${locale}/account` || pathname === `/${locale}`;
  const year = new Date().getFullYear();

  // Features, pricing, about, team and contact are in-page views on the
  // landing page now, so they collapse into "Home".
  const nav = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/careers`, label: dict.nav.careers },
    { href: `/${locale}/terms`, label: dict.nav.terms },
  ];

  const socials = CONTACT.socials;
  const addressText = CONTACT.address[locale] || CONTACT.address.en;
  const siteName = dict.common.brand;
  const heading = "mb-5 font-display text-xs font-700 uppercase tracking-[0.24em] text-brand-300";
  const link = "text-sm text-white/70 transition-colors hover:text-white";

  if (isBare) return null;

  return (
    <footer className="bg-steel-900 text-white">
      {/* Shared "Let's connect" band. The contact form is a view on the
          landing page now, so the call-to-action points there. */}
      <section className="border-b border-white/10">
        <div className="container-page py-16 sm:py-24">
          <p className="font-display text-xs font-700 uppercase tracking-[0.3em] text-brand-300">{dict.common.contactEyebrow}</p>
          <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="max-w-3xl font-display text-4xl font-800 uppercase leading-[1.05] tracking-tight text-white sm:text-6xl">
              {dict.common.letsConnect}
            </h2>
            <Link
              href={`/${locale}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-brand-950 transition-colors hover:bg-brand-300"
            >
              {dict.common.getInTouch}
              <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70">{dict.common.connectLead}</p>
        </div>
      </section>

      {/* Minimal footer strip */}
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.3fr_1fr_1.2fr]">
        {/* Brand */}
        <div>
          <p className="font-display text-2xl font-800 uppercase tracking-tight text-white">{siteName}</p>
          <p className="mt-4 font-display text-xs uppercase tracking-[0.18em] text-brand-300">
            {dict.common.footerTagline}
          </p>
          {socials.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/25 px-3.5 py-1.5 font-display text-xs font-600 uppercase tracking-[0.1em] text-white/80 transition-colors hover:border-white hover:text-white"
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Explore */}
        <div>
          <h4 className={heading}>{dict.common.explore}</h4>
          <ul className="grid grid-cols-2 gap-y-2.5 gap-x-6 sm:grid-cols-1 sm:gap-y-2.5">
            {nav.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={link}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Get in touch / office */}
        <div>
          <h4 className={heading}>{dict.contact.reachUs}</h4>
          <ul className="space-y-3 text-sm">
            {addressText && (
              <li className="max-w-xs font-display text-sm font-600 uppercase leading-relaxed tracking-[0.08em] text-white/85">
                {addressText}
              </li>
            )}
            {CONTACT.phone && (
              <li dir="ltr" className="rtl:text-end">
                <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className={link}>{CONTACT.phone}</a>
              </li>
            )}
            {CONTACT.email && (
              <li>
                <a href={`mailto:${CONTACT.email}`} className={link}>{CONTACT.email}</a>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/50 sm:flex-row">
          <p>© {year} {siteName}. {dict.common.allRightsReserved}</p>
          <Link href="/studio" className="transition-colors hover:text-white">{dict.common.admin}</Link>
        </div>
      </div>
    </footer>
  );
}
