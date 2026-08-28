"use client";

import { CURRENCIES_FROM_EXCHANGE_API, searchCurrencies, currency as currencyOf, fmtRate } from "@/shared/currencies";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio2/icons";
import { useFocusTrap } from "@/components/studio2/useFocusTrap";
import Combo from "@/components/studio2/Combo";
import { COUNTRIES } from "@/shared/countries";
import { citiesFor } from "@/lib/cities";
import { CurrencySymbol } from "@/components/Currency";
import { locales, LANGUAGE_NAMES } from "@/shared/locale";
import { settingsDict } from "@/shared/studio/settings";
import { fmtDate } from "@/lib/format";
import { Field } from "@/components/fields/Field";
import { actionsForField, OTHER_FIELD } from "@/shared/fieldsOfWork";

// THE SCREEN'S WORDS, HANDED DOWN RATHER THAN THREADED.
//
// Eleven components in this file need them — every dialog, every row, the
// countdown — and none of them need anything else from their parent. Passing
// a `t` prop through all eleven would be eleven signatures changed to carry
// one value that never varies within a render, and the next dialog added here
// would be the one somebody forgets. A context is the shape of the fact: one
// value, set once at the top, read wherever it is wanted.
// English is the default so a component rendered outside the provider — in a
// test, say — still has words rather than crashing on undefined.
const T = createContext(settingsDict("en"));
const useT = () => useContext(T);

// Studio settings — the studio's own identity, reached from the sidebar where
// "My account" used to sit. The account itself is still one click away, behind
// the header avatar; this is the studio, which is a different thing entirely.
//
// The rows deliberately copy /account's Personal info: a grouped stack where
// each row is an icon slot, a label, the current value, and the whole row is the
// control. Somebody who has set their own picture already knows how this works.

// Same geometry as the account hub's stack: 20px outer corners, 4px inside, 2px
// between rows, 56px min-height.
const STACK = "flex flex-col gap-[2px]";
const ROW =
  "flex min-h-[56px] w-full items-center gap-3 rounded-[4px] bg-[var(--geex-surface)] px-4 py-3 text-start first:rounded-t-[20px] last:rounded-b-[20px]";
const ROW_TAP = "transition-colors hover:bg-slate-50 dark:hover:bg-white/5";
const ROW_LABEL = "text-base font-500 leading-normal text-slate-900 dark:text-white";
const ROW_VALUE = "truncate text-sm leading-[1.4286] text-slate-500 dark:text-slate-400";
const BTN = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const BTN_GHOST = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
// The currencies a studio is likely to price in. Free text is still allowed —
// the list is a shortcut, not a restriction.
// KEYS ONLY. The day NAMES moved into the dictionary — they are the one part
// of a working week that is language and not data, and a list of pairs here
// meant the Arabic week could only ever have been a second list beside it.
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DEFAULT_HOURS = Object.fromEntries(DAYS.map((d) => [d, { open: !["fri", "sat"].includes(d), from: "09:00", to: "17:00" }]));
// citiesFor keys on the ISO code while the stored answer is a country NAME.
const codeOf = (name) => COUNTRIES.find((c) => c.name === name)?.code || "";
const hoursSummary = (h, t) => {
  if (!h) return t.hoursNotSet;
  const open = DAYS.filter((d) => h[d]?.open);
  if (open.length === 0) return t.hoursClosedAll;
  const first = open[0];
  const same = open.every((d) => h[d].from === h[first].from && h[d].to === h[first].to);
  const span = h[first];
  return same
    ? `${t.days(open.length)} · ${span.from}–${span.to}`
    : `${t.days(open.length)} · ${t.hoursVaries}`;
};

const BANNER_BAD = "rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300";

export default function StudioSettings({ slug, locale = "en" }) {
  // Resolved on the server and handed down with the rest of the screen's
  // props, so Settings opens in the reader's language on its first paint
  // rather than after a swap.
  const t = settingsDict(locale);
  const [studio, setStudio] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [fx, setFx] = useState(null);
  const [logoOpen, setLogoOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/settings`, { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      setStudio(d.studio);
      setCanManage(Boolean(d.canManage));
      setFx(d.fx || null);
      setIsOwner(Boolean(d.isOwner));
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // One writer for every row, so a saved value is re-read from the server
  // rather than assumed — the API cleans what it stores.
  const save = useCallback(async (patch) => {
    setError("");
    const res = await fetch(`/api/studios/${slug}/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    if (!res.ok) { setError(t.saveFailed); return false; }
    await load();
    return true;
  }, [slug, load, t]);

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">{t.loading}</p>;
  if (!studio) return <p className={BANNER_BAD}>{t.loadFailed}</p>;

  return (
    <T.Provider value={t}>
    <div className="mx-auto w-full max-w-[640px] py-2">
      <h2 className="font-display text-[1.75rem] font-500 leading-[1.2857] text-slate-900 dark:text-white">{t.title}</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {t.intro(studio.name)}
        {!canManage && t.adminOnly}
      </p>

      {error && <p className={`${BANNER_BAD} mt-4`}>{error}</p>}

      <div className={`${STACK} mt-4`}>
        {/* Logo: icon on the left, the logo itself at the RIGHT end of the row.
            The row borrows Personal info's geometry, but NOT its circle — a
            profile picture is a face and crops well, a company mark does not. */}
        <button
          type="button"
          disabled={!canManage}
          onClick={() => setLogoOpen(true)}
          aria-haspopup="dialog"
          className={`${ROW} ${canManage ? ROW_TAP : "cursor-default"}`}
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
            <Icon name="gallery" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col justify-center">
            <span className={ROW_LABEL}>{t.logo}</span>
            <span className={ROW_VALUE}>
              {studio.logo ? t.logoSet : t.logoDefault}
            </span>
          </span>
          {/* A tile, not a circle: this is a company's mark and it is shown
              WHOLE. Contained rather than cropped, so a wide wordmark keeps both
              ends and the tile's own shape stops mattering. */}
          <span className="ms-auto inline-flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-geex-sm dark:bg-white/5">
            {studio.logo
              /* A stored data URI, so next/image would only get in the way. */
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={studio.logo} alt="" className="h-full w-full object-contain" />
              /* eslint-disable-next-line @next/next/no-img-element */
              : <img src="/brand/logo-icon.png" alt="" className="h-full w-full object-contain" />}
          </span>
        </button>

        {/* Where the studio is. Country and city are also what a new sales
            ticket starts from, so they are the studio's default location and
            not merely a description of it. */}
        <EditRow
          icon="locations" label={t.country} value={studio.country} canManage={canManage}
          onSave={(v) => save({ country: v, ...(v !== studio.country ? { city: "" } : {}) })}
          render={(draft, set) => (
            <Combo value={draft} onChange={set} options={COUNTRIES.map((c) => c.name)} inputClassName={INPUT} />
          )}
        />
        <EditRow
          icon="locations" label={t.city} value={studio.city} canManage={canManage}
          hint={studio.country ? "" : t.cityNeedsCountry}
          onSave={(v) => save({ city: v })}
          render={(draft, set) => (
            <Combo value={draft} onChange={set} options={citiesFor(codeOf(studio.country))} inputClassName={INPUT} />
          )}
        />
        <EditRow
          icon="location" label={t.location} value={studio.location} canManage={canManage}
          onSave={(v) => save({ location: v })}
          render={(draft, set) => (
            <input className={INPUT} value={draft} onChange={(e) => set(e.target.value)} />
          )}
        />

        <EditRow
          icon="cash" label={t.currency} canManage={canManage}
          value={studio.currency
            ? <span className="inline-flex items-center gap-2"><CurrencySymbol code={studio.currency} /> {studio.currency}</span>
            : ""}
          hint={t.currencyUnset}
          onSave={(v) => save({ currency: v })}
          render={(draft, set) => (
            /* The full ExchangeRate-API list, the same vocabulary the
               favourites are picked from — and a real select, because a
               free-typed currency is one nothing can be priced against. */
            <select className={INPUT} value={draft} onChange={(e) => set(e.target.value)}>
              <option value="">{t.currencyNone}</option>
              {CURRENCIES_FROM_EXCHANGE_API.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          )}
        />

        <EditRow
          icon="globe" label={t.language} canManage={canManage}
          value={LANGUAGE_NAMES[studio.language] || LANGUAGE_NAMES.en}
          hint={t.languageHint}
          onSave={(v) => save({ language: v })}
          render={(draft, set) => (
            /* THE STUDIO'S DEFAULT, NOT A CEILING. This sets the language a
               colleague reads the studio in before they have chosen one of
               their own; the header's language menu is the override, and it
               belongs to the person rather than to the company (see
               preferredLocale in shared/locale).

               It stays admin-only because it is still a decision ABOUT the
               studio — it is what everyone who never opens the menu will see,
               which for most people is everyone. */
            <select className={INPUT} value={draft || "en"} onChange={(e) => set(e.target.value)}>
              {locales.map((code) => (
                <option key={code} value={code}>{LANGUAGE_NAMES[code]}</option>
              ))}
            </select>
          )}
        />

        <button
          type="button" disabled={!canManage} onClick={() => setHoursOpen(true)} aria-haspopup="dialog"
          className={`${ROW} ${canManage ? ROW_TAP : "cursor-default"}`}
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
            <Icon name="overtime" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col justify-center">
            <span className={ROW_LABEL}>{t.workingHours}</span>
            <span className={ROW_VALUE}>{hoursSummary(studio.workingHours, t)}</span>
          </span>
          {canManage && <Icon name="chevronRight" className="ms-auto h-5 w-5 shrink-0 text-slate-300 rtl:-scale-x-100 dark:text-slate-600" />}
        </button>
      </div>

      <FavouriteCurrencies
        codes={Array.isArray(studio.favoriteCurrencies) ? studio.favoriteCurrencies : []}
        base={studio.currency || ""}
        fx={fx}
        canManage={canManage}
        onSave={save}
      />

      <LegalInfo
        rows={Array.isArray(studio.legalInfo) ? studio.legalInfo : []}
        canManage={canManage}
        onSave={save}
      />

      {/* Its own fetch/save cycle against the dedicated service-actions route —
          the general settings PUT above no longer accepts `serviceActions` at
          all, so this section cannot share the parent's `save`. */}
      <ServiceActions slug={slug} />

      {/* ENDING THE STUDIO. Kept apart from the settings above and framed in red,
          because it is not a setting — it is the end of the thing the settings
          describe. Owner only, and reversible for thirty days. */}
      {isOwner && (
        <div className="mt-8 rounded-geex border border-rose-200 p-5 dark:border-rose-500/30">
          <h3 className="font-display text-base font-700 text-rose-700 dark:text-rose-300">{t.deleteHeading}</h3>
          {studio.deletionRequestedAt ? (
            <>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.deleteScheduled}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Countdown until={studio.deletionFinalisesAt} />
                <button
                  className={BTN}
                  onClick={() => save({ requestDeletion: false })}
                >
                  {t.cancelDeletion}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.deleteLead(studio.name)}</p>
              <button
                className="mt-3 rounded-full bg-rose-600 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-rose-700"
                onClick={() => setConfirmDelete(true)}
              >
                {t.deleteStudio}
              </button>
            </>
          )}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDelete
          name={studio.name}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => { await save({ requestDeletion: true }); setConfirmDelete(false); }}
        />
      )}

      {hoursOpen && (
        <HoursDialog
          slug={slug}
          hours={studio.workingHours || DEFAULT_HOURS}
          onClose={() => setHoursOpen(false)}
          onSaved={load}
        />
      )}

      {logoOpen && (
        <LogoDialog
          slug={slug}
          logo={studio.logo}
          onClose={() => setLogoOpen(false)}
          onSaved={load}
        />
      )}
    </div>
    </T.Provider>
  );
}

// How long is left, counted down live. A date alone ("3 September") makes
// somebody work out whether they still have time; a running clock does not.
function Countdown({ until }) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, Date.parse(until || "") - now);
  if (!Number.isFinite(left)) return null;
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const sec = Math.floor((left % 60000) / 1000);
  return (
    <span className="inline-flex items-baseline gap-1 rounded-full bg-rose-500/10 px-3 py-1.5 font-mono text-sm font-600 tabular-nums text-rose-700 dark:text-rose-300">
      {d}d {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}
      <span className="font-sans text-xs font-500 opacity-70">{t.timeLeft}</span>
    </span>
  );
}

// The alert. It states the thirty days plainly, because that is the part that
// makes the decision reversible and the part somebody needs to have read.
function ConfirmDelete({ name, onClose, onConfirm }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const panelRef = useRef(null);
  useFocusTrap(panelRef, true);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={t.deleteStudio}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div ref={panelRef} className="relative w-full max-w-[480px] overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex">
        <div className="px-6 pt-6">
          <h3 className="font-display text-lg font-700 text-rose-700 dark:text-rose-300">{t.confirmDeleteTitle(name)}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {t.confirmLead}<strong>{t.confirmDays}</strong>{t.confirmRest}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.confirmReversible}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6 pt-5">
          <button
            className="rounded-full bg-rose-600 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
            disabled={busy}
            onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); }}
          >
            {busy ? t.scheduling : t.scheduleDeletion}
          </button>
          <button className={BTN_GHOST} onClick={onClose}>{t.keepStudio}</button>
        </div>
      </div>
    </div>
  );
}

// The studio's legal identity, as PAIRS it names itself — CR number, VAT
// number, whatever its jurisdiction expects. Fixed fields would mean guessing a
// country and being wrong for every other one.
//
// Edited as a whole and saved once, like the working week: this is one block of
// information, and saving it row by row would let it sit half-updated.
function LegalInfo({ rows, canManage, onSave }) {
  const t = useT();
  const [draft, setDraft] = useState(() => (rows.length ? rows.map((r) => ({ ...r })) : [{ key: "", value: "" }]));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (i, patch) => {
    setDraft((d) => d.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    setSaved(false);
  };
  const add = () => { setDraft((d) => [...d, { key: "", value: "" }]); setSaved(false); };
  const remove = (i) => { setDraft((d) => (d.length === 1 ? [{ key: "", value: "" }] : d.filter((_, j) => j !== i))); setSaved(false); };

  async function save() {
    setBusy(true);
    // Blank rows are the form's, not the record's — an empty pair left at the
    // bottom is somewhere to type, not something to store.
    const ok = await onSave({ legalInfo: draft.filter((r) => r.key.trim()) });
    setBusy(false);
    setSaved(ok !== false);
  }

  return (
    <section className="mt-8 rounded-geex border border-slate-200/70 p-5 dark:border-white/10">
      <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{t.legalHeading}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.legalLead}</p>

      <div className="mt-4 space-y-2">
        {draft.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={`${INPUT} sm:w-56`}
              value={row.key}
              disabled={!canManage}
              aria-label={t.legalLabelFor(i + 1)}
              onChange={(e) => set(i, { key: e.target.value })}
            />
            <input
              className={INPUT}
              value={row.value}
              disabled={!canManage}
              aria-label={t.legalValueFor(i + 1)}
              onChange={(e) => set(i, { value: e.target.value })}
            />
            {canManage && (
              <button type="button" aria-label={t.removeNamed(row.key || t.rowNumber(i + 1))}
                className="shrink-0 px-1.5 text-slate-400 transition-colors hover:text-rose-600"
                onClick={() => remove(i)}>×</button>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className={BTN} onClick={save} disabled={busy}>{busy ? t.saving : saved ? t.saved : t.save}</button>
          <button className={BTN_GHOST} onClick={add}>{t.addAnother}</button>
        </div>
      )}
    </section>
  );
}

// SERVICE ACTIONS — the things this company DOES to finish a job (Delivery,
// Installation, Programming, Building, Assembling, …). Seeded from the studio's
// field of work against the market's fixed 25-field × 20-action matrix
// (`@/shared/fieldsOfWork`), not freely typed: an inventory item's Scope is
// chosen from the pool this section edits, and a project's requirement weights
// are keyed to it. This section owns a fetch/save cycle onto the DEDICATED
// `.../settings/service-actions` route — the general settings PUT stopped
// accepting `serviceActions` once that route existed, so sharing the parent
// `save` here would 400 on every change (see the route's own comment).
function ServiceActions({ slug }) {
  const t = useT();
  const [data, setData] = useState(null); // GET body: fieldOfWork, serviceActions, usage, options, canManage…
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // The "Other" free-typed label, edited apart from `data` so typing does not
  // get clobbered by the field-of-work refresh until it is explicitly saved.
  const [otherDraft, setOtherDraft] = useState("");
  const [confirmField, setConfirmField] = useState(null); // { next, added, leaving }
  const [confirmRetire, setConfirmRetire] = useState(null); // { action, count }

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/settings/service-actions`, { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      setData(d);
      setOtherDraft(d.fieldOfWorkOther || "");
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // One writer for both kinds of edit, so a saved pool is always re-read from
  // the server rather than assumed — `nextPool` decides retire-vs-drop, this
  // component does not guess it.
  async function put(patch) {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/settings/service-actions`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    setBusy(false);
    if (!res.ok) { setError(t.saveFailed); return false; }
    const d = await res.json();
    setData(d);
    setOtherDraft(d.fieldOfWorkOther || "");
    return true;
  }

  // Nothing writes yet — the confirm dialog shows what would change first, using
  // the matrix constant locally (no round trip needed to preview it) and `usage`
  // already on hand from the GET.
  function requestFieldChange(next) {
    if (!data || !next || next === data.fieldOfWork) return;
    const nextActive = actionsForField(next);
    const added = nextActive.filter((a) => !data.serviceActions.includes(a));
    const leaving = data.serviceActions
      .filter((a) => !nextActive.includes(a))
      .map((a) => ({ action: a, count: data.usage[a] || 0 }));
    setConfirmField({ next, added, leaving });
  }

  async function confirmFieldChange(otherLabel) {
    if (!confirmField) return;
    const ok = await put({
      fieldOfWork: confirmField.next,
      fieldOfWorkOther: confirmField.next === OTHER_FIELD ? otherLabel : "",
    });
    if (ok) setConfirmField(null);
  }

  function toggleAction(action, checked, count) {
    // Unticking something already relied on asks first — the pool drops it,
    // but an item that already scoped it keeps working either way; the studio
    // just stops being offered it for NEW work, and should know that going in.
    if (checked && count > 0) { setConfirmRetire({ action, count }); return; }
    const next = checked ? data.serviceActions.filter((a) => a !== action) : [...data.serviceActions, action];
    put({ serviceActions: next });
  }

  async function confirmRetireAction() {
    if (!confirmRetire) return;
    const next = data.serviceActions.filter((a) => a !== confirmRetire.action);
    const ok = await put({ serviceActions: next });
    if (ok) setConfirmRetire(null);
  }

  if (loading) {
    // Shaped like the settled section below it — a select-height bar, then a
    // couple of checkbox rows — so the real content does not shift the page
    // when it lands (§ progressive loading).
    return (
      <section className="mt-8 rounded-geex border border-slate-200/70 p-5 dark:border-white/10" aria-busy="true">
        <div className="skel skel-text w-40" />
        <div className="skel skel-text mt-3 w-full" />
        <div className="skel skel-text mt-1 w-2/3" />
        <div className="skel mt-5 h-[52px] w-full rounded-xl" />
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skel skel-text w-full" />)}
        </div>
      </section>
    );
  }
  if (!data) return <p className={`${BANNER_BAD} mt-8`}>{t.actionsLoadFailed}</p>;

  return (
    <section className="mt-8 rounded-geex border border-slate-200/70 p-5 dark:border-white/10">
      <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{t.actionsHeading}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {t.actionsLead}
        {!data.canManage && t.actionsAdminOnly}
      </p>

      {error && <p className={`${BANNER_BAD} mt-3`}>{error}</p>}

      <div className="mt-4">
        <Field
          as="select"
          label={t.industry}
          value={data.fieldOfWork || ""}
          onChange={requestFieldChange}
          disabled={!data.canManage || busy}
          options={[...data.options.fields, OTHER_FIELD]}
        />
      </div>

      {data.fieldOfWork === OTHER_FIELD && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field
            className="min-w-[220px] flex-1"
            label={t.ownLabel}
            value={otherDraft}
            onChange={setOtherDraft}
            disabled={!data.canManage || busy}
          />
          {data.canManage && otherDraft !== (data.fieldOfWorkOther || "") && (
            <button className={BTN_GHOST} disabled={busy} onClick={() => put({ fieldOfWork: OTHER_FIELD, fieldOfWorkOther: otherDraft })}>
              {busy ? t.saving : t.saveLabel}
            </button>
          )}
        </div>
      )}

      <div className="mt-5">
        <p className="text-[11px] font-600 uppercase tracking-wide text-slate-400">{t.standardActions}</p>
        <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {data.options.actions.map((action) => {
            const checked = data.serviceActions.includes(action);
            const count = data.usage[action] || 0;
            return (
              <label
                key={action}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 ${data.canManage ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5" : "cursor-default"}`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-brand-600"
                  checked={checked}
                  disabled={!data.canManage || busy}
                  onChange={() => toggleAction(action, checked, count)}
                />
                <span className="min-w-0 flex-1 truncate">{action}</span>
                {count > 0 && (
                  <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400" title={t.referencedBy(count)}>
                    {count}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {data.retiredServiceActions.length > 0 && (
        <p className="mt-4 text-xs text-slate-400">
          {t.retiredStill}{data.retiredServiceActions.join("، ")}
        </p>
      )}

      {confirmField && (
        <ConfirmFieldChange
          from={data.fieldOfWork}
          to={confirmField.next}
          added={confirmField.added}
          leaving={confirmField.leaving}
          busy={busy}
          onClose={() => setConfirmField(null)}
          onConfirm={confirmFieldChange}
        />
      )}

      {confirmRetire && (
        <ConfirmRetireAction
          action={confirmRetire.action}
          count={confirmRetire.count}
          busy={busy}
          onClose={() => setConfirmRetire(null)}
          onConfirm={confirmRetireAction}
        />
      )}
    </section>
  );
}

// Shown BEFORE a field-of-work change is sent — the pool reseeds from the new
// field's matrix row, so whoever picks it should see what that means before it
// happens rather than discover it afterwards.
function ConfirmFieldChange({ to, added, leaving, busy, onClose, onConfirm }) {
  const t = useT();
  const [otherLabel, setOtherLabel] = useState("");
  const panelRef = useRef(null);
  useFocusTrap(panelRef, true);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={t.changeFieldAria}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div ref={panelRef} className="relative w-full max-w-[480px] overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex">
        <div className="px-6 pt-6">
          <h3 className="font-display text-lg font-700 text-slate-900 dark:text-white">{t.switchTo(to)}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.reseedsFrom(to)}</p>
          {added.length > 0 && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">{t.adds}</strong> {added.join("، ")}
            </p>
          )}
          {leaving.length > 0 && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">{t.leavesPool}</strong>{" "}
              {leaving.map(({ action, count }, i) => (
                <span key={action}>
                  {i > 0 && "، "}
                  {action}
                  {count > 0
                    ? <span className="text-amber-700 dark:text-amber-300">{t.retiredWithCount(count)}</span>
                    : <span className="text-slate-400">{t.unusedRemoved}</span>}
                </span>
              ))}
            </p>
          )}
          {to === OTHER_FIELD && (
            <div className="mt-4">
              <Field label={t.ownLabel} value={otherLabel} onChange={setOtherLabel} />
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6 pt-5">
          <button className={BTN} disabled={busy} onClick={() => onConfirm(otherLabel)}>{busy ? t.saving : t.confirm}</button>
          <button className={BTN_GHOST} onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// Shown before unticking an action still referenced by inventory items — the
// pool edit itself is "soft": the action leaves what new work is offered, but
// nothing already scoped to it changes (`nextPool` retires rather than drops).
function ConfirmRetireAction({ action, count, busy, onClose, onConfirm }) {
  const t = useT();
  const panelRef = useRef(null);
  useFocusTrap(panelRef, true);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={t.retireAria}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div ref={panelRef} className="relative w-full max-w-[440px] overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex">
        <div className="px-6 pt-6">
          <h3 className="font-display text-lg font-700 text-slate-900 dark:text-white">{t.retireTitle(action)}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.retireBody(count)}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6 pt-5">
          <button className={BTN} disabled={busy} onClick={onConfirm}>{busy ? t.saving : t.retire}</button>
          <button className={BTN_GHOST} onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// The currencies this studio actually deals in, picked out of the full
// ExchangeRate-API list in lib/currencies — 166 codes, held as a static
// vocabulary rather than fetched, so the picker opens instantly and works
// offline. Names and countries change about once a decade; RATES are the part
// that moves, and they live elsewhere.
//
// Only CODES are stored. A saved list never goes stale when a name changes, and
// a code the vocabulary does not know is dropped on the way in rather than kept
// as a label nobody can price against.
function FavouriteCurrencies({ codes, base, fx, canManage, onSave }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(codes);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef(null);
  useFocusTrap(panelRef, open);

  const results = useMemo(() => searchCurrencies(query).slice(0, 60), [query]);
  const has = (code) => picked.includes(code);
  const toggle = (code) =>
    setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));

  async function save() {
    setBusy(true);
    const ok = await onSave({ favoriteCurrencies: picked });
    setBusy(false);
    if (ok !== false) setOpen(false);
  }

  return (
    <section className="mt-8 rounded-geex border border-slate-200/70 p-5 dark:border-white/10">
      <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{t.favHeading}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {t.favLeadPrefix}{base
          ? <><CurrencySymbol code={base} /> {base}</>
          : t.favStudioCurrency}.
      </p>

      {/* ONE ROW PER CURRENCY, each showing what one unit of the studio's own
          money buys. Chips side by side said which currencies mattered but not
          what they were worth, which is the thing somebody opens this to see. */}
      {codes.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{t.favNone}</p>
      ) : !base ? (
        <p className="mt-3 text-sm text-slate-400">{t.favNeedsBase}</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
          {codes.map((code) => {
            const rate = fx?.rates?.[code];
            return (
              <li key={code} className="flex items-center gap-3 py-2.5">
                <span className="w-14 shrink-0 font-mono text-xs font-700 text-slate-700 dark:text-slate-200">{code}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">{currencyOf(code).name}</span>
                <span className="shrink-0 text-sm tabular-nums text-slate-500 dark:text-slate-400">
                  {code === base ? (
                    <span className="text-slate-400">{t.favBase}</span>
                  ) : rate == null ? (
                    <span className="text-slate-400">{t.favNoRate}</span>
                  ) : (
                    <>
                      1 <CurrencySymbol code={base} /> ={" "}
                      <span className="font-600 text-slate-700 dark:text-slate-200">{fmtRate(rate)}</span>{" "}
                      <CurrencySymbol code={code} />
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {base && fx?.updatedAt > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          {t.ratesAsOf(fmtDate(fx.updatedAt * 1000))}
          {fx.stale ? t.ratesStale : "."}
        </p>
      )}

      {canManage && (
        <button className={`${BTN_GHOST} mt-4`} onClick={() => { setPicked(codes); setQuery(""); setOpen(true); }}>
          {codes.length ? t.changeChoice : t.chooseCurrencies}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t.favHeading}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div ref={panelRef} className="relative flex max-h-[80vh] w-full max-w-[520px] flex-col overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex">
            <div className="flex items-center gap-3 px-6 pt-5">
              <h4 className="font-display text-lg font-700 text-slate-900 dark:text-white">{t.favHeading}</h4>
              <button type="button" onClick={() => setOpen(false)} aria-label={t.close}
                className="ms-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:hover:bg-white/5">
                <Icon name="close" className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="px-6 pt-3">
              {/* Code, name OR country — somebody looking for the riyal may know
                  any of the three. */}
              <input className={INPUT} value={query} autoFocus
                aria-label={t.searchCurrencies} onChange={(e) => setQuery(e.target.value)} />
              <p className="mt-2 text-xs text-slate-400">
                {t.chosenAvailable(picked.length, CURRENCIES_FROM_EXCHANGE_API.length)}
              </p>
            </div>
            <ul className="mt-3 flex-1 overflow-y-auto px-6">
              {results.length === 0 && <li className="py-6 text-center text-sm text-slate-400">{t.noMatches}</li>}
              {results.map((c) => (
                <li key={c.code}>
                  <label className="flex cursor-pointer items-center gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-white/5">
                    <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={has(c.code)} onChange={() => toggle(c.code)} />
                    <span className="w-12 shrink-0 font-mono text-xs font-700 text-slate-700 dark:text-slate-200">{c.code}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{c.name}</span>
                    <span className="hidden shrink-0 text-xs text-slate-400 sm:block">{c.country}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4 dark:border-white/10">
              <button className={BTN} onClick={save} disabled={busy}>{busy ? t.saving : t.save}</button>
              <button className={BTN_GHOST} onClick={() => setOpen(false)}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// A row that edits ONE value in place. Pressing it opens the editor beneath the
// label rather than in a dialog: these are single fields, and a modal for one
// field is more ceremony than the change deserves.
function EditRow({ icon, label, value, canManage, hint, onSave, render }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [busy, setBusy] = useState(false);

  function start() { setDraft(value || ""); setOpen(true); }
  async function commit() {
    setBusy(true);
    const ok = await onSave(String(draft || "").trim());
    setBusy(false);
    if (ok !== false) setOpen(false);
  }

  if (open) {
    return (
      <div className={`${ROW} flex-col items-stretch`}>
        <div className="flex w-full items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
            <Icon name={icon} className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
          </span>
          <span className={ROW_LABEL}>{label}</span>
        </div>
        <div className="mt-3 w-full ps-[52px]">
          {render(draft, setDraft)}
          <div className="mt-3 flex gap-3">
            <button className={BTN} onClick={commit} disabled={busy}>{busy ? t.saving : t.save}</button>
            <button className={BTN_GHOST} onClick={() => setOpen(false)}>{t.cancel}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button type="button" disabled={!canManage} onClick={start}
      className={`${ROW} ${canManage ? ROW_TAP : "cursor-default"}`}>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
        <Icon name={icon} className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className={ROW_LABEL}>{label}</span>
        <span className={ROW_VALUE}>{value || hint || t.notSet}</span>
      </span>
      {canManage && <Icon name="chevronRight" className="ms-auto h-5 w-5 shrink-0 text-slate-300 rtl:-scale-x-100 dark:text-slate-600" />}
    </button>
  );
}

// Seven days, each with its own switch and span. Edited as a whole and saved
// once: a week is one decision, and saving day by day would let the record sit
// half-changed.
function HoursDialog({ slug, hours, onClose, onSaved }) {
  const t = useT();
  const [draft, setDraft] = useState(() => structuredClone(hours));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const panelRef = useRef(null);
  useFocusTrap(panelRef, true);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const set = (day, patch) => setDraft((d) => ({ ...d, [day]: { ...d[day], ...patch } }));

  async function save() {
    setBusy(true); setErr("");
    const res = await fetch(`/api/studios/${slug}/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workingHours: draft }),
    });
    setBusy(false);
    if (!res.ok) { setErr(t.hoursSaveFailed); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t.workingHours}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div ref={panelRef} className="relative w-full max-w-[520px] overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex">
        <div className="flex items-center gap-3 px-6 pt-5">
          <h3 className="font-display text-lg font-700 text-slate-900 dark:text-white">{t.workingHours}</h3>
          <button type="button" onClick={onClose} aria-label={t.close}
            className="ms-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:hover:bg-white/5">
            <Icon name="close" className="h-[18px] w-[18px]" />
          </button>
        </div>
        <p className="px-6 pt-1 text-sm text-slate-500 dark:text-slate-400">{t.hoursLead}</p>

        <div className="max-h-[52vh] space-y-2 overflow-y-auto px-6 py-5">
          {DAYS.map((key) => {
            const name = t.dayNames[key];
            const row = draft[key] || { open: false, from: "09:00", to: "17:00" };
            return (
              <div key={key} className="flex items-center gap-3">
                <button
                  type="button" role="switch" aria-checked={row.open} aria-label={name}
                  onClick={() => set(key, { open: !row.open })}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${row.open ? "bg-brand-600" : "bg-slate-200 dark:bg-white/15"}`}
                >
                  {/* START AND END, NOT LEFT AND RIGHT. A toggle's knob sits at
                      the START when off and the END when on, and in Arabic that
                      is the other way round on the screen. Pinned to `left-` it
                      read inverted in an RTL studio — off looking on — which is
                      the worst way for a switch to be wrong. `end-0.5` also
                      retires the magic 22px, which was the 44px track minus the
                      20px knob minus the offset. */}
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${row.open ? "end-0.5" : "start-0.5"}`} />
                </button>
                <span className="w-24 shrink-0 text-sm font-500 text-slate-900 dark:text-white">{name}</span>
                {row.open ? (
                  <span className="flex items-center gap-2">
                    <input type="time" className={`${INPUT} w-28`} value={row.from} onChange={(e) => set(key, { from: e.target.value })} aria-label={t.fromLabel(name)} />
                    <span className="text-slate-400">–</span>
                    <input type="time" className={`${INPUT} w-28`} value={row.to} onChange={(e) => set(key, { to: e.target.value })} aria-label={t.toLabel(name)} />
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">{t.closed}</span>
                )}
              </div>
            );
          })}
        </div>

        {err && <p className={`${BANNER_BAD} mx-6 mb-4`}>{err}</p>}

        <div className="flex gap-3 px-6 pb-6">
          <button className={BTN} onClick={save} disabled={busy}>{busy ? t.saving : t.saveHours}</button>
          <button className={BTN_GHOST} onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// The same dialog shape as the account hub's profile picture: a large preview,
// Change, and Remove.
function LogoDialog({ slug, logo, onClose, onSaved }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);
  const panelRef = useRef(null);
  useFocusTrap(panelRef, true);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  async function save(value) {
    const res = await fetch(`/api/studios/${slug}/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logo: value }),
    });
    if (!res.ok) throw new Error("save");
  }

  async function upload(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr(t.pickImage); return; }
    if (file.size > 2 * 1024 * 1024) { setErr(t.imageTooBig); return; }
    setBusy(true); setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      const up = await fetch("/api/media", { method: "POST", body: form });
      const media = await up.json().catch(() => ({}));
      if (!up.ok || !media.url) throw new Error(media.error || "upload");
      await save(media.url);
      onSaved(); onClose();
    } catch { setErr(t.uploadFailed); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setErr("");
    try { await save(""); onSaved(); onClose(); }
    catch { setErr(t.removeFailed); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t.logo}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div ref={panelRef} className="relative w-full max-w-[512px] overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex">
        <div className="flex items-center gap-3 px-6 pt-5">
          <h3 className="font-display text-lg font-700 text-slate-900 dark:text-white">{t.logo}</h3>
          <button type="button" onClick={onClose} aria-label={t.close}
            className="ms-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:hover:bg-white/5">
            <Icon name="close" className="h-[18px] w-[18px]" />
          </button>
        </div>
        <p className="px-6 pt-1 text-sm text-slate-500 dark:text-slate-400">{t.logoLead}</p>

        {/* A WIDE frame, because the preview has to tell the truth about how the
            logo will sit: contained and whole. A square preview would quietly
            imply the mark gets cropped to one. */}
        <div className="flex justify-center px-6 py-6">
          <span className="inline-flex h-[136px] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-geex border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            {logo
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={logo} alt="" className="h-full w-full object-contain" />
              /* eslint-disable-next-line @next/next/no-img-element */
              : <img src="/brand/logo-icon.png" alt="" className="h-full w-full object-contain opacity-70" />}
          </span>
        </div>

        {err && <p className={`${BANNER_BAD} mx-6 mb-4`}>{err}</p>}

        <div className="flex flex-wrap justify-center gap-3 px-6">
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" className={BTN} disabled={busy} onClick={() => fileRef.current?.click()}>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="camera" className="h-4 w-4" /> {busy ? t.uploading : t.change}
            </span>
          </button>
          <button type="button" className={BTN_GHOST} disabled={busy || !logo} onClick={remove}
            title={logo ? "" : t.noLogoToRemove}>
            {t.remove}
          </button>
        </div>
        <p className="px-6 pb-6 pt-4 text-center text-xs text-slate-400">{t.logoFormats}</p>
      </div>
    </div>
  );
}
