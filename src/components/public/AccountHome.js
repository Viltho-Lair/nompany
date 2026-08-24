"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import PhoneInput from "@/components/public/PhoneInput";
import PasswordInput from "@/components/public/PasswordInput";
import { PASSWORD_RULES, checkPassword } from "@/platform/auth/passwordPolicy";
import { parsePhone } from "@/shared/countries";
import LangMenu from "@/components/LangMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { NOVA_PROVIDERS, providerMeta } from "@/lib/nova/providers";

// The account hub, laid out like the Google Account console:
//   • brand mark top-left, ABOVE the fixed sidebar
//   • fixed left sidebar, one coloured icon per destination
//   • the content column fits the window so nothing needs horizontal scroll
//   • profile avatar top-right — the ONLY place sign-out lives
//   • Terms / Help / Documentation pinned to the BOTTOM OF THE RAIL, and the
//     scope note pinned to the BOTTOM OF THE SCREEN — both anchored to the
//     viewport, not trailing the content
//
// Each sidebar button shows completely different content; the identity block
// and the create/join actions belong to Overview alone.

// The shell is a fixed-height flex column, not normal document flow: that is
// what lets the rail footer and the scope note sit ON the viewport edges, and
// what lets Overview be sized to fit rather than scroll.
const PAGE = "flex h-screen flex-col overflow-hidden bg-geex-bg dark:bg-[#141420]";
const RAIL_W = "lg:w-[280px]";
const PANEL = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
const H2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
const SUB = "mt-1 text-sm text-slate-500 dark:text-slate-400";
const INPUT =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const LABEL = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const BTN = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const BTN_GHOST = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const BANNER_BAD = "rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300";
const BANNER_GOOD = "rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";

// Google Account's grouped "stack": 20px on the outer corners, 4px inside, 2px
// between rows, 56px min-height, 12px/16px padding, 12px icon gap.
const STACK = "flex flex-col gap-[2px]";
const ROW =
  "flex min-h-[56px] w-full items-center gap-3 rounded-[4px] bg-white px-4 py-3 text-start first:rounded-t-[20px] last:rounded-b-[20px] dark:bg-[#20202c]";
const ROW_TAP = "transition-colors hover:bg-slate-50 dark:hover:bg-white/5";
const ROW_LABEL = "text-base font-500 leading-normal text-slate-900 dark:text-white";
const ROW_VALUE = "truncate text-sm leading-[1.4286] text-slate-500 dark:text-slate-400";

// Every sidebar destination carries its own icon colour, so the rail reads as a
// set of distinct places rather than a uniform list.
const NAV = [
  { key: "overview", label: "Overview", icon: "dashboard", tone: "text-brand-600 dark:text-brand-400", bg: "bg-brand-500/10" },
  // `accent` is the project's purple scale. Tailwind's default `violet` is
  // overridden in tailwind.config as a SINGLE token, so `violet-600` does not
  // exist and would silently fall through to inherited colour.
  { key: "studios", label: "My Studios", icon: "building", tone: "text-accent-600 dark:text-accent-400", bg: "bg-accent-500/10" },
  { key: "collabs", label: "My Collaborations", icon: "team", tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { key: "personal", label: "Personal info", icon: "person", tone: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  { key: "security", label: "Security", icon: "shield", tone: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
];

const slugify = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const initialsOf = (s) => String(s || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function AccountHome({ locale, chrome }) {
  const [identity, setIdentity] = useState(null);
  const [studios, setStudios] = useState({ owned: null, collaborations: [] });
  const [devices, setDevices] = useState([]);
  const [view, setView] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    const [meRes, stRes, dvRes] = await Promise.all([
      fetch("/api/identity/me", { cache: "no-store" }),
      fetch("/api/studios", { cache: "no-store" }),
      fetch("/api/identity/devices", { cache: "no-store" }),
    ]);
    if (!meRes.ok) { window.location.assign(`/${locale}/login`); return; }
    setIdentity(await meRes.json());
    if (stRes.ok) setStudios(await stRes.json());
    if (dvRes.ok) setDevices((await dvRes.json()).devices || []);
    setLoading(false);
  }, [locale]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className={cn(PAGE, "flex items-center justify-center")}><p className="text-sm text-slate-500">Loading your account…</p></div>;
  }

  const name = identity?.profile?.fullName || identity?.user?.email || "there";
  // The API models 0..1 owned studios today; the UI is written against a list so
  // it is already correct if that cap is ever lifted.
  const owned = studios.owned ? [studios.owned] : [];
  const collabs = studios.collaborations || [];
  const signOut = async () => { await fetch("/api/identity/logout", { method: "POST" }); window.location.assign(`/${locale}/login`); };

  const langOptions = [
    { code: "en", label: "English", short: "EN", href: "/en/account" },
    { code: "ar", label: "العربية", short: "AR", href: "/ar/account" },
  ];

  return (
    <div className={PAGE} onClick={() => menuOpen && setMenuOpen(false)}>
      {/* brand mark top-left, sitting ABOVE the rail; account controls top-right */}
      <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href={`/${locale}`} className="flex items-center gap-2.5 text-slate-900 dark:text-white">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#eef1f6] p-[3px] dark:bg-white/5">
            <Image src="/brand/logo-icon.png" alt="" width={36} height={36} className="h-full w-full object-contain" priority />
          </span>
          <span className="font-display text-base font-700 tracking-tight sm:text-lg">{chrome?.brand || "nompany"}</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block"><ThemeToggle labels={chrome?.theme} /></div>
          <LangMenu
            current={locale} options={langOptions} label={chrome?.language}
            triggerClass="inline-flex items-center gap-1.5 rounded-full border border-current/25 px-3 py-1.5 font-display text-xs font-600 uppercase tracking-[0.12em] transition-colors hover:border-current"
            align="end"
          />
          {/* The only sign-out in the product sits behind this avatar. */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button" onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu" aria-expanded={menuOpen}
              className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-700 font-display text-sm font-700 text-white transition-shadow hover:ring-2 hover:ring-brand-500/40"
              title={identity?.user?.email || "Account"}
            >
              {identity?.profile?.photo
                /* eslint-disable-next-line @next/next/no-img-element */
                ? <img src={identity.profile.photo} alt="" className="h-full w-full object-cover" />
                : initialsOf(name)}
            </button>
            {menuOpen && (
              <div role="menu" className="absolute end-0 z-30 mt-2 w-56 overflow-hidden rounded-geex border border-slate-200/70 bg-white py-1 shadow-geex dark:border-white/10 dark:bg-[#20202c]">
                <p className="truncate px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{identity?.user?.email}</p>
                {owned[0] && (
                  <a role="menuitem" href={`/${owned[0].slug}`} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5">
                    Go to {owned[0].name}
                  </a>
                )}
                <button role="menuitem" type="button" onClick={signOut}
                  className="block w-full px-4 py-2.5 text-start text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 px-5 sm:px-8 lg:flex-row lg:gap-10">
        {/* fixed rail */}
        <nav className={cn(RAIL_W, "lg:flex lg:shrink-0 lg:flex-col")}>
          <div className="lg:flex-1">
            <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {NAV.map((item) => {
                const on = view === item.key;
                return (
                  <li key={item.key} className="shrink-0 lg:shrink">
                    <button
                      type="button" onClick={() => setView(item.key)}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "flex h-12 w-full items-center gap-3 rounded-full px-4 text-start text-sm font-500 transition-colors",
                        on ? "bg-white text-slate-900 dark:bg-[#20202c] dark:text-white"
                           : "text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/5",
                      )}
                    >
                      <span className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full", item.bg)}>
                        <Icon name={item.icon} className={cn("h-[18px] w-[18px]", item.tone)} />
                      </span>
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* content — sized to the window so nothing scrolls sideways */}
        {/* Overview is still sized to fit, but it is no longer CLIPPED when it
            does not. Doubling the avatar spent 4rem of a budget that only ever
            just balanced, and on a shorter laptop that pushed the tiles past the
            edge — where, being clipped, they could not be reached at all.
            overflow-y-auto keeps the scrollbar away whenever it does fit, which
            is the behaviour the clip was there to get. */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          {view === "overview" && <Overview identity={identity} owned={owned} collabs={collabs} onGo={setView} onChanged={load} />}
          {view === "studios" && <StudioList title="My Studios" note="Workspaces you own. Renaming one, or changing its link, takes effect at 12:00 am." studios={owned} empty="You don't own a studio yet." onChanged={load} />}
          {view === "collabs" && <StudioGrid title="My Collaborations" note="Studios other people have given you access to. Your own studio is under My Studios." studios={collabs} empty="You're not collaborating in any studio yet." />}
          {view === "personal" && <PersonalInfo identity={identity} onSaved={load} />}
          {view === "security" && <Security devices={devices} onChanged={load} locale={locale} user={identity?.user} />}

        </main>
      </div>

      {/* One row on the viewport's bottom edge: the rail's links sit in a
          column the same width as the rail, so they line up with the rail
          above AND share a baseline with the note beside them. */}
      <footer className="flex shrink-0 items-center gap-6 px-5 pb-4 pt-2 sm:px-8">
        <div className={cn(RAIL_W, "hidden shrink-0 flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 lg:flex")}>
          <Link href={`/${locale}/terms`} className="hover:text-slate-900 hover:underline dark:hover:text-white">Terms</Link>
          <Link href={`/${locale}/contact`} className="hover:text-slate-900 hover:underline dark:hover:text-white">Help</Link>
          {owned[0]
            ? <a href={`/${owned[0].slug}/documentation`} className="hover:text-slate-900 hover:underline dark:hover:text-white">Documentation</a>
            : <span className="text-slate-400 dark:text-slate-500">Documentation</span>}
        </div>
        <p className="min-w-0 flex-1 text-center text-xs text-slate-500 dark:text-slate-400">
          These settings are yours alone. Studios you join keep their own profile for you and never see what&apos;s here.
        </p>
        {/* Balances the links column so the note is centred in the window. */}
        <div className={cn(RAIL_W, "hidden shrink-0 lg:block")} aria-hidden="true" />
      </footer>
    </div>
  );
}

// ---- studio cards ------------------------------------------------------------
// A studio is a square tile: logo when the studio has one, initials otherwise,
// with the name underneath. The logo is set in the studio's own settings, so a
// studio that has not set one still falls back to initials.
function StudioCard({ studio, compact = false }) {
  const w = compact ? "w-[104px]" : "w-[132px]";
  return (
    <a href={`/${studio.slug}`} className={cn("group block shrink-0", w)}>
      <span className={cn("flex aspect-square items-center justify-center overflow-hidden rounded-geex border border-slate-200/70 bg-white transition-colors group-hover:border-brand-500 dark:border-white/10 dark:bg-[#20202c] dark:group-hover:border-brand-500/50", w)}>
        {studio.logo
          ? /* eslint-disable-next-line @next/next/no-img-element */
            /* object-CONTAIN, not cover: a logo is a whole mark, and cropping
               it to fill a square is how you lose half a wordmark. */
            <img src={studio.logo} alt="" className="h-full w-full object-contain p-2" />
          : <span className={cn("font-display font-800 text-brand-700 dark:text-brand-300", compact ? "text-xl" : "text-2xl")}>{initialsOf(studio.name)}</span>}
      </span>
      <span className="mt-2 block truncate text-center text-sm font-600 text-slate-900 dark:text-white">{studio.name}</span>
      {/* The address is useful when browsing every studio, but in the overview
          strip it is a third line of text competing with the tile itself. */}
      {!compact && <span className="block truncate text-center font-mono text-[11px] text-slate-400">nompany.com/{studio.slug}</span>}
    </a>
  );
}

// The square action tile that sits to the LEFT of a row of studio tiles.
function ActionTile({ icon, label, onClick, compact = false }) {
  const w = compact ? "w-[104px]" : "w-[132px]";
  return (
    <button type="button" onClick={onClick} className={cn("group block shrink-0 text-start", w)}>
      <span className={cn("flex aspect-square flex-col items-center justify-center gap-2 rounded-geex border border-dashed border-slate-300 bg-white/60 transition-colors group-hover:border-brand-500 group-hover:bg-white dark:border-white/20 dark:bg-white/[0.03] dark:group-hover:border-brand-500/50", w)}>
        <Icon name={icon} className="h-6 w-6 text-brand-600 dark:text-brand-400" />
      </span>
      <span className="mt-2 block text-center text-sm font-600 text-slate-900 dark:text-white">{label}</span>
    </button>
  );
}

// Action tile + a horizontal row of studio tiles. The list arrives already
// ordered by how often this person opens each studio, so the first four ARE the
// four they use most — no choice to make, and no scrolling to find the one they
// wanted. Past four, a View all tile takes over.
function StudioStrip({ action, studios, onViewAll }) {
  const shown = studios.slice(0, 4);
  return (
    <div className="mt-2 flex items-start gap-3 overflow-x-auto">
      {action}
      {shown.map((s) => <StudioCard key={s.id} studio={s} compact />)}
      {studios.length > 4 && (
        <button type="button" onClick={onViewAll} className="flex aspect-square w-[104px] shrink-0 flex-col items-center justify-center gap-1 rounded-geex border border-slate-200/70 bg-white text-xs font-600 text-brand-700 transition-colors hover:border-brand-500 dark:border-white/10 dark:bg-[#20202c] dark:text-brand-300">
          <Icon name="chevronRight" className="h-5 w-5 rtl:-scale-x-100" />
          View all
          <span className="text-[11px] font-500 text-slate-400">{studios.length} total</span>
        </button>
      )}
    </div>
  );
}

function StudioGrid({ title, note, studios, empty }) {
  return (
    <section className={PANEL}>
      <h2 className={H2}>{title}</h2>
      <p className={SUB}>{note}</p>
      {studios.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-4">
          {studios.map((s) => <StudioCard key={s.id} studio={s} />)}
        </div>
      )}
    </section>
  );
}

// ---- my studios ----------------------------------------------------------------
// A LIST, not a grid of tiles. A studio you own is a thing you administer, not
// a thing you pick from a shelf: each row carries its logo, its name and its
// address, and the name and address are editable in place.
//
// THE LOGO IS NOT A LINK any more. When the row holds editable fields, a
// clickable picture beside them is a trap — you go to change the name, miss,
// and land in the studio instead. Opening it is now its own labelled button.
function StudioRow({ studio, onSaved }) {
  const [name, setName] = useState(studio.name || "");
  const [slug, setSlug] = useState(studio.slug || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const dirty = name.trim() !== studio.name || slug.trim().toLowerCase() !== studio.slug;
  const addressChanging = slug.trim().toLowerCase() !== studio.slug;

  async function save() {
    setBusy(true); setErr(""); setMsg("");
    try {
      const res = await fetch(`/api/studios/${studio.slug}/settings`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rename: { name: name.trim(), slug: slug.trim().toLowerCase() } }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(out.error === "slug-taken" ? "That address is already taken."
          : out.error === "slug-invalid" ? "An address is 3–64 characters: lowercase letters, numbers and hyphens."
          : out.error === "owner-only" ? "Only the owner can rename a studio."
          : "That didn't save.");
        return;
      }
      // It has already happened, so this says so rather than promising it. The
      // address warning is worth keeping: the old link stops working now, and
      // whoever has it bookmarked needs telling.
      setMsg(!out.changed ? "Nothing to change."
        : addressChanging ? "Renamed. The old link no longer works — share the new one."
        : "Renamed.");
      onSaved?.();
    } catch {
      setErr("That didn't save.");
    } finally { setBusy(false); }
  }

  return (
    <li className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-b-0 dark:border-white/5 sm:flex-row sm:items-start sm:gap-4">
      {/* Presentational only — no link, no button. */}
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-geex border border-slate-200/70 bg-white dark:border-white/10 dark:bg-[#20202c]">
        {studio.logo
          /* eslint-disable-next-line @next/next/no-img-element */
          ? <img src={studio.logo} alt="" className="h-full w-full object-contain p-1.5" />
          : <span className="font-display text-xl font-800 text-brand-700 dark:text-brand-300">{initialsOf(studio.name)}</span>}
      </span>

      <div className="min-w-0 flex-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Studio name</span>
            <input className={INPUT} value={name} onChange={(e) => { setName(e.target.value); setMsg(""); setErr(""); }} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Studio link</span>
            <span className="flex items-center gap-1">
              <span className="shrink-0 font-mono text-xs text-slate-400">nompany.com/</span>
              <input className={INPUT} value={slug} onChange={(e) => { setSlug(e.target.value); setMsg(""); setErr(""); }} />
            </span>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className={BTN} onClick={save} disabled={busy || !dirty}>{busy ? "Saving…" : "Save"}</button>
          <a href={`/${studio.slug}`} className={BTN_GHOST}>Open studio</a>
        </div>

        {msg && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">{msg}</p>}
        {err && <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{err}</p>}
        {/* Renaming is immediate, so there is no "scheduled" state to report.
            The warning goes BEFORE the act instead of after it: the address is
            about to change, and the old link will stop working. */}
        {!msg && !err && addressChanging && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            Saving changes the address to nompany.com/{slug.trim().toLowerCase()} straight away. The old link will stop working.
          </p>
        )}
      </div>
    </li>
  );
}

function StudioList({ title, note, studios, empty, onChanged }) {
  return (
    <section className={PANEL}>
      <h2 className={H2}>{title}</h2>
      <p className={SUB}>{note}</p>
      {studios.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="mt-2">
          {studios.map((s) => <StudioRow key={s.id} studio={s} onSaved={onChanged} />)}
        </ul>
      )}
    </section>
  );
}

// ---- overview ----------------------------------------------------------------
function Overview({ identity, owned, collabs, onGo, onChanged }) {
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const name = identity?.profile?.fullName || identity?.user?.email || "there";
  const verified = Boolean(identity?.emailVerified);

  return (
    <div className="mx-auto flex h-full max-w-[888px] flex-col justify-center gap-4 py-2">
      {/* Identity, centred and unboxed — it reads as the page's subject rather
          than as one more card among the sections below it. */}
      <section className="flex flex-col items-center gap-2 text-center">
        {/* Twice the old 16 (4rem -> 8rem). The initials scale with it, or a
            two-letter fallback would sit lost in the middle of the circle. */}
        <span className="inline-flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-brand-700 font-display text-4xl font-800 text-white">
          {identity?.profile?.photo
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={identity.profile.photo} alt="" className="h-full w-full object-cover" />
            : initialsOf(name)}
        </span>
        <div>
          <h2 className="font-display text-[1.75rem] font-500 leading-[1.25] text-slate-900 dark:text-white">{name}</h2>
          <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="break-all">{identity?.user?.email}</span>
            {verified ? (
              // The mark alone: a verification badge is a symbol people already
              // read, so the tick and the word "Verified" beside it were saying
              // the same thing three times. The label moves to the tooltip and
              // to assistive tech, which is where it is still needed.
              <span className="inline-flex items-center text-sky-500" title="Email verified">
                <Icon name="verified" className="h-4 w-4" />
                <span className="sr-only">Email verified</span>
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-600 text-amber-700 dark:text-amber-300">
                Requires verification
              </span>
            )}
          </p>
        </div>
      </section>

      {/* Unboxed: the tiles are the objects here, so a panel behind them would
          just be a second frame around things that already have their own. */}
      <section>
        <h3 className={H2}>Your studios</h3>
        <p className={SUB}>
          A studio is your company&apos;s workspace, at its own address.
          {owned.length > 4 && " Showing the four you open most."}
        </p>
        <StudioStrip
          action={<ActionTile icon="plus" label="Create a studio" onClick={() => setCreating(true)} compact />}
          studios={owned}
          onViewAll={() => onGo("studios")}
        />
        {creating && <CreateStudio onDone={() => { setCreating(false); onChanged(); }} onClose={() => setCreating(false)} />}
      </section>

      <section>
        <h3 className={H2}>Your collaborations</h3>
        <p className={SUB}>
          Studios other people have given you access to.
          {collabs.length > 4 && " Showing the four you open most."}
        </p>
        <StudioStrip
          action={<ActionTile icon="team" label="Join a studio" onClick={() => setJoining(true)} compact />}
          studios={collabs}
          onViewAll={() => onGo("collabs")}
        />
        {joining && <JoinStudio onChanged={onChanged} onClose={() => setJoining(false)} />}
      </section>
    </div>
  );
}

// ---- dialog ------------------------------------------------------------------
// One modal shell for every dialog here: backdrop, Escape, a locked body scroll
// and a titled header with a close button. Create, Join and the profile picture
// all wear it, so they open, dismiss and read the same way.
function Dialog({ title, description, onClose, children, width = "max-w-[512px]" }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className={cn("relative w-full overflow-hidden rounded-geex bg-white shadow-geex dark:bg-[#20202c]", width)}>
        <div className="flex items-center gap-3 px-6 pt-5">
          <h3 className="font-display text-lg font-700 text-slate-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close"
            className="ms-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">
            <Icon name="close" className="h-[18px] w-[18px]" />
          </button>
        </div>
        {description && <p className="px-6 pt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        <div className="px-6 pb-6 pt-4">{children}</div>
      </div>
    </div>
  );
}

// ---- create / join -----------------------------------------------------------
// Both are dialogs rather than panels that unfold under the tile: Overview is
// sized to fit the window and must never scroll, so growing the page by a form's
// height is the one thing it cannot absorb.
function CreateStudio({ onDone, onClose }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const effectiveSlug = touched ? slugify(slug) : slugify(name);

  useEffect(() => {
    if (!effectiveSlug) { setStatus(null); return; }
    const id = setTimeout(async () => {
      const res = await fetch(`/api/studios/available?slug=${encodeURIComponent(effectiveSlug)}`, { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    }, 350);
    return () => clearTimeout(id);
  }, [effectiveSlug]);

  async function create() {
    setBusy(true); setError("");
    const res = await fetch("/api/studios", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: effectiveSlug }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { onDone(); return; }
    setError(
      data.error === "unverified" ? "Confirm your email address first."
      : data.error === "already-owner" ? "You already own a studio."
      : data.error === "slug-taken" ? "That code is taken — pick another."
      : data.error === "slug-reserved" ? "That code is reserved — pick another."
      : data.error === "slug-invalid" ? "Use 3+ letters, numbers or dashes."
      : data.error === "name" ? "Give your studio a name."
      : "We couldn't create your studio."
    );
  }

  return (
    <Dialog title="Create a studio" onClose={onClose}
      description="A studio is your company's workspace, at its own address on nompany.com.">
      {error && <p className={cn(BANNER_BAD, "mb-4")}>{error}</p>}
      <div className="grid gap-3">
        <div><label className={LABEL}>Company name</label><input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Trading Co." /></div>
        <div>
          <label className={LABEL}>Studio address (company code)</label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">nompany.com/</span>
            <input className={INPUT} value={touched ? slug : effectiveSlug} onChange={(e) => { setTouched(true); setSlug(e.target.value); }} placeholder="acme-trading" />
          </div>
          {effectiveSlug && status && (
            <p className={cn("mt-1 text-xs font-600", status.available ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-300")}>
              {status.available ? `“${status.slug}” is available`
                : status.reason === "taken" ? `“${status.slug}” is already taken`
                : status.reason === "reserved" ? `“${status.slug}” is reserved`
                : "Use 3+ letters, numbers or dashes"}
            </p>
          )}
        </div>
        <div className="mt-1 flex gap-3">
          <button className={BTN} onClick={create} disabled={busy || !name || !status?.available}>{busy ? "Creating…" : "Create studio"}</button>
          <button className={BTN_GHOST} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Dialog>
  );
}

// A join is a REQUEST, so nothing appears in the strip when it succeeds — the
// confirmation is the only feedback there is. The dialog therefore stays open on
// success and the user dismisses it, rather than closing over its own message.
function JoinStudio({ onChanged, onClose }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function join() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/studios/join", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setCode("");
      setMsg({ tone: "good", text: `Request sent to ${data.studio?.name || "the studio"}. You'll get access once they approve.` });
      onChanged();
      return;
    }
    setMsg({ tone: "bad", text:
      data.error === "notfound" ? "No studio uses that code."
      : data.error === "pending" ? "You've already asked to join — waiting on their approval."
      : data.error === "already-member" ? "You're already in that studio."
      : data.error === "own-studio" ? "That's your own studio."
      : "We couldn't send that request." });
  }

  const sent = msg?.tone === "good";

  return (
    <Dialog title="Join a studio" onClose={onClose}
      description="Ask a studio for access using its company code. Someone there approves the request.">
      {msg && <p className={cn(sent ? BANNER_GOOD : BANNER_BAD, "mb-4")}>{msg.text}</p>}
      {sent ? (
        <button className={BTN} onClick={onClose}>Done</button>
      ) : (
        <div className="grid gap-3">
          <div><label className={LABEL}>Company code</label><input className={INPUT} value={code} onChange={(e) => setCode(e.target.value)} placeholder="acme-trading" /></div>
          <div className="mt-1 flex gap-3">
            <button className={BTN} onClick={join} disabled={busy || !code.trim()}>{busy ? "Sending…" : "Request access"}</button>
            <button className={BTN_GHOST} onClick={onClose}>Cancel</button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

// ---- personal info -----------------------------------------------------------
// Laid out like Google Account's Personal info: a stack of rows in a NARROW
// CENTRED COLUMN (.WxnH6c is max-width:640px there, roughly half the window),
// each row an icon slot, a label and the current value. The whole row is the
// control — pressing anywhere on it opens that field — rather than a separate
// Edit affordance.
function PersonalInfo({ identity, onSaved }) {
  const profile = identity?.profile || {};
  const [editing, setEditing] = useState(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: profile.fullName || "", shortName: profile.shortName || "",
    phone: profile.phone || "", workAddress: profile.workAddress || "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // The Nova / AI key. A credential, so the field never shows what is stored —
  // only whether one is set — and saving it sends only the key, never the rest
  // of the form. The server encrypts it; Nova decrypts it to answer as this user.
  const keySet = Boolean(profile.novaKeySet);
  const [provider, setProvider] = useState(profile.novaProvider || "anthropic");
  const [novaKey, setNovaKey] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyMsg, setKeyMsg] = useState("");
  async function saveKey(value) {
    setKeyBusy(true); setKeyMsg("");
    const res = await fetch("/api/identity/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ novaProvider: provider, novaKey: value }),
    });
    setKeyBusy(false);
    if (res.ok) { setNovaKey(""); setKeyMsg(value ? "Key saved." : "Key removed."); onSaved(); }
    else setKeyMsg("That didn't save.");
  }

  async function save() {
    // The phone is optional, so an empty field saves fine — but a number that
    // is present and too short to dial is a typo, not a choice, and PhoneInput
    // already renders the error state for it.
    if (editing === "phone" && form.phone) {
      // Split on the dial code rather than on whitespace: the field keeps the
      // spacing the person typed, so "+31 576 908 413" would otherwise look
      // like a three-digit number.
      const digits = parsePhone(form.phone).number.replace(/\D/g, "");
      if (digits.length < 4) { setPhoneError("Please enter a valid phone number"); return; }
    }
    setBusy(true);
    const res = await fetch("/api/identity/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) { setSaved(true); setEditing(null); setPhoneError(""); onSaved(); }
  }

  const name = form.fullName || identity?.user?.email || "?";
  const rows = [
    { key: "fullName", icon: "person", label: "Name", value: form.fullName || "—" },
    { key: "shortName", icon: "person", label: "Short name", value: form.shortName || "—" },
    { key: "email", icon: "email", label: "Email", value: identity?.user?.email || "—", readOnly: true,
      badge: identity?.emailVerified ? null : "Requires verification" },
    { key: "phone", icon: "call", label: "Phone", value: form.phone || "—" },
    { key: "workAddress", icon: "location", label: "Address", value: form.workAddress || "—" },
  ];

  return (
    <div className="mx-auto w-full max-w-[640px] py-6">
      <h2 className="font-display text-[1.75rem] font-500 leading-[1.2857] text-slate-900 dark:text-white">Personal info</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Your profile information and how to reach you. Only you can see this.
      </p>

      {saved && <p className={cn(BANNER_GOOD, "mt-4")}>Profile updated.</p>}

      {/* Nova / AI key — your own AI subscription, used by the assistant inside
          your studios. Stored encrypted; shown only as set / not set. */}
      <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-600 text-slate-900 dark:text-white">Nova / AI key</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {keySet ? "A key is set. Nova uses it to answer inside your studios." : "Not set — Nova needs your own AI key to work."}
            </p>
          </div>
          {keySet && (
            <button type="button" onClick={() => saveKey("")} disabled={keyBusy}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-500 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
              Remove
            </button>
          )}
        </div>
        {/* Which AI you subscribe to, then the key for it. Nova talks to whichever
            you pick — Claude, ChatGPT or Gemini. */}
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,11rem)_1fr_auto]">
          <select
            value={provider}
            onChange={(e) => { setProvider(e.target.value); setKeyMsg(""); }}
            className={cn(INPUT, "text-sm")}
          >
            {NOVA_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <input
            type="password"
            value={novaKey}
            onChange={(e) => { setNovaKey(e.target.value); setKeyMsg(""); }}
            placeholder={keySet ? "Paste a new key to replace it" : providerMeta(provider).keyHint}
            autoComplete="off"
            className={cn(INPUT, "font-mono text-xs")}
          />
          <button type="button" onClick={() => saveKey(novaKey.trim())} disabled={keyBusy || !novaKey.trim()}
            className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-sm font-500 text-white disabled:opacity-50">
            {keyBusy ? "Saving…" : "Save"}
          </button>
        </div>
        {keyMsg && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{keyMsg}</p>}
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Get a key at {providerMeta(provider).docs}. It&apos;s stored encrypted and never shown again.
        </p>
      </div>

      <div className={cn(STACK, "mt-4")}>
        {/* Profile picture: camera icon on the left, the picture itself as a
            circle at the RIGHT end of the row. */}
        <button type="button" onClick={() => { setSaved(false); setPhotoOpen(true); }}
          aria-haspopup="dialog" className={cn(ROW, ROW_TAP)}>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
            <Icon name="camera" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col justify-center">
            <span className={ROW_LABEL}>Profile picture</span>
            <span className={ROW_VALUE}>A picture helps people recognise you</span>
          </span>
          <span className="ms-auto inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-700 font-display text-sm font-700 text-white">
            {profile.photo
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={profile.photo} alt="" className="h-full w-full object-cover" />
              : initialsOf(name)}
          </span>
        </button>

        {rows.map((r) => {
          const open = editing === r.key;
          if (open) {
            return (
              <div key={r.key} className={cn(ROW, "flex-col items-stretch")}>
                <div className="flex w-full items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
                    <Icon name={r.icon} className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
                  </span>
                  <span className={ROW_LABEL}>{r.label}</span>
                </div>
                <div className="mt-3 w-full ps-[52px]">
                  {r.key === "phone" ? (
                    <PhoneInput
                      value={form.phone}
                      error={phoneError}
                      autoFocus
                      onChange={(v) => { setPhoneError(""); setForm((f) => ({ ...f, phone: v })); }}
                    />
                  ) : (
                    <input className={INPUT} value={form[r.key]} autoFocus
                      onChange={(e) => setForm((f) => ({ ...f, [r.key]: e.target.value }))} />
                  )}
                  <div className="mt-3 flex gap-3">
                    <button className={BTN} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                    <button className={BTN_GHOST} onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            );
          }
          // Read-only rows stay a div so they are not announced as pressable.
          const Tag = r.readOnly ? "div" : "button";
          return (
            <Tag key={r.key} {...(r.readOnly ? {} : { type: "button", onClick: () => { setSaved(false); setEditing(r.key); } })}
              className={cn(ROW, !r.readOnly && ROW_TAP)}>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
                <Icon name={r.icon} className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col justify-center">
                <span className={ROW_LABEL}>{r.label}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className={ROW_VALUE}>{r.value}</span>
                  {r.badge && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-600 text-amber-700 dark:text-amber-300">{r.badge}</span>
                  )}
                </span>
              </span>
              {!r.readOnly && <Icon name="chevronRight" className="ms-auto h-5 w-5 shrink-0 text-slate-300 rtl:-scale-x-100 dark:text-slate-600" />}
            </Tag>
          );
        })}
      </div>

      {photoOpen && <PhotoDialog name={name} photoUrl={profile.photo} onClose={() => setPhotoOpen(false)} onSaved={onSaved} />}
    </div>
  );
}

// The "Change profile photo" dialog. The saved page only contains the TRIGGER
// (aria-haspopup="dialog", aria-label="Change profile photo") — Google builds the
// dialog itself on click, so its markup was not in the file to copy. This mirrors
// its shape and options, minus Google Photos as asked.
function PhotoDialog({ name, photoUrl, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  async function upload(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Choose an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setErr("Images must be 2 MB or smaller."); return; }
    setBusy(true); setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      const up = await fetch("/api/media", { method: "POST", body: form });
      const media = await up.json().catch(() => ({}));
      if (!up.ok || !media.url) throw new Error(media.error || "upload");
      const res = await fetch("/api/identity/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: media.url }),
      });
      if (!res.ok) throw new Error("save");
      onSaved(); onClose();
    } catch { setErr("We couldn't upload that picture."); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setErr("");
    const res = await fetch("/api/identity/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photo: "" }),
    });
    setBusy(false);
    if (res.ok) { onSaved(); onClose(); } else setErr("We couldn't remove that picture.");
  }

  return (
    <Dialog title="Profile picture" onClose={onClose}
      description="A picture helps people recognise you and shows when you're signed in.">
      <div className="flex justify-center pb-6 pt-2">
        <span className="inline-flex h-[136px] w-[136px] items-center justify-center overflow-hidden rounded-full bg-brand-700 font-display text-4xl font-800 text-white">
          {photoUrl
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            : initialsOf(name)}
        </span>
      </div>

      {err && <p className={cn(BANNER_BAD, "mb-4")}>{err}</p>}

      <div className="flex flex-wrap justify-center gap-3">
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => upload(e.target.files?.[0])} />
        <button type="button" className={BTN} disabled={busy} onClick={() => fileRef.current?.click()}>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="camera" className="h-4 w-4" /> {busy ? "Uploading…" : "Change"}
          </span>
        </button>
        <button type="button" className={BTN_GHOST} disabled={busy || !photoUrl} onClick={remove}
          title={photoUrl ? "" : "No picture to remove"}>
          Remove
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">JPG, PNG or WebP, up to 2 MB.</p>
    </Dialog>
  );
}

// The set/change-password modal. Same policy and confirm-field pattern as the
// sign-up form (PASSWORD_RULES + a live ✓/• checklist), so "set a password" here
// looks and validates exactly like creating one there.
//
// `hasPassword` decides the shape: with one, the current password is required and
// a change signs every device out (the server clears the cookie, so we land back
// on /login); without one, this is a first set — no current password, session
// kept. The server enforces the same split; this UI just matches it.
function SetPasswordDialog({ hasPassword, locale, onClose, onSaved }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const strength = checkPassword(next);
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    strength.ok && next === confirm && confirm.length > 0 && (!hasPassword || current.length > 0) && !busy;

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/identity/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "invalid" ? "The current password is incorrect."
            : data.error === "weak" ? "Your new password doesn't meet the requirements yet."
              : "We couldn't update your password. Please try again.",
        );
        setBusy(false);
        return;
      }
      // A change revoked every session, so the cookie is already cleared — go to
      // sign-in. A first set kept the session, so just refresh the account.
      if (data.signedOut) { window.location.assign(`/${locale}/login`); return; }
      onSaved?.();
      onClose();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={hasPassword ? "Change password" : "Set a password"}
      onClose={onClose}
      description={
        hasPassword
          ? "Enter your current password, then a new one. This signs you out on every device."
          : "Create a password so you can sign in with your email as well."
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {hasPassword && (
          <PasswordInput
            id="current-password"
            labelText="Current password"
            labelClassName={LABEL}
            className={INPUT}
            value={current}
            onChange={(e) => { setCurrent(e.target.value); setError(""); }}
            autoComplete="current-password"
          />
        )}

        <PasswordInput
          id="new-password"
          labelText="New password"
          labelClassName={LABEL}
          className={INPUT}
          value={next}
          onChange={(e) => { setNext(e.target.value); setError(""); }}
          autoComplete="new-password"
        >
          <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(next);
              const idle = next.length === 0;
              return (
                <li
                  key={rule.key}
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    idle ? "text-slate-400" : met ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-700",
                      met ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-400 dark:bg-white/10",
                    )}
                  >
                    {met ? "✓" : "•"}
                  </span>
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </PasswordInput>

        <PasswordInput
          id="confirm-password"
          labelText="Confirm new password"
          labelClassName={LABEL}
          className={cn(INPUT, mismatch && "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20")}
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(""); }}
          autoComplete="new-password"
          ariaInvalid={mismatch}
        >
          {mismatch && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">The two passwords don&apos;t match.</p>}
        </PasswordInput>

        {error && <p className={BANNER_BAD} role="alert">{error}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" className={BTN_GHOST} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={BTN} disabled={!canSubmit}>
            {busy ? "Saving…" : hasPassword ? "Change password" : "Set password"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// ---- security ----------------------------------------------------------------
function Security({ devices, onChanged, locale, user }) {
  const [busy, setBusy] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  async function revokeOne(deviceId) {
    setBusy(true);
    await fetch("/api/identity/devices", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId }),
    });
    setBusy(false); onChanged();
  }
  const provider = user?.provider || "";
  const providerName = provider === "google" ? "Google" : provider === "microsoft" ? "Microsoft" : "";
  const hasPassword = Boolean(user?.hasPassword);
  async function revokeAll() {
    setBusy(true);
    await fetch("/api/identity/devices", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }),
    });
    setBusy(false); onChanged();
  }

  return (
    // The SAME frame as Personal info: one narrow centred column, heading and
    // blurb sitting directly on it, then the stack. Both pages are a list of
    // rows about one person, so reading them at two different widths made them
    // look like two different products.
    <div className="mx-auto w-full max-w-[640px] py-6">
      <h2 className="font-display text-[1.75rem] font-500 leading-[1.2857] text-slate-900 dark:text-white">Security</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        How you sign in, and the browsers that stay trusted. A device that isn&apos;t on this list
        has to pass a one-time code before it can sign in. Removing one sends it back through that check.
      </p>

      <div className={cn(STACK, "mt-4")}>
        <div className={ROW}>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
            <Icon name="lock" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
          </span>
          <div className="flex min-w-0 flex-col justify-center">
            <span className={ROW_LABEL}>{providerName || "Email and password"}</span>
            <span className={ROW_VALUE}>
              {providerName
                ? `You sign in with ${providerName}, which also verified your email.`
                : "Changing it signs you out everywhere and forgets every trusted device."}
            </span>
          </div>
          <button type="button" onClick={() => setPwOpen(true)}
            className="ms-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">
            {hasPassword ? "Change" : "Set a password"}
          </button>
        </div>

        {pwOpen && (
          <SetPasswordDialog
            hasPassword={hasPassword}
            locale={locale}
            onClose={() => setPwOpen(false)}
            onSaved={onChanged}
          />
        )}

        {devices.length === 0 ? (
          <div className={ROW}>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
              <Icon name="shield" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
            </span>
            <div className="flex min-w-0 flex-col justify-center">
              <span className={ROW_LABEL}>Trusted devices</span>
              <span className={ROW_VALUE}>No trusted devices.</span>
            </div>
          </div>
        ) : devices.map((d) => (
          <div key={d.id} className={ROW}>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
              <Icon name={d.deviceType === "Phone" ? "call" : d.deviceType === "Tablet" ? "gallery" : "shield"}
                className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
            </span>
            <div className="flex min-w-0 flex-col justify-center">
              <span className="flex flex-wrap items-center gap-2">
                <span className={ROW_LABEL}>{d.label || "Unknown device"}</span>
                {/* Every browser that signs in is listed; only the ones marked
                    trusted skip the emailed code. Saying which is which is the
                    point of the list. */}
                {d.trusted ? (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-600 text-emerald-700 dark:text-emerald-300">Trusted</span>
                ) : (
                  <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-600 text-slate-600 dark:text-slate-300">Asks for a code</span>
                )}
              </span>
              <span className={ROW_VALUE}>
                {[d.deviceType, d.location || "Location unknown",
                  `last used ${new Date(d.lastSeenAt).toLocaleDateString("en-GB")}`].filter(Boolean).join(" · ")}
              </span>
            </div>
            <button type="button" onClick={() => revokeOne(d.id)} disabled={busy}
              className="ms-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-600 text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-300 dark:hover:bg-rose-500/10">
              Remove
            </button>
          </div>
        ))}
      </div>

      {devices.length > 0 && (
        <button className={cn(BTN_GHOST, "mt-4")} onClick={revokeAll} disabled={busy}>{busy ? "Removing…" : "Remove all devices"}</button>
      )}
    </div>
  );
}
