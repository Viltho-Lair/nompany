"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import LangMenu from "@/components/LangMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

// The account hub, laid out like the Google Account console:
//   • brand mark top-left, ABOVE the fixed sidebar
//   • fixed left sidebar, one coloured icon per destination
//   • the content column fits the window so nothing needs horizontal scroll
//   • profile avatar top-right — the ONLY place sign-out lives
//   • Terms / Help / Documentation bottom-left, scope note bottom-centre
//
// Each sidebar button shows completely different content; the identity block
// and the create/join actions belong to Overview alone.

const PAGE = "min-h-screen bg-geex-bg dark:bg-[#141420]";
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 font-display text-sm font-700 text-white transition-shadow hover:ring-2 hover:ring-brand-500/40"
              title={identity?.user?.email || "Account"}
            >
              {initialsOf(name)}
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

      <div className="flex flex-col gap-6 px-5 pb-8 sm:px-8 lg:flex-row lg:gap-10">
        {/* fixed rail */}
        <nav className={cn(RAIL_W, "lg:shrink-0")}>
          <div className="lg:sticky lg:top-6">
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

            {/* bottom-left links */}
            <div className="mt-8 hidden flex-wrap gap-x-4 gap-y-2 px-4 text-xs text-slate-500 dark:text-slate-400 lg:flex">
              <Link href={`/${locale}/terms`} className="hover:text-slate-900 hover:underline dark:hover:text-white">Terms</Link>
              <Link href={`/${locale}/contact`} className="hover:text-slate-900 hover:underline dark:hover:text-white">Help</Link>
              {owned[0]
                ? <a href={`/${owned[0].slug}/documentation`} className="hover:text-slate-900 hover:underline dark:hover:text-white">Documentation</a>
                : <span className="text-slate-400 dark:text-slate-500">Documentation</span>}
            </div>
          </div>
        </nav>

        {/* content — sized to the window so nothing scrolls sideways */}
        <main className="min-w-0 flex-1">
          {view === "overview" && <Overview identity={identity} owned={owned} collabs={collabs} onGo={setView} onChanged={load} />}
          {view === "studios" && <StudioGrid title="My Studios" note="Workspaces you own." studios={owned} empty="You don't own a studio yet." />}
          {view === "collabs" && <StudioGrid title="My Collaborations" note="Studios you've been given access to." studios={collabs} empty="You're not collaborating in any studio yet." />}
          {view === "personal" && <PersonalInfo identity={identity} onSaved={load} />}
          {view === "security" && <Security devices={devices} onChanged={load} locale={locale} user={identity?.user} />}

          {/* bottom-centre scope note */}
          <p className="mt-10 text-center text-xs text-slate-500 dark:text-slate-400">
            These settings are yours alone. Studios you join keep their own profile for you and never see what's here.
          </p>
          <div className="mt-4 flex justify-center gap-4 text-xs text-slate-500 dark:text-slate-400 lg:hidden">
            <Link href={`/${locale}/terms`} className="hover:underline">Terms</Link>
            <Link href={`/${locale}/contact`} className="hover:underline">Help</Link>
          </div>
        </main>
      </div>
    </div>
  );
}

// ---- studio cards ------------------------------------------------------------
// A studio is a square tile: logo when the studio has one, initials otherwise,
// with the name underneath. Studio rows carry no logo field yet, so today every
// tile falls back to initials.
function StudioCard({ studio }) {
  return (
    <a href={`/${studio.slug}`} className="group block w-[132px] shrink-0">
      <span className="flex aspect-square w-[132px] items-center justify-center overflow-hidden rounded-geex border border-slate-200/70 bg-white transition-colors group-hover:border-brand-500 dark:border-white/10 dark:bg-[#20202c] dark:group-hover:border-brand-500/50">
        {studio.logoUrl
          ? /* eslint-disable-next-line @next/next/no-img-element */
            <img src={studio.logoUrl} alt="" className="h-full w-full object-cover" />
          : <span className="font-display text-2xl font-800 text-brand-700 dark:text-brand-300">{initialsOf(studio.name)}</span>}
      </span>
      <span className="mt-2 block truncate text-center text-sm font-600 text-slate-900 dark:text-white">{studio.name}</span>
      <span className="block truncate text-center font-mono text-[11px] text-slate-400">nompany.com/{studio.slug}</span>
    </a>
  );
}

// The square action tile that sits to the LEFT of a row of studio tiles.
function ActionTile({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="group block w-[132px] shrink-0 text-start">
      <span className="flex aspect-square w-[132px] flex-col items-center justify-center gap-2 rounded-geex border border-dashed border-slate-300 bg-white/60 transition-colors group-hover:border-brand-500 group-hover:bg-white dark:border-white/20 dark:bg-white/[0.03] dark:group-hover:border-brand-500/50">
        <Icon name={icon} className="h-7 w-7 text-brand-600 dark:text-brand-400" />
      </span>
      <span className="mt-2 block text-center text-sm font-600 text-slate-900 dark:text-white">{label}</span>
    </button>
  );
}

// Action tile + a horizontal row of studio tiles. Past four studios the row
// stops and a View all takes over, so the strip never wraps out of the window.
function StudioStrip({ action, studios, onViewAll }) {
  const shown = studios.slice(0, 4);
  return (
    <div className="mt-4 flex items-start gap-4 overflow-x-auto pb-1">
      {action}
      {shown.map((s) => <StudioCard key={s.id} studio={s} />)}
      {studios.length > 4 && (
        <button type="button" onClick={onViewAll} className="flex aspect-square w-[132px] shrink-0 flex-col items-center justify-center gap-1 rounded-geex border border-slate-200/70 bg-white text-sm font-600 text-brand-700 transition-colors hover:border-brand-500 dark:border-white/10 dark:bg-[#20202c] dark:text-brand-300">
          <Icon name="chevronRight" className="h-5 w-5 rtl:-scale-x-100" />
          View all
          <span className="text-xs font-500 text-slate-400">{studios.length} total</span>
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

// ---- overview ----------------------------------------------------------------
function Overview({ identity, owned, collabs, onGo, onChanged }) {
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const name = identity?.profile?.fullName || identity?.user?.email || "there";
  const verified = Boolean(identity?.emailVerified);

  return (
    <div className="space-y-6">
      {/* identity — Overview only */}
      <section className={PANEL}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-700 font-display text-xl font-800 text-white">
            {initialsOf(name)}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-800 text-slate-900 dark:text-white">{name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="break-all">{identity?.user?.email}</span>
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-600 text-emerald-700 dark:text-emerald-300">
                  <Icon name="check" className="h-3.5 w-3.5" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-600 text-amber-700 dark:text-amber-300">
                  Requires verification
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* owned */}
      <section className={PANEL}>
        <h2 className={H2}>Your studios</h2>
        <p className={SUB}>A studio is your company's workspace, at its own address.</p>
        <StudioStrip
          action={<ActionTile icon="plus" label="Create a studio" onClick={() => { setCreating((v) => !v); setJoining(false); }} />}
          studios={owned}
          onViewAll={() => onGo("studios")}
        />
        {creating && <CreateStudio onDone={() => { setCreating(false); onChanged(); }} onCancel={() => setCreating(false)} />}
      </section>

      {/* collaborations */}
      <section className={PANEL}>
        <h2 className={H2}>Your collaborations</h2>
        <p className={SUB}>Studios you've been given access to, alongside your own.</p>
        <StudioStrip
          action={<ActionTile icon="team" label="Join a studio" onClick={() => { setJoining((v) => !v); setCreating(false); }} />}
          studios={collabs}
          onViewAll={() => onGo("collabs")}
        />
        {joining && <JoinStudio onDone={() => { setJoining(false); onChanged(); }} onCancel={() => setJoining(false)} />}
      </section>
    </div>
  );
}

// ---- create / join -----------------------------------------------------------
function CreateStudio({ onDone, onCancel }) {
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
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/15 dark:bg-[#191921]">
      {error && <p className={cn(BANNER_BAD, "mb-4")}>{error}</p>}
      <div className="grid max-w-md gap-3">
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
        <div className="flex gap-3">
          <button className={BTN} onClick={create} disabled={busy || !name || !status?.available}>{busy ? "Creating…" : "Create studio"}</button>
          <button className={BTN_GHOST} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function JoinStudio({ onDone, onCancel }) {
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
      onDone();
      return;
    }
    setMsg({ tone: "bad", text:
      data.error === "notfound" ? "No studio uses that code."
      : data.error === "pending" ? "You've already asked to join — waiting on their approval."
      : data.error === "already-member" ? "You're already in that studio."
      : data.error === "own-studio" ? "That's your own studio."
      : "We couldn't send that request." });
  }

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/15 dark:bg-[#191921]">
      {msg && <p className={cn(msg.tone === "good" ? BANNER_GOOD : BANNER_BAD, "mb-4")}>{msg.text}</p>}
      <div className="grid max-w-md gap-3">
        <div><label className={LABEL}>Company code</label><input className={INPUT} value={code} onChange={(e) => setCode(e.target.value)} placeholder="acme-trading" /></div>
        <div className="flex gap-3">
          <button className={BTN} onClick={join} disabled={busy || !code.trim()}>{busy ? "Sending…" : "Request access"}</button>
          <button className={BTN_GHOST} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ---- personal info -----------------------------------------------------------
// Laid out exactly like Google Account's Personal info: a stack of rows, each an
// icon slot, a label, and the current value. Clicking a row opens it for edit
// in place rather than navigating away.
function PersonalInfo({ identity, onSaved }) {
  const profile = identity?.profile || {};
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    fullName: profile.fullName || "", shortName: profile.shortName || "",
    phone: profile.phone || "", workAddress: profile.workAddress || "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch("/api/identity/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) { setSaved(true); setEditing(null); onSaved(); }
  }

  const rows = [
    { key: "avatar", icon: "person", label: "Profile picture", value: "Add a photo to personalise your account", readOnly: true },
    { key: "fullName", icon: "person", label: "Name", value: form.fullName || "—" },
    { key: "shortName", icon: "person", label: "Short name", value: form.shortName || "—" },
    { key: "email", icon: "external", label: "Email", value: identity?.user?.email || "—", readOnly: true,
      badge: identity?.emailVerified ? null : "Requires verification" },
    { key: "phone", icon: "clients", label: "Phone", value: form.phone || "—" },
    { key: "workAddress", icon: "location", label: "Address", value: form.workAddress || "—" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-[1.75rem] font-500 leading-[1.2857] text-slate-900 dark:text-white">Personal info</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Your profile information and how to reach you. Only you can see this.
        </p>
      </div>

      {saved && <p className={BANNER_GOOD}>Profile updated.</p>}

      <div className={STACK}>
        {rows.map((r) => {
          const open = editing === r.key;
          return (
            <div key={r.key} className={cn(ROW, !r.readOnly && ROW_TAP, "flex-col items-stretch sm:flex-row sm:items-center")}>
              <div className="flex w-full items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <Icon name={r.icon} className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className={ROW_LABEL}>{r.label}</span>
                  {!open && (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={ROW_VALUE}>{r.value}</span>
                      {r.badge && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-600 text-amber-700 dark:text-amber-300">{r.badge}</span>
                      )}
                    </span>
                  )}
                </div>
                {!r.readOnly && !open && (
                  <button type="button" onClick={() => { setSaved(false); setEditing(r.key); }}
                    className="ms-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">
                    Edit
                  </button>
                )}
              </div>

              {open && (
                <div className="mt-3 w-full ps-[52px]">
                  <input className={cn(INPUT, "max-w-md")} value={form[r.key]} autoFocus
                    onChange={(e) => setForm((f) => ({ ...f, [r.key]: e.target.value }))} />
                  <div className="mt-3 flex gap-3">
                    <button className={BTN} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                    <button className={BTN_GHOST} onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- security ----------------------------------------------------------------
function Security({ devices, onChanged, locale, user }) {
  const [busy, setBusy] = useState(false);
  const provider = user?.provider || "";
  const providerName = provider === "google" ? "Google" : provider === "microsoft" ? "Microsoft" : "";
  async function revokeAll() {
    setBusy(true);
    await fetch("/api/identity/devices", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }),
    });
    setBusy(false); onChanged();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-[1.75rem] font-500 leading-[1.2857] text-slate-900 dark:text-white">Security</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">How you sign in, and the browsers that stay trusted.</p>
      </div>

      <div className={STACK}>
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
          <a href={`/${locale}/forgot`} className="ms-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">
            {providerName ? "Set a password" : "Reset"}
          </a>
        </div>

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
              <Icon name="shield" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
            </span>
            <div className="flex min-w-0 flex-col justify-center">
              <span className={ROW_LABEL}>{d.label || "Unknown device"}</span>
              <span className={ROW_VALUE}>last used {new Date(d.lastSeenAt).toLocaleDateString("en-GB")}</span>
            </div>
          </div>
        ))}
      </div>

      {devices.length > 0 && (
        <button className={BTN_GHOST} onClick={revokeAll} disabled={busy}>{busy ? "Removing…" : "Remove all devices"}</button>
      )}
    </div>
  );
}
