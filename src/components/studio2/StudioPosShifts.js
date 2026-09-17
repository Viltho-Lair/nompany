"use client";

// EVERY DRAWER THAT WAS OPENED (17/09/2026) — the Point of Sale department's
// shift history. A closed shift shows the report stored when it was closed,
// never one recomputed since; an open one shows what it has taken so far, and
// says so. `docs/functionality/pos.md` is the file.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useStudioLocale } from "@/components/studio2/locale";
import { posDeptDict } from "@/shared/studio/posDept";
import { posDict } from "@/shared/studio/pos";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { Field } from "@/components/fields/Field";
import { panel, th, btn, btnGhost, btnRow, Dialog, money, fmtDateTime } from "@/components/studio2/ui";
import { StatusPill } from "@/components/studio2/StatusPill";
import { PRINT_CSS, ShiftReport, PeriodPicker, usePosPeriod, rangeQuery } from "@/components/studio2/posParts";

const td = "py-2.5 pe-3 align-middle";

export default function StudioPosShifts({ slug }) {
  const locale = useStudioLocale();
  const tr = posDeptDict(locale);
  const till = posDict(locale);
  const period = usePosPeriod("month");
  const [terminalIds, setTerminalIds] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const query = rangeQuery(period.range, { terminalIds });

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/pos/shifts?${query}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || "failed"); return; }
    setError("");
    setData({ query, ...body });
  }, [slug, query]);

  useEffect(() => {
    let current = true;
    (async () => { if (current) await load(); })();
    return () => { current = false; };
  }, [load]);
  useLiveUpdates(slug, "crm-sales-pos", load);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error === "forbidden" ? tr.refused : error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { shifts = [], tills = [], terms = {}, can = {} } = data;
  const cur = terms.currency || "";
  const verdict = (d) => (d == null ? "" : d > 0 ? tr.over : d < 0 ? tr.short : tr.exact);

  return (
    <div className={`space-y-5 ${data.query !== query ? "opacity-60" : ""}`}>
      {open && <style>{PRINT_CSS}</style>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PeriodPicker tr={tr} value={period} />
        <div className="w-56">
          <Field label={tr.till} as="select" value={terminalIds} onChange={setTerminalIds}
            options={[{ value: "", label: tr.all }, ...tills.map((t) => ({ value: t.id, label: t.name }))]} />
        </div>
      </div>

      <section className={panel}>
        {shifts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{tr.noShifts}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className={`${th} text-start`}>{tr.shift}</th>
                  <th className={`${th} text-start`}>{tr.till}</th>
                  <th className={`${th} text-start`}>{tr.opened}</th>
                  <th className={`${th} text-start`}>{tr.closed}</th>
                  <th className={`${th} text-end`}>{tr.salesCount}</th>
                  <th className={`${th} text-end`}>{tr.takings}{cur ? ` (${cur})` : ""}</th>
                  <th className={`${th} text-end`}>{tr.expected}</th>
                  <th className={`${th} text-end`}>{tr.difference}</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => {
                  const r = s.report || {};
                  const closed = s.status === "Closed";
                  return (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                      <td className={td}>
                        <span className="font-mono text-xs font-600 text-[var(--geex-ink)]">{s.number}</span>
                        <span className="ms-2"><StatusPill status={s.status} label={tr.status[s.status] || s.status} /></span>
                      </td>
                      <td className={td}>{s.till || "—"}</td>
                      <td className={`${td} text-slate-500 dark:text-slate-400`}>
                        {fmtDateTime(s.openedAt)}
                        <span className="block text-xs">{s.openedBy || "—"}</span>
                      </td>
                      <td className={`${td} text-slate-500 dark:text-slate-400`}>
                        {closed ? (
                          <>
                            {fmtDateTime(s.closedAt)}
                            <span className="block text-xs">{s.closedBy || "—"}</span>
                          </>
                        ) : <span className="text-xs">{tr.runningNow}</span>}
                      </td>
                      <td className={`${td} num text-end`}>{r.sales ?? 0}</td>
                      <td className={`${td} num text-end font-600 text-[var(--geex-ink)]`}>{money(r.total || 0, cur)}</td>
                      <td className={`${td} num text-end`}>{money(r.expectedCash || 0, cur)}</td>
                      <td className={`${td} num text-end ${r.difference < 0 ? "text-rose-600 dark:text-rose-400" : r.difference > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                        {closed && r.difference != null ? `${money(r.difference, cur)} ${verdict(r.difference)}` : "—"}
                      </td>
                      <td className={`${td} whitespace-nowrap text-end`}>
                        {closed && <button type="button" className={btnRow} onClick={() => setOpen(s)}>{tr.viewReport}</button>}
                        {can.sales && (
                          <Link className={`${btnRow} ms-1`} href={`/${slug}/pos-sales?shiftIds=${encodeURIComponent(s.id)}`}>{tr.viewSales}</Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <Dialog title={`${till.report} ${open.number}`} onClose={() => setOpen(null)} width="max-w-[420px]">
          <ShiftReport tr={till} shift={open} report={open.report} studio={{ name: data.studioName || "" }}
            currency={cur} tillName={open.till} />
          <div className="mt-4 flex gap-2">
            <button type="button" className={btn} onClick={() => window.print()}>{tr.print}</button>
            <button type="button" className={btnGhost} onClick={() => setOpen(null)}>{tr.close}</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
