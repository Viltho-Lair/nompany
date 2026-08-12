"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon } from "@/components/studio2/icons";
import ThemeToggle from "@/components/ThemeToggle";

// Studio chrome for the restructured model: the studio's identity, its sections
// (each a real row with its own SectionID), and who you are INSIDE this studio.
// Every link stays on the tenant's own address, /<slug>/… — the internal route
// name is never exposed.
//
// The look is the Old System's Geex control panel: a floating rounded sidebar
// pinned inset-4, content offset by ps-72, and a sticky header carrying the
// section title. Rendered in nompany's own brand-*/steel-* palette rather than
// the Old System's navy, and the nav stays DB-driven — sections come from the
// tenant, so there is no hardcoded route list to copy.

// Section keys are tenant data, so the icon map is best-effort and falls back
// to a neutral dot for anything unrecognised.
const SECTION_ICONS = {
  tasks: "checkDouble",
  sales: "money",
  technical: "techService",
  projects: "projects",
  operations: "gears",
  inventory: "vendors",
  finance: "services",
  website: "gallery",
  hr: "team",
  people: "clients",
  access: "lock",
  // Sales sub-sections carry their own icons rather than falling back to the
  // neutral dot, so the group reads as three destinations instead of a list.
  "sales-tickets": "ticket",
  "sales-clients": "group",
  "sales-live": "live",
  // Technical sub-sections, same idea. Live view reuses the broadcast mark the
  // Sales one already uses — it is the same kind of screen, so it should not
  // arrive wearing a different badge.
  "technical-quotations": "report",
  "technical-rfq": "rfp",
  "technical-live": "live",
  // Projects sub-sections.
  "projects-list": "blueprint",
  "projects-sla": "tools",
  "projects-overtimes": "overtime",
};

// The row's shell — shape and colour, no padding. A plain row adds the padding
// itself (itemClass); a parent group hands it to the link and the chevron
// button separately, so each is a full-height hit target of its own.
const rowClass = (active) =>
  `flex items-center justify-between gap-3 rounded-lg text-sm font-500 transition-colors ${
    active
      ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
  }`;

const itemClass = (active) => `${rowClass(active)} px-3 py-2.5`;

const iconClass = (active) =>
  `h-[18px] w-[18px] ${active ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"}`;

export default function StudioFrame({ studio, me, sections, activeKey, children }) {
  const [open, setOpen] = useState(false);
  // The header avatar is the ACCOUNT, not the studio membership: `me` carries a
  // studio-local alias and role, but the picture belongs to the person and lives
  // on their profile, so it comes from the identity endpoint like it does in the
  // public header and the account hub.
  const [account, setAccount] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/identity/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.user) setAccount({ email: d.user.email, photo: d.profile?.photo || "" }); })
      .catch(() => {}); // the avatar just falls back to initials
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const close = () => setAccountOpen(false);
    const onKey = (e) => e.key === "Escape" && setAccountOpen(false);
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("click", close); window.removeEventListener("keydown", onKey); };
  }, [accountOpen]);

  async function signOut() {
    try { await fetch("/api/identity/logout", { method: "POST" }); } catch { /* sign out locally anyway */ }
    window.location.assign("/en/login");
  }

  // Nav tree. A section with `parentId` is a sub-section; its parent renders as
  // an expandable group. Until sub-sections exist in the data every row is a
  // parent, so this degrades to the flat list it replaces.
  //
  // A sub-section can be granted WITHOUT its parent — access is per id and does
  // not cascade — so a child whose parent is not visible is promoted to the top
  // level rather than being hidden under a group that was filtered out.
  const all = sections || [];
  const visibleIds = new Set(all.map((s) => s.id));
  const tree = all
    .filter((s) => !s.parentId || !visibleIds.has(s.parentId))
    .map((s) => ({ ...s, children: all.filter((c) => c.parentId === s.id) }));

  // AT MOST ONE group is expanded, and which one FOLLOWS THE PAGE YOU ARE ON.
  // The previous version remembered every group you had ever opened, so nothing
  // ever collapsed: opening a second section left the first hanging open, and
  // walking into a different section's sub-section left both.
  //
  // Deriving it from `activeKey` closes the old group on every navigation for
  // free — a different section, a different section's sub-section, or People /
  // Access outside the tree entirely (no group matches → all closed).
  const groupKeyFor = (key) =>
    tree.find((n) => n.key === key || n.children.some((c) => c.key === key))?.key || null;
  const [openKey, setOpenKey] = useState(() => groupKeyFor(activeKey));
  useEffect(() => { setOpenKey(groupKeyFor(activeKey)); }, [activeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const isOpen = (node) => openKey === node.key;
  const toggleGroup = (key) => setOpenKey((k) => (k === key ? null : key));

  const admin = [
    { href: `/${studio.slug}/people`, key: "people", label: me.canAdminister ? "People & requests" : "People", show: true },
    { href: `/${studio.slug}/access`, key: "access", label: "Access", show: me.canAdminister },
  ].filter((i) => i.show);

  const activeLabel =
    sections.find((s) => s.key === activeKey)?.name ||
    admin.find((i) => i.key === activeKey)?.label ||
    studio.name;

  // EVERY section is a link to its own dashboard — a parent that owns
  // sub-sections is BOTH: the row navigates to the parent's dashboard, and the
  // chevron beside it expands the children without leaving the page. The two
  // are separate hit targets so neither steals the other's click.
  const navGroup = (node) => {
    if (node.children.length === 0) return navLink(`/${studio.slug}/${node.key}`, node.key, node.name);
    const shown = isOpen(node);
    // Highlight the exact page you are on. A child being active expands the
    // group (see isOpen) but no longer dresses the parent up as the current
    // screen — the parent is now a destination of its own.
    const active = node.key === activeKey;
    return (
      <div key={node.key}>
        <div className={`${rowClass(active)} pe-1`}>
          <Link
            href={`/${studio.slug}/${node.key}`}
            // Clicking the section you are ALREADY on has no navigation to
            // trigger the effect above, so it collapses the group by hand —
            // otherwise the one section you cannot close is the open one.
            onClick={() => { setOpen(false); if (active) toggleGroup(node.key); }}
            className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5"
          >
            <Icon name={SECTION_ICONS[node.key] || "dot"} className={iconClass(active)} />
            <span className="truncate">{node.name}</span>
          </Link>
          <button
            type="button"
            onClick={() => toggleGroup(node.key)}
            aria-expanded={shown}
            aria-label={`${shown ? "Collapse" : "Expand"} ${node.name}`}
            className="shrink-0 rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Icon
              name={shown ? "chevronUp" : "chevronDown"}
              className="h-4 w-4 text-slate-400 dark:text-slate-500"
            />
          </button>
        </div>
        {shown && (
          <div className="mt-0.5 space-y-0.5 ps-4">
            {node.children.map((c) => navLink(`/${studio.slug}/${c.key}`, c.key, c.name))}
          </div>
        )}
      </div>
    );
  };

  const navLink = (href, key, label, extraClass = "") => {
    const active = key === activeKey;
    return (
      <Link key={key} href={href} onClick={() => setOpen(false)} className={`${itemClass(active)} ${extraClass}`}>
        <span className="flex items-center gap-3">
          <Icon name={SECTION_ICONS[key] || "dot"} className={iconClass(active)} />
          {label}
        </span>
      </Link>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-[var(--geex-surface)]">
      <Link href={`/${studio.slug}`} className="flex items-center gap-2.5 px-6 py-5" onClick={() => setOpen(false)}>
        {/* The studio's own logo stands here once it has one; the nompany mark
            is the default every new studio starts with. Shown whole rather than
            cropped to a circle — it is a company's mark, not a face — so it is
            contained inside the tile and may be any shape.
            A plain <img> because the logo is a stored data URI, which next/image
            would try to optimise and cannot. */}
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-[3px] shadow-geex-sm dark:bg-white/5">
          {studio.logo
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={studio.logo} alt="" className="h-full w-full object-contain" />
            : <Image src="/brand/logo-icon.png" alt="" width={36} height={36} className="h-full w-full object-contain" />}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-display text-[15px] font-700 tracking-tight text-slate-900 dark:text-white">
            {studio.name}
          </span>
          <span className="truncate font-mono text-[10px] font-500 tracking-tight text-slate-400 dark:text-slate-500">
            nompany.com/{studio.slug}
          </span>
        </span>
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-4 py-6">
        {tree.map((node) => navGroup(node))}

        {admin.length > 0 && (
          <div className="mt-6 space-y-0.5 border-t border-[var(--geex-border)] pt-4">
            {admin.map((i) => navLink(i.href, i.key, i.label, "font-600"))}
          </div>
        )}
      </nav>

      <div className="space-y-0.5 border-t border-[var(--geex-border)] p-4">
        {/* Full-screen manual — opens outside the studio chrome. */}
        <Link
          href={`/${studio.slug}/documentation`}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <Icon name="services" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
          Documentation
        </Link>
        {/* This slot used to hold "My account". The account is the PERSON and
            belongs with the header avatar, which now carries it; the sidebar
            belongs to the studio, so the studio's own settings live here. */}
        <Link
          href={`/${studio.slug}/studio-settings`}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 ${
            activeKey === "studio-settings"
              ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
          }`}
        >
          <Icon name="gears" className={`h-[18px] w-[18px] ${activeKey === "studio-settings" ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"}`} />
          Studio settings
        </Link>
      </div>
    </div>
  );

  const avatarLetter = (me.alias?.[0] || me.role?.[0] || "?").toUpperCase();

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
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm dark:text-slate-300 lg:hidden"
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white sm:text-2xl">{activeLabel}</h1>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">{studio.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Light / Dark / Device — writes the same `theme` cookie and `.dark`
                class the public site uses, so the Studio follows the choice
                everywhere and the no-flash script picks it up on next load. */}
            <ThemeToggle labels={{ theme: "Theme", light: "Light", dark: "Dark", system: "Device" }} />
            <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">
              {me.alias || "Member"}
              <span className="ms-2 rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-600 text-brand-700 dark:text-brand-300">
                {me.role}
              </span>
            </span>
            {/* The avatar is a menu, not a link: going to the account and
                signing out are both reachable from it, and sign-out lives
                nowhere else in the studio. */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setAccountOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-950 font-display text-sm font-700 text-white shadow-geex-sm transition-shadow hover:ring-2 hover:ring-brand-500/40 dark:bg-brand-500/20 dark:text-brand-300"
                title={me.alias ? `${me.alias} — my account` : "My account"}
              >
                {account?.photo
                  /* A stored data URI, so next/image would only get in the way. */
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={account.photo} alt="" className="h-full w-full object-cover" />
                  : avatarLetter}
              </button>

              {accountOpen && (
                <div role="menu" className="absolute end-0 z-50 mt-2 w-56 overflow-hidden rounded-geex bg-[var(--geex-surface)] py-1 shadow-geex">
                  <p className="truncate px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
                    {account?.email || me.alias || "Signed in"}
                  </p>
                  <Link
                    href="/en/account"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm font-500 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    <Icon name="person" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
                    Go to account
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm font-500 text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    <Icon name="lock" className="h-[18px] w-[18px]" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-5 pb-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
