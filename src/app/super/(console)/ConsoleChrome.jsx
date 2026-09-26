"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";
import Icon from "../_components/Icon";
import { BASE, CONSOLE_BAR, CONSOLE_GROUPS, CONSOLE_ACCOUNT, FULL_BLEED } from "../_components/nav";
import ConsoleActions, { ConsoleSearch } from "../_components/ConsoleActions";
import { ConsoleClock, PresentButton } from "../_components/Present";
import SuperLiveProvider from "@/components/super/SuperLiveProvider";

/* THE CONSOLE'S CHROME — a grouped sidebar, a slim header, and the page.
   ------------------------------------------------------------------
   IT WAS A BOTTOM BAR, and the owner retired it on 26/09/2026: "/super is not
   organized and is not tidy, everything is stacked on each other". Fourteen
   pills in one row wrapped to two on a laptop, in shipping order, under a
   header that held the brand, the search, a clock, four controls and Present
   in one line. The screens are now GROUPED in a sidebar (the groups live in
   `_components/nav`), and the header says where you are before anything else.

   THE SIDEBAR FOLDS TO AN ICON RAIL, because Pulse is a wall and wants the
   width. The choice is remembered in this browser (`localStorage`, read
   through `useSyncExternalStore` so the server render and the first client
   render agree and no effect sets state). Below `lg` it is a drawer behind the
   header's menu button instead, and choosing a screen closes it.

   THEY ARE STILL ROUTES, NOT PANES — the owner's call between the shapes
   offered when the bar was built. Four screens are async Server Components that
   read the store directly; the cost is that leaving the wall unmounts it.

   THE RIGHT SIDE OF THE HEADER IS THE OLD HEADER'S, RESTORED once already —
   the avatar and profile menu, SIGN-OUT, the live bell, the theme control and
   the ⌘K palette (`ConsoleActions`). For one deploy the console had no way to
   log out because a chrome rewrite dropped it; this one keeps every control. */

const COLLAPSE_KEY = "super:nav-collapsed";
const collapseListeners = new Set();
const subscribeCollapse = (fn) => {
  collapseListeners.add(fn);
  window.addEventListener("storage", fn);
  return () => { collapseListeners.delete(fn); window.removeEventListener("storage", fn); };
};
const readCollapse = () => {
  try { return window.localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
};
const writeCollapse = (on) => {
  try { window.localStorage.setItem(COLLAPSE_KEY, on ? "1" : "0"); } catch { /* private window — the rail just forgets */ }
  collapseListeners.forEach((fn) => fn());
};

// THE LONGEST MATCH WINS, so a screen with children still lights its own item.
function activeHref(pathname) {
  return [...CONSOLE_BAR, ...CONSOLE_ACCOUNT].reduce((best, item) => {
    const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return hit && item.href.length > best.length ? item.href : best;
  }, "");
}

function NavRow({ item, on, collapsed, onPick }) {
  return (
    <Link
      href={item.href}
      onClick={onPick}
      aria-current={on ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl py-2 text-sm transition-colors ${
        collapsed ? "justify-center px-0" : "px-3"
      } ${
        on
          ? "bg-[rgb(var(--ad-primary-rgb)/0.12)] font-600 text-[var(--ad-primary-ink)]"
          : "text-[var(--ad-muted-foreground)] hover:bg-[var(--ad-accent)] hover:text-[var(--ad-foreground)]"
      }`}
    >
      <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function Sidebar({ active, collapsed, onToggle, onPick, drawer = false }) {
  return (
    <div className="flex h-full flex-col">
      <div className={`flex h-16 shrink-0 items-center ${collapsed ? "justify-center" : "justify-between gap-2 px-4"}`}>
        {/* THE MARK, THEN THE WORDS. `LogoMark` in components/landing draws it
            everywhere else and cannot be used here: it imports motion/react,
            which is confined to the landing folder. */}
        <Link href={`${BASE}/pulse`} onClick={onPick} className="flex min-w-0 items-center gap-2.5" aria-label="nompany super admin">
          <Image
            src="/brand/logo-icon.png" alt="nompany" width={30} height={30} priority
            className="h-[30px] w-[30px] shrink-0 object-contain"
          />
          {collapsed ? null : (
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-[15px] font-800 tracking-tight">nompany</span>
              <span className="block truncate text-[11px] text-[var(--ad-muted-foreground)]">Super admin console</span>
            </span>
          )}
        </Link>
        {drawer ? (
          <button type="button" onClick={onPick} className="ad-icon-btn h-9 w-9" aria-label="Close menu">
            <Icon name="close" className="h-[18px] w-[18px]" />
          </button>
        ) : null}
      </div>

      <nav aria-label="Console" className="ad-scrollarea min-h-0 flex-1 px-3 pb-3">
        {CONSOLE_GROUPS.map((g, i) => (
          <div key={g.label} className={i ? "mt-4" : "mt-1"}>
            {/* A GROUP NAME IN SENTENCE CASE, not a tracked-out caption: it is
                read, not decorated. Folded, a hairline stands in for it so the
                groups still read as groups. */}
            {collapsed ? (
              i ? <div className="mx-3 mb-3 h-px bg-[var(--ad-border)]" aria-hidden="true" /> : null
            ) : (
              <p className="mb-1 px-3 text-xs font-600 text-[var(--ad-muted-foreground)] opacity-80">{g.label}</p>
            )}
            <ul className="flex flex-col gap-0.5">
              {g.items.map((item) => (
                <li key={item.href}>
                  <NavRow item={item} on={item.href === active} collapsed={collapsed} onPick={onPick} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t px-3 py-3" style={{ borderColor: "var(--ad-border)" }}>
        <ul className="flex flex-col gap-0.5">
          {CONSOLE_ACCOUNT.map((item) => (
            <li key={item.href}>
              <NavRow item={item} on={item.href === active} collapsed={collapsed} onPick={onPick} />
            </li>
          ))}
          {drawer ? null : (
            <li>
              <button
                type="button"
                onClick={onToggle}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl py-2 text-sm text-[var(--ad-muted-foreground)] transition-colors hover:bg-[var(--ad-accent)] hover:text-[var(--ad-foreground)] ${
                  collapsed ? "justify-center" : "px-3"
                }`}
              >
                {/* Chevrons point where the rail will go, and mirror in RTL. */}
                <Icon name={collapsed ? "chevronRight" : "chevronLeft"} className="h-[18px] w-[18px] shrink-0 rtl:-scale-x-100" />
                {collapsed ? null : <span>Collapse</span>}
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default function ConsoleChrome({ admin, children }) {
  const pathname = usePathname() || "";
  const active = activeHref(pathname);
  const current = [...CONSOLE_BAR, ...CONSOLE_ACCOUNT].find((i) => i.href === active);

  const collapsed = useSyncExternalStore(subscribeCollapse, readCollapse, () => false);
  const toggle = useCallback(() => writeCollapse(!readCollapse()), []);

  // The drawer remembers WHICH address it was opened on, so it is shut on any
  // other — a route change closes it without an effect.
  const [drawerAt, setDrawerAt] = useState(null);
  const drawerOpen = drawerAt === pathname;
  const closeDrawer = useCallback(() => setDrawerAt(null), []);

  // THE WALL IS EXACT, NOT A PREFIX: see FULL_BLEED in _components/nav.
  const bleed = FULL_BLEED.some((b) =>
    pathname === b.href || (b.prefix && pathname.startsWith(`${b.href}/`)));

  return (
    // THE CONSOLE'S ONE LIVE CONNECTION, opened here so the bell and every
    // screen below share it. The old shell mounted it; when the screens moved
    // into this chrome (8b421af1) it was left behind, and nothing failed: the
    // bell's list loads only when the stream reports "live", so it sat empty
    // and no screen heard a live event, with no error anywhere. Restored
    // 18/09/2026.
    <SuperLiveProvider>
    <div
      className="flex h-[100dvh] w-full"
      style={{ background: "var(--ad-background)", color: "var(--ad-foreground)" }}
    >
      <aside
        className={`hidden shrink-0 border-e transition-[width] duration-200 lg:block ${collapsed ? "w-[4.5rem]" : "w-60"}`}
        style={{ borderColor: "var(--ad-border)", background: "var(--ad-card)" }}
      >
        <Sidebar active={active} collapsed={collapsed} onToggle={toggle} />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Console menu">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={closeDrawer} />
          <div
            className="absolute inset-y-0 start-0 w-72 max-w-[85vw] border-e shadow-2xl"
            style={{ borderColor: "var(--ad-border)", background: "var(--ad-card)" }}
          >
            <Sidebar active={active} collapsed={false} onPick={closeDrawer} drawer />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-6"
          style={{ borderColor: "var(--ad-border)", background: "var(--ad-card)" }}
        >
          <button
            type="button"
            onClick={() => setDrawerAt(pathname)}
            className="ad-icon-btn -ms-2 lg:hidden"
            aria-label="Open menu"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          {/* WHERE YOU ARE, FIRST: the group, then the screen. The page's own
              title sits under it in the content, so this stays small. */}
          <div className="min-w-0 flex-1">
            {current ? (
              <p className="flex min-w-0 items-center gap-1.5 text-sm">
                {current.group ? (
                  <>
                    <span className="hidden truncate text-[var(--ad-muted-foreground)] sm:inline">{current.group}</span>
                    <Icon name="chevronRight" className="hidden h-3.5 w-3.5 shrink-0 text-[var(--ad-muted-foreground)] opacity-60 sm:inline rtl:-scale-x-100" />
                  </>
                ) : null}
                <span className="truncate font-600">{current.label}</span>
              </p>
            ) : null}
          </div>

          <div className="hidden w-full max-w-xs md:block">
            <ConsoleSearch />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden xl:inline"><ConsoleClock /></span>
            <ConsoleActions admin={admin} />
            <PresentButton />
          </div>
        </header>

        {/* THE PAGE SCROLLS, THE CHROME DOES NOT. `min-h-0` is what makes that
            true inside a flex column — without it the child's content sets the
            height and the header leaves the screen.

            AND IT PADS AND CENTRES, EXCEPT WHERE A SCREEN OWNS THE WHOLE AREA.
            The screens carry no padding or scroll of their own; an
            `overflow-hidden` main clipped the Users and Studios tables before
            it shipped. The width is capped so a form or a two-column dashboard
            does not stretch across an ultrawide monitor. The wall, Broadcast and
            the questionnaire app fill a fixed area and opt out by path. */}
        <main className={`min-h-0 flex-1 ${bleed ? "overflow-hidden" : "overflow-y-auto"}`}>
          {bleed ? children : (
            <div className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">{children}</div>
          )}
        </main>
      </div>
    </div>
    </SuperLiveProvider>
  );
}
