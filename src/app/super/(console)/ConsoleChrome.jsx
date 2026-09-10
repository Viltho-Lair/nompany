"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Icon from "../_components/Icon";
import { Menu, menuItem } from "../_components/Menu";
import { BASE, CONSOLE_BAR, CONSOLE_MENU, FULL_BLEED } from "../_components/nav";
import ConsoleActions from "../_components/ConsoleActions";
import { ConsoleClock, PresentButton } from "../_components/Present";

/* THE CONSOLE'S CHROME — one long header and one bar, identical on every screen.
   ------------------------------------------------------------------
   IT IS NOT PULSE'S, and the name says so now. It shipped as `PulseChrome`
   under `(full)/pulse/`, which made Pulse a prefix on every console address.
   Pulse is a page — `/super/pulse` — beside `/super/dashboard` and the rest, and
   this chrome belongs to the route group all of them sit in.

   THEY ARE ROUTES, NOT PANES — the owner's call between the shapes offered.
   Four of the screens are async Server Components that read the store
   directly; sliding them would have meant rewriting each against list endpoints
   that do not exist. The cost: leaving the wall unmounts it, so coming back
   re-reads its two payloads.

   THE RIGHT SIDE IS THE OLD HEADER'S, RESTORED. The first version drew a brand
   and a menu and nothing else, because the header it replaced was deleted as
   sidebar chrome — and it was not. It held the signed-in admin's avatar and
   profile menu, SIGN-OUT, the live notifications bell, the theme control and
   the ⌘K palette, and for one deploy the console had no way to log out.
   `ConsoleActions` is that code, ported rather than rewritten.

   THE BAR IS LINKS, WHICH IS WHY IT IS NOT `PanelBar` — that component flips
   panels inside one route and says in its own header that it is "deliberately
   NOT a set of links". The lists live in `_components/nav` because two things
   read them, this bar and the palette, and two copies would disagree the first
   time a screen was added. */
export default function ConsoleChrome({ admin, children }) {
  const pathname = usePathname() || "";

  // THE LONGEST MATCH WINS, so a screen with children still lights its own item.
  const active = CONSOLE_BAR.reduce((best, item) => {
    const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return hit && item.href.length > best.length ? item.href : best;
  }, "");

  // THE WALL IS EXACT, NOT A PREFIX: see FULL_BLEED in _components/nav.
  const bleed = FULL_BLEED.some((b) =>
    pathname === b.href || (b.prefix && pathname.startsWith(`${b.href}/`)));

  return (
    <div
      className="flex h-[100dvh] w-full flex-col"
      style={{ background: "var(--ad-background)", color: "var(--ad-foreground)" }}
    >
      <header
        className="flex shrink-0 flex-wrap items-center gap-4 border-b px-5 py-2.5"
        style={{ borderColor: "var(--ad-border)" }}
      >
        {/* THE MARK, THEN THE WORDS. `LogoMark` in components/landing draws it
            everywhere else and cannot be used here: it imports motion/react,
            which is confined to the landing folder. */}
        <Link href={`${BASE}/pulse`} className="flex items-center gap-3" aria-label="nompany super admin">
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
          {/* THE CLOCK AND PRESENT CAME UP FROM THE WALL — see _components/Present. */}
          <ConsoleClock />
          <PresentButton />
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
            {CONSOLE_MENU.map((m) => (
              <Link key={m.href} href={m.href} className={menuItem} role="menuitem">
                <Icon name={m.icon} className="h-4 w-4 opacity-70" />
                {m.label}
              </Link>
            ))}
          </Menu>
          <ConsoleActions admin={admin} />
        </div>
      </header>

      {/* THE PAGE SCROLLS, THE CHROME DOES NOT. `min-h-0` is what makes that
          true inside a flex column — without it the child's content sets the
          height and the bar leaves the screen.

          AND IT PADS, EXCEPT WHERE A SCREEN OWNS THE WHOLE AREA. The screens
          from the old `(shell)` were written against that shell's main —
          `px-4 pb-8 sm:px-6` inside a scrolling document — and carry no padding
          or scroll of their own; an `overflow-hidden` main clipped the Users and
          Studios tables before it shipped. The wall, Broadcast and the
          questionnaire app fill a fixed area and opt out by path. */}
      <main className={`min-h-0 flex-1 ${bleed ? "overflow-hidden" : "overflow-y-auto px-4 pb-8 pt-5 sm:px-6"}`}>
        {children}
      </main>

      <nav
        className="flex shrink-0 flex-wrap items-center gap-1.5 border-t px-4 py-2"
        style={{ borderColor: "var(--ad-border)", background: "var(--ad-card)" }}
        aria-label="Console"
      >
        {CONSOLE_BAR.map((item) => {
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
