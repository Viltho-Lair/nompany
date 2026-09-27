"use client";
import Link from "next/link";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from "motion/react";
import { usePathname } from "next/navigation";
import { chromeCopy } from "@/shared/marketing/chrome";
import { useEffect, useState } from "react";
import { initialsOf } from "@/lib/initials";
import Skeleton from "@/components/Skeleton";
import ThemeToggle from "@/components/ThemeToggle";
import LangMenu from "@/components/LangMenu";
import { locales, LANGUAGE_NAMES, LANGUAGE_SHORT } from "@/shared/locale";
import { LogoMark, Wordmark } from "../Logo";
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
  // next/link, NOT plain anchors. These were `<a>` "on purpose", back when every
  // page brought its own shell and there was nothing to keep — so each click was
  // a full document load that repainted the header, re-asked for the session
  // and flashed the skeleton. Every public page now sits under the one chrome
  // `(marketing)/layout.js` mounts, and a client navigation is what lets that
  // chrome survive the click. A Link is still a real `<a href>` in the HTML:
  // openable in a new tab and followable by a crawler. The LANGUAGE links stay
  // plain anchors — a locale switch changes `dir` and `lang` above this shell.
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
    const { scrollY, scrollYProgress } = useScroll();
    const [condensed, setCondensed] = useState(false);
    // OUT OF THE WAY WHILE READING, BACK THE MOMENT THEY TURN ROUND: the bar
    // slides up on a downward scroll past the first screen and returns on any
    // upward one. Never while a menu is open, and never under reduced motion.
    const [tucked, setTucked] = useState(false);
    const reduceMotion = useReducedMotion();
    const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 32, mass: 0.3 });
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
    // AND FOLLOWING A LINK CLOSES BOTH. The links are client navigations now, so
    // this nav survives the click — a full reload used to close an open menu for
    // free, and the menu's own stopPropagation keeps the listeners above from
    // seeing a click inside it. Closed at the click rather than by an effect on
    // the pathname, which would be a setState-in-effect for the same result.
    const closeMenus = () => { setNavOpen(false); setMenuOpen(false); };
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
        const prev = scrollY.getPrevious() ?? v;
        const tuck = !reduceMotion && v > 640 && v > prev + 2 ? true : v < prev - 2 || v <= 640 ? false : null;
        if (tuck !== null) setTucked((t) => (t === tuck ? t : tuck));
    });
    // THE NAV RENDERS WHERE IT BELONGS, and this took two goes to get right.
    //
    // It began as `initial={{ y: -70, opacity: 0 }}`, which shipped the site's
    // entire navigation as `style="opacity:0"`, and then as `y: -70`, which
    // rendered it seventy pixels above the viewport for anything not running
    // the animation. It has no entrance at all now: what the server renders is
    // what the page is.
    //
    // THE LETTERHEAD STRIP (27/09/2026). The floating glass pill went with the
    // dark-glow world. This is the head of the sheet: the logo's three-colour
    // band across the very top, then one ruled row — transparent at the top of
    // the page, paper-coloured with a hairline under it once the page scrolls.
    // The page you are on is marked, which the pill never did.
    const pathname = usePathname() || "";
    const isHere = (href) => pathname === href || pathname.startsWith(`${href}/`);
    const hide = tucked && !navOpen && !menuOpen;
    return (<header className={`fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${hide ? "-translate-y-full" : "translate-y-0"}`}>
      <div className="lh-band" aria-hidden="true"/>
      <nav className={`border-b transition-[background-color,border-color] duration-300 ${condensed ? "border-line bg-ink/95" : "border-transparent bg-transparent"}`}>
        <div className={`mx-auto flex max-w-6xl items-center gap-2 px-4 transition-[padding] duration-300 sm:gap-3 sm:px-6 ${condensed ? "py-2.5" : "py-4"}`}>
        {/* THE LOGO IS A LINK, AND WAS A BUTTON THAT THREW. It called
            onNavigate("overview") with no guard on every page but home. Home
            has an address, so the mark that means "home" is a Link: openable
            in a new tab, readable by a crawler, and the chrome survives it. */}
        <Link href={`/${locale}`} className="flex shrink-0 items-center gap-2.5 pe-1 sm:pe-3" aria-label={tr.nompanyHome}>
          <LogoMark size={26} priority/>
          <Wordmark className="hidden sm:block"/>
        </Link>

        {/* THE COLLAPSED MENU, next to the logo. Below `lg` this is the whole
            navigation; above it, the row below is. Both render from PAGE_LINKS,
            so the two layouts cannot drift into offering different places. */}
        <div className="relative shrink-0 lg:hidden" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setNavOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={navOpen}
            aria-label={nav.menu}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:text-fg"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
          {navOpen && (
            <div role="menu" className="lh-sheet absolute start-0 z-50 mt-3 w-60 overflow-hidden py-2">
              {PAGE_LINKS.map((l) => (
                <Link key={l.href} role="menuitem" href={l.href} onClick={closeMenus}
                   aria-current={isHere(l.href) ? "page" : undefined}
                   className={`block px-4 py-2.5 text-sm transition-colors hover:bg-ink-soft ${isHere(l.href) ? "font-medium text-fg" : "text-fg-muted hover:text-fg"}`}>
                  {l.label}
                </Link>
              ))}
              {/* THE PRIMARY CALL TO ACTION FOLLOWS THE MENU DOWN, for
                  signed-out visitors — the same rule the row's copy follows. */}
              {account === undefined || account ? null : (
                <Link role="menuitem" href={`/api/intent?locale=${locale}`} onClick={closeMenus}
                   className="mt-1 block border-t border-line px-4 pb-1 pt-3 text-sm font-medium text-iris transition-colors hover:bg-ink-soft">
                  {tr.startFree}
                </Link>
              )}
              {/* THE LANGUAGES ARE ROWS, NOT A SECOND DROPDOWN — a popup inside
                  this popup was clipped by its corners, and two destinations do
                  not need a menu to choose between. */}
              <div className="mt-1 border-t border-line pt-2">
                <p className="px-4 pb-1 text-[11px] text-fg-dim">{tr.language}</p>
                {langOptions.map((o) => (
                  <a
                    key={o.code}
                    role="menuitem"
                    href={o.href}
                    aria-current={o.code === locale ? "true" : undefined}
                    className={`block px-4 py-2.5 text-sm transition-colors hover:bg-ink-soft ${o.code === locale ? "text-fg" : "text-fg-muted hover:text-fg"}`}
                  >
                    {o.label}
                  </a>
                ))}
              </div>
              <div className="mt-1 flex items-center border-t border-line px-4 pt-3 text-fg-muted">
                <ThemeToggle labels={{ theme: tr.theme, light: tr.themeLight, dark: tr.themeDark, system: tr.themeSystem }} />
              </div>
            </div>
          )}
        </div>

        <div className="ms-auto hidden items-center gap-0.5 lg:flex">
          {PAGE_LINKS.map((l) => {
            const here = isHere(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={here ? "page" : undefined}
                className={`relative rounded-md px-3 py-2 text-sm transition-colors duration-200 hover:text-fg ${here ? "font-medium text-fg" : "text-fg-muted"}`}
              >
                {l.label}
                {here && <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-px bg-fg"/>}
              </Link>
            );
          })}
        </div>

        <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-line lg:block"/>

        {/* Light / dark / system. Writes the same `theme` cookie the account
            hub and studio read, so the choice follows the visitor across every
            surface. Both of these move into the collapsed menu below `lg`. */}
        <div className="hidden shrink-0 text-fg-muted lg:block">
          <ThemeToggle labels={{ theme: tr.theme, light: tr.themeLight, dark: tr.themeDark, system: tr.themeSystem }} />
        </div>

        <div className="hidden shrink-0 text-fg-muted lg:block">
          <LangMenu current={locale} options={langOptions} label={tr.language} align="end" />
        </div>

        {/* Signed out → "Log in". Signed in → the person's own picture, opening
            a menu with Go to account / Sign out. While the answer is unknown, a
            skeleton in the same footprint so the header does not reflow. */}
        <div className="ms-auto flex shrink-0 items-center gap-2 lg:ms-0">
        {account === undefined ? (
            <Skeleton className="h-9 w-9 shrink-0" rounded="rounded-full" bg="bg-line"/>
        ) : account ? (
            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu" aria-expanded={menuOpen}
                aria-label={account.name || account.email || tr.yourAccount} title={account.name || account.email}
                className="block rounded-full">
                {account.photo ? (
                    // A stored data URI, so next/image would only get in the way.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={account.photo} alt="" className="h-9 w-9 rounded-full border border-line object-cover"/>
                ) : (
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-iris font-display text-xs font-semibold text-white">
                      {initialsOf(account.name || account.email)}
                    </span>
                )}
              </button>
              {menuOpen && (
                  <div role="menu" className="lh-sheet absolute end-0 z-50 mt-2 w-56 overflow-hidden py-1 text-start">
                    <p className="truncate px-4 py-2 text-xs text-fg-dim">{account.email}</p>
                    <Link role="menuitem" href={`/${locale}/account`} onClick={closeMenus} className="block px-4 py-2.5 text-sm text-fg-muted transition-colors hover:bg-ink-soft hover:text-fg">
                      {tr.goToAccount}
                    </Link>
                    <button role="menuitem" type="button"
                      onClick={async () => {
                          await fetch("/api/identity/logout", { method: "POST" });
                          window.location.assign(`/${locale}`);
                      }}
                      className="block w-full px-4 py-2.5 text-start text-sm text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400">
                      {tr.signOut}
                    </button>
                  </div>
              )}
            </div>
        ) : (
            <Link href={`/${locale}/login`} className="inline-flex shrink-0 items-center rounded-md px-3 py-2 text-sm text-fg-muted transition-colors duration-200 hover:text-fg">
              {tr.logIn}
            </Link>
        )}

        {/* "Start free" follows the same rule as "Log in": both are for people
            who are not signed in, so both give way to the avatar. NO SKELETON
            in this slot: a placeholder that resolves to nothing for a signed-in
            reader reserves space the page then takes back. */}
        {account === undefined || account ? null : (
            <Link href={`/api/intent?locale=${locale}`} className="lh-btn hidden !px-4 !py-2 !text-sm lg:inline-flex">
              {tr.startFree}
            </Link>
        )}
        </div>
        </div>
        {/* How far down the page the reader is: one hairline of stamp ink along
            the bar's lower edge, sprung so it glides rather than ticks. */}
        <motion.div aria-hidden="true" className={`h-px origin-left bg-iris transition-opacity duration-300 rtl:origin-right ${condensed ? "opacity-100" : "opacity-0"}`} style={{ scaleX: progress }}/>
      </nav>
    </header>);
}
