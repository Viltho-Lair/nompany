"use client";

import { useCallback, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { procurementDict } from "@/shared/studio/procurement";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { useReload } from "@/components/studio2/useReload";
import { RecordSkeleton } from "@/components/studio2/RecordSkeleton";
import { panel, h2, sub, btnRow, btnRowPrimary, money, fmtDate } from "@/components/studio2/ui";

// THE PURCHASE ORDER REGISTER — Procurement → Purchase orders (tier 5).
//
// THERE WAS NO SCREEN LISTING ORDERS. A requisition converted to a Draft order,
// and that Draft was visible only on the requisition's own row: Expediting shows
// what is in flight and Receiving what can be booked in, and both hide Drafts on
// purpose. So a studio could not see what it had ordered, from whom, or what
// was sitting unplaced. Every order is here, in every state.
//
// PLACING AND CANCELLING ARE INVENTORY'S OWN EDIT (`editOrder`, inventory.stock
// .edit) — the same two moves the requisition row makes, not a second path.
// Received and Partly received are consequences of booking goods in and are
// never offered.
//
// WATCHES `inventory-sheets`, the section the orders are WRITTEN under (see
// invariant 14) — not this section, which owns no collection.

const FILTERS = ["", "Draft", "Ordered", "Partly received", "Received", "Cancelled"];

export default function StudioPurchaseOrders({ slug }) {
  const tr = procurementDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/inventory/orders`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || String(res.status)); return; }
    setError("");
    setData(body);
  }, [slug]);

  useReload(load);
  useLiveUpdates(slug, "inventory-sheets", load);

  const move = async (id, status) => {
    setBusy(id);
    const res = await fetch(`/api/studios/${slug}/inventory/orders`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setBusy("");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || String(res.status));
    }
    await load();
  };

  const orders = useMemo(() => (data?.orders || []).filter((o) => !filter || o.status === filter), [data, filter]);

  if (!data) return error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : <RecordSkeleton />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className={h2}>{tr.purchaseOrders}</h2>
        <p className={sub}>{tr.purchaseOrdersSub}</p>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap gap-1" role="group" aria-label={tr.orderStatusLabel}>
        {FILTERS.map((s) => {
          const count = s ? (data.orders || []).filter((o) => o.status === s).length : (data.orders || []).length;
          return (
            <button
              key={s || "all"}
              type="button"
              aria-pressed={filter === s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-600 transition-colors ${filter === s
                ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"}`}
            >
              {s ? tr.orderStatus(s) : tr.allStatuses} <span className="num text-slate-400">{count}</span>
            </button>
          );
        })}
      </div>

      <section className={panel}>
        {orders.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noOrders}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-start text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <th className="py-2 pe-3 text-start font-600">{tr.orderReference}</th>
                  <th className="py-2 pe-3 text-start font-600">{tr.orderSupplier}</th>
                  <th className="py-2 pe-3 text-start font-600">{tr.orderProject}</th>
                  <th className="py-2 pe-3 text-start font-600">{tr.orderStatusLabel}</th>
                  <th className="py-2 pe-3 text-end font-600">{tr.orderTotal}</th>
                  <th className="py-2 pe-3 text-end font-600">{tr.orderOutstanding}</th>
                  <th className="py-2 pe-3 text-start font-600">{tr.orderRaised}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className="py-2 pe-3 font-mono text-xs">{o.reference}</td>
                    <td className="py-2 pe-3">{o.vendorName || "—"}</td>
                    <td className="py-2 pe-3 font-mono text-xs">{o.projectNumber || "—"}</td>
                    <td className="py-2 pe-3">{tr.orderStatus(o.status)}</td>
                    <td className="num py-2 pe-3 text-end">{money(o.total)}</td>
                    <td className="num py-2 pe-3 text-end">{o.outstanding}</td>
                    <td className="py-2 pe-3 text-xs text-slate-500">{fmtDate(o.createdAt)}</td>
                    <td className="py-2 text-end">
                      {data.canPlace && (
                        <span className="inline-flex gap-2">
                          {o.status === "Draft" && (
                            <button className={btnRowPrimary} disabled={busy === o.id} onClick={() => move(o.id, "Ordered")}>
                              {tr.placeOrder}
                            </button>
                          )}
                          {/* Only an order nothing has been received against —
                              once goods arrive, the order explains real stock. */}
                          {(o.status === "Draft" || o.status === "Ordered") && (
                            <button className={btnRow} disabled={busy === o.id} onClick={() => move(o.id, "Cancelled")}>
                              {tr.cancelOrder}
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
