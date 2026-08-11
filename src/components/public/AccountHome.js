"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Full-page account. Left rail for navigation, right panel for the section —
// the shape people expect from an account/settings area, rather than one long
// scroll. Data comes from /api/identity/* and /api/studios.
//
// Styling is lifted verbatim from the Old System's account page
// (studio/(panel)/profile → EmployeeSelfProfile): a `space-y-5` stack of geex
// cards, slate-50 rounded-xl inputs with uppercase micro-labels, and pill
// buttons. The class names are identical, so `brand-700`/`brand-950` resolve to
// this project's royal blue rather than the Old System's navy.

const PAGE = "min-h-screen bg-geex-bg dark:bg-[#141420]";
const SHELL = "mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8";
const STACK = "space-y-5";
const CARD =
  "rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const H2 = "mb-1 font-display text-base font-700 text-slate-900 dark:text-white";
const H3 = "mb-1 font-display text-sm font-700 text-slate-900 dark:text-white";
const SUB = "text-xs text-slate-500 dark:text-slate-400";
const DIVIDER = "mt-6 border-t border-slate-100 pt-5 dark:border-white/10";
const INPUT =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const LABEL = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const BTN_GHOST =
  "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const OK = "text-sm text-emerald-600 dark:text-emerald-400";
const ERR = "text-sm text-red-600 dark:text-red-400";

const slugify = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const initialsOf = (s) => String(s || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const NAV = [
  { key: "home", label: "Overview" },
  { key: "studio", label: "My Studio" },
  { key: "collabs", label: "Collaborations" },
  { key: "personal", label: "Personal info" },
  { key: "security", label: "Security" },
];

function Card({ className, children }) {
  return <div className={cn(CARD, className)}>{children}</div>;
}

export default function AccountHome({ locale }) {
  const [identity, setIdentity] = useState(null);
  const [studios, setStudios] = useState({ owned: null, collaborations: [] });
  const [devices, setDevices] = useState([]);
  const [active, setActive] = useState("home");
  const [loading, setLoading] = useState(true);

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
    return (
      <div className={cn(PAGE, "flex items-center justify-center")}>
        <div className="text-sm text-slate-400">Loading…</div>
      </div>
    );
  }

  const name = identity?.profile?.fullName || identity?.user?.email || "there";
  const go = (key) => { setActive(key); document.getElementById("acct-panel")?.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className={PAGE}>
      <div className={SHELL}>
        {/* identity header */}
        <header className="mb-6 flex flex-wrap items-center gap-4">
          <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-700 font-display text-xl font-700 text-white">
            {initialsOf(identity?.profile?.fullName || identity?.user?.email)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white sm:text-2xl">{name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="break-all">{identity?.user?.email}</span>
              {identity?.emailVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-600 text-emerald-600 dark:text-emerald-400">
                  ✓ Verified
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            className={BTN_GHOST}
            onClick={async () => { await fetch("/api/identity/logout", { method: "POST" }); window.location.assign(`/${locale}/login`); }}
          >
            Sign out
          </button>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* left rail */}
          <nav className="lg:w-56 lg:shrink-0">
            <ul className="flex flex-wrap gap-1 lg:flex-col">
              {NAV.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => go(item.key)}
                    aria-current={active === item.key ? "page" : undefined}
                    className={cn(
                      "w-full rounded-lg px-3 py-2.5 text-start text-sm font-500 transition-colors",
                      active === item.key
                        ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
                    )}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* panel */}
          <div id="acct-panel" className="min-w-0 flex-1">
            {active === "home" && <Overview identity={identity} studios={studios} onGo={go} locale={locale} />}
            {active === "studio" && <MyStudio studio={studios.owned} onCreated={load} />}
            {active === "collabs" && <Collaborations studios={studios.collaborations} onJoined={load} />}
            {active === "personal" && <PersonalInfo profile={identity?.profile || {}} onSaved={load} />}
            {active === "security" && <Security devices={devices} onChanged={load} locale={locale} user={identity?.user} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- overview ---------------------------------------------------------------
function Overview({ identity, studios, onGo, locale }) {
  const q = identity?.questionnaire || {};
  const tiles = [
    { key: "studio", label: "My Studio", value: studios.owned ? studios.owned.name : "Not created", hint: studios.owned ? `nompany.com/${studios.owned.slug}` : "Create one to get started" },
    { key: "collabs", label: "Collaborations", value: String(studios.collaborations.length), hint: studios.collaborations.length ? "Studios you can enter" : "Join one with a company code" },
  ];
  return (
    <div className={STACK}>
      <Card>
        <h2 className={H2}>Overview</h2>
        <p className={cn(SUB, "mb-5")}>Everything tied to your account lives here.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {tiles.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onGo(t.key)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-start transition-colors hover:border-brand-500 dark:border-white/15 dark:bg-[#191921] dark:hover:border-brand-500/40"
            >
              <p className={LABEL}>{t.label}</p>
              <p className="font-display text-sm font-700 text-slate-900 dark:text-white">{t.value}</p>
              <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">{t.hint}</p>
            </button>
          ))}
        </div>
      </Card>

      {studios.owned && (
        <Card>
          <h2 className={H2}>Your studio is live</h2>
          <p className={cn(SUB, "mb-4")}>
            Share the code <span className="font-600 text-slate-700 dark:text-slate-200">{studios.owned.slug}</span> so teammates can request access.
          </p>
          <a href={`/${studios.owned.slug}`} className={BTN}>Open Studio</a>
        </Card>
      )}

      {q.completedAt && (
        <Card>
          <h2 className={H2}>About your company</h2>
          <p className={cn(SUB, "mb-5")}>What you told us when you signed up.</p>
          <dl className="grid gap-4 sm:grid-cols-3">
            {[["Goal", q.intent === "create" ? "Create a studio" : q.intent === "join" ? "Join a studio" : "—"],
              ["Field", q.field || "—"], ["Location", [q.city, q.country].filter(Boolean).join(", ") || "—"]].map(([k, v]) => (
              <div key={k}>
                <dt className={LABEL}>{k}</dt>
                <dd className="text-sm text-slate-900 dark:text-white">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  );
}

// ---- my studio --------------------------------------------------------------
function MyStudio({ studio, onCreated }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const effectiveSlug = touched ? slugify(slug) : slugify(name);

  useEffect(() => {
    if (studio || !effectiveSlug) { setStatus(null); return; }
    const id = setTimeout(async () => {
      const res = await fetch(`/api/studios/available?slug=${encodeURIComponent(effectiveSlug)}`, { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    }, 350);
    return () => clearTimeout(id);
  }, [effectiveSlug, studio]);

  if (studio) {
    return (
      <div className={STACK}>
        <Card>
          <h2 className={H2}>My Studio</h2>
          <p className={cn(SUB, "mb-5")}>Your company&apos;s workspace. You own exactly one.</p>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/15 dark:bg-[#191921]">
            <div>
              <p className="font-display text-sm font-700 text-slate-900 dark:text-white">{studio.name}</p>
              <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">nompany.com/{studio.slug}</p>
            </div>
            <a href={`/${studio.slug}`} className={BTN}>Open Studio</a>
          </div>
          <div className={DIVIDER}>
            <h3 className={H3}>Company code</h3>
            <p className={SUB}>
              Teammates join by entering <span className="font-600 text-slate-700 dark:text-slate-200">{studio.slug}</span> on their own account page — you approve each request inside the studio.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  async function create() {
    setBusy(true); setError("");
    const res = await fetch("/api/studios", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: effectiveSlug }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { onCreated(); return; }
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
    <div className={STACK}>
      <Card>
        <h2 className={H2}>Create your Studio</h2>
        <p className={cn(SUB, "mb-5")}>Your company&apos;s workspace, at its own address.</p>
        {error && <p className={cn(ERR, "mb-4")}>{error}</p>}
        <div className="grid max-w-md gap-3">
          <div>
            <label className={LABEL}>Company name</label>
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Trading Co." />
          </div>
          <div>
            <label className={LABEL}>Studio address (company code)</label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">nompany.com/</span>
              <input
                className={INPUT}
                value={touched ? slug : effectiveSlug}
                onChange={(e) => { setTouched(true); setSlug(e.target.value); }}
                placeholder="acme-trading"
              />
            </div>
            {effectiveSlug && status && (
              <p className={cn("mt-1 text-xs font-600", status.available ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                {status.available ? `“${status.slug}” is available`
                  : status.reason === "taken" ? `“${status.slug}” is already taken`
                  : status.reason === "reserved" ? `“${status.slug}” is reserved`
                  : "Use 3+ letters, numbers or dashes"}
              </p>
            )}
          </div>
          <div>
            <button className={BTN} onClick={create} disabled={busy || !name || !status?.available}>
              {busy ? "Creating…" : "Create Studio"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---- collaborations ---------------------------------------------------------
function Collaborations({ studios, onJoined }) {
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
      onJoined();
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
    <div className={STACK}>
      <Card>
        <h2 className={H2}>Collaboration Studios</h2>
        <p className={cn(SUB, "mb-5")}>Studios you&apos;ve been given access to, alongside your own.</p>
        {studios.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-white/15 dark:text-slate-400">
            You&apos;re not collaborating in any studio yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {studios.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/15 dark:bg-[#191921]">
                <div>
                  <p className="font-display text-sm font-700 text-slate-900 dark:text-white">{s.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">nompany.com/{s.slug}</p>
                </div>
                <a href={`/${s.slug}`} className={BTN_GHOST}>Open</a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className={H2}>Join a studio</h2>
        <p className={cn(SUB, "mb-5")}>Enter the company code you were given. They&apos;ll approve your request.</p>
        {msg && <p className={cn(msg.tone === "good" ? OK : ERR, "mb-4")}>{msg.text}</p>}
        <div className="grid max-w-md gap-3">
          <div>
            <label className={LABEL}>Company code</label>
            <input className={INPUT} value={code} onChange={(e) => setCode(e.target.value)} placeholder="acme-trading" />
          </div>
          <div>
            <button className={BTN} onClick={join} disabled={busy || !code.trim()}>
              {busy ? "Sending…" : "Request access"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---- personal info ----------------------------------------------------------
function PersonalInfo({ profile, onSaved }) {
  const [form, setForm] = useState({
    fullName: profile.fullName || "", shortName: profile.shortName || "",
    phone: profile.phone || "", workAddress: profile.workAddress || "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setSaved(false); };

  async function save() {
    setBusy(true);
    const res = await fetch("/api/identity/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) { setSaved(true); onSaved(); }
  }

  const fields = [
    ["fullName", "Full name"],
    ["shortName", "Short name"],
    ["phone", "Phone"],
    ["workAddress", "Address"],
  ];

  return (
    <div className={STACK}>
      <Card>
        <h2 className={H2}>Personal information</h2>
        <p className={cn(SUB, "mb-5")}>Yours alone. Studios you join keep their own name for you and never see this.</p>
        {saved && <p className={cn(OK, "mb-4")}>Profile updated.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([key, labelText]) => (
            <div key={key}>
              <label className={LABEL}>{labelText}</label>
              <input className={INPUT} value={form[key]} onChange={set(key)} />
            </div>
          ))}
        </div>
        <div className="mt-5">
          <button className={BTN} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </Card>
    </div>
  );
}

// ---- security ---------------------------------------------------------------
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
    <div className={STACK}>
      <Card>
        <h2 className={H2}>Trusted devices</h2>
        <p className={cn(SUB, "mb-5")}>Browsers that can sign in without a one-time code. Remove one and its next sign-in needs a fresh code.</p>
        {devices.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">No trusted devices.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {devices.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/15 dark:bg-[#191921]">
                  <span className="text-sm font-600 text-slate-900 dark:text-white">{d.label || "Unknown device"}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">last used {new Date(d.lastSeenAt).toLocaleDateString("en-GB")}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <button className={BTN_GHOST} onClick={revokeAll} disabled={busy}>{busy ? "Removing…" : "Remove all devices"}</button>
            </div>
          </>
        )}
      </Card>

      <Card>
        <h2 className={H2}>How you sign in</h2>
        {providerName ? (
          <>
            <p className={SUB}>
              You sign in with <span className="font-600 text-slate-700 dark:text-slate-200">{providerName}</span>, which is
              also how your email was verified — so you&apos;ve never set a password here.
            </p>
            <p className={cn(SUB, "mb-5 mt-2")}>
              Want to sign in with an email and password too? Set one below — your {providerName} button keeps working either way.
            </p>
          </>
        ) : (
          <p className={cn(SUB, "mb-5")}>You sign in with your email and password. Changing it signs you out everywhere and forgets every trusted device.</p>
        )}
        <a href={`/${locale}/forgot`} className={BTN_GHOST}>{providerName ? "Set a password" : "Reset password"}</a>
      </Card>
    </div>
  );
}
