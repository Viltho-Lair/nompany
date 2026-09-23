"use client";

// THE COUNTER'S SETTINGS (17/09/2026) — its tills, whether shelf prices include
// tax, and the line printed at the foot of every receipt. Moved here from a
// dialog on the till, under a right of its own (`pos.settings`). The settings
// are still stored on the till's own section row, where the till reads them.

import { useCallback, useEffect, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { posDeptDict } from "@/shared/studio/posDept";
import { posDict } from "@/shared/studio/pos";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { Field } from "@/components/fields/Field";
import { panel, h2, btn, btnGhost, btnRow, btnRowDanger, fmtDateTime } from "@/components/studio2/ui";

// THE EDITABLE COPY OF THE TERMS, taken once from the first answer — by the
// loader and by `initial` alike, so the two cannot seed different forms.
const formFor = (body) => ({
  pricesIncludeTax: Boolean(body.terms.pricesIncludeTax), footer: body.terms.footer || "",
  // Blank means no limit, and saves as null so an emptied box lifts the cap.
  maxDiscountPercent: body.terms.maxDiscountPercent ?? "",
  // HOW SOON "ENDING SOON" IS on the offers screen. Here rather than on the
  // studio because nothing outside Point of Sale reads it (the owner's
  // rule, 22/09/2026: a setting several sections share is the studio's).
  promotionExpiryWarningDays: body.terms.promotionExpiryWarningDays ?? "",
});

// `initial` is the /pos/settings body the studio page answered in its own
// render, so the tills and terms paint at once; absent, it fetches on mount as
// before.
export default function StudioPosSettings({ slug, initial }) {
  const locale = useStudioLocale();
  const tr = posDeptDict(locale);
  const till = posDict(locale);
  const [data, setData] = useState(initial ?? null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [form, setForm] = useState(() => (initial ? formFor(initial) : null));

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/pos/settings`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
    setForm((f) => f || formFor(body));
  }, [slug, setForm]);

  // The loader the page already answered for is skipped by IDENTITY, not by a
  // flag, so React's development double-effect cannot spend it (useReload says
  // why); a new slug builds a new loader and fetches as before.
  const skip = useRef(initial !== undefined ? load : null);
  useEffect(() => {
    if (load === skip.current) return;
    let current = true;
    (async () => { if (current) await load(); })();
    return () => { current = false; };
  }, [load]);
  useLiveUpdates(slug, "crm-sales-pos", load);

  const call = async (path, method, body) => {
    setBusy(true); setNote(""); setError("");
    try {
      const res = await fetch(`/api/studios/${slug}/pos${path}`, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { setError(till.refusal(out.error || "", out)); return null; }
      await load();
      return out;
    } finally { setBusy(false); }
  };

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error === "forbidden" ? tr.refused : error}</p>;
  if (!data || !form) return <ScreenSkeleton loadingLabel={tr.loading} />;
  const canEdit = Boolean(data.can?.edit);

  return (
    <div className="space-y-5">
      {!canEdit && <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">{tr.readOnly}</p>}
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      {note && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{note}</p>}

      <section className={panel}>
        <h2 className={h2}>{tr.tills}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {tr.tillsLead} {till.notATillLead}
          {data.maxTills ? <span className="ms-1 font-600">{till.tillLimit(data.maxTills)}</span> : null}
        </p>
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
          {data.terminals.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className={t.active === false ? "text-slate-400 line-through" : "font-600 text-[var(--geex-ink)]"}>
                  {t.code ? <span className="me-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-700 dark:bg-white/10">{t.code}</span> : null}
                  {t.name}
                </span>
                {t.active === false && <span className="ms-2 text-xs">{tr.retired}</span>}
                {data.thisDevice === t.id && (
                  <span className="ms-2 rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-600 text-brand-700 dark:text-brand-300">{till.thisDevice}</span>
                )}
                {t.active !== false && (
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {t.paired ? till.pairedTo(t.paired.label, fmtDateTime(t.paired.at)) : till.notPaired}
                  </span>
                )}
              </span>
              {canEdit && (
                <span className="flex shrink-0 flex-wrap gap-1.5">
                  {/* PAIRING IS DONE FROM THE DEVICE ITSELF: this button pairs
                      the computer it is clicked on. Unpairing works from anywhere. */}
                  {t.active !== false && data.thisDevice !== t.id && (
                    <button type="button" className={btnRow} disabled={busy}
                      onClick={() => call("/terminals/pair", "POST", { id: t.id })}>{till.pairThisDevice}</button>
                  )}
                  {t.active !== false && t.paired && (
                    <button type="button" className={btnRowDanger} disabled={busy}
                      onClick={() => call("/terminals/pair", "DELETE", { id: t.id })}>{till.unpair}</button>
                  )}
                  {t.active === false
                    ? <button type="button" className={btnRow} disabled={busy}
                        onClick={() => call("/terminals", "PUT", { id: t.id, name: t.name, code: t.code, active: true })}>{tr.reactivate}</button>
                    : <button type="button" className={btnRowDanger} disabled={busy}
                        onClick={() => call("/terminals", "PUT", { id: t.id, name: t.name, code: t.code, active: false })}>{till.retire}</button>}
                </span>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="w-32"><Field label={till.tillCode} value={code} onChange={(v) => setCode(String(v).toUpperCase())} /></div>
            <div className="min-w-[10rem] flex-1"><Field label={till.tillName} value={name} onChange={setName} /></div>
            <button type="button" className={btnGhost} disabled={busy || !name.trim()}
              onClick={async () => { if (await call("/terminals", "POST", { name: name.trim(), code: code.trim() })) { setName(""); setCode(""); } }}>
              {till.addTill}
            </button>
          </div>
        )}
      </section>

      <section className={panel}>
        <h2 className={h2}>{tr.pricing}</h2>
        <label className="mt-4 flex items-start gap-3 text-sm">
          <input type="checkbox" disabled={!canEdit} checked={form.pricesIncludeTax}
            onChange={(e) => setForm((f) => ({ ...f, pricesIncludeTax: e.target.checked }))}
            className="mt-1 h-4 w-4 accent-brand-600" />
          <span>
            <span className="font-600 text-[var(--geex-ink)]">{till.pricesIncludeTax}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">{till.pricesIncludeTaxHint}</span>
          </span>
        </label>
        <div className="mt-4 max-w-xl">
          <Field label={till.footer} value={form.footer} disabled={!canEdit} hint={till.footerHint}
            onChange={(v) => setForm((f) => ({ ...f, footer: v }))} />
          <Field label={till.maxDiscount} type="number" min="0" max="100" value={form.maxDiscountPercent} disabled={!canEdit}
            hint={till.maxDiscountHint} onChange={(v) => setForm((f) => ({ ...f, maxDiscountPercent: v }))} />
          <Field label={till.expiryWarning} type="number" min="0" max="365" value={form.promotionExpiryWarningDays}
            disabled={!canEdit} hint={till.expiryWarningHint}
            onChange={(v) => setForm((f) => ({ ...f, promotionExpiryWarningDays: v }))} />
        </div>
        {canEdit && (
          <button type="button" className={`${btn} mt-5`} disabled={busy}
            onClick={async () => { if (await call("", "PUT", form)) setNote(tr.saved); }}>
            {till.save}
          </button>
        )}
      </section>
    </div>
  );
}
