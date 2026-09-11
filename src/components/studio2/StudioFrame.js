"use client";

import { AnalyticsLevelProvider } from "@/components/studio2/analyticsLevel";
import NovaLauncher from "@/components/studio2/NovaLauncher";

import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { dirFor, locales, LANGUAGE_NAMES, LANGUAGE_SHORT } from "@/shared/locale";
import { studioSegments, requestedKey, resolveActiveKey, isFullScreenPath, isSettingsPath, SETTINGS_KEY } from "@/shared/studioRoute";
import { shellDict } from "@/shared/studio/shell";
import { sectionName } from "@/shared/studio/sections";
import { isSystemSection } from "@/platform/db/keys";
import { StudioLocaleProvider } from "@/components/studio2/locale";
import LangMenu from "@/components/LangMenu";
// LOADED ONLY BY THE STUDIOS THAT NEED IT. The RTL cache pulls in
// stylis-plugin-rtl and a second Emotion cache; imported eagerly it landed
// in the shared chunk, so every English studio paid 5 KB for mirroring it
// never uses. Split, an English tenant never fetches it.
const MuiRtlProvider = dynamic(() => import("@/components/MuiRtlProvider"));
import { Icon } from "@/components/studio2/icons";
import StudioChat from "@/components/studio2/StudioChat";
import RateNompany from "@/components/studio2/RateNompany";
import LiveProvider from "@/components/studio2/LiveProvider";
import NotificationBell from "@/components/studio2/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import { toneOf } from "@/lib/planColors";
import DailyGreeting from "@/components/studio2/DailyGreeting";

// Studio chrome for the restructured model: the studio's identity, its sections
// (each a real row with its own SectionID), and who you are INSIDE this studio.
// Every link stays on the tenant's own address, /<slug>/… — the internal route
// name is never exposed.
//
// The look is the Old System's Geex control panel: a floating rounded sidebar
// pinned inset-4, content offset by ps-[23.5rem], and a sticky header carrying the
// section title. Rendered in nompany's own brand-*/steel-* palette rather than
// the Old System's navy, and the nav stays DB-driven — sections come from the
// tenant, so there is no hardcoded route list to copy.

// Section keys are tenant data, so the icon map is best-effort and falls back
// to a neutral dot for anything unrecognised.
//
// THE CRM & SALES ROW'S ICON NAME IS THE BARE WORD "sales" — the icon set's own
// registry key for it, unrelated to and unrenamed by the P0 restructure: an icon
// name is not a section key. tests/restructure.mjs's KNOWN_COLLISIONS allowlist
// knows about this one. (It used to name `sales.png`; the set is Phosphor
// artwork now and there is no PNG behind any of these names.)
const SECTION_ICONS = {
  main: "home",
  tasks: "tasks",
  "crm-sales": "sales",
  tendering: "tender",
  projects: "projects",
  "engineering-docs": "engineeringDocs",
  procurement: "procurement",
  inventory: "box",
  manufacturing: "manufacturing",
  // Engineering, not the plain gear: Field Service is a section of its own,
  // and sharing the gear with every module's Settings made the parent and its
  // own Settings child render identically side by side.
  "field-service": "engineering",
  logistics: "selection",
  assets: "assets",
  maintenance: "tools",
  "quality-hse": "hse",
  hr: "team",
  finance: "bank",
  reports: "reports",
  administration: "gears",
  // ADMINISTRATION'S ROWS ARE SECTIONS NOW, so they arrive under their section
  // keys rather than the pre-restructure "people" / "access". Both old keys are
  // deliberately kept beside the new ones: a retired address resolves to the
  // new key before it reaches here, so nothing should ask for them — but this
  // map is best-effort by design, and a stale entry costs a line where a
  // missing one costs a row its icon.
  "administration-members": "team",
  "administration-access": "lock",
  "administration-master": "database",
  "administration-settings": "gears",
  people: "team",
  access: "lock",
  engagements: "link",
  // Sales sub-sections carry their own icons rather than sharing the fallback,
  // so the group reads as three destinations instead of a list.
  // THE SIX THAT FELL THROUGH, measured rather than eyeballed: the whole
  // Procurement group and Sales' order register. Five identical marks under one
  // parent is a list that says nothing about what is in it — which is the whole
  // reason each of these is named. (This said `SECTION_ICONS[key] || "dot"`; the
  // fallback is `sectionIcon` below now, and it is a mark rather than a dot.)
  "crm-sales-orders": "salesOrders",
  "procurement-requisitions": "requisitions",
  "maintenance-requests": "requisitions",
  "maintenance-orders": "tool",
  "maintenance-plans": "calendar",
  "procurement-rfq": "supplierQuotes",
  "procurement-expediting": "expediting",
  "procurement-subcontracts": "subcontracts",
  "procurement-receiving": "receiving",

  "tendering-register": "rfp",
  "tendering-rates": "money",
  "crm-sales-pipeline": "kanban",
  "crm-sales-tickets": "ticket",
  "crm-sales-clients": "group",
  "crm-sales-contracts": "contract",
  "crm-sales-live": "live",
  // Technical sub-sections, same idea. Live view reuses the broadcast mark the
  // Sales one already uses — it is the same kind of screen, so it should not
  // arrive wearing a different badge.
  "crm-sales-quotations": "report",
  "engineering-docs-rfq": "form",
  "engineering-docs-live": "live",
  "engineering-docs-register": "book",
  // Projects sub-sections. SLA is a promise about TIME, so it wears the clock
  // rather than the toolbox it used to.
  "projects-list": "blueprint",
  "projects-sla": "clock",
  "projects-overtimes": "overtime",
  "projects-planner": "calendar",
  // Inventory, procurement and logistics.
  "inventory-items": "registeredItems",
  "inventory-stock": "readyStock",
  "inventory-sheets": "sheets",
  "procurement-suppliers": "vendors",
  "logistics-shipments": "box",
  "hr-employees": "teamwork",
  // FINANCE'S FOUR CHILDREN DREW A BARE DOT UNTIL NOW — the map had an entry
  // for Cash and nothing for the Ledger, the Payables or the Fixed assets, so
  // three of the four rows in the section a studio spends most of its day in
  // were unlabelled. Same for Procurement, Logistics and their children.
  /* THE ENGINE REGISTERS — thirty-one rows that drew a bare dot each.
     ------------------------------------------------------------------
     A record type is a ROW, and the section it plants is `engine-<typeKey>`
     (platform/access/catalogue). So these keys do not exist when this file is
     compiled, which is why none of them was here and why every engine register
     in the product rendered the fallback. Quality & HSE showed eight identical
     dots; Manufacturing four; Assets, Logistics, HR and Engineering & Documents
     three or more each.

     WITHIN ONE PARENT NO TWO MARKS REPEAT, which is the whole point — the
     complaint was not that a dot is ugly, it is that five identical dots under
     one heading say nothing about what is under it. Across parents a mark is
     reused freely: `box` is Inventory's and Manufacturing's batches, and no
     reader ever sees them side by side.

     THIS COVERS THE BUILT-INS AND NOT A TYPE A STUDIO CREATES ITSELF. A runtime
     type still falls through to the dot, and it always will while the icon is
     decided here: the durable fix is an `icon` on the type declaration, stored
     with the row and read by the nav. Written down rather than done, because it
     is a stored-shape change plus a backfill for every already-planted section,
     and this is a map. */
  // Engineering & Documents
  "engine-transmittal": "send",
  "engine-rfi": "helpCircle",
  "engine-submittal": "form",
  "engine-ebom": "code",
  "engine-techlib": "folder",
  // Quality & HSE — the worst of them, eight rows and eight dots.
  "engine-ncr": "alert",
  "engine-audit": "checkDouble",
  "engine-incident": "flag",
  "engine-permit": "shield",
  "engine-toolbox": "megaphone",
  "engine-itp": "list",
  "engine-testreport": "chart",
  "engine-certification": "verified",
  // Assets & Equipment
  "engine-equipment": "tool",
  "engine-maintenance": "gears",
  "engine-calibration": "target",
  // Field Operations & Service
  "engine-job": "techService",
  "engine-contract": "contract",
  "engine-planned": "calendar",
  "engine-installed": "locations",
  // Logistics & Fleet
  "engine-delivery": "package",
  "engine-trip": "mapPin",
  "engine-vehicle": "tracking",
  // Manufacturing & Production
  "engine-workorder": "tasks",
  "engine-bom": "layers",
  "engine-station": "server",
  "engine-batch": "box",
  // Human Resources
  "engine-candidate": "person",
  "engine-appraisal": "award",
  "engine-course": "book",
  // Inventory & Warehouse
  "engine-stocktake": "table",

  "finance-cash": "cash",
  "finance-ledger": "ledger",
  "finance-payables": "invoice",
  "finance-assets": "assets",
  "field-service-schedule": "calendar",
  "field-service-tracking": "tracking",
  // Every module's Settings wears the same gear. They are the same KIND of
  // screen in five different places, so giving each its own mark would imply a
  // difference that is not there.
  "crm-sales-settings": "gears",
  "engineering-docs-settings": "gears",
  "projects-settings": "gears",
  "finance-settings": "gears",
  "field-service-settings": "gears",
  "tasks-settings": "gears",
};

/* A SECTION A STUDIO INVENTED STILL GETS A MARK.
   ------------------------------------------------------------------
   `SECTION_ICONS` can only name keys that exist when this file is compiled, and
   an engine record type is a ROW: its section key is `engine-<typeKey>`, minted
   the moment somebody adds a type. The thirty-one built-ins are mapped above by
   name; a type a studio invents this afternoon cannot be, ever — there is no
   commit between them and their own sidebar.

   So the fallback is a REAL MARK rather than a dot. Every one of these screens
   is a register of records, which is a list, and a list drawn against a section
   name reads as that section. A dot reads as nothing, and five of them under one
   parent read as a list that says nothing about what is in it — which is the
   argument the map above already makes for the built-ins.

   The honest limit: every studio-made register wears the SAME mark, because
   nothing on a type row says which one it wants. Giving a type its own icon is a
   field on the declaration and a backfill for the sections already planted, and
   it belongs with the type editor rather than here. */
const FALLBACK_SECTION_ICON = "list";

function sectionIcon(key) {
  return SECTION_ICONS[key] || FALLBACK_SECTION_ICON;
}

// A HUE PER SECTION, AND SUB-SECTIONS INHERIT THEIR PARENT'S.
//
// Every mark in this nav used to be drawn at `text-slate-400`: fifteen sections
// and seventeen sub-sections in one grey, so the only thing distinguishing a row
// from the row above it was the word. Colour does that work far faster than
// reading does, and a section keeps its hue everywhere it appears — which is
// what makes the nav learnable rather than merely colourful.
//
// A CHILD IS NOT ITS OWN COLOUR. Giving Payables a hue of its own would say it
// is a peer of Finance rather than part of it, so the accent is resolved from
// the ROOT and every child of Finance is the same green. The group reads as a
// group even when it is scrolled away from its parent.
//
// The hues are spread around the wheel rather than picked one at a time, so no
// two adjacent sections collide, and each is a 600/400 pair because a mid-tone
// that reads on white disappears on the dark shell. Written as whole class
// strings because Tailwind scans source text for them — a composed
// `text-${hue}-600` is not there to find and arrives unstyled.
const SECTION_ACCENTS = {
  main: "text-blue-600 dark:text-blue-400",
  tasks: "text-violet-600 dark:text-violet-400",
  "crm-sales": "text-sky-600 dark:text-sky-400",
  tendering: "text-purple-600 dark:text-purple-400",
  projects: "text-indigo-600 dark:text-indigo-400",
  "engineering-docs": "text-cyan-600 dark:text-cyan-400",
  procurement: "text-orange-600 dark:text-orange-400",
  inventory: "text-amber-600 dark:text-amber-400",
  manufacturing: "text-stone-600 dark:text-stone-400",
  "field-service": "text-teal-600 dark:text-teal-400",
  logistics: "text-lime-600 dark:text-lime-400",
  assets: "text-stone-600 dark:text-stone-400",
  maintenance: "text-yellow-700 dark:text-yellow-400",
  "quality-hse": "text-rose-600 dark:text-rose-400",
  hr: "text-fuchsia-600 dark:text-fuchsia-400",
  finance: "text-emerald-600 dark:text-emerald-400",
  reports: "text-pink-600 dark:text-pink-400",
  administration: "text-slate-500 dark:text-slate-400",
  engagements: "text-blue-600 dark:text-blue-400",
  people: "text-slate-500 dark:text-slate-400",
  access: "text-slate-500 dark:text-slate-400",
};

// LONGEST PREFIX, NOT `split("-")[0]`. Four section keys contain a hyphen of
// their own — crm-sales, engineering-docs, field-service, quality-hse — so
// splitting on the first one sends every CRM child to a root called "crm" that
// does not exist. Sorted long-to-short so `crm-sales-clients` matches
// `crm-sales` and never the shorter neighbour it also starts with.
const ACCENT_ROOTS = Object.keys(SECTION_ACCENTS).sort((a, b) => b.length - a.length);

// Section keys are TENANT DATA — a studio can add its own — so an unrecognised
// key is expected rather than exceptional, and it gets the neutral grey the
// whole nav used to wear.
//
// A REGISTER TAKES ITS PARENT'S HUE, because its key says nothing about where
// it sits. An engine record type plants `engine-<typeKey>` — `engine-ncr` lives
// under Quality & HSE and starts with nothing Quality's key starts with — so the
// prefix match found no root and thirty-one registers (and every one a studio
// invents) drew their new icons in the neutral grey, beside siblings in the
// section's colour. The owner saw it. The PARENT is the stored fact about where
// a section sits, so a key that resolves to no root asks its parent's key.
const rootOf = (key) => ACCENT_ROOTS.find((r) => key === r || key.startsWith(`${r}-`));
const accentOf = (key, parentKey) => {
  const root = rootOf(key) || (parentKey ? rootOf(parentKey) : undefined);
  return root ? SECTION_ACCENTS[root] : "text-slate-400 dark:text-slate-500";
};

// The row's shell — shape and colour, NO PADDING AND NO JUSTIFICATION. A plain
// row adds the padding itself (itemClass); a parent group hands it to the link
// and the chevron button separately, so each is a full-height hit target of its
// own.
//
// `justify-between` USED TO BE BAKED IN HERE AND IT BELONGED TO ONE CALLER.
// Exactly one consumer has two children — the parent-group wrapper, whose link
// and chevron push apart. Everything else has one child, and a single flex item
// under `justify-between` is placed at the START, which is invisible on a row
// whose content is left-aligned anyway and very visible on a SQUARE: both
// header marks and the Engagements square drew their icon hard against one
// edge instead of centred.
//
// Adding `justify-center` at those call sites did not fix it and could not.
// Tailwind emits `justify-between` AFTER `justify-center` in its own utility
// order, so between wins on specificity ties no matter which order the class
// attribute lists them — the class string reads as if it were overridden while
// the stylesheet says otherwise. Two utilities for one property on one element
// is the bug; the fix is to stop shipping the first one to callers that never
// wanted it.
const rowClass = (active) =>
  `flex items-center gap-3 rounded-lg text-[12px] font-500 transition-colors ${
    active
      ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
  }`;

const itemClass = (active) => `${rowClass(active)} px-3 py-2.5`;

// THE MARK KEEPS ITS SECTION'S COLOUR WHETHER THE ROW IS ACTIVE OR NOT, which
// is the opposite of what this used to do: it drew grey normally and turned
// brand blue on the active row, so the colour said "you are here" and nothing
// said "this is Finance". The row already answers the first question twice over
// — a tinted background and a darker label — so the icon is free to answer the
// second one, on every row at once, including the fourteen you are not on.
const iconClass = (key, parentKey) => `h-[18px] w-[18px] ${accentOf(key, parentKey)}`;

// The plan chips. Every colour the tag needs is handed to CSS as a variable
// rather than set inline, because which text colour is readable depends on the
// theme and inline styles cannot answer that — the stylesheet picks (.plan-tag).
function PlanTag({ color, label, children }) {
  const tone = toneOf(color);
  return (
    <span
      className="plan-tag inline-flex rounded-full px-2 py-0.5 text-[10px] font-700"
      style={{
        "--tag-bg": tone.bg,
        "--tag-bg-dark": tone.bgDark,
        "--tag-fg": tone.fg,
        "--tag-fg-dark": tone.fgDark,
        "--tag-metal": tone.metal,
      }}
      title={label}
    >
      {children}
    </span>
  );
}

export default function StudioFrame({
  studio, me, sections, activeKey: activeKeyProp, chat = null, locale = "en",
  analytics = null, novaEnabled = false, children,
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  // WHICH ROW IS THE CURRENT ONE, DERIVED FROM THE PATH.
  //
  // This was a prop, and it could be while the page rendered the shell: the
  // page has `params`. The shell lives in a `layout.js` now, and a layout is
  // never given the route's segments — so the address is the only thing left
  // that knows, and `usePathname()` is how a client component reads it.
  //
  // Derived through shared/studioRoute, NOT re-implemented here, because the
  // page still parses the same address to choose a screen. Two derivations
  // would be free to disagree, and the way that shows up is a nav row
  // highlighting one section while the screen below shows another.
  //
  // The prop still wins when it is passed. `Denied` renders this shell with an
  // explicit `activeKey=""` to highlight nothing at all, and that is a
  // statement about the screen rather than about the address.
  const pathname = usePathname();
  const segments = studioSegments(pathname, studio.slug);
  // THE SETTINGS SURFACE ANSWERS FIRST, ahead of the section lookup, because it
  // is no longer IN the section list: `resolveActiveKey` answers only from the
  // sections a person may open, so `/settings` — and the four screens under it —
  // would fall through to their first section and light up Main while Studio
  // settings was on screen. Same class of bug as the nav rows that used to be
  // reached by a literal key match; answered from the shared derivation this
  // time, so the page and the shell cannot disagree about it.
  const activeKey = activeKeyProp
    ?? (isSettingsPath(segments) ? SETTINGS_KEY : resolveActiveKey(requestedKey(segments), sections));
  // The shell's own words. Imported rather than passed down as a prop: it is a
  // few hundred bytes, it is needed on literally every studio render, and a
  // prop would put it in the RSC payload of every navigation instead. See the
  // header of shared/studio/shell for why each surface's dictionary is its own
  // module.
  const tr = shellDict(locale);
  // The header avatar is the ACCOUNT, not the studio membership: `me` carries a
  // studio-local alias and role, but the picture belongs to the person and lives
  // on their profile, so it comes from the identity endpoint like it does in the
  // public header and the account hub.
  const [account, setAccount] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  // AT MOST ONE HEADER MENU, holding the key rather than a boolean per icon —
  // the same shape `openKey` uses for the section groups, so opening one closes
  // the other without either knowing the other exists.
  const [headerMenu, setHeaderMenu] = useState(null);
  // ONE CORNER, ONE WINDOW. Nova and the support chat are both anchored to the
  // bottom-end corner and are both the same shape, so two open at once would be
  // one stacked on the other. Neither can decide that alone — each only knows
  // its own state — so the shell holds which of the two is showing and opening
  // either closes the other. null means neither.
  const [cornerChat, setCornerChat] = useState(null); // null | "nova" | "support"
  // Stable, so the key handlers and effects inside each chat can list them as
  // dependencies instead of re-subscribing on every shell render.
  const openNova = useCallback((next) => setCornerChat(next ? "nova" : null), []);
  const openSupport = useCallback((next) => setCornerChat(next ? "support" : null), []);

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

  // The same two listeners for the header menus. Deliberately a second effect
  // rather than one that closes both: they open from opposite ends of the
  // chrome and a shared handler would be a single state nobody could reason
  // about — and this one is keyed on `headerMenu` so it is not attached at all
  // while nothing is open, which is what the account menu's does too.
  useEffect(() => {
    if (!headerMenu) return;
    const close = () => setHeaderMenu(null);
    const onKey = (e) => e.key === "Escape" && setHeaderMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("click", close); window.removeEventListener("keydown", onKey); };
  }, [headerMenu]);

  async function signOut() {
    try { await fetch("/api/identity/logout", { method: "POST" }); } catch { /* sign out locally anyway */ }
    // Signing out of an Arabic studio landed on the English login screen. The
    // login page IS locale-addressed, so send them to their own.
    window.location.assign(`/${locale}/login`);
  }

  // Nav tree. A section with `parentId` is a sub-section; its parent renders as
  // an expandable group. Until sub-sections exist in the data every row is a
  // parent, so this degrades to the flat list it replaces.
  //
  // A sub-section can be granted WITHOUT its parent — access is per id and does
  // not cascade — so a child whose parent is not visible is promoted to the top
  // level rather than being hidden under a group that was filtered out.
  // ADMINISTRATION IS NOT IN THIS TREE, and that is the point of the change on
  // 09/09/2026. Its four screens are system configuration — People, Access,
  // Master data, Studio settings — not a department a studio runs, and sitting
  // them beside Projects and Finance said otherwise to every tenant.
  //
  // FILTERED HERE RATHER THAN OMITTED FROM THE DATA: the rows still exist and
  // still own `locations`, `departments`, `costCodeLibrary` and `recordTypes`,
  // so seven modules go on resolving them as foreign sections. What changed is
  // what the SIDEBAR calls a section. `isSystemSection` is the one list that
  // decides, shared with the marketing site's department list so the two cannot
  // drift — the exact failure the fifteen-section restructure kept finding.
  const all = (sections || []).filter((s) => !isSystemSection(s.key));
  const systemSections = (sections || []).filter((s) => isSystemSection(s.key));
  const visibleIds = new Set(all.map((s) => s.id));
  // WHO EACH SECTION'S PARENT IS, by key, from the whole list rather than the
  // visible one — a child promoted to the top because its parent is not granted
  // still belongs to that parent's department, and should wear its colour.
  const keyById = new Map((sections || []).map((s) => [s.id, s.key]));
  const parentKeyOf = new Map((sections || []).map((s) => [s.key, keyById.get(s.parentId)]));
  const tintFor = (key) => iconClass(key, parentKeyOf.get(key));
  const fullTree = all
    .filter((s) => !s.parentId || !visibleIds.has(s.parentId))
    .map((s) => ({ ...s, children: all.filter((c) => c.parentId === s.id) }));

  // TASKS AND ADMINISTRATION ARE NOT SECTIONS, AND THE LIST BELOW IS SECTIONS.
  //
  // This file has said so at the top since the restructure — "plus Main and
  // Tasks, which are not sections: Main is the home surface and Tasks is a
  // cross-cutting control" — while rendering both of them in the same column,
  // in the same shape, as the fifteen. Administration & Settings is the same
  // kind of thing from the other end: People, Access, Master data and Studio
  // settings are how the studio is ADMINISTERED, not work anybody does in it.
  //
  // They are marks beside the logo now, each opening its own children. What
  // that buys is not tidiness: the sidebar is the studio's list of DEPARTMENTS,
  // and two non-departments sitting in it taught every reader that the list is
  // "everything", which is what made Tasks look like a sixteenth section on the
  // org chart the departments register had to correct.
  const HEADER_KEYS = ["tasks", "administration"];
  const tree = fullTree.filter((n) => !HEADER_KEYS.includes(n.key));

  // `/administration` IS A NAVIGATION NODE AND NOT A DESTINATION, so its own
  // row is left out — it exists to own four children and renders nothing worth
  // arriving at. Tasks is the opposite: its parent IS the task list, so it
  // leads its own menu under a name that says which of the two it is. The
  // asymmetry is in the data, not a special case: a parent is included only
  // where the parent is a screen.
  const PARENT_IS_A_SCREEN = { tasks: true, administration: false };

  const headerMenus = HEADER_KEYS
    .map((key) => {
      const node = fullTree.find((n) => n.key === key);
      if (!node) return null;
      const items = [
        // The parent's own screen, where it has one. `taskList` rather than the
        // section's name: "Tasks > Tasks" says nothing about which is which.
        ...(PARENT_IS_A_SCREEN[key]
          ? [{ key: node.key, href: `/${studio.slug}/${node.key}`, label: tr.taskList }]
          : []),
        ...node.children.map((c) => ({
          key: c.key,
          href: `/${studio.slug}/${c.key}`,
          label: sectionName(c.key, c.name, locale),
        })),
      ];
      // NO ICON FOR AN EMPTY MENU. A sub-section can be granted without its
      // parent and the reverse is just as real — somebody holding
      // `administration` and none of its four children would otherwise get a
      // button that opens nothing.
      if (items.length === 0) return null;
      return { key, label: sectionName(node.key, node.name, locale), items };
    })
    .filter(Boolean);

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

  // ENGAGEMENTS IS THE ONLY ONE LEFT, AND IT NO LONGER RENDERS HERE. People and
  // Access were here beside it — People shown to everyone, Access gated on
  // canAdminister — because neither was a section anybody could be granted.
  // Both are sections now and arrive through the tree below, which is also what
  // gives them the group behaviour, the active-row highlight and the Arabic
  // labels they never had here.
  //
  // Engagements stays a nav entry because it genuinely is not a section: giving
  // Main a child would gate the parent and hide Main from every member without
  // the right. engagements.view is a right of its own, held by any role.
  //
  // WHAT CHANGED IS WHERE IT SITS: it is a square icon in the footer beside
  // Documentation now, not a labelled row above the divider. THIS ARRAY STAYS
  // ANYWAY, because `activeLabel` below reads it — the header on
  // /<slug>/engagements takes its title from here, and deleting the array to
  // "clean up" after moving the button would silently retitle that page to the
  // studio's own name with nothing failing.
  const admin = [
    { href: `/${studio.slug}/engagements`, key: "engagements", label: tr.engagements, show: me.canSeeEngagements },
  ].filter((i) => i.show);

  const activeSection = sections.find((s) => s.key === activeKey);
  const activeLabel =
    (activeSection && sectionName(activeSection.key, activeSection.name, locale)) ||
    admin.find((i) => i.key === activeKey)?.label ||
    studio.name;

  // EVERY section is a link to its own dashboard — a parent that owns
  // sub-sections is BOTH: the row navigates to the parent's dashboard, and the
  // chevron beside it expands the children without leaving the page. The two
  // are separate hit targets so neither steals the other's click.
  const navGroup = (node) => {
    if (node.children.length === 0) return navLink(`/${studio.slug}/${node.key}`, node.key, sectionName(node.key, node.name, locale));
    const shown = isOpen(node);
    // Highlight the exact page you are on. A child being active expands the
    // group (see isOpen) but no longer dresses the parent up as the current
    // screen — the parent is now a destination of its own.
    const active = node.key === activeKey;
    return (
      <div key={node.key}>
        {/* THE ONE ROW WITH TWO CHILDREN, so it is the one that asks for
            `justify-between` — the link takes the width and the chevron is
            pushed to the end. It used to inherit this from `rowClass` and
            every single-child caller inherited it too. */}
        <div className={`${rowClass(active)} justify-between pe-1`}>
          <Link
            href={`/${studio.slug}/${node.key}`}
            // Clicking the section you are ALREADY on has no navigation to
            // trigger the effect above, so it collapses the group by hand —
            // otherwise the one section you cannot close is the open one.
            onClick={() => { setOpen(false); if (active) toggleGroup(node.key); }}
            className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5"
          >
            <Icon name={sectionIcon(node.key)} className={tintFor(node.key)} />
            <span className="truncate">{sectionName(node.key, node.name, locale)}</span>
          </Link>
          <button
            type="button"
            onClick={() => toggleGroup(node.key)}
            aria-expanded={shown}
            aria-label={`${shown ? tr.collapse : tr.expand} ${sectionName(node.key, node.name, locale)}`}
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
            {node.children.map((c) => navLink(`/${studio.slug}/${c.key}`, c.key, sectionName(c.key, c.name, locale)))}
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
          <Icon name={sectionIcon(key)} className={tintFor(key)} />
          {label}
        </span>
      </Link>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-[var(--geex-surface)]">
      {/* THE IDENTITY BLOCK IS A ROW NOW, not a single link. The padding moved
          off the link and onto this wrapper so the marks sit inside the same
          box the studio's name does — putting them after a `px-6` link would
          have indented them past its edge. `relative` is the anchor every menu
          below positions against. */}
      <div className="relative flex items-center gap-1 px-6 py-5">
      <Link href={`/${studio.slug}`} className="flex min-w-0 flex-1 items-center gap-2.5" onClick={() => setOpen(false)}>
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
          <span className="truncate font-display text-[13px] font-700 tracking-tight text-slate-900 dark:text-white">
            {studio.name}
          </span>
          <span className="truncate font-mono text-[10px] font-500 tracking-tight text-slate-400 dark:text-slate-500">
            nompany.com/{studio.slug}
          </span>
          {/* What this studio is on. Free and Standard until the console says
              otherwise, so the tags are never absent — a studio always has a
              plan, and showing it here is how anyone inside knows which. */}
          <span className="mt-1.5 flex flex-wrap items-center gap-1">
            <PlanTag color={studio.packageColor} label={`${tr.packageLabel}: ${studio.packageName}`}>{studio.packageName}</PlanTag>
            <PlanTag color={studio.tierColor} label={`${tr.tierLabel}: ${studio.tierName}`}>{studio.tierName}</PlanTag>
          </span>
        </span>
      </Link>

      {/* TASKS AND ADMINISTRATION, AS MARKS. No visible label — the name is on
          hover and on `aria-label`, both, for the reason the Engagements square
          in the footer gives.

          `stopPropagation` on the click is what lets the window-level listener
          above stay dumb: it closes on ANY click, so the button that opens a
          menu has to not be one of them, or opening would immediately close. */}
      {headerMenus.map((menu) => (
        <div key={menu.key} className="relative shrink-0">
          <button
            type="button"
            title={menu.label}
            aria-label={menu.label}
            aria-haspopup="menu"
            aria-expanded={headerMenu === menu.key}
            onClick={(e) => { e.stopPropagation(); setHeaderMenu((k) => (k === menu.key ? null : menu.key)); }}
            className={`${rowClass(menu.items.some((i) => i.key === activeKey))} h-9 w-9 justify-center`}
          >
            <Icon name={sectionIcon(menu.key)} className={tintFor(menu.key)} />
          </button>

          {headerMenu === menu.key && (
            <div role="menu" className="absolute end-0 z-50 mt-2 w-52 overflow-hidden rounded-geex bg-[var(--geex-surface)] py-1 shadow-geex">
              {menu.items.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  role="menuitem"
                  onClick={() => { setHeaderMenu(null); setOpen(false); }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm font-500 ${
                    item.key === activeKey
                      ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon name={sectionIcon(item.key)} className={tintFor(item.key)} />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
      </div>

      <nav aria-label={tr.departments} className="flex-1 space-y-0.5 overflow-y-auto px-4 py-6">
        {tree.map((node) => navGroup(node))}

      </nav>

      {/* TWO DESTINATIONS, ONE ROW. `items-stretch` rather than `items-center`
          is what makes the square square WITHOUT a hard-coded size: the
          manual's own padding sets the row's height, `aspect-square` takes its
          width from that height, and the two stay matched if that padding is
          ever changed. A `h-9 w-9` here would be a second place the row's
          height is written down, free to disagree with the first. */}
      <div className="flex items-stretch gap-2 border-t border-[var(--geex-border)] p-4">
        {/* Full-screen manual — opens outside the studio chrome.
            `flex-1 min-w-0` is the ONLY change to it: it yields the width the
            square needs instead of pushing it out of the row, and `min-w-0`
            is what lets a long label shrink rather than overflow — a flex item
            refuses to go below its content width without it, in Arabic first,
            where the word is longer. */}
        <Link
          href={`/${studio.slug}/documentation`}
          onClick={() => setOpen(false)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-500 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
        >
          {/* The manual, so it wears the manual's mark. It asked for "services"
              — a wrench in the new set — which is a tool, not a document. It stays
              neutral grey rather than taking an accent: it is not a section, and
              colouring it would put it in the same visual class as the fourteen. */}
          <Icon name="book" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
          <span className="truncate">{tr.documentation}</span>
        </Link>

        {/* ENGAGEMENTS, AS A MARK RATHER THAN A ROW. It carries no visible label
            — the name arrives on hover — so it needs `aria-label` to say the
            same thing to a screen reader, and `title` to say it to a pointer.
            Both, not one: `title` is invisible to a keyboard user and
            `aria-label` never appears on hover, and this is the one control in
            the sidebar whose purpose cannot be read off its face.

            It keeps `rowClass`, whose ACTIVE ARM IS UNREACHABLE TODAY and is
            kept deliberately. Engagements is one of the seven full-screen
            routes (see the note further down), so the shell — and this sidebar
            with it — is not rendered on `/engagements` at all: there is no
            state in which this square is both visible and current. That was
            equally true of the nav row it replaces, which is why moving it
            loses nothing. `rowClass` stays because it is the same shell every
            other row uses, it costs one word, and it is already correct on the
            day Engagements stops being full-screen. Documentation beside it
            hard-codes the inactive styling instead, for the same unreachable
            reason — the two are inconsistent, and that is the older half. */}
        {admin.map((i) => (
          <Link
            key={i.key}
            href={i.href}
            onClick={() => setOpen(false)}
            title={i.label}
            aria-label={i.label}
            className={`${rowClass(i.key === activeKey)} aspect-square shrink-0 justify-center`}
          >
            <Icon name={sectionIcon(i.key)} className={tintFor(i.key)} />
          </Link>
        ))}
        {/* AND SETTINGS BESIDE IT, WHICH IS NOT A REVERSION.

            Studio settings was a footer link once, because it was reached by a
            literal key match with nowhere else to put it; then it became a
            child of the Administration section; and now Administration is not a
            section at all (see `isSystemSection`). What is pinned here is the
            SURFACE rather than one screen — People, Access, Master data and
            Studio settings behind one gear — so the four keep their addresses,
            their rights and their Arabic labels while leaving the department
            list they never belonged in.

            A ROW RATHER THAN A SQUARE, unlike Engagements above. The mark above
            is one destination and can carry its name on hover; this one opens
            onto four, so it says so in words.

            SHOWN ONLY TO SOMEBODY WHO MAY OPEN AT LEAST ONE. `systemSections`
            is already filtered by the same visibility the tree uses, so a
            member holding none of the four rights sees no gear rather than a
            gear that refuses them — the same courtesy every section row gets.


            The slot before it held "My account", which moved to the header
            avatar because the account is the PERSON and the sidebar belongs to
            the studio. Documentation stays: it is a full-screen route, not a
            section. */}
        {systemSections.length > 0 && (
          <Link
            href={`/${studio.slug}/settings`}
            onClick={() => setOpen(false)}
            aria-current={activeKey === "settings" ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-500 ${
              activeKey === "settings"
                ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {/* Neutral grey, like Documentation and for its reason: this is not
                a section, and giving it an accent would put it back in the same
                visual class as the fourteen. */}
            <Icon name="gears" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
            {tr.settings}
          </Link>
        )}
      </div>
    </div>
  );

  const avatarLetter = (me.alias?.[0] || me.role?.[0] || "?").toUpperCase();

  // SEVEN SCREENS WANT THE WHOLE WINDOW, AND THE SHELL IS WHAT GRANTS IT.
  //
  // The manual, the two live views, Engagements, the document register, a
  // project's board and the planner are full-screen by design. They used to
  // `return` out of the page before the shell was built, which only worked
  // while the page WAS the shell — a layout wraps everything below it, so the
  // page can no longer decline to be wrapped. The shell declines on its behalf,
  // reading the same address through the same module (shared/studioRoute).
  //
  // WHAT THEY STILL GET, because it is not chrome and they would break without
  // it: the locale context, `lang`/`dir`, the RTL cache for MUI, and the
  // studio's ONE live connection. Each of those screens used to carry its own
  // `LiveProvider` precisely because it rendered outside this component; now
  // that they render inside it, keeping those would open a SECOND EventSource
  // per tab against a browser cap of six (invariant 14). They have been removed
  // from the page for that reason — this is where the connection comes from now,
  // for the full-screen screens exactly as for the framed ones.
  //
  // AFTER EVERY HOOK. An early return above them would call a different number
  // of hooks on a full-screen route than on a framed one, which is the rules-of-
  // hooks violation React cannot recover from.
  if (isFullScreenPath(segments, sections)) {
    return (
      <StudioLocaleProvider locale={locale}>
        <LiveProvider slug={studio.slug}>
          <div lang={locale} dir={dirFor(locale)} className="min-h-screen">
            <Rtl on={dirFor(locale) === "rtl"}>{children}</Rtl>
          </div>
        </LiveProvider>
      </StudioLocaleProvider>
    );
  }

  return (
    // The studio's one live connection, opened here on the SHELL so every board
    // shares it. Boards subscribe through useLiveUpdates and never open a
    // connection of their own — see the note in LiveProvider about why that is
    // a hard requirement rather than a preference.
    //
    // THE LANGUAGE GOES DOWN AS CONTEXT, not as a prop. Every department screen
    // and every dialog inside one needs it, most of them three or four levels
    // below a component whose only prop is `slug` — see components/studio2/locale
    // for why threading it would have been the wrong shape.
    <StudioLocaleProvider locale={locale}>
    <LiveProvider slug={studio.slug}>
    {/* LANG AND DIR SIT HERE, NOT ON <html>.
        A studio's language is the tenant's, resolved from the studio record —
        and the root layout never reads that record, because it never touches
        the database. So the shell declares it, the way /super's Shell already
        declares its own. Both attributes are inherited, so everything below is
        laid out and announced correctly without a single component asking.

        `dir` also switches every logical property in the tree at once: ps-/pe-,
        ms-/me- and border-s- are what the sidebar and the tables are written
        in, so the whole layout mirrors from this one attribute. */}
    <div
      lang={locale}
      dir={dirFor(locale)}
      className="min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300"
    >
    {/* SKIP TO CONTENT. First focusable thing in the shell, hidden until it
        takes focus, so a keyboard user can jump the whole sidebar and land on
        the page rather than Tabbing through every nav row first. Targets the
        <main> below, which carries a matching id and tabIndex so focus settles
        there. Uses logical `start` so it sits at the leading edge in both
        directions. */}
    <a
      href="#studio-main"
      className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:font-display focus:text-sm focus:font-600 focus:text-white focus:shadow-geex focus-visible:ring-2 focus-visible:ring-brand-500/50"
    >
      {tr.skipToContent}
    </a>
    {/* MUI DOES NOT FOLLOW `dir`, so it gets its own cache when the tenant is
        Arabic — see MuiRtlProvider. Everything hand-written above mirrors from
        the attribute alone, because logical properties are the browser's job;
        MUI emits physical CSS from Emotion at runtime and has to be rewritten
        as it is serialised. Mounted INSIDE the dir element so the two agree,
        and only for Arabic: an English studio keeps the root provider's cache
        and pays nothing. */}
    <Rtl on={dirFor(locale) === "rtl"}>
      {/* Floating rounded sidebar — Geex control-panel style */}
      <aside className="fixed inset-y-4 start-4 z-30 hidden w-[21.5rem] overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label={tr.closeMenu} className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside aria-label={tr.departments} className="absolute inset-y-0 start-0 w-[21.5rem] bg-[var(--geex-surface)] shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:ps-[23.5rem]">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-[var(--geex-page)] px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:text-slate-300 lg:hidden"
              aria-label={tr.openMenu}
            >
              <Icon name="menu" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white sm:text-2xl">{activeLabel}</h1>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">{studio.name}</p>
            </div>
          </div>

          {/* THE BROADCAST BAND FLOATS OVER THE HEADER rather than sitting in the
              row: absolutely positioned against this sticky header (a sticky
              element is a containing block), so a message appearing, rotating
              or closing never moves the title or the controls. It used to be a
              flex item here with `order-last`, and every message shifted the
              bar. See DailyGreeting for where it sits at each width. */}
          <DailyGreeting slug={studio.slug} />

          <div className="flex items-center gap-2">
            {/* THE PERSON'S LANGUAGE, beside the theme control because it is the
                same kind of choice: mine, about how I read this, not about what
                the studio holds.

                The studio's own setting still exists and is still admin-only —
                it is what a new colleague gets before they have chosen. This is
                the override, and it is the same LangMenu the public header and
                the account hub use, so the control does not change shape when
                somebody walks from one surface into the other.

                A button rather than a link: there is no locale in a studio's
                address to navigate to. LangMenu writes the cookie; the refresh
                re-renders the shell server-side, which is what swaps `dir` and
                re-mirrors the whole layout in one paint. */}
            <LangMenu
              current={locale}
              label={tr.language}
              align="end"
              triggerClass="inline-flex h-9 items-center gap-1.5 rounded-full border border-current/20 px-3 text-xs font-600 text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:text-slate-300 dark:hover:text-white"
              options={locales.map((code) => ({
                code,
                label: LANGUAGE_NAMES[code],
                short: LANGUAGE_SHORT[code],
                onSelect: () => router.refresh(),
              }))}
            />
            {/* Light / Dark / Device — writes the same `theme` cookie and `.dark`
                class the public site uses, so the Studio follows the choice
                everywhere and the no-flash script picks it up on next load. */}
            <ThemeToggle labels={{ theme: tr.theme, light: tr.themeLight, dark: tr.themeDark, system: tr.themeSystem }} />
            {/* Beside the theme toggle rather than in the sidebar: it belongs
                with the other things that are about YOU here, not with the
                studio's sections. */}
            <NotificationBell slug={studio.slug} locale={locale} />
            <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">
              {me.alias || tr.member}
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
                className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-950 font-display text-sm font-700 text-white shadow-geex-sm transition-shadow hover:ring-2 hover:ring-brand-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:bg-brand-500/20 dark:text-brand-300"
                title={me.alias ? `${me.alias} — ${tr.myAccount}` : tr.myAccount}
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
                    {account?.email || me.alias || tr.signedIn}
                  </p>
                  {/* THE ACCOUNT HUB HAS A LOCALE IN ITS ADDRESS and the studio
                      does not, so leaving this at /en/account sent an Arabic
                      studio's members to an English page — the one place in the
                      product where the language silently changed under them. */}
                  <Link
                    href={`/${locale}/account`}
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm font-500 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    <Icon name="person" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
                    {tr.goToAccount}
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm font-500 text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    <Icon name="lock" className="h-[18px] w-[18px]" />
                    {tr.signOut}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="studio-main" tabIndex={-1} className="mx-auto max-w-[1400px] px-5 pb-8 outline-none sm:px-8"><AnalyticsLevelProvider analytics={analytics}>{children}</AnalyticsLevelProvider></main>
        {/* `view` is the section key of the screen behind the shell — the same
            one the sidebar highlights. Nova's bubble ranks what it has to say
            around it, so what she volunteers is about where you are; passing
            the key rather than the pathname means no component has to parse an
            address to work out which department it is looking at. */}
        <NovaLauncher slug={studio.slug} enabled={novaEnabled} besideChat={Boolean(chat?.enabled)}
          open={cornerChat === "nova"}
          onOpenChange={openNova}
          view={activeKey} />
      </div>

      {/* Live chat with nompany. It lives on the SHELL rather than on a page, so
          it is reachable from wherever someone happens to be when they need it —
          and, just as deliberately, nowhere the shell isn't: the account hub and
          the public site have no chat button because they don't render this. */}
      <StudioChat
        open={cornerChat === "support"}
        onOpenChange={openSupport}
        enabled={Boolean(chat?.enabled)}
        slug={studio.slug}
        studioName={studio.name}
        userName={chat?.userName || me.alias || tr.you}
        unlimited={chat?.unlimited !== false}
        allowed={chat?.allowed || 0}
        used={chat?.used || 0}
        remaining={chat?.remaining ?? null}
        exhausted={Boolean(chat?.exhausted)}
      />

      {/* Asked once, fifteen days in, and only HERE — a studio is where somebody
          is actually using the product, so it is the only place the question
          means anything. It decides nothing itself; the server says whether to
          ask. */}
      <RateNompany />
    </Rtl>
    </div>
    </LiveProvider>
    </StudioLocaleProvider>
  );
}

// One place to decide, so the tree below reads the same in both languages
// rather than being written out twice.
function Rtl({ on, children }) {
  return on ? <MuiRtlProvider>{children}</MuiRtlProvider> : children;
}
