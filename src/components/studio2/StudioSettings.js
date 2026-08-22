"use client";

import { CURRENCIES_FROM_EXCHANGE_API, searchCurrencies, currency as currencyOf, fmtRate } from "@/shared/currencies";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio2/icons";
import Combo from "@/components/studio2/Combo";
import { COUNTRIES } from "@/shared/countries";
import { citiesFor } from "@/lib/cities";
import { CurrencySymbol } from "@/components/Currency";
import { locales } from "@/shared/locale";
import { fmtDate } from "@/lib/format";

// EACH NAMED IN ITSELF. A picker that says "Arabic" to somebody looking for
// العربية is a picker they have to already read English to use.
const LANGUAGE_NAMES = { en: "English", ar: "العربية" };

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
  "flex min-h-[56px] w-full items-center gap-3 rounded-[4px] bg-white px-4 py-3 text-start dark:bg-[#20202c] first:rounded-t-[20px] last:rounded-b-[20px]";
const ROW_TAP = "transition-colors hover:bg-slate-50 dark:hover:bg-white/5";
const ROW_LABEL = "text-base font-500 leading-normal text-slate-900 dark:text-white";
const ROW_VALUE = "truncate text-sm leading-[1.4286] text-slate-500 dark:text-slate-400";
const BTN = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const BTN_GHOST = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
// The currencies a studio is likely to price in. Free text is still allowed —
// the list is a shortcut, not a restriction.
const DAYS = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]];
const DEFAULT_HOURS = Object.fromEntries(DAYS.map(([d]) => [d, { open: !["fri", "sat"].includes(d), from: "09:00", to: "17:00" }]));
// citiesFor keys on the ISO code while the stored answer is a country NAME.
const codeOf = (name) => COUNTRIES.find((c) => c.name === name)?.code || "";
const hoursSummary = (h) => {
  if (!h) return "Not set";
  const open = DAYS.filter(([d]) => h[d]?.open);
  if (open.length === 0) return "Closed every day";
  const [, first] = open[0];
  const same = open.every(([d]) => h[d].from === h[open[0][0]].from && h[d].to === h[open[0][0]].to);
  const span = h[open[0][0]];
  return same
    ? `${open.length} day${open.length === 1 ? "" : "s"} · ${span.from}–${span.to}`
    : `${open.length} days · varies`;
};

const BANNER_BAD = "rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300";

export default function StudioSettings({ slug }) {
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
    if (!res.ok) { setError("That didn't save."); return false; }
    await load();
    return true;
  }, [slug, load]);

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading settings…</p>;
  if (!studio) return <p className={BANNER_BAD}>We couldn&apos;t load this studio&apos;s settings.</p>;

  return (
    <div className="mx-auto w-full max-w-[640px] py-2">
      <h2 className="font-display text-[1.75rem] font-500 leading-[1.2857] text-slate-900 dark:text-white">Studio settings</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        How {studio.name} appears to everyone working in it.
        {!canManage && " Only an admin can change these."}
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
            <span className={ROW_LABEL}>Studio logo</span>
            <span className={ROW_VALUE}>
              {studio.logo
                ? "Shown at the top of this studio, and on its card in every member's account"
                : "Using the nompany mark — the default for a new studio"}
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
          icon="locations" label="Country" value={studio.country} canManage={canManage}
          onSave={(v) => save({ country: v, ...(v !== studio.country ? { city: "" } : {}) })}
          render={(draft, set) => (
            <Combo value={draft} onChange={set} options={COUNTRIES.map((c) => c.name)} placeholder="Saudi Arabia" inputClassName={INPUT} />
          )}
        />
        <EditRow
          icon="locations" label="City" value={studio.city} canManage={canManage}
          hint={studio.country ? "" : "Choose a country first."}
          onSave={(v) => save({ city: v })}
          render={(draft, set) => (
            <Combo value={draft} onChange={set} options={citiesFor(codeOf(studio.country))} placeholder="Riyadh" inputClassName={INPUT} />
          )}
        />
        <EditRow
          icon="location" label="Location" value={studio.location} canManage={canManage}
          onSave={(v) => save({ location: v })}
          render={(draft, set) => (
            <input className={INPUT} value={draft} onChange={(e) => set(e.target.value)} placeholder="Address, or a map link" />
          )}
        />

        <EditRow
          icon="cash" label="Currency" canManage={canManage}
          value={studio.currency
            ? <span className="inline-flex items-center gap-2"><CurrencySymbol code={studio.currency} /> {studio.currency}</span>
            : ""}
          hint="Not set — amounts show without one."
          onSave={(v) => save({ currency: v })}
          render={(draft, set) => (
            /* The full ExchangeRate-API list, the same vocabulary the
               favourites are picked from — and a real select, because a
               free-typed currency is one nothing can be priced against. */
            <select className={INPUT} value={draft} onChange={(e) => set(e.target.value)}>
              <option value="">— not set —</option>
              {CURRENCIES_FROM_EXCHANGE_API.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          )}
        />

        <EditRow
          icon="globe" label="Language" canManage={canManage}
          value={LANGUAGE_NAMES[studio.language] || LANGUAGE_NAMES.en}
          hint="Everyone in this studio reads it in this language."
          onSave={(v) => save({ language: v })}
          render={(draft, set) => (
            /* ONE LANGUAGE PER COMPANY, not per person. A studio's records, its
               documents and its vocabulary are shared, and half a studio in
               Arabic is a studio whose people cannot read each other's work.
               Changing it also flips the layout — see the note on lang/dir in
               StudioFrame — so it sits behind the same right as everything else
               on this screen. */
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
            <span className={ROW_LABEL}>Working hours</span>
            <span className={ROW_VALUE}>{hoursSummary(studio.workingHours)}</span>
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

      {/* ENDING THE STUDIO. Kept apart from the settings above and framed in red,
          because it is not a setting — it is the end of the thing the settings
          describe. Owner only, and reversible for thirty days. */}
      {isOwner && (
        <div className="mt-8 rounded-geex border border-rose-200 p-5 dark:border-rose-500/30">
          <h3 className="font-display text-base font-700 text-rose-700 dark:text-rose-300">Delete this studio</h3>
          {studio.deletionRequestedAt ? (
            <>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Scheduled for deletion. Everything keeps working until then, and cancelling
                undoes it completely.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Countdown until={studio.deletionFinalisesAt} />
                <button
                  className={BTN}
                  onClick={() => save({ requestDeletion: false })}
                >
                  Cancel deletion
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Deleting {studio.name} removes it for everyone in it, along with every
                section, ticket and record inside.
              </p>
              <button
                className="mt-3 rounded-full bg-rose-600 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-rose-700"
                onClick={() => setConfirmDelete(true)}
              >
                Delete studio
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
  );
}

// How long is left, counted down live. A date alone ("3 September") makes
// somebody work out whether they still have time; a running clock does not.
function Countdown({ until }) {
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
      <span className="font-sans text-xs font-500 opacity-70">left</span>
    </span>
  );
}

// The alert. It states the thirty days plainly, because that is the part that
// makes the decision reversible and the part somebody needs to have read.
function ConfirmDelete({ name, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label="Delete studio">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-geex bg-white shadow-geex dark:bg-[#20202c]">
        <div className="px-6 pt-6">
          <h3 className="font-display text-lg font-700 text-rose-700 dark:text-rose-300">Delete {name}?</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Deletion of this studio will take <strong>30 days</strong> to finalise. Until then
            nothing changes — everyone keeps their access and all of its work stays where it is.
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            You can cancel at any point in those 30 days and the studio carries on as if you
            had never asked.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6 pt-5">
          <button
            className="rounded-full bg-rose-600 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
            disabled={busy}
            onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); }}
          >
            {busy ? "Scheduling…" : "Schedule deletion"}
          </button>
          <button className={BTN_GHOST} onClick={onClose}>Keep the studio</button>
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
      <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">Legal information</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Whatever this studio has to state about itself — registration number, VAT number,
        licence. Each one is a label and what it says.
      </p>

      <div className="mt-4 space-y-2">
        {draft.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={`${INPUT} sm:w-56`}
              value={row.key}
              disabled={!canManage}
              placeholder="CR number"
              aria-label={`Legal information label ${i + 1}`}
              onChange={(e) => set(i, { key: e.target.value })}
            />
            <input
              className={INPUT}
              value={row.value}
              disabled={!canManage}
              placeholder="1010XXXXXX"
              aria-label={`Legal information value ${i + 1}`}
              onChange={(e) => set(i, { value: e.target.value })}
            />
            {canManage && (
              <button type="button" aria-label={`Remove ${row.key || `row ${i + 1}`}`}
                className="shrink-0 px-1.5 text-slate-400 transition-colors hover:text-rose-600"
                onClick={() => remove(i)}>×</button>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className={BTN} onClick={save} disabled={busy}>{busy ? "Saving…" : saved ? "Saved" : "Save"}</button>
          <button className={BTN_GHOST} onClick={add}>Add another</button>
        </div>
      )}
    </section>
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(codes);
  const [busy, setBusy] = useState(false);

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
      <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">Favourite currencies</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        The few this studio deals in, each against {base
          ? <><CurrencySymbol code={base} /> {base}</>
          : "the studio currency"}.
      </p>

      {/* ONE ROW PER CURRENCY, each showing what one unit of the studio's own
          money buys. Chips side by side said which currencies mattered but not
          what they were worth, which is the thing somebody opens this to see. */}
      {codes.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">None chosen yet.</p>
      ) : !base ? (
        <p className="mt-3 text-sm text-slate-400">
          Set the studio currency above and these will show an exchange rate against it.
        </p>
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
                    <span className="text-slate-400">base</span>
                  ) : rate == null ? (
                    <span className="text-slate-400">no rate today</span>
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
          Rates as of {fmtDate(fx.updatedAt * 1000)}
          {fx.stale ? " — today's refresh hasn't landed yet." : "."}
        </p>
      )}

      {canManage && (
        <button className={`${BTN_GHOST} mt-4`} onClick={() => { setPicked(codes); setQuery(""); setOpen(true); }}>
          {codes.length ? "Change" : "Choose currencies"}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Favourite currencies">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[80vh] w-full max-w-[520px] flex-col overflow-hidden rounded-geex bg-white shadow-geex dark:bg-[#20202c]">
            <div className="flex items-center gap-3 px-6 pt-5">
              <h4 className="font-display text-lg font-700 text-slate-900 dark:text-white">Favourite currencies</h4>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"
                className="ms-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">
                <Icon name="close" className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="px-6 pt-3">
              {/* Code, name OR country — somebody looking for the riyal may know
                  any of the three. */}
              <input className={INPUT} value={query} autoFocus placeholder="Search code, name or country"
                aria-label="Search currencies" onChange={(e) => setQuery(e.target.value)} />
              <p className="mt-2 text-xs text-slate-400">
                {picked.length} chosen · {CURRENCIES_FROM_EXCHANGE_API.length} available
              </p>
            </div>
            <ul className="mt-3 flex-1 overflow-y-auto px-6">
              {results.length === 0 && <li className="py-6 text-center text-sm text-slate-400">Nothing matches that.</li>}
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
              <button className={BTN} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
              <button className={BTN_GHOST} onClick={() => setOpen(false)}>Cancel</button>
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
            <button className={BTN} onClick={commit} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            <button className={BTN_GHOST} onClick={() => setOpen(false)}>Cancel</button>
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
        <span className={ROW_VALUE}>{value || hint || "Not set"}</span>
      </span>
      {canManage && <Icon name="chevronRight" className="ms-auto h-5 w-5 shrink-0 text-slate-300 rtl:-scale-x-100 dark:text-slate-600" />}
    </button>
  );
}

// Seven days, each with its own switch and span. Edited as a whole and saved
// once: a week is one decision, and saving day by day would let the record sit
// half-changed.
function HoursDialog({ slug, hours, onClose, onSaved }) {
  const [draft, setDraft] = useState(() => structuredClone(hours));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

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
    if (!res.ok) { setErr("We couldn't save those hours."); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Working hours">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-geex bg-white shadow-geex dark:bg-[#20202c]">
        <div className="flex items-center gap-3 px-6 pt-5">
          <h3 className="font-display text-lg font-700 text-slate-900 dark:text-white">Working hours</h3>
          <button type="button" onClick={onClose} aria-label="Close"
            className="ms-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">
            <Icon name="close" className="h-[18px] w-[18px]" />
          </button>
        </div>
        <p className="px-6 pt-1 text-sm text-slate-500 dark:text-slate-400">
          The days and hours this studio works. Turn a day off to mark it closed.
        </p>

        <div className="max-h-[52vh] space-y-2 overflow-y-auto px-6 py-5">
          {DAYS.map(([key, name]) => {
            const row = draft[key] || { open: false, from: "09:00", to: "17:00" };
            return (
              <div key={key} className="flex items-center gap-3">
                <button
                  type="button" role="switch" aria-checked={row.open} aria-label={name}
                  onClick={() => set(key, { open: !row.open })}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${row.open ? "bg-brand-600" : "bg-slate-200 dark:bg-white/15"}`}
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
                    <input type="time" className={`${INPUT} w-28`} value={row.from} onChange={(e) => set(key, { from: e.target.value })} aria-label={`${name} from`} />
                    <span className="text-slate-400">–</span>
                    <input type="time" className={`${INPUT} w-28`} value={row.to} onChange={(e) => set(key, { to: e.target.value })} aria-label={`${name} to`} />
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">Closed</span>
                )}
              </div>
            );
          })}
        </div>

        {err && <p className={`${BANNER_BAD} mx-6 mb-4`}>{err}</p>}

        <div className="flex gap-3 px-6 pb-6">
          <button className={BTN} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save hours"}</button>
          <button className={BTN_GHOST} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// The same dialog shape as the account hub's profile picture: a large preview,
// Change, and Remove.
function LogoDialog({ slug, logo, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

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
    if (!file.type.startsWith("image/")) { setErr("Choose an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setErr("Images must be 2 MB or smaller."); return; }
    setBusy(true); setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      const up = await fetch("/api/media", { method: "POST", body: form });
      const media = await up.json().catch(() => ({}));
      if (!up.ok || !media.url) throw new Error(media.error || "upload");
      await save(media.url);
      onSaved(); onClose();
    } catch { setErr("We couldn't upload that logo."); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setErr("");
    try { await save(""); onSaved(); onClose(); }
    catch { setErr("We couldn't remove that logo."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Studio logo">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-[512px] overflow-hidden rounded-geex bg-white shadow-geex dark:bg-[#20202c]">
        <div className="flex items-center gap-3 px-6 pt-5">
          <h3 className="font-display text-lg font-700 text-slate-900 dark:text-white">Studio logo</h3>
          <button type="button" onClick={onClose} aria-label="Close"
            className="ms-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">
            <Icon name="close" className="h-[18px] w-[18px]" />
          </button>
        </div>
        <p className="px-6 pt-1 text-sm text-slate-500 dark:text-slate-400">
          Stands at the top of this studio in place of the nompany mark, and on the studio&apos;s
          card in the account of everyone who works in it.
        </p>

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
              <Icon name="camera" className="h-4 w-4" /> {busy ? "Uploading…" : "Change"}
            </span>
          </button>
          <button type="button" className={BTN_GHOST} disabled={busy || !logo} onClick={remove}
            title={logo ? "" : "No logo to remove"}>
            Remove
          </button>
        </div>
        <p className="px-6 pb-6 pt-4 text-center text-xs text-slate-400">JPG, PNG or WebP, up to 2 MB.</p>
      </div>
    </div>
  );
}
