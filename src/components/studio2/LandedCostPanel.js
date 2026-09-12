"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { logisticsDict } from "@/shared/studio/logistics";
import { useReload } from "@/components/studio2/useReload";
import { panel, h2, sub, btn, btnGhost, btnRow, money, fmtDate, Empty } from "@/components/studio2/ui";

// WHAT A SHIPMENT COST TO LAND — freight, duty, insurance, handling, spread
// across the order's lines.
//
// THE ROUTE HAS EXISTED SINCE THE MODULE SHIPPED AND NOTHING FETCHED IT. A
// complete backend with no way in is a feature the studio paid for and cannot
// reach; this is the way in.
//
// IT COMPUTES NOTHING. `landedCost` (modules/logistics/landedCost, pure) decides
// every share, including the remainder the last line takes so the parts add to
// the whole. The list and the open order both come from that one function, so a
// row and the order opened from it cannot disagree.
//
// SAVING REPLACES. One record per order — a landed cost is a reconciliation
// ("these are the invoices that belong to this shipment"), so correcting the
// duty figure restates the set rather than appending to it.
export default function LandedCostPanel({ slug, locale = "en", currency = "" }) {
  const tr = logisticsDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/logistics/landed-cost`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setProblem("");
    setData(body);
  }, [slug, setData, setProblem]);

  useReload(load);

  // ONE ORDER, WITH ITS FULL DISTRIBUTION — what a reconciliation screen needs,
  // and the reason the route answers a single order differently from the list.
  const openOrder = useCallback(async (orderId) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/logistics/landed-cost?order=${encodeURIComponent(orderId)}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(tr.refuse[body.error] || body.error || tr.refuse.failed); return; }
    // THE SERVER'S TOTAL KEPT UNDER ITS OWN NAME. `charges` is the editable ROW
    // array here, and the answer's `charges` is the total those rows came to —
    // spreading the body and then shadowing one with the other is how the
    // header ends up reading nought however much has been recorded.
    setOpen({ ...body, chargesTotal: body.charges, charges: (body.chargeRows || []).map((c) => ({ ...c })) });
  }, [slug, tr, setBusy, setProblem, setOpen]);

  const save = useCallback(async (method, payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/logistics/landed-cost`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      // THE INDEX TRAVELS WITH THE REFUSAL, so the wrong charge row is named
      // rather than the whole form.
      const at = typeof body.at === "number" ? ` (${body.at + 1})` : "";
      setProblem((tr.refuse[body.error] || body.error || tr.refuse.failed) + at);
      return false;
    }
    await load();
    return true;
  }, [slug, load, tr, setBusy, setProblem]);

  if (problem && !data) return <p className="mt-5 text-sm text-rose-600 dark:text-rose-300">{problem}</p>;
  if (!data) return <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">…</p>;

  const { orders = [], canManage } = data;
  const amount = (n) => `${money(n)}${currency ? ` ${currency}` : ""}`;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className={h2}>{tr.title}</h3>
        {!canManage && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{tr.viewOnly}</span>}
      </div>
      <p className={sub}>{tr.lead}</p>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>
      )}

      {orders.length === 0 ? (
        <Empty title={tr.noOrders} body={tr.noOrdersBody} />
      ) : (
        <section className={`${panel} p-0`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="px-3 py-2 text-start text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.order}</th>
                  {[tr.goods, tr.charges, tr.landed].map((head) => (
                    <th key={head} className="px-3 py-2 text-end text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{head}</th>
                  ))}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.orderId} className="border-t border-slate-100 dark:border-white/5">
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{o.reference}</span>
                      <span className="ms-2 text-xs text-slate-400">{o.lines} {tr.lines}</span>
                      {o.expectedAt && <span className="ms-2 text-xs text-slate-400">{fmtDate(o.expectedAt)}</span>}
                    </td>
                    <td className="num px-3 py-2.5 text-end text-slate-600 dark:text-slate-300">{amount(o.goods)}</td>
                    <td className="num px-3 py-2.5 text-end text-slate-600 dark:text-slate-300">
                      {o.costed ? amount(o.charges) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="num px-3 py-2.5 text-end font-600 text-slate-900 dark:text-white">{amount(o.landed)}</td>
                    <td className="px-3 py-2.5 text-end">
                      <button type="button" className={`${btnRow} text-xs`} disabled={busy}
                        onClick={() => openOrder(o.orderId)}>
                        {o.costed ? tr.nCharges(o.chargeCount) : tr.notCosted}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {open && (
        <OrderCharges
          state={open} tr={tr} amount={amount} busy={busy} canManage={canManage}
          onChange={setOpen}
          onClose={() => { setOpen(null); setProblem(""); }}
          onSave={async () => {
            const done = await save("PUT", {
              orderId: open.orderId, basis: open.basis,
              charges: open.charges.map((c) => ({ id: c.id, kind: c.kind, amount: Number(c.amount) })),
            });
            if (done) await openOrder(open.orderId);
          }}
          onClear={async () => {
            const done = await save("DELETE", { orderId: open.orderId });
            if (done) setOpen(null);
          }}
        />
      )}
    </div>
  );
}

// ONE ORDER'S CHARGES AND WHAT THEY DID TO ITS LINES. The distribution shown is
// the SAVED one — editing a charge changes nothing on screen until it is saved,
// because the shares come from the server's own arithmetic and guessing them
// here would be the second copy this panel exists to avoid.
function OrderCharges({ state, tr, amount, busy, canManage, onChange, onClose, onSave, onClear }) {
  const set = (patch) => onChange({ ...state, ...patch });
  const setCharge = (i, patch) =>
    set({ charges: state.charges.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  return (
    <section className={`${panel} space-y-4`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-600 text-slate-900 dark:text-white">{state.reference}</span>
        <span className="ms-auto text-sm text-slate-500 dark:text-slate-400">
          {tr.goods} {amount(state.goods)} · {tr.charges} {amount(state.chargesTotal || 0)} · {tr.landed} {amount(state.landed)}
        </span>
        <button type="button" className={btnGhost} onClick={onClose}>{tr.cancel}</button>
      </div>

      {/* MONEY THAT COULD NOT BE SPREAD IS REPORTED, NOT SWALLOWED. */}
      {state.unallocated > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
          <p className="text-sm font-600 text-amber-800 dark:text-amber-200">{tr.unallocated} {amount(state.unallocated)}</p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300/90">{tr.unallocatedLead}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr.basis} as="select" value={state.basis} hint={tr.basisHint}
          onChange={(v) => set({ basis: v })}
          options={["value", "quantity"].map((b) => ({ value: b, label: tr.basisName(b) }))} />
      </div>

      <div className="space-y-2">
        {state.charges.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noCharges}</p>}
        {state.charges.map((c, i) => (
          <div key={c.id || i} className="flex flex-wrap items-end gap-2">
            <Field label={tr.kind} className="w-full sm:w-64" value={c.kind}
              onChange={(v) => setCharge(i, { kind: v })} inputProps={{ maxLength: 60 }} />
            <Field label={tr.amount} type="number" className="w-full sm:w-40" value={c.amount}
              onChange={(v) => setCharge(i, { amount: v })} inputProps={{ min: 0, step: "any" }} />
            {canManage && (
              <button type="button" className="pb-2.5 text-xs text-rose-600 hover:underline dark:text-rose-300"
                onClick={() => set({ charges: state.charges.filter((_, j) => j !== i) })}>
                {tr.remove}
              </button>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnRow}
            onClick={() => set({ charges: [...state.charges, { id: "", kind: "", amount: "" }] })}>
            {tr.addCharge}
          </button>
          <button type="button" className={btn} disabled={busy} onClick={onSave}>
            {busy ? tr.saving : tr.save}
          </button>
          <button type="button" className="rounded-full px-3 py-2 text-sm text-rose-600 hover:underline dark:text-rose-300"
            disabled={busy} onClick={onClear}>
            {tr.removeAll}
          </button>
        </div>
      )}

      {/* WHAT EACH LINE ENDED UP COSTING — the point of the whole exercise. */}
      {state.lines?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5">
                <th className="px-3 py-2 text-start text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.lines}</th>
                {[tr.quantity, tr.goods, tr.charges, tr.perUnit].map((h) => (
                  <th key={h} className="px-3 py-2 text-end text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.lines.map((l) => (
                <tr key={l.id} className="border-t border-slate-100 dark:border-white/5">
                  {/* THE NAME THE SERVER JOINED ON, with the id only as the
                      last resort — a raw id in a column headed Lines is
                      something nobody can look up from here. */}
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                    {l.sku && <span className="font-mono text-xs text-slate-400">{l.sku}</span>}
                    <span className={l.sku ? "ms-2" : ""}>{l.name || l.itemId || l.id}</span>
                  </td>
                  <td className="num px-3 py-2.5 text-end text-slate-600 dark:text-slate-300">{l.qty}</td>
                  <td className="num px-3 py-2.5 text-end text-slate-600 dark:text-slate-300">{amount(l.goods)}</td>
                  <td className="num px-3 py-2.5 text-end text-slate-600 dark:text-slate-300">{amount(l.charges)}</td>
                  {/* A LINE WITH NO UNITS HAS NO UNIT COST — a dash, not 0.00. */}
                  <td className="num px-3 py-2.5 text-end font-600 text-slate-900 dark:text-white">
                    {l.unitLanded == null ? <span className="text-slate-400">—</span> : amount(l.unitLanded)}
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
