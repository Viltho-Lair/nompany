"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { productionDict } from "@/shared/studio/production";
import { useStudioLocale } from "@/components/studio2/locale";
import { useReload } from "@/components/studio2/useReload";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";

// PRODUCTION PLANNING — the screen that joins four registers that never met.
//
// Manufacturing shipped as work orders, bills of materials, work stations and
// production batches, each holding its own rows and meeting none of the others:
// a BOM's components were one long text field, so nothing could explode a
// demand out of it, and a work order's `station` was a string nothing compared
// against a station's own capacity. This is the join, and the join is the
// feature — see `modules/manufacturing/mrp` for the arithmetic and the two
// limitations it states out loud.
export default function StudioProduction({ slug }) {
  const locale = useStudioLocale();
  const tr = productionDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [bomId, setBomId] = useState("");
  const [draft, setDraft] = useState({ itemId: "", qtyPer: "" });

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/manufacturing/planning`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setData(body);
    setBomId((b) => b || body.boms?.[0]?.id || "");
  }, [slug, setData, setBomId, setProblem]);

  useReload(load);
  // THE ROWS ARE WRITTEN UNDER `manufacturing` — the BOM lines on the root, and
  // every engine register beneath it — so the root is the watch key, and
  // LiveProvider fans an event out to the watchers of every ancestor of its
  // section (invariant 14).
  useLiveUpdates(slug, "manufacturing", load);

  const send = useCallback(async (method, payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/manufacturing/planning`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || body.error || "failed"); return false; }
    await load();
    return true;
  }, [slug, load, setBusy, setProblem]);

  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const {
    requirements = [], noBom = [], noQuantity = [], stations = [], unstationed = [],
    items = [], boms = [], lines = [],
  } = data;
  const itemLabel = Object.fromEntries(items.map((i) => [i.id, i.label]));
  const mine = lines.filter((l) => l.bomId === bomId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{tr.title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      </div>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      {/* ---- what has to be bought --------------------------------------- */}
      <section className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.requirements}</h3>
        {requirements.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.nothingRequired}</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="py-1 pe-3 text-start">{tr.item}</th>
                  <th className="py-1 pe-3 text-end">{tr.needed}</th>
                  <th className="py-1 pe-3 text-end">{tr.onHand}</th>
                  <th className="py-1 pe-3 text-end">{tr.onOrder}</th>
                  <th className="py-1 text-end">{tr.short}</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((r) => (
                  <tr key={r.itemId} className="border-t border-slate-100 dark:border-white/5">
                    <td className="py-1.5 pe-3 text-slate-700 dark:text-slate-200">
                      {r.itemLabel}{r.unit ? ` (${r.unit})` : ""}
                    </td>
                    <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{r.gross}</td>
                    <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{r.onHand}</td>
                    <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{r.onOrder}</td>
                    {/* A SURPLUS IS NOT A NEGATIVE SHORTFALL — nought is the
                        honest answer, and the surplus is readable from the two
                        columns beside it. */}
                    <td className={`num py-1.5 text-end font-600 ${
                      r.shortfall > 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-400 dark:text-slate-500"}`}>
                      {r.shortfall > 0 ? r.shortfall : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORTED, NOT SKIPPED. A requirement nobody can see is worse than a
            requirement nobody has, because the buyer believes the list is
            complete. */}
        {noBom.length > 0 && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {tr.noBom}: {noBom.map((o) => o.product || o.title).join(", ")}
          </p>
        )}
        {noQuantity.length > 0 && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {tr.noQuantity}: {noQuantity.map((o) => o.title || o.product).join(", ")}
          </p>
        )}
      </section>

      {/* ---- can the shop take it? ---------------------------------------- */}
      <section className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.capacity}</h3>
        {stations.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.noStations}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {stations.map((s) => (
              <li key={s.stationId} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-700 dark:text-slate-200">{s.name}</span>
                <span className="num ms-auto text-slate-600 dark:text-slate-300">{tr.load(s.load)}</span>
                {/* AN UNRATED STATION SAYS SO. "We do not know how long this
                    takes" is a third answer, and dividing by nought to avoid
                    saying it would print Infinity on a shop-floor screen. */}
                <span className={`w-24 text-end text-xs ${
                  s.over ? "text-rose-600 dark:text-rose-300" : "text-slate-400 dark:text-slate-500"}`}>
                  {s.days === null ? tr.unrated : tr.days(s.days)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {unstationed.length > 0 && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {tr.unstationed}: {unstationed.map((o) => `${o.title || o.id} → ${o.station}`).join(", ")}
          </p>
        )}
      </section>

      {/* ---- the lines that make the explosion possible -------------------- */}
      <section className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.bomLines}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.bomLinesLead}</p>

        {boms.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.noBoms}</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Field label={tr.bom} as="select" className="w-full sm:w-64"
                value={bomId} onChange={(v) => setBomId(v)}
                options={boms.map((b) => ({
                  value: b.id,
                  label: b.revision ? `${b.product} · ${b.revision}` : b.product,
                }))} />
            </div>

            {mine.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.noLines}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {mine.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-700 dark:text-slate-200">{itemLabel[l.itemId] || l.itemId}</span>
                    <span className="num ms-auto text-slate-600 dark:text-slate-300">{tr.per(l.qtyPer)}</span>
                    <button
                      className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-500"
                      disabled={busy}
                      onClick={() => send("DELETE", { id: l.id })}
                    >
                      {tr.remove}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {items.length > 0 && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Field label={tr.component} as="select" className="w-full sm:w-64"
                  value={draft.itemId} onChange={(v) => setDraft({ ...draft, itemId: v })}
                  options={[{ value: "", label: "" },
                    ...items.map((i) => ({ value: i.id, label: i.label }))]} />
                <Field label={tr.perUnit} type="number" className="w-full sm:w-28"
                  value={draft.qtyPer} onChange={(v) => setDraft({ ...draft, qtyPer: v })} />
                <button
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
                  disabled={busy || !draft.itemId || !(Number(draft.qtyPer) > 0)}
                  onClick={async () => {
                    const done = await send("POST", { bomId, itemId: draft.itemId, qtyPer: Number(draft.qtyPer) });
                    if (done) setDraft({ itemId: "", qtyPer: "" });
                  }}
                >
                  {tr.addLine}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
