"use client";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { chromeCopy } from "@/shared/marketing/chrome";
import { useEffect, useState } from "react";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";
import { initialsOf } from "@/lib/initials";
import Skeleton from "@/components/Skeleton";
import ThemeToggle from "@/components/ThemeToggle";
import LangMenu from "@/components/LangMenu";
import { locales, LANGUAGE_NAMES, LANGUAGE_SHORT } from "@/shared/locale";
import { LogoMark, Wordmark } from "../Logo";
import { MagneticButton } from "../ui/MagneticButton";
import { getDict } from "@/shared/i18n";
/* THE NAV OF A REAL SITE, and no longer of a simulated router.
   ------------------------------------------------------------------
   It began life on a single page with in-page views, switching them with
   an `onNavigate` callback and a shared-`layoutId` pill. `view` and
   `onNavigate` were then made OPTIONAL, for the five real routes that had
   no view to switch — a guard that had to be remembered at every call
   site, and was not: the logo went on calling `onNavigate("overview")`
   and threw on all five.

   Contact was the last in-page view and is `/<locale>/contact` now, so
   there is nothing left to switch and the props are gone rather than
   optional. Everything here is an anchor, which is what a nav is for:
   openable in a new tab, linkable, and followable by a crawler. */
export function TopNav({ locale = "en" }) {
  const tr = chromeCopy(locale);
  // The site dictionary owns the page names, so the nav and the site footer
  // cannot call the same page two different things.
  const nav = getDict(locale).nav;
  // ONE LIST, TWO LAYOUTS. The collapsed menu and the desktop bar both render
  // this, so a page added here appears in both or in neither — the failure mode
  // being avoided is a phone menu that quietly offers less than the desktop.
  //
  // Plain anchors, not next/link, on purpose: this nav sits inside a
  // client-rendered shell and a hard navigation is what leaves it for the
  // server-rendered route.
  const PAGE_LINKS = [
    { href: `/${locale}/platform`, label: nav.platform },
    { href: `/${locale}/pricing`, label: nav.pricing },
    { href: `/${locale}/security`, label: nav.security },
    { href: `/${locale}/about`, label: nav.about },
    { href: `/${locale}/contact`, label: nav.contact },
  ];
  // THE LANDING PAGE HAS NO `Nav`. The site header opts out of this route
  // because the page renders its own, so the language control has to be here
  // or nowhere — and it was nowhere: /en could not reach /ar at all.
  // Each label is written in its own script, and the href swaps the locale
  // segment; `LangMenu` writes the `lang` cookie itself, so the choice
  // survives the login where the URL can no longer carry it.
  const langOptions = locales.map((code) => ({
    code,
    label: LANGUAGE_NAMES[code],
    short: LANGUAGE_SHORT[code],
    href: `/${code}`,
  }));
    const { scrollY } = useScroll();
    const [condensed, setCondensed] = useState(false);
    // Three states, never two — `undefined` means "still asking", so the header
    // shows a skeleton instead of flashing "Log in" at someone who is already
    // signed in and then swapping it for their avatar.
    const [account, setAccount] = useState(undefined);
    const [menuOpen, setMenuOpen] = useState(false);
    // THE WHOLE NAV COLLAPSES ON A PHONE. Six controls — two page links, two
    // view pills, a theme switch and a language picker — plus a logo and a
    // sign-in button do not fit across 390 pixels: they overflowed the pill and
    // pushed the language control off the right edge of the screen entirely.
    const [navOpen, setNavOpen] = useState(false);
    // Any click outside the menu closes it, and so does Escape.
    useEffect(() => {
        if (!menuOpen) return;
        const close = () => setMenuOpen(false);
        const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
        window.addEventListener("click", close);
        window.addEventListener("keydown", onKey);
        return () => { window.removeEventListener("click", close); window.removeEventListener("keydown", onKey); };
    }, [menuOpen]);
    useEffect(() => {
        if (!navOpen) return;
        const close = () => setNavOpen(false);
        const onKey = (e) => e.key === "Escape" && setNavOpen(false);
        window.addEventListener("click", close);
        window.addEventListener("keydown", onKey);
        return () => { window.removeEventListener("click", close); window.removeEventListener("keydown", onKey); };
    }, [navOpen]);
    useEffect(() => {
        let alive = true;
        fetch("/api/identity/me", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
            if (!alive) return;
            setAccount(d?.user
                ? { name: d.profile?.fullName || "", email: d.user.email, photo: d.profile?.photo || "" }
                : null);
        })
            .catch(() => { if (alive) setAccount(null); }); // resolve to guest so the skeleton never hangs
        return () => { alive = false; };
    }, []);
    // Single boolean flip, not a per-pixel state update.
    useMotionValueEvent(scrollY, "change", (v) => {
        const next = v > 24;
        setCondensed((prev) => (prev === next ? prev : next));
    });
    // THE NAV RENDERS WHERE IT BELONGS, and this took two goes to get right.
    //
    // It began as `initial={{ y: -70, opacity: 0 }}`, which shipped the site's
    // entire navigation as `style="opacity:0"`. Dropping the opacity left
    // `y: -70` — and that is not better, it is worse in a quieter way: the nav
    // was then rendered seventy pixels ABOVE the viewport, so anything not
    // running the animation had no navigation at all rather than invisible
    // navigation. Measured in a browser with the animation frame frozen, the
    // header sat at top: -70 with nothing on screen.
    //
    // `initial={false}` renders the settled state and animates nothing. A nav
    // sliding down is a flourish; being able to reach the other pages is not,
    // and the first is not worth risking the second. It is also the only state
    // that matches the rule the rest of this surface follows — what the server
    // renders is what the page is.
    return (<motion.header initial={false} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT_EXPO }} className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <motion.nav animate={{
            backgroundColor: condensed
                ? "color-mix(in oklab, var(--color-ink-soft) 82%, transparent)"
                : "color-mix(in oklab, var(--color-ink-soft) 30%, transparent)",
            borderColor: condensed ? "var(--color-line)" : "transparent",
            paddingTop: condensed ? 8 : 12,
            paddingBottom: condensed ? 8 : 12,
        }} transition={{ duration: 0.4, ease: EASE_OUT_EXPO }} className="flex w-full max-w-6xl items-center gap-1.5 rounded-full border px-2.5 backdrop-blur-xl sm:gap-4 sm:px-5">
        {/* THE LOGO IS A LINK, AND WAS A BUTTON THAT THREW. It called
            onNavigate("overview") with no guard, so clicking the wordmark on
            /platform, /pricing, /security or /about threw "onNavigate is not a
            function". The view pills next to it had been given a guard; the
            logo was missed — which is the argument the header comment makes for
            deleting the props rather than guarding them, and the pills are gone
            with them now.
            A guard was the wrong fix anyway: home has an address, so the mark
            that means "home" should be openable in a new tab and readable by a
            crawler — the same argument PAGE_LINKS above already makes, and a
            plain anchor for the same reason it gives (a hard navigation is what
            leaves the client-rendered shell for the server-rendered route). */}
        <a href={`/${locale}`} className="flex shrink-0 items-center gap-2.5 pr-1 sm:pr-2" aria-label={tr.nompanyHome}>
          <LogoMark size={26} priority/>
          <Wordmark className="hidden sm:block"/>
        </a>

        {/* REAL PAGES FIRST, then whatever is still an in-page view.
            Platform and Pricing have addresses now, so they are links: a
            <button> that swaps a client view cannot be opened in a new tab,
            cannot be linked to from anywhere, and is invisible to a crawler —
            which is why the price list reached no engine while it lived here.
            They are plain anchors rather than next/link on purpose: this nav
            sits on the landing page, and a hard navigation is what leaves the
            client-rendered shell for the server-rendered route. */}
        {/* THE COLLAPSED MENU, next to the logo. Below `md` this is the whole
            navigation; above it, the bar below is. Both render from PAGE_LINKS
            and the same view list, so the two layouts cannot drift into
            offering different destinations. */}
        <div className="relative shrink-0 md:hidden" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setNavOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={navOpen}
            aria-label={nav.menu}
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:text-fg"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
          {navOpen && (
            <div role="menu" className="surface absolute start-0 z-50 mt-3 w-56 overflow-hidden rounded-2xl py-2">
              {PAGE_LINKS.map((l) => (
                <a key={l.href} role="menuitem" href={l.href}
                   className="block px-4 py-2.5 text-sm text-fg-muted transition-colors hover:bg-line/40 hover:text-fg">
                  {l.label}
                </a>
              ))}
              <div className="mt-1 flex items-center justify-between gap-2 border-t border-line px-4 pt-3 text-fg-muted">
                <ThemeToggle labels={{ theme: tr.theme, light: tr.themeLight, dark: tr.themeDark, system: tr.themeSystem }} />
                <LangMenu current={locale} options={langOptions} label={tr.language} align="end" />
              </div>
            </div>
          )}
        </div>

        <div className="ml-auto hidden items-center gap-1 rounded-full bg-ink/40 p-1 md:flex">
          {PAGE_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative rounded-full px-2 py-1.5 text-xs font-medium text-fg-muted transition-colors duration-300 hover:text-fg sm:px-3.5 sm:text-sm"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Light / dark / system. Writes the same `theme` cookie the account
            hub and studio read, so the choice follows the visitor across every
            surface. Both of these move into the collapsed menu below `md` —
            the language control was the one being pushed off the screen. */}
        <div className="hidden shrink-0 text-fg-muted md:block">
          <ThemeToggle labels={{ theme: tr.theme, light: tr.themeLight, dark: tr.themeDark, system: tr.themeSystem }} />
        </div>

        <div className="hidden shrink-0 text-fg-muted md:block">
          <LangMenu current={locale} options={langOptions} label={tr.language} align="end" />
        </div>

        {/* Signed out → "Log in". Signed in → the person's own picture, opening
            a menu with Go to account / Sign out. While the answer is unknown, a
            skeleton in the same footprint so the header does not reflow. */}
        {account === undefined ? (
            <Skeleton className="h-9 w-9 shrink-0" rounded="rounded-full" bg="bg-line"/>
        ) : account ? (
            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu" aria-expanded={menuOpen}
                aria-label={account.name || account.email || tr.yourAccount} title={account.name || account.email}
                className="block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-iris-bright focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
                {account.photo ? (
                    // A stored data URI, so next/image would only get in the way.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={account.photo} alt="" className="h-9 w-9 rounded-full border border-line object-cover"/>
                ) : (
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-iris to-violet font-display text-xs font-semibold text-white">
                      {initialsOf(account.name || account.email)}
                    </span>
                )}
              </button>
              {menuOpen && (
                  <div role="menu" className="surface absolute end-0 z-50 mt-2 w-56 overflow-hidden rounded-xl py-1 text-left">
                    <p className="truncate px-4 py-2 text-xs text-fg-dim">{account.email}</p>
                    <a role="menuitem" href={`/${locale}/account`} className="block px-4 py-2.5 text-sm text-fg-muted transition-colors hover:bg-line/40 hover:text-fg">
                      {tr.goToAccount}
                    </a>
                    <button role="menuitem" type="button"
                      onClick={async () => {
                          await fetch("/api/identity/logout", { method: "POST" });
                          window.location.assign(`/${locale}`);
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm text-rose-400 transition-colors hover:bg-rose-500/10">
                      {tr.signOut}
                    </button>
                  </div>
              )}
            </div>
        ) : (
            <a href={`/${locale}/login`} className="inline-flex shrink-0 items-center rounded-full border border-line px-3 py-2 text-xs font-medium text-fg-muted transition-colors duration-300 hover:border-iris/50 hover:text-fg focus-visible:ring-2 focus-visible:ring-iris-bright focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none sm:px-4 sm:text-sm">
              {tr.logIn}
            </a>
        )}

        {/* "Start free" follows the same rule as "Log in": both are for people
            who are not signed in, so both give way to the avatar. Skeleton
            while auth is unknown, so the bar does not jump when it resolves. */}
        <div className="hidden md:block">
          {account === undefined ? (
              <Skeleton className="h-9 w-[104px]" rounded="rounded-full" bg="bg-line"/>
          ) : account ? null : (
              <MagneticButton variant="ghost" strength={8} className="px-5 py-2 text-xs" href={`/${locale}/signup`}>
                {tr.startFree}
              </MagneticButton>
          )}
        </div>
      </motion.nav>
    </motion.header>);
}
