"use client";

// EVERY SALE THE COUNTER RANG UP (17/09/2026) — the Point of Sale department's
// Sales screen. `docs/functionality/pos.md` is the file.
//
// WHO SOLD IT is the person signed in at the till: the receipt stores their
// CollaboratorID and this list shows the name they carry today.
//
// THE FILTER IS THE SERVER'S. The period is worked out here, in the reader's
// own time, and handed over as two instants with the rest; the list, its totals
// and every download are the same filter answered by the same function
// (modules/sales/posReports), so what is downloaded is what is shown.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { posDeptDict } from "@/shared/studio/posDept";
import { posDict } from "@/shared/studio/pos";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { Field } from "@/components/fields/Field";
import { panel, th, btn, btnGhost, btnRow, Dialog, money, fmtDateTime, StatTile, tileRow } from "@/components/studio2/ui";
import { StatRow } from "@/components/dashboard";
import { PRINT_CSS, Receipt, PeriodPicker, usePosPeriod, rangeQuery } from "@/components/studio2/posParts";

const td = "py-2.5 pe-3 align-middle";

// A shift's sales are opened from the shift history as ?shiftIds=<id>.
const startingShifts = () => {
  if (typeof window === "undefined") return [];
  return (new URLSearchParams(window.location.search).get("shiftIds") || "").split(",").filter(Boolean);
};

export default function StudioPosSales({ slug }) {
  const locale = useStudioLocale();
  const tr = posDeptDict(locale);
  const till = posDict(locale);
  const period = usePosPeriod("day");
  const [shiftIds, setShiftIds] = useState(startingShifts);
  const [filters, setFilters] = useState({ terminalIds: "", cashierIds: "", methods: "", q: "" });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [open, setOpen] = useState(null);

  // A SHIFT'S SALES ARE THE SHIFT'S, whatever the period — so a shift filter
  // asks for all time rather than today.
  const query = useMemo(() => {
    const extra = { ...filters, shiftIds };
    return shiftIds.length ? new URLSearchParams(Object.entries(extra).filter(([, v]) => (Array.isArray(v) ? v.length : v)).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v])).toString()
      : rangeQuery(period.range, extra);
  }, [filters, shiftIds, period.range]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/pos/sales?${query}`, { cache: "no-store" });
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

  const openReceipt = async (id) => {
    const res = await fetch(`/api/studios/${slug}/pos/receipts?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setOpen(body);
  };

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error === "forbidden" ? tr.refused : error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { receipts = [], totals = {}, terms = {}, tills = [], cashiers = [], can = {} } = data;
  const cur = terms.currency || "";
  const amount = (n) => `${money(n || 0, cur)}${cur ? ` ${cur}` : ""}`;
  const set = (k) => (v) => { setPicked(new Set()); setFilters((f) => ({ ...f, [k]: v })); };
  const selected = receipts.filter((r) => picked.has(r.id));
  const downloadHref = (kind) => {
    const q = new URLSearchParams(query);
    q.set("kind", kind);
    q.set("tz", String(new Date().getTimezoneOffset()));
    if (selected.length) q.set("receiptIds", selected.map((r) => r.id).join(","));
    return `/api/studios/${slug}/pos/export?${q.toString()}`;
  };
  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const methods = (r) => [...new Set((r.payments || []).map((p) => tr.method[p.method] || p.method))].join(" + ");

  return (
    <div className={`space-y-5 ${data.query !== query ? "opacity-60" : ""}`}>
      {open && <style>{PRINT_CSS}</style>}

      {shiftIds.length ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-600 text-[var(--geex-ink)]">{tr.shiftNumber}: {receipts[0]?.shiftNumber || shiftIds.length}</span>
          <button type="button" className={btnRow} onClick={() => { setShiftIds([]); window.history.replaceState(null, "", window.location.pathname); }}>
            {tr.clearFilters}
          </button>
        </div>
      ) : (
        <PeriodPicker tr={tr} value={period} />
      )}

      <div className={tileRow}>
        <Field label={tr.search} type="search" hintOverlay hint={tr.searchHint} value={filters.q} onChange={set("q")} />
        <Field label={tr.till} as="select" value={filters.terminalIds} onChange={set("terminalIds")}
          options={[{ value: "", label: tr.all }, ...tills.map((t) => ({ value: t.id, label: t.name }))]} />
        <Field label={tr.cashier} as="select" value={filters.cashierIds} onChange={set("cashierIds")}
          options={[{ value: "", label: tr.all }, ...cashiers.map((c) => ({ value: c.id, label: c.name || c.id }))]} />
        <Field label={tr.paidBy} as="select" value={filters.methods} onChange={set("methods")}
          options={[{ value: "", label: tr.all }, ...["cash", "card", "transfer"].map((m) => ({ value: m, label: tr.method[m] }))]} />
      </div>

      <StatRow>
        <StatTile label={tr.takings} value={amount(totals.total)} />
        <StatTile label={tr.salesCount} value={<span className="num">{totals.sales ?? 0}</span>} />
        <StatTile label={tr.unitsSold} value={<span className="num">{totals.items ?? 0}</span>} />
        <StatTile label={tr.tax} value={amount(totals.vat)} />
      </StatRow>

      {can.export && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-600 text-[var(--geex-ink)]">{tr.download}:</span>
          <a className={btnGhost} href={downloadHref("receipts")}>{tr.downloadReceipts}</a>
          <a className={btnGhost} href={downloadHref("items")}>{tr.downloadItems}</a>
          <a className={btnGhost} href={downloadHref("lines")}>{tr.downloadLines}</a>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {selected.length ? `${tr.selected(selected.length)} — ${tr.downloadSelectedHint}` : tr.downloadHint}
          </span>
        </div>
      )}

      <section className={panel}>
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>{tr.shown(receipts.length)}</span>
          {can.export && receipts.length > 0 && (
            picked.size
              ? <button type="button" className={btnRow} onClick={() => setPicked(new Set())}>{tr.clearSelection}</button>
              : <button type="button" className={btnRow} onClick={() => setPicked(new Set(receipts.map((r) => r.id)))}>{tr.selectAll}</button>
          )}
        </div>
        {data.truncated && <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">{tr.truncated}</p>}
        {receipts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{tr.noMatches}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {can.export && <th className={`${th} w-8`} />}
                  <th className={`${th} text-start`}>{tr.receipt}</th>
                  <th className={`${th} text-start`}>{tr.when}</th>
                  <th className={`${th} text-start`}>{tr.till}</th>
                  <th className={`${th} text-start`}>{tr.cashier}</th>
                  <th className={`${th} text-end`}>{tr.items}</th>
                  <th className={`${th} text-start`}>{tr.paidBy}</th>
                  <th className={`${th} text-end`}>{tr.total}{cur ? ` (${cur})` : ""}</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                    onClick={() => openReceipt(r.id)}>
                    {can.export && (
                      <td className={td} onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={picked.has(r.id)} onChange={() => toggle(r.id)}
                          aria-label={`${tr.receipt} ${r.number}`} />
                      </td>
                    )}
                    <td className={`${td} font-mono text-xs font-600 text-[var(--geex-ink)]`}>{r.number}</td>
                    <td className={`${td} text-slate-500 dark:text-slate-400`}>{fmtDateTime(r.at)}</td>
                    <td className={td}>{r.till || "—"}</td>
                    <td className={td}>{r.cashier || "—"}</td>
                    <td className={`${td} num text-end`}>{r.lines.reduce((t, l) => t + Number(l.units ?? l.count), 0)}</td>
                    <td className={`${td} text-slate-500 dark:text-slate-400`}>{methods(r)}</td>
                    <td className={`${td} num text-end font-600 text-[var(--geex-ink)]`}>{money(r.total, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <Dialog title={`${till.receipt} ${open.receipt.number}`} onClose={() => setOpen(null)} width="max-w-[440px]">
          <p className="mb-3 text-center text-xs text-slate-500 dark:text-slate-400">
            {tr.cashier}: {open.receipt.cashier || "—"}{open.receipt.shiftNumber ? ` · ${tr.shiftNumber} ${open.receipt.shiftNumber}` : ""}
          </p>
          <Receipt tr={till} receipt={open.receipt} studio={open.studio} terms={open.terms} tillName={open.receipt.till} />
          <div className="mt-4 flex gap-2">
            <button type="button" className={btn} onClick={() => window.print()}>{tr.print}</button>
            <button type="button" className={btnGhost} onClick={() => setOpen(null)}>{tr.close}</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
