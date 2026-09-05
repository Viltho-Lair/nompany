// THE RATE LIBRARY — what the studio charges for a unit of work.
//
// A register in its own right rather than a panel on a tender, because the
// point of keeping one is that it outlives any single bid: the next estimate
// starts from what the last one worked out instead of re-inventing it.
//
// APPLIED BY COPY. A rate put on a bill is copied onto that line and the
// library row is only remembered for provenance — so editing a rate here
// changes what the NEXT bid starts from and reprices nothing already written.
// The screen says so, because the opposite assumption is the dangerous one.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { tenderingDict } from "@/shared/studio/tendering";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, microLabel, Empty, Dialog, money } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

export default function StudioRates({ slug }) {
  const tr = tenderingDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/tendering/rates`, { cache: "no-store" });
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, []);

  useEffect(() => {
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [read, apply]);

  const reload = useCallback(async () => { apply(await read()); }, [read, apply]);
  useLiveUpdates(slug, reload);

  const send = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/tendering/rates`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      // `duplicate` is the one refusal worth a sentence: a library with two
      // rows for one code makes every reference to that code ambiguous.
      setError(out.error === "duplicate" ? tr.duplicateCode : (out.error || "failed"));
      return false;
    }
    await reload();
    return true;
  }, [slug, reload, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingRates} />;

  const rates = data.rates || [];
  // Grouped by category in the order the sorted list presents them, so a long
  // library can be scanned by trade rather than read end to end.
  const byCategory = [];
  for (const r of rates) {
    const name = (r.category || "").trim() || tr.uncategorised;
    const last = byCategory[byCategory.length - 1];
    if (last && last.name === name) last.rows.push(r);
    else byCategory.push({ name, rows: [r] });
  }

  const openForm = (row) => setForm(row ? { ...row } : { code: "", description: "", unit: "", rate: "", category: "", notes: "" });

  const saveForm = async () => {
    const payload = {
      code: form.code, description: form.description, unit: form.unit,
      rate: Number(form.rate) || 0, category: form.category, notes: form.notes,
    };
    const done = form.id ? await send("PUT", { ...payload, id: form.id }) : await send("POST", payload);
    if (done) setForm(null);
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.rates}</h2>
          <p className={sub}>{tr.ratesSub}</p>
        </div>
        {data.canCreate && <button type="button" className={btn} onClick={() => openForm(null)}>{tr.addRate}</button>}
      </div>

      {rates.length === 0 ? <Empty title={tr.noRatesYet} body={tr.noRatesBody} /> : (
        <div className="space-y-4">
          {byCategory.map((group) => (
            <section key={group.name} className={panel}>
              <p className={microLabel}>{group.name}</p>
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/5">
                {group.rows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                    <span className="min-w-0">
                      <span className="font-mono text-xs text-slate-400">{r.code}</span>
                      <span className="ms-2 font-600 text-slate-900 dark:text-white">{r.description}</span>
                      {r.notes && <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">{r.notes}</span>}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="num text-sm font-600 text-slate-900 dark:text-white">
                        {money(r.rate)}{r.unit && <span className="ms-1 text-xs font-400 text-slate-400">/{r.unit}</span>}
                      </span>
                      {data.canEdit && (
                        <button type="button" className={btnGhost} onClick={() => openForm(r)}>{tr.edit}</button>
                      )}
                      {data.canDelete && (
                        <button type="button" className={btnGhost} disabled={busy}
                          onClick={() => send("DELETE", { id: r.id })}>{tr.deleteLine}</button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {form && (
        <Dialog
          title={form.id ? tr.editRate : tr.addRate}
          // SAID WHERE IT MATTERS. Somebody editing a rate is entitled to assume
          // it might reprice open bids, and it does not — the reassurance
          // belongs on the dialog that raises the question.
          description={form.id ? tr.editingARateRepricesNothing : undefined}
          onClose={() => setForm(null)}
          width="max-w-[620px]"
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[10rem,1fr]">
              <Field label={tr.rateCode} required value={form.code || ""}
                onChange={(v) => setForm((f) => ({ ...f, code: v }))} inputProps={{ maxLength: 40 }} />
              <Field label={tr.rateDescription} required value={form.description || ""}
                onChange={(v) => setForm((f) => ({ ...f, description: v }))} inputProps={{ maxLength: 500 }} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={tr.rateAmount} type="number" value={form.rate ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, rate: v }))} inputProps={{ min: "0", step: "0.01" }} />
              <Field label={tr.colUnit} value={form.unit || ""}
                onChange={(v) => setForm((f) => ({ ...f, unit: v }))} inputProps={{ maxLength: 24 }} />
              <Field label={tr.rateCategory} value={form.category || ""}
                onChange={(v) => setForm((f) => ({ ...f, category: v }))} inputProps={{ maxLength: 120 }} />
            </div>
            <Field label={tr.notes} as="textarea" value={form.notes || ""}
              onChange={(v) => setForm((f) => ({ ...f, notes: v }))} inputProps={{ maxLength: 1000 }} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn}
                disabled={busy || !form.code?.trim() || !form.description?.trim()}
                onClick={saveForm}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
