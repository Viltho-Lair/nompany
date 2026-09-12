"use client";

import { useCallback, useState } from "react";
import { valuationDict } from "@/shared/studio/valuation";
import { useReload } from "@/components/studio2/useReload";
import { panel, sub, money, Empty } from "@/components/studio2/ui";

// WHAT THE STOCK ON HAND IS WORTH.
//
// IT FETCHES ITS OWN DATA rather than riding in the Inventory payload, the way
// the bin and batch tabs do: a valuation walks every movement the studio has
// ever recorded, and putting it in the section's main response would make every
// open of every Inventory screen pay for it.
//
// IT COMPUTES NOTHING. `valueStock` (modules/inventory/valuation, pure) decides
// what a unit is worth and `stockValuation` overlays the landed cost; this shows
// what came back. A second copy of FIFO in a component is a second answer free
// to disagree with the balance sheet.
//
// THE METHOD IS AN ACCOUNTING POLICY, NOT A VIEW OPTION. The studio's own choice
// is what loads; the toggle previews the other one, and a previewed figure SAYS
// SO — a number that silently is not the policy is how the wrong one ends up on
// a return.
export default function ValuationPanel({ slug, locale = "en", currency = "" }) {
  const tr = valuationDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [method, setMethod] = useState("");

  const load = useCallback(async () => {
    const qs = method ? `?method=${encodeURIComponent(method)}` : "";
    const res = await fetch(`/api/studios/${slug}/inventory/valuation${qs}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setProblem("");
    setData(body);
  }, [slug, method, setData, setProblem]);

  useReload(load);

  if (problem && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p>;
  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const { items = [], total = 0, uncosted = 0, method: shown, studioMethod, preview } = data;
  const amount = (n) => `${money(n)}${currency ? ` ${currency}` : ""}`;

  return (
    <div className="space-y-5">
      <p className={sub}>{tr.lead}</p>

      {/* THE POLICY, AND WHICH ANSWER IS ON SCREEN. Both are named because they
          are different facts and the screen is useless if they are confused. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-slate-200 p-0.5 dark:border-white/15">
          {["average", "fifo"].map((m) => (
            <button key={m} type="button" onClick={() => setMethod(m)}
              className={`rounded-full px-4 py-1.5 text-sm font-600 transition-colors ${shown === m ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>
              {tr.methodName(m)}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{tr.studioUses(studioMethod)}</span>
      </div>

      {preview && (
        <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          {tr.previewing(shown)}
        </p>
      )}

      {items.length === 0 ? (
        <Empty title={tr.nothingHeld} body={tr.nothingHeldBody} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={panel}>
              <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.totalValue}</p>
              <p className="num mt-1 font-display text-2xl font-800 text-slate-900 dark:text-white">{amount(total)}</p>
            </div>
            <div className={panel}>
              <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.itemsHeld}</p>
              <p className="num mt-1 font-display text-2xl font-800 text-slate-900 dark:text-white">{items.length}</p>
            </div>
          </div>

          {/* UNITS VALUED AT NOTHING ARE SAID, not folded into the total. */}
          {uncosted > 0 && (
            <div className="rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
              <p className="text-sm font-600 text-amber-800 dark:text-amber-200">{tr.uncostedUnits(uncosted)}</p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300/90">{tr.uncostedLead}</p>
            </div>
          )}

          <section className={`${panel} p-0`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    <th className="px-3 py-2 text-start text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.item}</th>
                    {[tr.quantity, tr.unitValue, tr.value].map((h) => (
                      <th key={h} className="px-3 py-2 text-end text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.itemId} className="border-t border-slate-100 dark:border-white/5">
                      {/* THE NAME AND SKU THE SERVER ALREADY JOINED ON. The
                          valuation itself stays id-only and pure; naming is
                          presentation, and re-joining it here would be a second
                          lookup of something already answered. */}
                      <td className="px-3 py-2.5">
                        {i.sku && <span className="font-mono text-xs text-slate-400">{i.sku}</span>}
                        <span className={`${i.sku ? "ms-2 " : ""}font-600 text-slate-900 dark:text-white`}>{i.name || i.itemId}</span>
                      </td>
                      <td className="num px-3 py-2.5 text-end text-slate-600 dark:text-slate-300">{i.qty}</td>
                      {/* NULL IS A DASH, never 0.00 — an item with nothing on
                          hand has no unit value rather than a free one. */}
                      <td className="num px-3 py-2.5 text-end text-slate-600 dark:text-slate-300">
                        {i.unitValue == null ? <span className="text-slate-400">—</span> : amount(i.unitValue)}
                      </td>
                      <td className="num px-3 py-2.5 text-end font-600 text-slate-900 dark:text-white">{amount(i.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
