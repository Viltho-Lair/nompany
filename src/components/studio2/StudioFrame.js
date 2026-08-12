"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
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
};

const itemClass = (active) =>
  `flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-500 transition-colors ${
    active
      ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
  }`;

const iconClass = (active) =>
  `h-[18px] w-[18px] ${active ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"}`;

export default function StudioFrame({ studio, me, sections, activeKey, children }) {
  const [open, setOpen] = useState(false);

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

  // Which groups are open. A group holding the active child starts expanded and
  // stays that way; `expanded` only records what the user has since toggled.
  const [expanded, setExpanded] = useState({});
  const hasActiveChild = (node) => node.children.some((c) => c.key === activeKey);
  const isOpen = (node) => expanded[node.key] ?? hasActiveChild(node);
  const toggle = (key, next) => setExpanded((e) => ({ ...e, [key]: next }));

  const admin = [
    { href: `/${studio.slug}/people`, key: "people", label: me.canAdminister ? "People & requests" : "People", show: true },
    { href: `/${studio.slug}/access`, key: "access", label: "Access", show: me.canAdminister },
  ].filter((i) => i.show);

  const activeLabel =
    sections.find((s) => s.key === activeKey)?.name ||
    admin.find((i) => i.key === activeKey)?.label ||
    studio.name;

  // A parent that owns sub-sections is a disclosure, not a link: it expands to
  // reveal them rather than navigating. Parents with no children stay links.
  const navGroup = (node) => {
    if (node.children.length === 0) return navLink(`/${studio.slug}/${node.key}`, node.key, node.name);
    const shown = isOpen(node);
    const active = node.key === activeKey || hasActiveChild(node);
    return (
      <div key={node.key}>
        <button
          type="button"
          onClick={() => toggle(node.key, !shown)}
          aria-expanded={shown}
          className={`${itemClass(active)} w-full`}
        >
          <span className="flex items-center gap-3">
            <Icon name={SECTION_ICONS[node.key] || "dot"} className={iconClass(active)} />
            {node.name}
          </span>
          <Icon
            name={shown ? "chevronUp" : "chevronDown"}
            className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
          />
        </button>
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
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-[3px] shadow-geex-sm dark:bg-white/5">
          <Image src="/brand/logo-icon.png" alt="" width={36} height={36} className="h-full w-full object-contain" />
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
        <Link
          href="/en/account"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <Icon name="external" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
          My account
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
            <Link
              href="/en/account"
              className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-950 font-display text-sm font-700 text-white shadow-geex-sm transition-shadow hover:ring-2 hover:ring-brand-500/40 dark:bg-brand-500/20 dark:text-brand-300"
              title={me.alias ? `${me.alias} — my account` : "My account"}
            >
              {avatarLetter}
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-5 pb-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
