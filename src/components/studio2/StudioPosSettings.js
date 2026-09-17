"use client";

// THE COUNTER'S SETTINGS (17/09/2026) — its tills, whether shelf prices include
// tax, and the line printed at the foot of every receipt. Moved here from a
// dialog on the till, under a right of its own (`pos.settings`). The settings
// are still stored on the till's own section row, where the till reads them.

import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { posDeptDict } from "@/shared/studio/posDept";
import { posDict } from "@/shared/studio/pos";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { Field } from "@/components/fields/Field";
import { panel, h2, btn, btnGhost, btnRow, btnRowDanger } from "@/components/studio2/ui";

export default function StudioPosSettings({ slug }) {
  const locale = useStudioLocale();
  const tr = posDeptDict(locale);
  const till = posDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/pos/settings`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
    setForm((f) => f || { pricesIncludeTax: Boolean(body.terms.pricesIncludeTax), footer: body.terms.footer || "" });
  }, [slug]);

  useEffect(() => {
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
      if (!res.ok) { setError(till.errors?.[out.error] || out.error || "failed"); return null; }
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
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.tillsLead}</p>
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
          {data.terminals.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className={t.active === false ? "text-slate-400 line-through" : "font-600 text-[var(--geex-ink)]"}>
                {t.name}
                {t.active === false && <span className="ms-2 text-xs no-underline">{tr.retired}</span>}
              </span>
              {canEdit && (t.active === false
                ? <button type="button" className={btnRow} disabled={busy}
                    onClick={() => call("/terminals", "PUT", { id: t.id, name: t.name, active: true })}>{tr.reactivate}</button>
                : <button type="button" className={btnRowDanger} disabled={busy}
                    onClick={() => call("/terminals", "PUT", { id: t.id, name: t.name, active: false })}>{till.retire}</button>)}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="mt-4 flex items-end gap-2">
            <div className="flex-1"><Field label={till.tillName} value={name} onChange={setName} /></div>
            <button type="button" className={btnGhost} disabled={busy || !name.trim()}
              onClick={async () => { if (await call("/terminals", "POST", { name: name.trim() })) setName(""); }}>
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
