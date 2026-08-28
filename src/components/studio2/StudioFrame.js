"use client";

import { AnalyticsLevelProvider } from "@/components/studio2/analyticsLevel";
import NovaLauncher from "@/components/studio2/NovaLauncher";

import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dirFor, locales, LANGUAGE_NAMES, LANGUAGE_SHORT } from "@/shared/locale";
import { shellDict } from "@/shared/studio/shell";
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
  main: "home",
  tasks: "checkDouble",
  sales: "sales",
  technical: "technicalSupport",
  projects: "projects",
  // Engineering, not the plain gear: Operations is a section of its own, and
  // sharing the gear with every module's Settings made the parent and its own
  // Settings child render identically side by side.
  operations: "engineering",
  inventory: "vendors",
  finance: "services",
  quality: "verified",
  website: "gallery",
  hr: "team",
  people: "user",
  access: "lock",
  engagements: "link",
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
  // Inventory sub-sections.
  "inventory-items": "registeredItems",
  "inventory-stock": "readyStock",
  "inventory-vendors": "selection",
  "inventory-sheets": "sheets",
  "quality-documents": "book",
  "hr-employees": "teamwork",
  "finance-cash": "cash",
  "operations-schedule": "calendar",
  "operations-tracking": "locations",
  "operations-planner": "calendar",
  // Every module's Settings wears the same gear. They are the same KIND of
  // screen in five different places, so giving each its own mark would imply a
  // difference that is not there.
  "sales-settings": "gears",
  "technical-settings": "gears",
  "projects-settings": "gears",
  "finance-settings": "gears",
  "operations-settings": "gears",
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

// The plan chips. Every colour the tag needs is handed to CSS as a variable
// rather than set inline, because which text colour is readable depends on the
// theme and inline styles cannot answer that — the stylesheet picks (.plan-tag).
function PlanTag({ color, label, children }) {
  const t = toneOf(color);
  return (
    <span
      className="plan-tag inline-flex rounded-full px-2 py-0.5 text-[10px] font-700"
      style={{
        "--tag-bg": t.bg,
        "--tag-bg-dark": t.bgDark,
        "--tag-fg": t.fg,
        "--tag-fg-dark": t.fgDark,
        "--tag-metal": t.metal,
      }}
      title={label}
    >
      {children}
    </span>
  );
}

export default function StudioFrame({
  studio, me, sections, activeKey, chat = null, locale = "en",
  analytics = null, novaEnabled = false, children,
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  // The shell's own words. Imported rather than passed down as a prop: it is a
  // few hundred bytes, it is needed on literally every studio render, and a
  // prop would put it in the RSC payload of every navigation instead. See the
  // header of shared/studio/shell for why each surface's dictionary is its own
  // module.
  const t = shellDict(locale);
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
    // Placed above People (design §3): engagements.view is a right on its own,
    // held by any role — not an admin-only screen — so it sits with the other
    // non-section destinations rather than gated behind canAdminister.
    { href: `/${studio.slug}/engagements`, key: "engagements", label: t.engagements, show: me.canSeeEngagements },
    { href: `/${studio.slug}/people`, key: "people", label: me.canAdminister ? t.peopleAndRequests : t.people, show: true },
    { href: `/${studio.slug}/access`, key: "access", label: t.access, show: me.canAdminister },
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
            aria-label={`${shown ? t.collapse : t.expand} ${node.name}`}
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
          {/* What this studio is on. Free and Standard until the console says
              otherwise, so the tags are never absent — a studio always has a
              plan, and showing it here is how anyone inside knows which. */}
          <span className="mt-1.5 flex flex-wrap items-center gap-1">
            <PlanTag color={studio.packageColor} label={`${t.packageLabel}: ${studio.packageName}`}>{studio.packageName}</PlanTag>
            <PlanTag color={studio.tierColor} label={`${t.tierLabel}: ${studio.tierName}`}>{studio.tierName}</PlanTag>
          </span>
        </span>
      </Link>

      <nav aria-label={t.departments} className="flex-1 space-y-0.5 overflow-y-auto px-4 py-6">
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
          {t.documentation}
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
          {t.studioSettings}
        </Link>
      </div>
    </div>
  );

  const avatarLetter = (me.alias?.[0] || me.role?.[0] || "?").toUpperCase();

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
      {t.skipToContent}
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
      <aside className="fixed inset-y-4 start-4 z-30 hidden w-64 overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label={t.closeMenu} className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside aria-label={t.departments} className="absolute inset-y-0 start-0 w-64 bg-[var(--geex-surface)] shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:ps-72">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-[var(--geex-page)] px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:text-slate-300 lg:hidden"
              aria-label={t.openMenu}
            >
              <Icon name="menu" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white sm:text-2xl">{activeLabel}</h1>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">{studio.name}</p>
            </div>
          </div>
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
              label={t.language}
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
            <ThemeToggle labels={{ theme: t.theme, light: t.themeLight, dark: t.themeDark, system: t.themeSystem }} />
            {/* Beside the theme toggle rather than in the sidebar: it belongs
                with the other things that are about YOU here, not with the
                studio's sections. */}
            <NotificationBell slug={studio.slug} locale={locale} />
            <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">
              {me.alias || t.member}
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
                title={me.alias ? `${me.alias} — ${t.myAccount}` : t.myAccount}
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
                    {account?.email || me.alias || t.signedIn}
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
                    {t.goToAccount}
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm font-500 text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    <Icon name="lock" className="h-[18px] w-[18px]" />
                    {t.signOut}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="studio-main" tabIndex={-1} className="mx-auto max-w-[1400px] px-5 pb-8 outline-none sm:px-8"><AnalyticsLevelProvider analytics={analytics}>{children}</AnalyticsLevelProvider></main>
        <NovaLauncher slug={studio.slug} enabled={novaEnabled} besideChat={Boolean(chat?.enabled)} />
      </div>

      {/* Live chat with nompany. It lives on the SHELL rather than on a page, so
          it is reachable from wherever someone happens to be when they need it —
          and, just as deliberately, nowhere the shell isn't: the account hub and
          the public site have no chat button because they don't render this. */}
      <StudioChat
        enabled={Boolean(chat?.enabled)}
        slug={studio.slug}
        studioName={studio.name}
        userName={chat?.userName || me.alias || t.you}
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
