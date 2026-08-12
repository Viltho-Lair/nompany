"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import LangMenu from "@/components/LangMenu";
import AccountMenu from "@/components/AccountMenu";
import Skeleton from "@/components/Skeleton";
import { track, pageLabelFromPath } from "@/lib/track";
import { CONTACT, marketingUrl } from "@/lib/site";

// Minimal editorial header (inspired by the reference site): a slim bar with the
// wordmark, theme + language controls and a Menu button that opens a full-screen
// overlay carrying the navigation. No hovering/glowing logo.
export default function Nav({ locale, dict }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Auth state has three values so the header never flashes the wrong buttons:
  //   undefined = still loading (unknown) → skeleton
  //   null      = guest                   → Login / Sign-up
  //   object    = signed-in SaaS account  → AccountMenu
  // The value is preserved across route changes (we don't reset to undefined on
  // re-fetch), so the skeleton only appears on the very first load.
  const [company, setCompany] = useState(undefined);
  const authLoading = company === undefined;
  const siteName = dict.common.brand;

  // Reflect the SaaS session in the header (re-checked on navigation) so a
  // signed-in user sees their account menu instead of Login/Sign-up.
  useEffect(() => {
    let alive = true;
    fetch("/api/identity/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setCompany(d?.user ? { email: d.user.email, name: d.profile?.fullName || "" } : null); })
      .catch(() => { if (alive) setCompany(null); }); // resolve to guest so the skeleton never hangs
    return () => { alive = false; };
  }, [pathname]);

  async function signOut() {
    try { await fetch("/api/identity/logout", { method: "POST" }); } catch { /* ignore */ }
    setCompany(null);
    setOpen(false);
  }

  // Home, features, pricing, about, team and contact now live on the standalone
  // marketing site, which is a single page with no deep links — so they collapse
  // into one outbound entry. Careers and terms are still served from here.
  const links = [
    { href: marketingUrl(), label: dict.nav.home, external: true },
    { href: `/${locale}/careers`, label: dict.nav.careers },
    { href: `/${locale}/terms`, label: dict.nav.terms },
  ];

  // Primary auth actions → public SaaS sign-up / login.
  const loginHref = `/${locale}/login`;
  const signupHref = `/${locale}/signup?package=micro`;

  // External entries can never match the current path.
  const isActive = (href, external) => !external && pathname.startsWith(href);

  // Language options preserve the current sub-path and just swap the locale
  // segment. Each label is shown in its own script; English is the default.
  const rest = pathname.replace(/^\/(en|ar)/, "") || "";
  const langOptions = [
    { code: "en", label: "English", short: "EN", href: `/en${rest}` },
    { code: "ar", label: "العربية", short: "AR", href: `/ar${rest}` },
  ];

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

  const langTrigger =
    "inline-flex items-center gap-1.5 rounded-full border border-current/25 px-3 py-1.5 font-display text-xs font-600 uppercase tracking-[0.12em] transition-colors hover:border-current";

  // The account hub is a full-screen app surface — no site header and no
  // footer (see Footer.js `isBare`). It carries the brand link, theme control
  // and language switcher inside the page instead.
  if (pathname === `/${locale}/account`) return null;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-steel-400/15 bg-white/85 backdrop-blur-md dark:border-white/10 dark:bg-steel-900/85">
        <nav className="container-page flex h-16 items-center justify-between gap-4 sm:h-[74px]">
          <Link href={marketingUrl()} className="flex items-center gap-2.5 text-brand-950 dark:text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#eef1f6] p-[3px] sm:h-10 sm:w-10">
              <Image src="/brand/logo-icon.png" alt="" width={40} height={40} className="h-full w-full object-contain" priority />
            </span>
            <span className="font-display text-base font-700 tracking-tight sm:text-lg">{siteName}</span>
          </Link>

          <div className="flex items-center gap-2 text-brand-950 dark:text-white sm:gap-3">
            <div className="hidden sm:block">
              <ThemeToggle labels={themeLabels} />
            </div>
            <LangMenu current={locale} options={langOptions} label={dict.common.language} triggerClass={langTrigger} align="end" />
            {authLoading ? (
              <div className="hidden items-center gap-2.5 sm:flex" aria-hidden="true">
                <Skeleton className="h-4 w-12" rounded="rounded" />
                <Skeleton className="h-8 w-20" rounded="rounded-full" />
              </div>
            ) : company ? (
              <div className="hidden sm:block">
                <AccountMenu locale={locale} company={company} dict={dict} onSignedOut={() => setCompany(null)} />
              </div>
            ) : (
              <>
                <Link
                  href={loginHref}
                  className="hidden font-display text-xs font-600 uppercase tracking-[0.12em] transition-colors hover:text-brand-600 dark:hover:text-brand-300 sm:inline"
                >
                  {dict.nav.login}
                </Link>
                <Link
                  href={signupHref}
                  className="hidden rounded-full bg-brand-600 px-4 py-2 font-display text-xs font-700 uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-700 sm:inline-block"
                >
                  {dict.nav.signup}
                </Link>
              </>
            )}
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
        <div className="absolute inset-0 bg-steel-900 text-white">
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
                    isActive(l.href, l.external) ? "text-brand-400" : "text-white/85 hover:text-brand-400"
                  }`}
                >
                  <span className="font-mono text-xs font-500 text-white/30 sm:text-sm">{String(i + 1).padStart(2, "0")}</span>
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="mb-6 flex flex-wrap items-center gap-3 sm:hidden">
              {authLoading ? (
                <>
                  <Skeleton className="h-12 w-40" rounded="rounded-full" bg="bg-white/15" />
                  <Skeleton className="h-12 w-28" rounded="rounded-full" bg="bg-white/15" />
                </>
              ) : company ? (
                <>
                  <Link
                    href={`/${locale}/account`}
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-brand-600 px-6 py-3 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-700"
                  >
                    {dict.nav.account || "My account"}
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="rounded-full border border-white/40 px-6 py-3 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:border-white"
                  >
                    {dict.nav.signout || "Sign out"}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={signupHref}
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-brand-600 px-6 py-3 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-700"
                  >
                    {dict.nav.signup}
                  </Link>
                  <Link
                    href={loginHref}
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-white/40 px-6 py-3 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:border-white"
                  >
                    {dict.nav.login}
                  </Link>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-white">
              <div className="flex items-center gap-3">
                <ThemeToggle labels={themeLabels} />
                <LangMenu
                  current={locale}
                  options={langOptions.map((o) => ({ ...o, onSelect: () => setOpen(false) }))}
                  label={dict.common.language}
                  triggerClass={langTrigger}
                  align="start"
                  direction="up"
                />
              </div>
              {CONTACT.email && (
                <a href={`mailto:${CONTACT.email}`} className="font-display text-sm font-600 tracking-wide text-white/80 transition-colors hover:text-white">
                  {CONTACT.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
