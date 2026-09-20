"use client";

import { useMemo } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { technicalDict } from "@/shared/studio/technical";
import { money } from "@/components/studio2/ui";
import { compareQuotations } from "@/modules/technical/quotationDiff";

// WHAT CHANGED BETWEEN THIS REVISION AND THE ONE BEFORE IT.
//
// Both documents are already on the screen's own list (listQuotations returns
// whole quotations), so this computes in the browser through the SAME pure
// module a test asserts — no route, no round trip, and no right of its own: a
// reader who may open both documents may be told the difference between them.
//
// THE PRICES ARE THE DOCUMENT'S OWN CURRENCY, frozen when it was raised, which
// is why the currency comes in as a prop rather than being read from the studio.
export default function QuotationCompare({ quote, previous, currency }) {
  const tr = technicalDict(useStudioLocale());
  const diff = useMemo(() => compareQuotations(previous, quote), [previous, quote]);

  if (!previous) return <p className="text-sm text-slate-500 dark:text-slate-400">{tr.compareNoPrevious}</p>;

  const badge = {
    added: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    changed: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    removed: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  };
  const label = { added: tr.compareAdded, changed: tr.compareChanged, removed: tr.compareRemoved };
  const tableLine = (t) => (t.kind === "renamed" ? tr.compareTableRenamed(t.from, t.to)
    : t.kind === "added" ? tr.compareTableAdded(t.to) : tr.compareTableRemoved(t.from));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-600 text-slate-800 dark:text-slate-100">{tr.compareTitle(diff.fromRevision, diff.toRevision)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{tr.compareSummary(diff.added, diff.changed, diff.removed)}</p>
      </div>

      {/* Said plainly. A revision exists for its own reasons — a date, a
          covering note — and "nothing moved" is an answer, not an empty state. */}
      {diff.identical && <p className="text-sm text-slate-600 dark:text-slate-300">{tr.compareIdentical}</p>}

      {(diff.tables.length > 0 || diff.vatRateFrom !== diff.vatRateTo) && (
        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
          {diff.tables.map((t, i) => <li key={`t${i}`}>{tableLine(t)}</li>)}
          {diff.vatRateFrom !== diff.vatRateTo && <li>{tr.compareVatRate(diff.vatRateFrom, diff.vatRateTo)}</li>}
        </ul>
      )}

      {diff.lines.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {diff.lines.map((l, i) => (
            <li key={`l${i}`} className="py-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-700 ${badge[l.kind]}`}>{label[l.kind]}</span>
                <span dir="auto" className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-100">{l.description || "—"}</span>
                <span className="num text-xs text-slate-500 dark:text-slate-400">
                  {l.kind === "added" ? money(l.amountTo, currency)
                    : l.kind === "removed" ? money(l.amountFrom, currency)
                      : `${money(l.amountFrom, currency)} → ${money(l.amountTo, currency)}`}
                </span>
              </div>
              {l.tableTitle && <p className="text-[11px] text-slate-400">{l.tableTitle}</p>}
              {l.fields.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {l.fields.map((f) => (
                    <li key={f.field} dir="auto" className="text-xs text-slate-600 dark:text-slate-300">
                      {tr.compareFields[f.field] || f.field}: {f.from || "—"} → {f.to || "—"}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-baseline justify-between border-t border-slate-100 pt-2 text-sm dark:border-white/10">
        <span className="font-600 text-slate-700 dark:text-slate-200">{tr.compareTotal}</span>
        <span className="num text-slate-800 dark:text-slate-100">
          {money(diff.totalFrom, currency)} → <span className="font-700">{money(diff.totalTo, currency)}</span>
        </span>
      </p>
    </div>
  );
}
