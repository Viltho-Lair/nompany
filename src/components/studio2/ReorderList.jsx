"use client";

// "STOCK TO REORDER" (17/09/2026) — every item at or near its reorder level,
// under first. Drawn on the Inventory and Point of Sale dashboards for whoever
// holds the stock alert (`inventory.stock.alerts`); the rows come from
// modules/inventory/stockLevels, the same rules the alert is sent on.

import { useStudioLocale } from "@/components/studio2/locale";
import { stockAlertsDict } from "@/shared/studio/stockAlerts";
import { NEAR_MARGIN } from "@/modules/inventory/stockLevels";
import { h2, th } from "@/components/studio2/ui";
import { StatusPill } from "@/components/studio2/StatusPill";

const qty = (n) => new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(Number(n) || 0);

export default function ReorderList({ rows = [], href = "" }) {
  const tr = stockAlertsDict(useStudioLocale());
  return (
    <section className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
      <h2 className={h2}>
        {href ? <a href={href} className="hover:underline">{tr.title}</a> : tr.title}
        {rows.length > 0 && <span className="ms-2 text-sm font-600 text-amber-700 dark:text-amber-300">{rows.length}</span>}
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.hint(Math.round(NEAR_MARGIN * 100))}</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{tr.none}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className={`${th} text-start`}>{tr.item}</th>
                <th className={`${th} text-end`}>{tr.onHand}</th>
                <th className={`${th} text-end`}>{tr.reorderAt}</th>
                <th className={`${th} text-end`} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.itemId} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                  <td className="py-2.5 pe-3">
                    <span className="font-600 text-[var(--geex-ink)]">{r.name}</span>
                    {r.sku && <span className="ms-2 font-mono text-xs text-slate-400">{r.sku}</span>}
                  </td>
                  <td className={`num py-2.5 pe-3 text-end ${r.state === "below" ? "font-700 text-rose-600 dark:text-rose-400" : ""}`}>
                    {qty(r.onHand)} {r.unit}
                  </td>
                  <td className="num py-2.5 pe-3 text-end text-slate-500 dark:text-slate-400">{qty(r.reorderLevel)}</td>
                  <td className="py-2.5 text-end">
                    <StatusPill kind="stock" status={r.state} label={tr.state[r.state]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
