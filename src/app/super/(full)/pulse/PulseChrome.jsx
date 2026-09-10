"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Icon from "../../_components/Icon";
import { Menu, menuItem } from "../../_components/Menu";
import { BASE } from "../../_components/nav";

/* THE CONSOLE'S CHROME — one long header and one bar, identical on every page.
   ------------------------------------------------------------------
   THE SIDEBAR IS NOT HERE, and that is the change. Every screen this console has
   lived under `(shell)`: a collapsible sidebar, a header with a command palette,
   and a customiser — roughly nine hundred lines of chrome around screens that
   are mostly one table each. The owner asked for them in Pulse's bottom bar
   instead, so the bar IS the navigation and the header carries only what has
   nowhere else to go.

   THEY ARE REAL ROUTES, NOT PANES, and that was the owner's call between two
   shapes I put up. Broadcast used to slide in beside the wall as a client pane
   holding its own fetches; four of the screens joining it read the store as
   async Server Components, and making those slide would have meant rewriting
   each one client-side against list endpoints that do not exist. As routes they
   move unchanged — same server rendering, same data, same files — and the
   header and bar are a LAYOUT, so they are drawn once and survive every
   navigation between them.

   WHAT IT COSTS, stated because it is the half the slide was buying: leaving the
   wall for another screen unmounts it, so coming back re-reads its two payloads
   and starts its polls again. That is two fetches on a screen somebody chose to
   look at, against a rewrite of eight screens — the trade the owner took.

   THE BAR IS LINKS, WHICH IS WHY IT IS NOT `PanelBar`. That component says in
   its own header that it is "deliberately NOT a set of links": it flips panels
   inside one route and keeps the choice in a query string. This navigates. Same
   look, different thing, and collapsing them would make one of the two lie. */

/* EVERY HREF IS SPELLED OUT, and that is for the test rather than for the eye.
   `testEveryConsoleDestinationResolvesToARoute` reads each `${BASE}...` literal
   in the console and asserts a page answers it — the guard that exists because
   sign-in once landed on a 404 while every link looked right. This list was
   `${BASE}/pulse/${key}`, which the test cannot resolve, so a typo'd bar item
   would have shipped as a dead link with the guard green. Written out, it fails
   the suite instead. */
const NAV = [
  { href: `${BASE}/pulse`, label: "Pulse", icon: "activity" },
  { href: `${BASE}/pulse/dashboard`, label: "Dashboard", icon: "dashboard" },
  { href: `${BASE}/pulse/studios`, label: "Studios", icon: "briefcase" },
  { href: `${BASE}/pulse/users`, label: "Users", icon: "users" },
  { href: `${BASE}/pulse/chat`, label: "Chat", icon: "chat" },
  { href: `${BASE}/pulse/packages`, label: "Packages", icon: "package" },
  { href: `${BASE}/pulse/tiers`, label: "Tiers", icon: "layers" },
  { href: `${BASE}/pulse/nova`, label: "Nova", icon: "star" },
  { href: `${BASE}/pulse/calendar`, label: "Calendar", icon: "calendar" },
  { href: `${BASE}/pulse/broadcast`, label: "Broadcast", icon: "live" },
];

/* WHAT THE BAR WOULD NOT CARRY. Ten pills is already a wide strip, and these
   three are not places anybody moves BETWEEN — a questionnaire is authored, the
   migration is read once, settings are changed and left. They sit behind the
   header's menu, which is also where the owner asked for the first two. */
const MENU = [
  { href: `${BASE}/pulse/questionnaires`, label: "Questionnaires", icon: "form" },
  { href: `${BASE}/pulse/settings`, label: "Settings", icon: "settings" },
  { href: `${BASE}/pulse/migration`, label: "Database migration", icon: "database" },
];

/* SCREENS THAT OWN THE WHOLE AREA between the header and the bar, and so get no
   padding and no scroll from the chrome — see the <main> below for why every
   other screen does. Literal hrefs, for the same reason NAV's are: the route
   test checks each one resolves to a page. */
const FULL_BLEED = [
  { href: `${BASE}/pulse`, prefix: false },
  { href: `${BASE}/pulse/broadcast`, prefix: false },
  { href: `${BASE}/pulse/questionnaires`, prefix: true },
];

export default function PulseChrome({ children }) {
  const pathname = usePathname() || "";

  // THE LONGEST MATCH WINS, or `/pulse` would light up on every page under it.
  const active = NAV.reduce((best, item) => {
    const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return hit && item.href.length > best.length ? item.href : best;
  }, "");

  // THE WALL IS EXACT, NOT A PREFIX, or every screen under /pulse would bleed.
  const bleed = FULL_BLEED.some((b) =>
    pathname === b.href || (b.prefix && pathname.startsWith(`${b.href}/`)));

  return (
    <div
      className="flex h-[100dvh] w-full flex-col"
      style={{ background: "var(--ad-background)", color: "var(--ad-foreground)" }}
    >
      {/* ---- the long header ------------------------------------------- */}
      <header
        className="flex shrink-0 flex-wrap items-center gap-4 border-b px-5 py-3"
        style={{ borderColor: "var(--ad-border)" }}
      >
        {/* THE MARK, NOT THE WORD, and then both. `LogoMark` in components/landing
            draws it everywhere else and cannot be used here: it imports
            motion/react, which is confined to the landing folder because it is
            ~30 KB the console has no reason to carry. */}
        <Link href={`${BASE}/pulse`} className="flex items-center gap-3" aria-label="Pulse">
          <Image
            src="/brand/logo-icon.png" alt="nompany" width={34} height={34} priority
            className="h-[34px] w-[34px] object-contain"
          />
          <span className="leading-tight">
            <span className="block font-display text-base font-800 tracking-tight">nompany</span>
            <span className="block text-[11px] font-600 uppercase tracking-[0.18em] opacity-60">
              Super admin
            </span>
          </span>
        </Link>

        <div className="ms-auto flex items-center gap-2">
          <Menu
            label="More"
            width={240}
            trigger={
              <span
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm"
                style={{ borderColor: "var(--ad-border)" }}
              >
                More
                <span aria-hidden="true" className="text-xs opacity-60">▾</span>
              </span>
            }
          >
            {MENU.map((m) => (
              <Link key={m.href} href={m.href} className={menuItem} role="menuitem">
                <Icon name={m.icon} className="h-4 w-4 opacity-70" />
                {m.label}
              </Link>
            ))}
          </Menu>
        </div>
      </header>

      {/* THE PAGE SCROLLS, THE CHROME DOES NOT. `min-h-0` is what makes that
          true inside a flex column — without it the child's content sets the
          height, the column grows past the viewport and the bar leaves the
          screen, which is exactly what a fixed bar is there to prevent.

          AND IT PADS, EXCEPT WHERE A SCREEN OWNS THE WHOLE AREA. The screens
          that came from `(shell)` were written against that shell's main —
          `px-4 pb-8 sm:px-6` inside a scrolling document — and carry no padding
          or scroll of their own. This was `overflow-hidden` at first, which
          clipped the Users and Studios tables with no way to reach a row below
          the fold. So the default is the old shell's contract, and the screens
          built to fill a fixed area opt out by path: the wall (a grid sized to
          the viewport), Broadcast (a register with its own scrolling columns)
          and the questionnaire app (a full-height builder). */}
      <main className={`min-h-0 flex-1 ${bleed ? "overflow-hidden" : "overflow-y-auto px-4 pb-8 pt-5 sm:px-6"}`}>
        {children}
      </main>

      {/* ---- the bar ---------------------------------------------------- */}
      <nav
        className="flex shrink-0 flex-wrap items-center gap-1.5 border-t px-4 py-2"
        style={{ borderColor: "var(--ad-border)", background: "var(--ad-card)" }}
        aria-label="Console"
      >
        {NAV.map((item) => {
          const on = item.href === active;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-sm font-600 transition-colors ${
                on ? "bg-brand-700 text-white" : "hover:bg-[var(--ad-accent)]"
              }`}
            >
              <Icon name={item.icon} className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
