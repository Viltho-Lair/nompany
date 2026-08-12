"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { FLAT, BASE } from "./nav";
import { CURRENT_USER } from "./session";

/* ---- theme ---------------------------------------------------------------
   The site-wide control: the same `theme` cookie the public site and Studio
   use (see src/components/ThemeToggle.js and the no-flash script in
   src/app/layout.js), toggling `html.dark`. Choosing a mode here changes the
   whole website, not just /super — which is the "passed on from the main
   website" behaviour.                                                        */

const MODES = [
  { id: "light", label: "Light", icon: "sun" },
  { id: "dark", label: "Dark", icon: "moon" },
  { id: "system", label: "System", icon: "monitor" },
];

function readTheme() {
  try {
    const m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "light";
  } catch {
    return "light";
  }
}

function applyTheme(mode) {
  const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", mode === "dark" || (mode === "system" && sys));
}

function useTheme() {
  const [mode, setMode] = useState("light");

  useEffect(() => {
    setMode(readTheme());
  }, []);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [mode]);

  const choose = useCallback((next) => {
    setMode(next);
    try {
      const secure = location.protocol === "https:" ? "; secure" : "";
      document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax${secure}`;
    } catch {}
    applyTheme(next);
  }, []);

  return [mode, choose];
}

/* ---- dropdown shell ------------------------------------------------------ */

function Menu({ trigger, children, align = "end", width = 288, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="contents"
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="menu"
          className={`absolute top-[calc(100%+8px)] z-50 overflow-hidden rounded-lg border shadow-lg ${
            align === "end" ? "ltr:right-0 rtl:left-0" : "ltr:left-0 rtl:right-0"
          }`}
          style={{
            width,
            backgroundColor: "var(--ad-popover)",
            borderColor: "var(--ad-border)",
            color: "var(--ad-popover-foreground)",
          }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

const menuItem =
  "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--ad-accent)] text-start";

/* ---- command palette ----------------------------------------------------- */

function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const pool = s
      ? FLAT.filter((i) => `${i.parent || ""} ${i.label} ${i.group}`.toLowerCase().includes(s))
      : FLAT.slice(0, 8);
    return pool.slice(0, 12);
  }, [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4 pt-[12vh]" onClick={onClose}>
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
                    onClose();
                    router.push(r.href);
                  }}
                >
                  <Icon name={r.icon || "file"} className="h-4 w-4 text-[var(--ad-muted-foreground)]" />
                  <span className="flex-1 truncate">
                    {r.parent ? <span className="text-[var(--ad-muted-foreground)]">{r.parent} / </span> : null}
                    {r.label}
                  </span>
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

const NOTIFICATIONS = [
  { id: 1, tone: "primary", icon: "user", title: "New studio registered", body: "Falcon Contracting completed onboarding.", time: "2 min ago", unread: true },
  { id: 2, tone: "success", icon: "wallet", title: "Payment received", body: "Invoice INV-2291 settled — SAR 12,400.", time: "26 min ago", unread: true },
  { id: 3, tone: "warning", icon: "alert", title: "Storage at 82%", body: "Media bucket approaching its quota.", time: "3 hours ago" },
  { id: 4, tone: "info", icon: "refresh", title: "Deployment finished", body: "Release 4.2.0 is live in production.", time: "Yesterday" },
];

const TONE_BG = {
  primary: "rgba(70,128,255,.14)",
  success: "rgba(44,168,127,.16)",
  warning: "rgba(229,138,0,.16)",
  info: "rgba(4,169,245,.16)",
};
const TONE_FG = {
  primary: "var(--ad-primary)",
  success: "var(--ad-success)",
  warning: "var(--ad-warning)",
  info: "var(--ad-info)",
};

/* ---- header -------------------------------------------------------------- */

export default function Header({ collapsed, onToggleCollapse, onOpenMobile, onOpenCustomizer }) {
  const [mode, setMode] = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const unread = NOTIFICATIONS.filter((n) => n.unread).length;
  const activeMode = MODES.find((m) => m.id === mode) || MODES[0];

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center px-4 sm:px-6"
        style={{
          height: "var(--ad-header-height)",
          backgroundColor: "color-mix(in srgb, var(--ad-background) 78%, transparent)",
          backdropFilter: "blur(7px)",
        }}
      >
        <div className="me-auto flex items-center">
          <button
            type="button"
            aria-label="Collapse sidebar"
            onClick={onToggleCollapse}
            className="ad-icon-btn hidden lg:flex"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Open sidebar" onClick={onOpenMobile} className="ad-icon-btn flex lg:hidden">
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search anything…"
            className="ms-1 flex h-11 items-center gap-1.5 rounded-full px-2.5 text-[var(--ad-muted-foreground)] transition-colors hover:bg-[var(--ad-accent)] hover:text-[var(--ad-foreground)]"
          >
            <Icon name="search" className="h-[18px] w-[18px]" />
            <kbd
              className="hidden rounded border px-1.5 py-0.5 text-[10px] font-medium md:inline"
              style={{ borderColor: "var(--ad-border)", backgroundColor: "var(--ad-background)" }}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1">
          {/* Theme */}
          <Menu
            label="Toggle theme"
            width={190}
            trigger={
              <span className="ad-icon-btn">
                <Icon name={activeMode.icon} className="h-[18px] w-[18px]" />
              </span>
            }
          >
            <div className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--ad-muted-foreground)]">
              Theme
            </div>
            {MODES.map((m) => (
              <button key={m.id} type="button" className={menuItem} onClick={() => setMode(m.id)} role="menuitem">
                <Icon name={m.icon} className="h-4 w-4" />
                <span className="flex-1">{m.label}</span>
                {mode === m.id ? <Icon name="check" className="h-4 w-4 text-[var(--ad-primary)]" /> : null}
              </button>
            ))}
            <div className="px-4 pb-3 pt-1 text-[11px] leading-snug text-[var(--ad-muted-foreground)]">
              Applies across the whole site.
            </div>
          </Menu>

          {/* Customizer */}
          <button type="button" className="ad-icon-btn" aria-label="Open theme customizer" onClick={onOpenCustomizer}>
            <Icon name="palette" className="h-[18px] w-[18px]" />
          </button>

          {/* Notifications */}
          <Menu
            label="Notifications"
            width={340}
            trigger={
              <span className="ad-icon-btn relative">
                <Icon name="bell" className="h-[18px] w-[18px]" />
                {unread ? (
                  <span
                    className="absolute -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ltr:-right-0.5 rtl:-left-0.5"
                    style={{ backgroundColor: "var(--ad-success)", color: "var(--ad-success-foreground)" }}
                  >
                    {unread}
                  </span>
                ) : null}
              </span>
            }
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: "var(--ad-border)" }}
            >
              <span className="text-sm font-semibold">Notifications</span>
              <span className="text-xs text-[var(--ad-primary)]">Mark all read</span>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {NOTIFICATIONS.map((n) => (
                <li key={n.id}>
                  <Link href={`${BASE}/application/notifications`} className="flex gap-3 px-4 py-3 hover:bg-[var(--ad-accent)]">
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: TONE_BG[n.tone], color: TONE_FG[n.tone] }}
                    >
                      <Icon name={n.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{n.title}</span>
                      <span className="mt-0.5 block text-xs text-[var(--ad-muted-foreground)]">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-[var(--ad-muted-foreground)]">{n.time}</span>
                    </span>
                    {n.unread ? (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "var(--ad-primary)" }} />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={`${BASE}/application/notifications`}
              className="block border-t px-4 py-3 text-center text-sm font-medium text-[var(--ad-primary)]"
              style={{ borderColor: "var(--ad-border)" }}
            >
              View all notifications
            </Link>
          </Menu>

          {/* Profile */}
          <Menu
            label="User menu"
            width={272}
            trigger={
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white transition-shadow"
                style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--ad-primary) 80%, #fff), var(--ad-primary))" }}
              >
                {CURRENT_USER.initials}
              </span>
            }
          >
            <div className="border-b px-4 py-4" style={{ borderColor: "var(--ad-border)" }}>
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--ad-primary) 80%, #fff), var(--ad-primary))" }}
                >
                  {CURRENT_USER.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{CURRENT_USER.name}</p>
                  <p className="truncate text-xs text-[var(--ad-muted-foreground)]">{CURRENT_USER.email}</p>
                </div>
              </div>
              <span
                className="ad-badge mt-3"
                style={{ backgroundColor: "rgba(70,128,255,.12)", color: "var(--ad-primary)" }}
              >
                {CURRENT_USER.role}
              </span>
            </div>
            <div className="py-1">
              <Link href={`${BASE}/settings/profile`} className={menuItem}>
                <Icon name="user" className="h-4 w-4" /> Profile
              </Link>
              <Link href={`${BASE}/settings/profile`} className={menuItem}>
                <Icon name="settings" className="h-4 w-4" /> Account settings
              </Link>
              <Link href={`${BASE}/docs`} className={menuItem}>
                <Icon name="helpCircle" className="h-4 w-4" /> Support
              </Link>
            </div>
            <div className="border-t py-1" style={{ borderColor: "var(--ad-border)" }}>
              <Link href={BASE} className={menuItem} style={{ color: "var(--ad-destructive)" }}>
                <Icon name="logout" className="h-4 w-4" /> Sign out
              </Link>
            </div>
          </Menu>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
