"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { cn } from "@/lib/utils";

// Full-page account. Left rail for navigation, right panel for the section —
// the shape people expect from an account/settings area, rather than one long
// scroll. Data comes from /api/identity/* and /api/studios.
//
// Styling follows the Google Account "stack" grammar: an 888px content column,
// a 1.75rem/500 page title, and grouped rows that read as one rounded slab —
// 20px on the outer corners, 4px on the inner ones, 2px between rows, 16px
// between groups. Row metrics (56px min-height, 12px/16px padding, 12px gap,
// 1rem/500 label over a 0.875rem/400 muted value) come straight from the same
// spec, remapped onto this project's brand/steel palette.

const PAGE = "min-h-screen bg-steel-50 dark:bg-steel-900";
const SHELL = "mx-auto w-full max-w-[888px] px-4 py-8 sm:px-6";
const TITLE = "font-display text-[1.75rem] font-500 leading-[1.2857] text-brand-950 dark:text-white";
const SUB = "mt-2 text-sm leading-relaxed text-steel-600 dark:text-slate-400";
const GROUPS = "flex flex-col gap-4";
const STACK = "flex flex-col gap-[2px]";
// Stack item. `first:`/`last:` carry a pseudo-class so they outrank the base
// 4px radius; a lone row matches both and ends up fully rounded.
const ROW =
  "flex min-h-[56px] w-full items-center gap-3 rounded-[4px] bg-white px-4 py-3 text-start first:rounded-t-[20px] last:rounded-b-[20px] dark:bg-steel-800";
const ROW_TAP = "transition-colors hover:bg-steel-100 dark:hover:bg-white/5";
const ROW_LABEL = "text-base font-500 leading-normal text-brand-950 dark:text-white";
const ROW_VALUE = "truncate text-sm leading-[1.4286] text-steel-600 dark:text-slate-400";
const GROUP_LABEL = "px-4 pb-1 pt-2 text-sm font-500 text-steel-600 dark:text-slate-400";
// Material's pill button: 40px tall, fully rounded, sentence case.
const PILL = "h-10 rounded-full px-6 font-display text-sm font-600 normal-case";

const slugify = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const initialsOf = (s) => String(s || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const NAV = [
  { key: "home", label: "Overview" },
  { key: "studio", label: "My Studio" },
  { key: "collabs", label: "Collaborations" },
  { key: "personal", label: "Personal info" },
  { key: "security", label: "Security" },
];

// Trailing affordance on rows that navigate, mirroring the chevron Google puts
// on its navigational stack items. Flips with the writing direction.
function Chevron() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"
      className="ms-auto h-5 w-5 shrink-0 text-steel-400 rtl:-scale-x-100 dark:text-slate-500"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// One stack item: label above an optional muted value. `as` lets the same row
// be a div, a button or a link without changing its metrics.
function Row({ as: Tag = "div", label, value, className, children, ...rest }) {
  return (
    <Tag className={cn(ROW, className)} {...rest}>
      <div className="flex min-w-0 flex-col justify-center">
        <span className={ROW_LABEL}>{label}</span>
        {value != null && <span className={ROW_VALUE}>{value}</span>}
      </div>
      {children}
    </Tag>
  );
}

function SectionHead({ title, children }) {
  return (
    <header className="pb-2">
      <h2 className={TITLE}>{title}</h2>
      {children && <p className={SUB}>{children}</p>}
    </header>
  );
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
        <p className="text-sm text-steel-500">Loading your account…</p>
      </div>
    );
  }

  const name = identity?.profile?.fullName || identity?.user?.email || "there";
  const go = (key) => { setActive(key); document.getElementById("acct-panel")?.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className={PAGE}>
      <div className={SHELL}>
        {/* identity header */}
        <header className="mb-8 flex flex-wrap items-center gap-4">
          <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-600 font-display text-xl font-600 text-white">
            {initialsOf(identity?.profile?.fullName || identity?.user?.email)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className={TITLE}>{name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-steel-600 dark:text-slate-400">
              <span className="break-all">{identity?.user?.email}</span>
              {identity?.emailVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-500 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
                  ✓ Verified
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outlined"
            className={PILL}
            onClick={async () => { await fetch("/api/identity/logout", { method: "POST" }); window.location.assign(`/${locale}/login`); }}
          >
            Sign out
          </Button>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* left rail — pill items, tonal active state */}
          <nav className="-mx-4 px-4 lg:mx-0 lg:w-[220px] lg:shrink-0 lg:px-0">
            <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {NAV.map((item) => (
                <li key={item.key} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => go(item.key)}
                    aria-current={active === item.key ? "page" : undefined}
                    className={cn(
                      "flex h-12 w-full items-center rounded-full px-4 text-start text-sm font-500 transition-colors",
                      active === item.key
                        ? "bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-100"
                        : "text-steel-600 hover:bg-steel-100 dark:text-slate-300 dark:hover:bg-white/5",
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
    <div className={GROUPS}>
      <SectionHead title="Overview">Everything tied to your account lives here.</SectionHead>

      <div className={STACK}>
        {tiles.map((t) => (
          <Row
            key={t.key}
            as="button"
            type="button"
            onClick={() => onGo(t.key)}
            className={ROW_TAP}
            label={t.label}
            value={`${t.value} · ${t.hint}`}
          >
            <Chevron />
          </Row>
        ))}
      </div>

      {studios.owned && (
        <div>
          <p className={GROUP_LABEL}>Your studio is live</p>
          <div className={STACK}>
            <Row
              label={studios.owned.name}
              value={`Share the code ${studios.owned.slug} so teammates can request access.`}
            >
              <span className="ms-auto shrink-0">
                <Button variant="contained" href={`/${studios.owned.slug}`} className={PILL}>Open Studio</Button>
              </span>
            </Row>
          </div>
        </div>
      )}

      {q.completedAt && (
        <div>
          <p className={GROUP_LABEL}>About your company</p>
          <div className={STACK}>
            {[["Goal", q.intent === "create" ? "Create a studio" : q.intent === "join" ? "Join a studio" : "—"],
              ["Field", q.field || "—"], ["Location", [q.city, q.country].filter(Boolean).join(", ") || "—"]].map(([k, v]) => (
              <Row key={k} label={k} value={v} />
            ))}
          </div>
        </div>
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
      <div className={GROUPS}>
        <SectionHead title="My Studio">Your company&apos;s workspace. You own exactly one.</SectionHead>
        <div className={STACK}>
          <Row label={studio.name} value={`nompany.com/${studio.slug}`}>
            <span className="ms-auto shrink-0">
              <Button variant="contained" href={`/${studio.slug}`} className={PILL}>Open Studio</Button>
            </span>
          </Row>
          <Row
            label="Company code"
            value={`Teammates join by entering ${studio.slug} on their own account page — you approve each request inside the studio.`}
          />
        </div>
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

  const slugHelp = effectiveSlug && status
    ? status.available ? `“${status.slug}” is available`
      : status.reason === "taken" ? `“${status.slug}” is already taken`
      : status.reason === "reserved" ? `“${status.slug}” is reserved`
      : "Use 3+ letters, numbers or dashes"
    : " ";

  return (
    <div className={GROUPS}>
      <SectionHead title="Create your Studio">Your company&apos;s workspace, at its own address.</SectionHead>
      <div className="rounded-[20px] bg-white p-4 dark:bg-steel-800 sm:p-6">
        <div className="grid gap-5">
          <TextField
            label="Company name" fullWidth size="medium"
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Acme Trading Co."
          />
          <TextField
            label="Studio address (company code)" fullWidth size="medium"
            value={touched ? slug : effectiveSlug}
            onChange={(e) => { setTouched(true); setSlug(e.target.value); }}
            placeholder="acme-trading"
            error={Boolean(effectiveSlug && status && !status.available)}
            helperText={slugHelp}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">nompany.com/</InputAdornment>,
              },
            }}
          />
        </div>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        <div className="mt-5">
          <Button variant="contained" className={PILL} onClick={create} disabled={busy || !name || !status?.available}>
            {busy ? "Creating…" : "Create Studio"}
          </Button>
        </div>
      </div>
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
    <div className={GROUPS}>
      <SectionHead title="Collaboration Studios">Studios you&apos;ve been given access to, alongside your own.</SectionHead>

      <div className={STACK}>
        {studios.length === 0 ? (
          <Row label="No collaborations yet" value="You're not collaborating in any studio yet." />
        ) : (
          studios.map((s) => (
            <Row key={s.id} label={s.name} value={`nompany.com/${s.slug}`}>
              <span className="ms-auto shrink-0">
                <Button variant="outlined" href={`/${s.slug}`} className={PILL}>Open</Button>
              </span>
            </Row>
          ))
        )}
      </div>

      <div>
        <p className={GROUP_LABEL}>Join a studio</p>
        <div className="rounded-[20px] bg-white p-4 dark:bg-steel-800 sm:p-6">
          <p className="mb-4 text-sm text-steel-600 dark:text-slate-400">
            Enter the company code you were given. They&apos;ll approve your request.
          </p>
          <div className="flex flex-wrap items-start gap-3">
            <TextField
              label="Company code" size="medium"
              className="min-w-[220px] flex-1"
              value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="acme-trading"
            />
            <Button variant="contained" className={cn(PILL, "h-14")} onClick={join} disabled={busy || !code.trim()}>
              {busy ? "Sending…" : "Request access"}
            </Button>
          </div>
          {msg && (
            <p className={cn("mt-3 text-sm", msg.tone === "good" ? "text-emerald-700 dark:text-emerald-400" : "text-danger")}>
              {msg.text}
            </p>
          )}
        </div>
      </div>
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
    <div className={GROUPS}>
      <SectionHead title="Personal information">
        Yours alone. Studios you join keep their own name for you and never see this.
      </SectionHead>
      <div className="rounded-[20px] bg-white p-4 dark:bg-steel-800 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map(([key, labelText]) => (
            <TextField key={key} label={labelText} fullWidth size="medium" value={form[key]} onChange={set(key)} />
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button variant="contained" className={PILL} onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
          {saved && <span className="text-sm text-emerald-700 dark:text-emerald-400">Saved</span>}
        </div>
      </div>
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
    <div className={GROUPS}>
      <SectionHead title="Trusted devices">
        Browsers that can sign in without a one-time code. Remove one and its next sign-in needs a fresh code.
      </SectionHead>

      <div className={STACK}>
        {devices.length === 0 ? (
          <Row label="No trusted devices" />
        ) : (
          devices.map((d) => (
            <Row
              key={d.id}
              label={d.label || "Unknown device"}
              value={`last used ${new Date(d.lastSeenAt).toLocaleDateString("en-GB")}`}
            />
          ))
        )}
      </div>

      {devices.length > 0 && (
        <div>
          <Button variant="outlined" className={PILL} onClick={revokeAll} disabled={busy}>
            {busy ? "Removing…" : "Remove all devices"}
          </Button>
        </div>
      )}

      <div>
        <p className={GROUP_LABEL}>How you sign in</p>
        <div className={STACK}>
          {providerName ? (
            <>
              <Row
                label={providerName}
                value={`You sign in with ${providerName}, which is also how your email was verified — so you've never set a password here.`}
              />
              <Row
                label="Password"
                value={`Want to sign in with an email and password too? Set one below — your ${providerName} button keeps working either way.`}
              />
            </>
          ) : (
            <Row
              label="Email and password"
              value="Changing it signs you out everywhere and forgets every trusted device."
            />
          )}
        </div>
        <div className="mt-4">
          <Button variant="outlined" href={`/${locale}/forgot`} className={PILL}>
            {providerName ? "Set a password" : "Reset password"}
          </Button>
        </div>
      </div>
    </div>
  );
}
