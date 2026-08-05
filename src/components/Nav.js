"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { field } from "@/lib/i18n";
import { track, pageLabelFromPath } from "@/lib/track";

// Minimal editorial header (inspired by the reference site): a slim bar with the
// wordmark, theme + language controls and a Menu button that opens a full-screen
// overlay carrying the navigation. No hovering/glowing logo.
export default function Nav({ locale, dict, settings }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const siteName = field(settings, "site_name", locale) || dict.common.brand;

  const links = [
    { href: `/${locale}`, label: dict.nav.home, exact: true },
    { href: `/${locale}/services`, label: dict.nav.services },
    { href: `/${locale}/projects`, label: dict.nav.projects },
    { href: `/${locale}/clients`, label: dict.nav.clients },
    { href: `/${locale}/vendors`, label: dict.nav.vendors },
    { href: `/${locale}/team`, label: dict.nav.team },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/careers`, label: dict.nav.careers },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  const isActive = (href, exact) => (exact ? pathname === href : pathname.startsWith(href));

  // Swap locale while preserving the current sub-path.
  const other = locale === "en" ? "ar" : "en";
  const rest = pathname.replace(/^\/(en|ar)/, "") || "";
  const otherHref = `/${other}${rest}`;

  const themeLabels = {
    theme: dict.common.theme,
    light: dict.common.themeLight,
    dark: dict.common.themeDark,
    system: dict.common.themeSystem,
  };

  // Close on route change + lock body scroll while the overlay is open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  // Escape closes the overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const langPill =
    "rounded-full border border-current/25 px-3 py-1.5 font-display text-xs font-600 uppercase tracking-[0.12em] transition-colors hover:border-current";

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-steel-400/15 bg-white/85 backdrop-blur-md dark:border-white/10 dark:bg-[#0b1633]/85">
        <nav className="container-page flex h-16 items-center justify-between gap-4 sm:h-[74px]">
          <Link href={`/${locale}`} className="flex items-center gap-2.5 text-brand-950 dark:text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#eef1f6] p-[3px] sm:h-10 sm:w-10">
              <Image src="/brand/logo-icon.png" alt="" width={40} height={40} className="h-full w-full object-contain" priority />
            </span>
            <span className="font-display text-base font-700 tracking-tight sm:text-lg">{siteName}</span>
          </Link>

          <div className="flex items-center gap-2 text-brand-950 dark:text-white sm:gap-3">
            <div className="hidden sm:block">
              <ThemeToggle labels={themeLabels} />
            </div>
            <Link href={otherHref} className={langPill}>{dict.common.langSwitch}</Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={dict.common.menu}
              aria-expanded={open}
              className="inline-flex items-center gap-2 rounded-full border border-current/25 px-3.5 py-2 font-display text-xs font-600 uppercase tracking-[0.14em] transition-colors hover:border-current"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <span className="hidden sm:inline">{dict.common.menu}</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Full-screen navigation overlay */}
      <div
        className={`fixed inset-0 z-[70] transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-brand-950 text-white">
          <div className="container-page flex h-16 items-center justify-between sm:h-[74px]">
            <span className="font-display text-base font-700 tracking-tight sm:text-lg">{siteName}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={dict.common.close}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3.5 py-2 font-display text-xs font-600 uppercase tracking-[0.14em] transition-colors hover:border-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
              <span className="hidden sm:inline">{dict.common.close}</span>
            </button>
          </div>

          <div className="container-page flex h-[calc(100%-4rem)] flex-col justify-between pb-10 pt-6 sm:h-[calc(100%-74px)] sm:pt-10">
            <nav className="flex flex-col gap-1 sm:gap-2">
              {links.map((l, i) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => { setOpen(false); track("section_open", { section: pageLabelFromPath(l.href) }); }}
                  className={`group flex items-baseline gap-4 font-display text-3xl font-800 uppercase tracking-tight transition-colors sm:text-5xl ${
                    isActive(l.href, l.exact) ? "text-brand-400" : "text-white/85 hover:text-brand-400"
                  }`}
                >
                  <span className="font-mono text-xs font-500 text-white/30 sm:text-sm">{String(i + 1).padStart(2, "0")}</span>
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-white">
              <div className="flex items-center gap-3">
                <ThemeToggle labels={themeLabels} />
                <Link href={otherHref} onClick={() => setOpen(false)} className={langPill}>{dict.common.langSwitch}</Link>
              </div>
              {settings?.email && (
                <a href={`mailto:${settings.email}`} className="font-display text-sm font-600 tracking-wide text-white/80 transition-colors hover:text-white">
                  {settings.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
