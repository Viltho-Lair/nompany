"use client";

import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useCallback, useState } from "react";
import { writeOffsDict } from "@/shared/studio/writeOffs";
import { useReload } from "@/components/studio2/useReload";
import { panel, sub, Empty, fmtDate } from "@/components/studio2/ui";
import { useMoney } from "@/components/studio2/studioCurrency";
import { Field } from "@/components/fields/Field";
import { writeXlsx } from "@/shared/xlsxWrite";

// WHAT WAS WRITTEN OFF — damaged, expired, lost, counted short.
//
// IT FETCHES ITS OWN DATA, the way the valuation, bin and batch tabs do: the
// report reads every movement the studio has made, and the Inventory payload
// every screen opens with should not carry it.
//
// IT COMPUTES NOTHING. `writeOffReport` (modules/inventory/writeOffs, pure)
// decides what counts, what it was worth and which period it falls in — in the
// studio's own time, which a browser's clock is not. This draws what came back.

const th = "px-3 py-2 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const td = "px-3 py-2.5";

export default function WriteOffsPanel({ slug, locale = "en", currency = "" }) {
  const money = useMoney();
  const tr = writeOffsDict(locale);
  const [period, setPeriod] = useState("month");
  // DAYS SOMEBODY CHOSE. Either end may be left open; the server swaps ends
  // typed the wrong way round and answers with the days it actually used.
  const [range, setRange] = useState({ from: "", to: "" });
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ONE QUERY for the screen and for the export, so the spreadsheet is the
  // period on screen and never a second idea of it.
  const query = period === "custom"
    ? `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
    : `period=${encodeURIComponent(period)}`;

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/inventory/write-offs?${query}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body) { setProblem(true); return; }
    setProblem(false);
    setData(body);
  }, [slug, query, setData, setProblem]);

  useReload(load);

  if (problem && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{tr.failed}</p>;
  if (!data) return <ScreenSkeleton />;

  const { entries = 0, total = 0, unvalued = 0, estimated = 0, byCause = [], byItem = [], rows = [], shown = rows.length } = data;
  // THE WORKBOOK IS BUILT HERE from a second read that asks for EVERY row: the
  // screen lists the newest three hundred, and a spreadsheet that stopped
  // there would not add up to its own total. Money is written as NUMBERS, so
  // the columns can be summed; an unvalued write-off is an empty cell, not 0.
  async function exportExcel() {
    setExporting(true);
    const res = await fetch(`/api/studios/${slug}/inventory/write-offs?${query}&rows=all`, { cache: "no-store" });
    const all = await res.json().catch(() => null);
    setExporting(false);
    if (!res.ok || !all) { setProblem(true); return; }
    const rtl = locale === "ar";
    const span = all.from || all.to ? `${all.from || "…"} → ${all.to || "…"}` : tr.allTime;
    const sheets = [
      {
        name: tr.sheetSummary, header: true, rtl,
        rows: [
          [tr.period, span],
          [tr.total, all.total],
          [tr.entries, all.entries],
          ...(all.unvalued > 0 ? [[tr.unvalued(all.unvalued)]] : []),
          ...(all.estimated > 0 ? [[tr.estimated(all.estimated)]] : []),
          [],
          [tr.reason, tr.entries, tr.value],
          ...all.byCause.map((c) => [tr.causes[c.cause] || tr.causes[""], c.entries, c.value]),
          [tr.totalRow, all.entries, all.total],
        ],
        columns: [{ width: 28, text: true }, { width: 16 }, { width: 16 }],
      },
      {
        name: tr.sheetItems, header: true, rtl,
        rows: [
          [tr.sku, tr.item, tr.quantity, tr.unit, tr.entries, tr.value],
          ...all.byItem.map((i) => [i.sku, i.name || tr.removedItem, i.units, i.unit, i.entries, i.value]),
        ],
        columns: [{ width: 16, text: true }, { width: 36, text: true }, { width: 12 }, { width: 10, text: true }, { width: 12 }, { width: 16 }],
      },
      {
        name: tr.sheetRows, header: true, rtl,
        rows: [
          [tr.date, tr.time, tr.sku, tr.item, tr.reason, tr.note, tr.quantity, tr.unit, tr.value, tr.estimatedColumn, tr.by],
          ...all.rows.map((r) => [
            r.day, String(r.at || "").slice(11, 16), r.sku, r.name || tr.removedItem,
            tr.causes[r.cause] || tr.causes[""], noteOf(r), r.units, r.unit,
            r.value == null ? "" : r.value, r.estimated ? tr.yes : "", r.byAlias || tr.someone,
          ]),
        ],
        columns: [{ width: 12, text: true }, { width: 8, text: true }, { width: 16, text: true }, { width: 32, text: true },
          { width: 16, text: true }, { width: 36, text: true }, { width: 10 }, { width: 8, text: true }, { width: 14 },
          { width: 20, text: true }, { width: 18, text: true }],
      },
    ];
    const url = URL.createObjectURL(new Blob([writeXlsx(sheets)],
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url; a.download = tr.exportFile(all.from, all.to); a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const amount = (n) => (n == null ? <span className="text-slate-400">—</span> : money(n, currency));
  // THE NOTE WITHOUT THE REASON IN FRONT OF IT. The Adjust dialog stores
  // "Damaged: fell off the shelf" so the movement list reads on its own; here
  // the reason has a column, and saying it twice is noise.
  const noteOf = (r) => {
    const text = String(r.reason || "");
    const label = [writeOffsDict("en"), writeOffsDict("ar")].map((d) => d.causes[r.cause]).find((l) => l && text.startsWith(l));
    return label ? text.slice(label.length).replace(/^:\s*/, "") : text;
  };

  return (
    <div className="space-y-5">
      <p className={sub}>{tr.lead}</p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex flex-wrap rounded-full border border-slate-200 p-0.5 dark:border-white/15">
          {["month", "last-month", "year", "all", "custom"].map((p) => (
            <button key={p} type="button" aria-pressed={period === p}
              // Custom opens on the days already on screen, so choosing it
              // changes nothing until a day is changed.
              onClick={() => { if (p === "custom" && period !== "custom") setRange({ from: data.from || "", to: data.to || "" }); setPeriod(p); }}
              className={`rounded-full px-4 py-1.5 text-sm font-600 transition-colors ${period === p ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>
              {p === "custom" ? tr.custom : tr.periods[p]}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <>
            <Field label={tr.from} type="date" className="w-44" value={range.from} onChange={(v) => setRange((r) => ({ ...r, from: v }))} />
            <Field label={tr.to} type="date" className="w-44" value={range.to} onChange={(v) => setRange((r) => ({ ...r, to: v }))} />
          </>
        )}
        {entries > 0 && (
          <button type="button" disabled={exporting} onClick={exportExcel}
            className="ms-auto rounded-full border border-slate-200 px-4 py-2 text-sm font-600 text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5">
            {exporting ? tr.exporting : tr.exportExcel}
          </button>
        )}
      </div>

      {entries === 0 ? (
        <Empty title={tr.nothing} body={tr.nothingBody} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={panel}>
              <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.total}</p>
              <p className="num mt-1 font-display text-2xl font-800 text-slate-900 dark:text-white">{amount(total)}</p>
            </div>
            <div className={panel}>
              <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.entries}</p>
              <p className="num mt-1 font-display text-2xl font-800 text-slate-900 dark:text-white">{entries}</p>
            </div>
          </div>

          {/* WHAT THE TOTAL LEAVES OUT, AND WHAT IN IT IS AN ESTIMATE — said,
              not folded in. */}
          {(unvalued > 0 || estimated > 0) && (
            <div className="space-y-1 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              {unvalued > 0 && <p>{tr.unvalued(unvalued)}</p>}
              {estimated > 0 && <p>{tr.estimated(estimated)}</p>}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <section className={`${panel} p-0`}>
              <p className="px-3 pt-3 text-sm font-700 text-slate-900 dark:text-white">{tr.byCause}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    <th className={`${th} text-start`}>{tr.reason}</th>
                    <th className={`${th} text-end`}>{tr.entries}</th>
                    <th className={`${th} text-end`}>{tr.value}</th>
                  </tr>
                </thead>
                <tbody>
                  {byCause.map((c) => (
                    <tr key={c.cause || "other"} className="border-t border-slate-100 dark:border-white/5">
                      <td className={`${td} font-600 text-slate-900 dark:text-white`}>{tr.causes[c.cause] || tr.causes[""]}</td>
                      <td className={`${td} num text-end text-slate-600 dark:text-slate-300`}>{c.entries}</td>
                      <td className={`${td} num text-end text-slate-900 dark:text-white`}>{amount(c.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={`${panel} p-0`}>
              <p className="px-3 pt-3 text-sm font-700 text-slate-900 dark:text-white">{tr.byItem}</p>
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5">
                      <th className={`${th} text-start`}>{tr.item}</th>
                      <th className={`${th} text-end`}>{tr.quantity}</th>
                      <th className={`${th} text-end`}>{tr.value}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byItem.map((i) => (
                      <tr key={i.itemId} className="border-t border-slate-100 dark:border-white/5">
                        <td className={td}>
                          {i.sku && <span className="font-mono text-xs text-slate-400">{i.sku}</span>}
                          <span dir="auto" className={`${i.sku ? "ms-2 " : ""}font-600 text-slate-900 dark:text-white`}>{i.name || tr.removedItem}</span>
                        </td>
                        <td className={`${td} num text-end text-slate-600 dark:text-slate-300`}>{i.units} <span className="text-xs text-slate-400">{i.unit}</span></td>
                        <td className={`${td} num text-end text-slate-900 dark:text-white`}>{amount(i.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className={`${panel} p-0`}>
            <p className="px-3 pt-3 text-sm font-700 text-slate-900 dark:text-white">{tr.everyEntry}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    {[tr.date, tr.item, tr.reason, tr.note].map((h) => <th key={h} className={`${th} text-start`}>{h}</th>)}
                    {[tr.quantity, tr.value].map((h) => <th key={h} className={`${th} text-end`}>{h}</th>)}
                    <th className={`${th} text-start`}>{tr.by}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id || `${r.at}:${r.itemId}`} className="border-t border-slate-100 dark:border-white/5">
                      <td className={`${td} whitespace-nowrap text-slate-600 dark:text-slate-300`}>{fmtDate(r.at)}</td>
                      <td className={td}><span dir="auto" className="font-600 text-slate-900 dark:text-white">{r.name || tr.removedItem}</span></td>
                      <td className={`${td} text-slate-600 dark:text-slate-300`}>{tr.causes[r.cause] || tr.causes[""]}</td>
                      <td dir="auto" className={`${td} text-start text-slate-500 dark:text-slate-400`}>{noteOf(r)}</td>
                      <td className={`${td} num text-end text-slate-600 dark:text-slate-300`}>{r.units} <span className="text-xs text-slate-400">{r.unit}</span></td>
                      <td className={`${td} num text-end text-slate-900 dark:text-white`}>{amount(r.value)}</td>
                      <td className={`${td} text-slate-500 dark:text-slate-400`}>{r.byAlias || tr.someone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {shown < entries && <p className="px-3 pb-3 text-xs text-slate-500 dark:text-slate-400">{tr.showing(shown, entries)}</p>}
          </section>
        </>
      )}
    </div>
  );
}
