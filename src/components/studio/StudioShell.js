"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { useLivePoll } from "@/lib/useLivePoll";
import ThemeToggle from "@/components/ThemeToggle";
import StudioDirToggle from "@/components/studio/StudioDirToggle";
import NotificationBell from "@/components/studio/NotificationBell";
import SyncButton from "@/components/studio/SyncButton";
import { canAccessSection } from "@/lib/sectionAccessConstants";

// Each nav item carries a `key` that matches an entry in
// lib/sectionAccessConstants.js. Every key (dashboard AND sub-items) is granted
// independently — there is no parent→child cascade, so granting a section's
// dashboard does not unlock its sub-sections.
const NAV = [
  { group: "Main", items: [{ href: "/studio", label: "Dashboard", icon: "dashboard", exact: true, key: "dashboard" }] },
  { group: "Tasks", items: [{ href: "/studio/tasks", label: "Tasks", icon: "checkDouble", key: "tasks" }] },
  {
    group: "Notifications",
    link: { href: "/studio/notifications", label: "Notifications", icon: "bell", key: "notifications", exact: true },
    items: [
      { href: "/studio/notifications/settings", label: "Settings", icon: "gear", key: "notifications-settings" },
    ],
  },
  {
    group: "Company Website",
    icon: "brandLogo",
    items: [
      { href: "/studio/messages", label: "Messages", icon: "messages", key: "messages" },
      { href: "/studio/chat", label: "Live Chat", icon: "messages", key: "chat" },
      { href: "/studio/access", label: "Access Control", icon: "gear", key: "access" },
      { href: "/studio/services", label: "Services", icon: "services", key: "services" },
      { href: "/studio/previous-projects", label: "Previous Projects", icon: "video", key: "previous-projects" },
      { href: "/studio/gallery", label: "Gallery", icon: "gallery", key: "gallery" },
    ],
  },
  {
    group: "Projects",
    link: { href: "/studio/projects", label: "Projects", icon: "projects", key: "projects" },
    items: [
      { href: "/studio/projects/list", label: "Project list", icon: "projects", key: "projects-list" },
      { href: "/studio/projects/sla", label: "SLA", icon: "careers", key: "projects-sla" },
      { href: "/studio/projects/overtime", label: "Overtimes", icon: "team", key: "projects-overtimes" },
      { href: "/studio/projects/settings", label: "Settings", icon: "gear", key: "projects-settings" },
    ],
  },
  {
    group: "Operations",
    link: { href: "/studio/operations", label: "Operations", icon: "dashboard", key: "operations" },
    items: [
      { href: "/studio/operations/tracking", label: "Tracking", icon: "location", key: "operations-tracking" },
      { href: "/studio/operations/settings", label: "Settings", icon: "gear", key: "operations-settings" },
    ],
  },
  {
    group: "Technical",
    link: { href: "/studio/technical", label: "Technical", icon: "dashboard", key: "technical" },
    items: [
      { href: "/studio/technical/quotations", label: "Quotations", icon: "services", key: "technical-quotations" },
      { href: "/studio/technical/rfq", label: "RFQ", icon: "messages", key: "technical-rfq" },
      { href: "/studio/technical/settings", label: "Settings", icon: "gear", key: "technical-settings" },
      { href: "/studio/live/technical", label: "Live view", icon: "dashboard", key: "technical-live" },
    ],
  },
  {
    group: "Sales",
    link: { href: "/studio/sales", label: "Sales", icon: "dashboard", key: "sales" },
    items: [
      { href: "/studio/sales/tickets", label: "Tickets", icon: "services", key: "sales-list" },
      { href: "/studio/sales/clients", label: "Clients", icon: "clients", key: "sales-clients" },
      { href: "/studio/live/sales", label: "Live view", icon: "dashboard", key: "sales-live" },
      { href: "/studio/sales/settings", label: "Settings", icon: "gear", key: "sales-settings" },
    ],
  },
  {
    group: "Finance",
    link: { href: "/studio/finance", label: "Finance", icon: "services", key: "finance" },
    items: [
      { href: "/studio/finance/cash", label: "Cash", icon: "services", key: "cash" },
      { href: "/studio/finance/settings", label: "Settings", icon: "gear", key: "finance-settings" },
    ],
  },
  {
    group: "Inventory",
    link: { href: "/studio/inventory", label: "Inventory", icon: "vendors", key: "inventory" },
    items: [
      { href: "/studio/inventory/stock", label: "Stock Management", icon: "vendors", key: "inventory-stock" },
      { href: "/studio/inventory/vendors", label: "Vendors", icon: "clients", key: "inventory-vendors" },
      { href: "/studio/inventory/items", label: "Registered Items", icon: "services", key: "inventory-items" },
      { href: "/studio/inventory/sheets", label: "Project Sheets", icon: "applications", key: "inventory-sheets" },
      { href: "/studio/inventory/awb", label: "AWB Tracking", icon: "location", key: "inventory-awb" },
    ],
  },
  {
    group: "Human Resources",
    link: { href: "/studio/hr", label: "Human Resources", icon: "team", key: "hr" },
    items: [
      { href: "/studio/employees", label: "Employees", icon: "team", key: "employees" },
      { href: "/studio/users", label: "Users", icon: "team", key: "users" },
      { href: "/studio/careers", label: "Careers", icon: "careers", key: "careers" },
      { href: "/studio/applications", label: "Applications", icon: "applications", key: "applications" },
    ],
  },
  {
    group: "Documentation",
    link: { href: "/studio/documentation", label: "Documentation", icon: "services", key: "documentation" },
    items: [
      { href: "/studio/documentation/settings", label: "Settings", icon: "gear", key: "documentation-settings" },
    ],
  },
  {
    group: "Content",
    items: [
      { href: "/studio/settings", label: "Main Website content", icon: "pencil", key: "settings" },
      { href: "/studio/reviews", label: "Client Reviews", icon: "star", key: "reviews" },
      { href: "/studio/content/statistics", label: "Statistics", icon: "dashboard", key: "content-statistics" },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => [...(g.link ? [{ ...g.link, exact: true }] : []), ...(g.items || [])]);

function titleFor(pathname) {
  if (pathname.startsWith("/studio/profile")) return "My Profile";
  const match = ALL_ITEMS.filter((i) => (i.exact ? pathname === i.href : pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match ? match.label : "Studio";
}

export default function StudioShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [accessMap, setAccessMap] = useState({});
  const [counts, setCounts] = useState({}); // unread personal-notification counts, keyed by nav item key

  useEffect(() => {
    document.documentElement.classList.add("studio-chrome");
    return () => document.documentElement.classList.remove("studio-chrome");
  }, []);

  // Load current user + section-access map so the sidebar can hide items this
  // user can't reach. Sidebar renders anyway on failure (fail-open) — the
  // per-page server guard is the real security boundary.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [meRes, accRes] = await Promise.all([
          fetch("/api/users/me", { cache: "no-store" }),
          fetch("/api/section-access", { cache: "no-store" }),
        ]);
        const me = await meRes.json();
        const acc = await accRes.json();
        if (!alive) return;
        setUser(me?.user || null);
        setAccessMap(acc?.access || {});
      } catch {
        /* keep sidebar visible; server guards are the real check */
      }
    })();
    return () => { alive = false; };
  }, []);

  // Unread PERSONAL-notification counts per nav item key — the single source for
  // the sidebar dot/counter. Reloaded on route change and polled so it stays live.
  const loadCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      let next = res.ok ? ((await res.json())?.counts || {}) : {};
      // Waiting live-chats (0 for users without chat access) — the "ring" cue.
      try {
        const c = await fetch("/api/chat/waiting-count", { cache: "no-store" });
        if (c.ok) { const d = await c.json(); if (Number(d.count) > 0) next = { ...next, chat: Number(d.count) }; }
      } catch { /* ignore */ }
      setCounts(next);
    } catch { /* non-critical */ }
  }, []);
  useEffect(() => { loadCounts(); }, [loadCounts, pathname]);
  useLivePoll(loadCounts, 20000);

  // Notifications Center is available to every signed-in user (no section gate).
  const canAccess = useMemo(
    () => (key) => (key === "notifications" || key === "notifications-settings") ? !!user : canAccessSection(user, key, accessMap),
    [user, accessMap]
  );

  const isActive = (item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/studio/login");
    router.refresh();
  }

  // Item renderer. `opts.dot` (used for a PARENT that has sub-sections) renders a
  // small pulsing red dot when `opts.dotOn` — pointing to where notifications
  // live — instead of a number. Leaf items render a numeric unread counter.
  const renderItem = (item, active, opts = {}) => {
    const permitted = canAccess(item.key);
    if (!permitted) return null;
    const cls = `flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-500 transition-colors ${
      active
        ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
    }`;
    const iconCls = `h-[18px] w-[18px] ${active ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"}`;
    const count = Number(counts[item.key] || 0);
    return (
      <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cls}>
        <span className="flex items-center gap-3">
          <Icon name={item.icon} className={iconCls} />
          {item.label}
        </span>
        <span className="flex items-center gap-1.5">
          {opts.dot
            ? (opts.dotOn ? <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" title="New notifications inside" /> : null)
            : (count > 0 ? (
                <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-700 leading-none text-white" title={`${count} unread notification${count === 1 ? "" : "s"}`}>
                  {count > 99 ? "99+" : count}
                </span>
              ) : null)}
        </span>
      </Link>
    );
  };

  // Sum of unread counts across a set of item keys (for a parent's dot).
  const sumCounts = (keys) => keys.reduce((a, k) => a + Number(counts[k] || 0), 0);

  const sidebar = (
    <div className="flex h-full flex-col bg-[var(--geex-surface)]">
      <Link href="/studio" className="flex items-center gap-2.5 px-6 py-5" onClick={() => setOpen(false)}>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white p-[3px] shadow-geex-sm dark:bg-white/5 dark:shadow-[0_0_14px_3px_rgba(42,148,254,0.5)]">
          <Image src="/brand/logo-icon.png" alt="" width={36} height={36} className="h-full w-full object-contain" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-display text-[15px] font-700 tracking-tight text-slate-900 dark:text-white">
            MegaTech <span className="text-brand-500">Studio</span>
          </span>
          <span className="text-[10px] font-500 uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Control Panel</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {NAV.map((group) => {
          // A section is shown only to members who can reach it — inaccessible
          // items are hidden outright (no greying), and a group with nothing
          // reachable disappears entirely (header included). Sub-sections are
          // always shown expanded — no collapse toggle.
          const parentPermitted = group.link ? canAccess(group.link.key) : false;
          const accessibleItems = (group.items || []).filter((i) => canAccess(i.key));
          if (!parentPermitted && accessibleItems.length === 0) return null;
          // A parent (link or header) shows a pulsing dot when any of its
          // sub-sections has unread notifications — pointing to the location.
          const childUnread = sumCounts(accessibleItems.map((i) => i.key));
          return (
            <div key={group.group}>
              <div className="space-y-0.5">
                {group.link && parentPermitted && renderItem({ ...group.link, exact: true }, pathname === group.link.href, { dot: true, dotOn: childUnread > 0 })}
                {group.link && parentPermitted ? (
                  <div className="space-y-0.5 ps-4 pt-0.5">
                    {accessibleItems.map((sub) => renderItem(sub, isActive(sub)))}
                  </div>
                ) : group.icon ? (
                  <>
                    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-600 text-slate-700 dark:text-slate-200">
                      <span className="flex items-center gap-3">
                        {group.icon === "brandLogo" ? (
                          <Image src="/brand/logo-icon.png" alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 object-contain" />
                        ) : (
                          <Icon name={group.icon} className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
                        )}
                        {group.group}
                      </span>
                      {childUnread > 0 && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" title="New notifications inside" />}
                    </div>
                    <div className="space-y-0.5 ps-4 pt-0.5">
                      {accessibleItems.map((item) => renderItem(item, isActive(item)))}
                    </div>
                  </>
                ) : (
                  accessibleItems.map((item) => renderItem(item, isActive(item)))
                )}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t border-[var(--geex-border)] p-4">
        <a
          href="/en"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <Icon name="external" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
          View website
        </a>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 text-red-600 hover:bg-red-50 dark:text-white dark:hover:bg-red-500/10"
        >
          <Icon name="logout" className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </div>
    </div>
  );

  const avatarLetter = (user?.fullName?.[0] || user?.userId?.[0] || "?").toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300">
      {/* Floating rounded sidebar — Geex control-panel style */}
      <aside className="fixed inset-y-4 start-4 z-30 hidden w-64 overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-64 bg-[var(--geex-surface)] shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:ps-72">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-[var(--geex-page)] px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm dark:text-slate-300 lg:hidden"
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>
            <div>
              <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white sm:text-2xl">{titleFor(pathname)}</h1>
              <p className="text-xs text-slate-400 dark:text-slate-500">Welcome to MegaTech Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncButton />
            {canAccess("messages") && (
              <Link
                href="/studio/messages"
                title="Messages"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-500 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
              >
                <Icon name="messages" className="h-[18px] w-[18px]" />
              </Link>
            )}
            <NotificationBell user={user} />
            <StudioDirToggle />
            <ThemeToggle label="Toggle dark mode" />
            <Link
              href="/studio/profile"
              className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-950 font-display text-sm font-700 text-white shadow-geex-sm transition-shadow hover:ring-2 hover:ring-brand-500/40 dark:bg-brand-500/20 dark:text-brand-300"
              title={user ? `${user.fullName} (${user.userId}) — edit profile` : "Profile"}
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                avatarLetter
              )}
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-5 pb-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
