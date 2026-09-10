"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { Menu, menuItem } from "./Menu";
import { BASE, CONSOLE_BAR, CONSOLE_ACCOUNT } from "./nav";
import { CURRENT_USER, ROLE } from "./session";
import { toneBg, toneInk } from "./ui";
import { initialsOf } from "@/lib/initials";
import { ago } from "@/lib/format";
import ThemeToggle from "@/components/ThemeToggle";
import useSuperNotifications from "@/components/super/useSuperNotifications";

/* THE HEADER'S RIGHT SIDE: search, theme, notifications, and the signed-in admin.
   ------------------------------------------------------------------
   RESTORED, NOT NEW. This is `_components/Header.js` as it stood at 2ca838a5,
   minus the two sidebar toggles and the customiser button — the three things in
   it that only meant anything beside a sidebar. The whole file was deleted in
   8b421af1 as sidebar chrome because nothing imported it once `Shell` was gone,
   and nobody read what it DID: it held SIGN-OUT, so for one deploy the console
   had no way to log out, along with the admin's avatar and profile menu, the
   live notifications bell and the theme control. The owner found the missing
   avatar. Everything below is ported from that file rather than rewritten, so
   it behaves exactly as it did.

   THE THEME CONTROL IS THE PRODUCT'S OWN BUTTON NOW — the owner's instruction,
   10/09/2026. The old header drew its own Light / Dark / System dropdown; the
   console uses `components/ThemeToggle`, the same control the public site and
   the Studio mount, on the same `theme` cookie. One control, one look.

   SEARCH IS ITS OWN EXPORT (`ConsoleSearch`), because it sits in the MIDDLE of
   the header and these controls sit at the right. It owns the palette and the
   ⌘K key; the query is cleared when the palette CLOSES, in the handler, which
   needs no effect — a `set-state-in-effect` the shrink-only lint budget would
   otherwise count.

   THE PALETTE SEARCHES `CONSOLE_BAR` AND `CONSOLE_ACCOUNT`, the lists in
   `_components/nav`, so it can never offer a different set of screens from
   the bar beside it. */

/* ---- command palette ----------------------------------------------------- */

const PAGES = [
  ...CONSOLE_BAR.map((p) => ({ ...p, group: "Screens" })),
  ...CONSOLE_ACCOUNT.map((p) => ({ ...p, group: "Account" })),
];

function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const inputRef = useRef(null);

  // CLEARED ON THE WAY OUT, not on the way in — see the header comment.
  const close = useCallback(() => {
    setQ("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const pool = s ? PAGES.filter((i) => `${i.label} ${i.group}`.toLowerCase().includes(s)) : PAGES;
    return pool.slice(0, 12);
  }, [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4 pt-[12vh]" onClick={close}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: "var(--ad-popover)", borderColor: "var(--ad-border)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Search"
      >
        <div className="flex items-center gap-3 border-b px-4" style={{ borderColor: "var(--ad-border)" }}>
          <Icon name="search" className="h-4 w-4 text-[var(--ad-muted-foreground)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages…"
            className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-[var(--ad-muted-foreground)]"
          />
          <kbd className="rounded border px-1.5 py-0.5 text-[10px] text-[var(--ad-muted-foreground)]" style={{ borderColor: "var(--ad-border)" }}>
            ESC
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-[var(--ad-muted-foreground)]">No pages found.</li>
          ) : (
            results.map((r) => (
              <li key={r.href}>
                <button
                  type="button"
                  className={menuItem}
                  onClick={() => {
                    close();
                    router.push(r.href);
                  }}
                >
                  <Icon name={r.icon || "file"} className="h-4 w-4 text-[var(--ad-muted-foreground)]" />
                  <span className="flex-1 truncate">{r.label}</span>
                  <span className="text-[11px] text-[var(--ad-muted-foreground)]">{r.group}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

/* ---- notifications ------------------------------------------------------- */
//
// From g:superNotifications over the console's live connection — see
// useSuperNotifications. The tone table is built from the console's ONE tone
// helper rather than being another copy of the same hand-mixed values.
const TONE_NAMES = ["primary", "success", "warning", "info", "danger"];
const TONE_FG = Object.fromEntries(TONE_NAMES.map((t) => [t, toneInk(t)]));
const TONE_BG = Object.fromEntries(TONE_NAMES.map((t) => [t, toneBg(t)]));

// THE FULL LIST IS A SETTINGS TAB NOW. It was its own route under
// Application; the settings page holds it beside Profile and Security.
const ALL_NOTIFICATIONS = `${BASE}/settings?tab=notifications`;

const avatarStyle = {
  background: "linear-gradient(135deg, color-mix(in srgb, var(--ad-primary) 80%, var(--ad-primary-foreground)), var(--ad-primary))",
};

/* ---- the controls -------------------------------------------------------- */

export default function ConsoleActions({ admin }) {
  const router = useRouter();

  // Identity comes from the SESSION (`admin`), not from the design constant.
  // The record holds only an email, so the display name is the console's own
  // when it is that person, and the address otherwise.
  const user = useMemo(() => {
    const email = admin?.email || CURRENT_USER.email;
    const name = email === CURRENT_USER.email ? CURRENT_USER.name : email.split("@")[0];
    return { email, name, initials: initialsOf(name), role: ROLE };
  }, [admin]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/super/logout", { method: "POST" });
    } catch {
      // The cookie may survive a failed call, so land on /super either way —
      // a still-valid session simply bounces back into the console.
    }
    router.replace("/super");
    router.refresh();
  }, [router]);

  const { notifications, unread, loaded, status, markAllRead } = useSuperNotifications();

  return (
    <>
      <div className="flex items-center gap-1">
        {/* THE PRODUCT'S OWN THEME BUTTON — see the header comment. It draws in
            `currentColor`, so the wrapper decides its ink. */}
        <span className="inline-flex text-[var(--ad-muted-foreground)]">
          <ThemeToggle />
        </span>

        {/* Notifications */}
        <Menu
          label="Notifications"
          width={340}
          trigger={
            <span className="ad-icon-btn relative">
              <Icon name="bell" className="h-[18px] w-[18px]" />
              {unread ? (
                <span
                  className="absolute -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-700 -end-0.5"
                  style={{ backgroundColor: "var(--ad-success)", color: "var(--ad-success-foreground)" }}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
              {/* No polling fallback behind it: if the stream cannot be
                  established, this says so rather than letting the console
                  look merely quiet. */}
              {status === "offline" ? (
                <span
                  className="absolute bottom-0 h-2.5 w-2.5 rounded-full end-0"
                  style={{ backgroundColor: "var(--ad-warning)" }}
                  title="Not receiving live updates — reconnecting"
                />
              ) : null}
            </span>
          }
        >
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--ad-border)" }}>
            <span className="text-sm font-600">Notifications</span>
            {unread ? (
              <button type="button" onClick={markAllRead} className="text-xs text-[var(--ad-primary)] hover:underline">
                Mark all read
              </button>
            ) : null}
          </div>
          {status === "offline" ? (
            <p className="border-b px-4 py-2 text-xs" style={{ borderColor: "var(--ad-border)", color: "var(--ad-warning)" }}>
              Not receiving live updates. Reconnecting…
            </p>
          ) : null}
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[var(--ad-muted-foreground)]">
                {loaded ? "Nothing yet." : "Loading…"}
              </li>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <li key={n.id}>
                  <Link href={n.href || ALL_NOTIFICATIONS} className="flex gap-3 px-4 py-3 hover:bg-[var(--ad-accent)]">
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: TONE_BG[n.tone] || TONE_BG.primary, color: TONE_FG[n.tone] || TONE_FG.primary }}
                    >
                      <Icon name="bell" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-500">{n.title}</span>
                      {n.body ? <span className="mt-0.5 block text-xs text-[var(--ad-muted-foreground)]">{n.body}</span> : null}
                      <span className="mt-1 block text-[11px] text-[var(--ad-muted-foreground)]">{ago(n.at)}</span>
                    </span>
                    {!n.readAt ? (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "var(--ad-primary)" }} />
                    ) : null}
                  </Link>
                </li>
              ))
            )}
          </ul>
          <Link
            href={ALL_NOTIFICATIONS}
            className="block border-t px-4 py-3 text-center text-sm font-500 text-[var(--ad-primary)]"
            style={{ borderColor: "var(--ad-border)" }}
          >
            View all notifications
          </Link>
        </Menu>

        {/* Profile — the signed-in admin, and the way out. */}
        <Menu
          label="User menu"
          width={272}
          trigger={
            <span className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-700 text-white" style={avatarStyle}>
              {user.initials}
            </span>
          }
        >
          <div className="border-b px-4 py-4" style={{ borderColor: "var(--ad-border)" }}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-700 text-white" style={avatarStyle}>
                {user.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-600">{user.name}</p>
                <p className="truncate text-xs text-[var(--ad-muted-foreground)]">{user.email}</p>
              </div>
            </div>
            <span className="ad-badge mt-3" style={{ backgroundColor: toneBg("primary", 0.12), color: toneInk("primary") }}>
              {user.role}
            </span>
          </div>
          <div className="py-1">
            {/* ONE ENTRY, NAMED FOR WHERE IT GOES — the owner's correction,
                10/09/2026. It read "Profile" and opened Settings, with a
                "Security" row beside it that opened a tab of the same page;
                the tabs are one click away once there. */}
            <Link href={`${BASE}/settings`} className={menuItem}>
              <Icon name="settings" className="h-4 w-4" /> Settings
            </Link>
          </div>
          <div className="border-t py-1" style={{ borderColor: "var(--ad-border)" }}>
            <button type="button" onClick={signOut} className={menuItem} style={{ color: "var(--ad-destructive)" }}>
              <Icon name="logout" className="h-4 w-4" /> Sign out
            </button>
          </div>
        </Menu>
      </div>

    </>
  );
}

/* ---- search, in the middle of the header ------------------------------- */
export function ConsoleSearch() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search pages"
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-full border px-3.5 text-sm text-[var(--ad-muted-foreground)] transition-colors hover:bg-[var(--ad-accent)] hover:text-[var(--ad-foreground)]"
        style={{ borderColor: "var(--ad-border)" }}
      >
        <Icon name="search" className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-start">Search pages…</span>
        <kbd
          className="hidden rounded border px-1.5 py-0.5 text-[10px] font-500 md:inline"
          style={{ borderColor: "var(--ad-border)", backgroundColor: "var(--ad-background)" }}
        >
          ⌘K
        </kbd>
      </button>
      <CommandPalette open={open} onClose={close} />
    </>
  );
}
