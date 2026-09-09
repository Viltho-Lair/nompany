"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { builderDict } from "@/shared/studio/builder";
import { useReload } from "@/components/studio2/useReload";

// THE REPORT BUILDER — a question a studio writes itself.
//
// Exporting gives you the whole collection and every declared column, which
// answers "get me the data" and nothing else. What an ERP is bought for is
// narrower: overdue invoices by client, this quarter's bills over a limit,
// projects by status with their values totalled. Before this the answer was a
// spreadsheet somebody kept by hand.
//
// IT VALIDATES NOTHING ITSELF. `modules/reports/query` decides what a spec may
// name — every column, filter and grouping is checked against the data set's
// own declared columns — and this shows what came back.
export default function ReportBuilderPanel({ slug, locale = "en" }) {
  const tr = builderDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [spec, setSpec] = useState({
    dataset: "", columns: [], filters: [], groupBy: "", aggregate: "count", aggregateColumn: "", limit: 200,
  });
  const [result, setResult] = useState(null);
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/reports/builder`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setData(body);
    setSpec((s) => (s.dataset ? s : { ...s, dataset: body.datasets?.[0]?.key || "" }));
  }, [slug, setData, setSpec, setProblem]);

  useReload(load);

  const send = useCallback(async (payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/reports/builder`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || body.error || "failed"); return null; }
    return body;
  }, [slug, setBusy, setProblem]);

  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const { datasets = [], reports = [], targets = [] } = data;
  const chosen = datasets.find((d) => d.key === spec.dataset) || null;
  const cols = chosen?.columns || [];

  const toggle = (key) => setSpec((s) => ({
    ...s,
    columns: s.columns.includes(key) ? s.columns.filter((c) => c !== key) : [...s.columns, key],
  }));

  return (
    <div className="space-y-6">
      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      {/* ---- targets, first, because they are the thing to act on --------- */}
      {targets.length > 0 && (
        <section className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
          <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.targets}</h3>
          <ul className="mt-2 space-y-1">
            {targets.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-700 dark:text-slate-200">{t.label}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{t.reportLabel}</span>
                <span className="num ms-auto text-slate-600 dark:text-slate-300">
                  {/* NULL IS NOT ZERO. A report that measured nothing this
                      period is not a breach and not a pass. */}
                  {t.measured === null ? "—" : t.measured} / {t.value}
                </span>
                <span className={`w-24 text-end text-xs font-600 ${
                  t.state === "breached" ? "text-rose-600 dark:text-rose-300"
                    : t.state === "warning" ? "text-amber-600 dark:text-amber-300"
                      : t.state === "unknown" ? "text-slate-400 dark:text-slate-500"
                        : "text-emerald-600 dark:text-emerald-300"}`}>
                  {tr.state(t.state)}
                </span>
                <button
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-500"
                  disabled={busy}
                  onClick={async () => { if (await send({ action: "deleteTarget", id: t.id })) await load(); }}
                >
                  {tr.remove}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- the saved list ---------------------------------------------- */}
      <section className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.saved}</h3>
        {reports.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.noSaved}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-700 dark:text-slate-200">{r.label}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{r.dataset}</span>
                <button
                  className="ms-auto rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
                  disabled={busy}
                  onClick={async () => {
                    const res = await fetch(`/api/studios/${slug}/reports/builder?run=${encodeURIComponent(r.id)}`);
                    const body = await res.json().catch(() => ({}));
                    if (!res.ok) { setProblem(body.error || "failed"); return; }
                    setSpec(body.spec); setResult(body); setLabel(body.label);
                  }}
                >
                  {tr.run}
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
                  onClick={() => setTarget({ label: r.label, reportId: r.id, direction: "atLeast", value: "" })}
                >
                  {tr.setTarget}
                </button>
                <button
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-500"
                  disabled={busy}
                  onClick={async () => { if (await send({ action: "delete", id: r.id })) await load(); }}
                >
                  {tr.remove}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- a target on a saved report ----------------------------------- */}
      {target && (
        <section className="rounded-geex border border-brand-200 p-4 dark:border-brand-400/30">
          <div className="flex flex-wrap items-end gap-2">
            <Field label={tr.targetName} required className="w-full sm:w-56"
              value={target.label} onChange={(v) => setTarget({ ...target, label: v })} />
            {/* A FLOOR AND A CEILING ARE THE SAME RULE FROM OPPOSITE SIDES. */}
            <Field label={tr.direction} as="select" className="w-full sm:w-44"
              value={target.direction} onChange={(v) => setTarget({ ...target, direction: v })}
              options={[{ value: "atLeast", label: tr.atLeast }, { value: "atMost", label: tr.atMost }]} />
            <Field label={tr.value} type="number" className="w-full sm:w-32"
              value={target.value} onChange={(v) => setTarget({ ...target, value: v })} />
            <button
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
              disabled={busy || !target.label.trim() || target.value === ""}
              onClick={async () => {
                const done = await send({ action: "target", ...target, value: Number(target.value) });
                if (done) { setTarget(null); await load(); }
              }}
            >
              {tr.save}
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300"
              onClick={() => { setTarget(null); setProblem(""); }}
            >
              {tr.cancel}
            </button>
          </div>
        </section>
      )}

      {/* ---- the builder -------------------------------------------------- */}
      <section className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.build}</h3>

        {datasets.length === 0 ? (
          // A READER WHO MAY OPEN NO REGISTER SEES NO DATA SETS, which is the
          // truthful answer rather than a refusal — the export screen makes the
          // same choice.
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.nothingToBuildOn}</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Field label={tr.dataset} as="select" className="w-full sm:w-56"
                value={spec.dataset}
                onChange={(v) => { setSpec({ ...spec, dataset: v, columns: [], filters: [], groupBy: "", aggregateColumn: "" }); setResult(null); }}
                options={datasets.map((d) => ({ value: d.key, label: `${d.group} · ${d.label}` }))} />
              <Field label={tr.groupBy} as="select" className="w-full sm:w-44"
                value={spec.groupBy} onChange={(v) => setSpec({ ...spec, groupBy: v })}
                options={[{ value: "", label: tr.noGrouping },
                  ...cols.map((c) => ({ value: c.key, label: c.label }))]} />
              {spec.groupBy && (
                <>
                  <Field label={tr.aggregate} as="select" className="w-full sm:w-36"
                    value={spec.aggregate} onChange={(v) => setSpec({ ...spec, aggregate: v })}
                    options={["count", "sum", "avg", "min", "max"].map((a) => ({ value: a, label: tr.agg(a) }))} />
                  {spec.aggregate !== "count" && (
                    <Field label={tr.of} as="select" className="w-full sm:w-40"
                      value={spec.aggregateColumn} onChange={(v) => setSpec({ ...spec, aggregateColumn: v })}
                      options={[{ value: "", label: "" }, ...cols.map((c) => ({ value: c.key, label: c.label }))]} />
                  )}
                </>
              )}
            </div>

            {/* NO COLUMNS CHOSEN MEANS EVERY COLUMN, which is what a first-time
                reader expects and what the export already does. */}
            <div className="mt-3 flex flex-wrap gap-1">
              {cols.map((c) => (
                <button
                  key={c.key}
                  onClick={() => toggle(c.key)}
                  className={`rounded-lg px-2 py-1 text-xs ${
                    spec.columns.length === 0 || spec.columns.includes(c.key)
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                      : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* ---- filters ------------------------------------------------ */}
            <div className="mt-3 space-y-2">
              {spec.filters.map((f, i) => (
                <div key={`${f.column}-${i}`} className="flex flex-wrap items-end gap-2">
                  <Field label={tr.where} as="select" className="w-full sm:w-40"
                    value={f.column}
                    onChange={(v) => setSpec({ ...spec, filters: spec.filters.map((x, k) => k === i ? { ...x, column: v } : x) })}
                    options={cols.map((c) => ({ value: c.key, label: c.label }))} />
                  <Field label={tr.is} as="select" className="w-full sm:w-36"
                    value={f.op}
                    onChange={(v) => setSpec({ ...spec, filters: spec.filters.map((x, k) => k === i ? { ...x, op: v } : x) })}
                    options={["eq", "ne", "contains", "gt", "gte", "lt", "lte", "empty", "notEmpty"]
                      .map((o) => ({ value: o, label: tr.op(o) }))} />
                  {f.op !== "empty" && f.op !== "notEmpty" && (
                    <Field label={tr.valueLabel} className="w-full sm:w-40"
                      value={f.value || ""}
                      onChange={(v) => setSpec({ ...spec, filters: spec.filters.map((x, k) => k === i ? { ...x, value: v } : x) })} />
                  )}
                  <button
                    className="rounded-lg px-2 py-2 text-xs text-slate-400 hover:text-rose-500"
                    onClick={() => setSpec({ ...spec, filters: spec.filters.filter((_, k) => k !== i) })}
                  >
                    {tr.remove}
                  </button>
                </div>
              ))}
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
                disabled={cols.length === 0}
                onClick={() => setSpec({ ...spec, filters: [...spec.filters, { column: cols[0].key, op: "eq", value: "" }] })}
              >
                {tr.addFilter}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-2">
              <button
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
                disabled={busy || !spec.dataset}
                onClick={async () => {
                  const body = await send({ action: "preview", spec });
                  if (body) setResult(body);
                }}
              >
                {tr.runIt}
              </button>
              <Field label={tr.saveAs} className="w-full sm:w-56"
                value={label} onChange={(v) => setLabel(v)} />
              <button
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-600 text-slate-700 disabled:opacity-50 dark:border-white/15 dark:text-slate-200"
                disabled={busy || !label.trim() || !spec.dataset}
                onClick={async () => {
                  const body = await send({ action: "save", label, spec });
                  if (body) { setLabel(""); await load(); }
                }}
              >
                {tr.save}
              </button>
            </div>
          </>
        )}
      </section>

      {/* ---- the answer --------------------------------------------------- */}
      {result && (
        <section className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {tr.matched(result.matched)}
            {/* A CAPPED LIST THAT DOES NOT SAY SO is read as complete. */}
            {result.truncated ? ` · ${tr.truncated}` : ""}
          </p>
          <div className="mt-2 overflow-x-auto">
            {result.groups ? (
              <table className="w-full text-sm">
                <tbody>
                  {result.groups.map((g) => (
                    <tr key={g.key} className="border-t border-slate-100 dark:border-white/5">
                      <td className="py-1.5 pe-3 text-slate-700 dark:text-slate-200">{g.label}</td>
                      <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">
                        {g.value === null ? "—" : g.value}
                      </td>
                      {/* HOW MANY ROWS THE FIGURE COVERED, beside it: an average
                          over three of ten is a real average of a different
                          population. */}
                      <td className="num py-1.5 text-end text-xs text-slate-400 dark:text-slate-500">{tr.rows(g.rows)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {result.columns.map((c) => <th key={c.key} className="py-1 pe-3 text-start">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-white/5">
                      {result.columns.map((c) => (
                        <td key={c.key} className="py-1.5 pe-3 text-slate-600 dark:text-slate-300">
                          {String(r[c.key] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
