"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/studio/icons";
import { computeSheet } from "@/lib/quotationSheet";
import { confirmDialog } from "@/lib/appDialog";

// Read-only view of a linked quotation's items — for Project & Logistics users.
// A Project Manager can tick items and send a delivery request to logistics.
// Delivery notes (status + returns) are managed in the project profile's
// Material box; here we only surface delivered/remaining hints per item.
export default function QuotationViewer({ quotation }) {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState({}); // rowId -> { itemId, name, model, qty }
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]); // material orders for this project (for arrival ETA)
  const [pending, setPending] = useState({}); // itemId -> qty currently in an open request
  const [pendingTasks, setPendingTasks] = useState([]); // open delivery tasks [{id, items, qtyChange}]
  const [editReq, setEditReq] = useState(null); // { taskId, rows: [{itemId,name,model,qty,max}] }
  const [editBusy, setEditBusy] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const sheet = quotation.sheet && Array.isArray(quotation.sheet.tables) ? quotation.sheet : { tables: [] };

  useEffect(() => {
    document.documentElement.classList.add("studio-chrome");
    return () => document.documentElement.classList.remove("studio-chrome");
  }, []);
  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/inventoryItems", { cache: "no-store" }); if (r.ok) setItems(await r.json()); } catch {}
    })();
  }, []);
  // Material orders for this quotation's project — used to show an estimated
  // arrival date for out-of-stock items once an order request has been sent.
  // Best-effort: needs Orders & Tracking access, otherwise silently skipped.
  useEffect(() => {
    const pid = quotation.projectId;
    if (!pid) return;
    (async () => {
      try { const r = await fetch(`/api/material-orders?projectId=${encodeURIComponent(pid)}`, { cache: "no-store" }); if (r.ok) setOrders(await r.json()); } catch {}
    })();
  }, [quotation.projectId]);

  const loadDeliveries = useCallback(async () => {
    try { const r = await fetch(`/api/deliveries?quotationId=${encodeURIComponent(quotation.id)}`, { cache: "no-store" }); if (r.ok) setDeliveries(await r.json()); } catch {}
    try { const r = await fetch(`/api/deliveries/pending?quotationId=${encodeURIComponent(quotation.id)}`, { cache: "no-store" }); if (r.ok) { const d = await r.json(); setPending(d?.items || {}); setPendingTasks(Array.isArray(d?.tasks) ? d.tasks : []); } } catch {}
  }, [quotation.id]);
  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const computed = useMemo(() => computeSheet(sheet, itemsById), [sheet, itemsById]);

  // Earliest material-order date per item (a request having been sent is what
  // unlocks the arrival estimate).
  const orderedAtByItem = useMemo(() => {
    const m = {};
    for (const o of orders) {
      for (const it of o.items || []) {
        if (!it.itemId || !o.createdAt) continue;
        if (!m[it.itemId] || o.createdAt < m[it.itemId]) m[it.itemId] = o.createdAt;
      }
    }
    return m;
  }, [orders]);
  // Estimated arrival = order date + the item's delivery-time weeks.
  const arrivalFor = useCallback((r) => {
    const at = orderedAtByItem[r.itemId];
    const weeks = Number(r.item?.deliveryWeeks);
    if (!at || !Number.isFinite(weeks) || weeks <= 0) return "";
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + weeks * 7);
    return d.toLocaleDateString("en-GB");
  }, [orderedAtByItem]);

  // Delivered (gross) and returned quantities per item, aggregated across all
  // deliveries on this quotation. Net delivered = delivered − returned.
  const deliveredByItem = useMemo(() => {
    const m = {};
    for (const d of deliveries) {
      for (const it of d.items || []) {
        if (!it.itemId) continue;
        if (!m[it.itemId]) m[it.itemId] = { delivered: 0, returned: 0 };
        m[it.itemId].delivered += Number(it.qty) || 0;
      }
      for (const r of d.returns || []) {
        if (!r.itemId) continue;
        if (!m[r.itemId]) m[r.itemId] = { delivered: 0, returned: 0 };
        m[r.itemId].returned += (r.serials || []).length;
      }
    }
    return m;
  }, [deliveries]);

  // Remaining (outstanding) quantity for a row = ordered − net delivered.
  const remainingOf = useCallback((r) => {
    const agg = deliveredByItem[r.itemId] || { delivered: 0, returned: 0 };
    const net = agg.delivered - agg.returned;
    return Math.max(0, r.calc.qty - net);
  }, [deliveredByItem]);

  // Ordered quantity per item across the whole sheet — used to cap qty-change
  // edits at each item's still-outstanding amount.
  const orderedByItem = useMemo(() => {
    const m = {};
    for (const t of computed.tables) for (const r of t.rows) { if (r.itemId) m[r.itemId] = (m[r.itemId] || 0) + (Number(r.calc.qty) || 0); }
    return m;
  }, [computed]);
  const outstandingOf = useCallback((itemId) => {
    const agg = deliveredByItem[itemId] || { delivered: 0, returned: 0 };
    return Math.max(0, (orderedByItem[itemId] || 0) - (agg.delivered - agg.returned));
  }, [orderedByItem, deliveredByItem]);

  // The open delivery task (if any) that contains a given item, + whether it
  // already has a pending quantity change awaiting Logistics.
  const taskForItem = useCallback((itemId) => pendingTasks.find((t) => (t.items || []).some((it) => it.itemId === itemId)) || null, [pendingTasks]);

  function openEditRequest(itemId) {
    const task = taskForItem(itemId);
    if (!task) return;
    const rows = (task.items || []).map((it) => ({ itemId: it.itemId, name: it.name || "", model: it.model || "", qty: Number(it.qty) || 0, max: outstandingOf(it.itemId) }));
    setEditReq({ taskId: task.id, initial: rows.map((r) => ({ itemId: r.itemId, qty: r.qty })), rows });
  }

  async function submitQtyChange() {
    if (!editReq) return;
    setEditBusy(true); setErr(""); setMsg("");
    try {
      const items = editReq.rows.map((r) => ({ itemId: r.itemId, name: r.name, model: r.model, qty: r.qty }));
      const res = await fetch(`/api/tasks/${editReq.taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request-qty-change", items }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send the change.");
      setEditReq(null);
      setMsg("Quantity change sent — awaiting Logistics approval.");
      loadDeliveries();
    } catch (e) { setErr(e.message); }
    finally { setEditBusy(false); }
  }

  const toggle = (r, remaining) => {
    setMsg(""); setErr("");
    setSelected((s) => {
      const next = { ...s };
      if (next[r.id]) delete next[r.id];
      else next[r.id] = { itemId: r.itemId, name: r.item?.name || "", model: r.item?.modelNumber || "", qty: remaining, remaining };
      return next;
    });
  };

  const setSelQty = (rowId, val, remaining) => {
    const q = Math.max(1, Math.min(remaining, parseInt(val, 10) || 1));
    setSelected((s) => (s[rowId] ? { ...s, [rowId]: { ...s[rowId], qty: q } } : s));
  };

  // Full delivery — select every eligible row (remaining > 0, not locked by an
  // open request) at its full remaining quantity.
  const selectFullDelivery = () => {
    setMsg(""); setErr("");
    const next = {};
    for (const t of computed.tables) for (const r of t.rows) {
      if (!r.item) continue;
      const remaining = remainingOf(r);
      if (remaining <= 0) continue;
      if ((pending[r.itemId] || 0) > 0) continue; // open request in flight
      next[r.id] = { itemId: r.itemId, name: r.item?.name || "", model: r.item?.modelNumber || "", qty: remaining, remaining };
    }
    setSelected(next);
  };

  const selCount = Object.keys(selected).length;

  async function requestDelivery() {
    const reqItems = Object.values(selected).filter((it) => it.itemId && it.qty > 0).map((it) => ({ itemId: it.itemId, name: it.name, model: it.model, qty: it.qty }));
    if (!reqItems.length) return;
    setRequesting(true); setErr(""); setMsg("");
    try {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "delivery", quotationId: quotation.id, items: reqItems }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setSelected({});
      setMsg("Delivery requested — sent to the logistics team.");
      loadDeliveries();
    } catch (e) { setErr(e.message); }
    finally { setRequesting(false); }
  }

  return (
    <div className="min-h-screen bg-[var(--geex-page)] text-slate-900 dark:text-slate-100">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-[var(--geex-surface)] px-4 py-3 dark:border-white/10">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push("/studio"))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5" title="Back" aria-label="Back">
          <Icon name="arrowLeft" className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-700 text-slate-900 dark:text-white">
            {quotation.approved && (
              <span className="me-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 align-middle text-[11px] font-700 text-emerald-700 dark:text-emerald-300"><Icon name="checkDouble" className="h-3 w-3" /> Approved</span>
            )}
            {quotation.number}<span className="ms-1 font-500 text-slate-400">· Quotation (view)</span>
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{quotation.title || quotation.clientName || "—"}</p>
        </div>
        <button
          onClick={selectFullDelivery}
          disabled={requesting}
          title="Select every remaining item at its full outstanding quantity"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-600 text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
        >
          <Icon name="checkDouble" className="h-4 w-4" /> Full delivery
        </button>
        <button
          onClick={requestDelivery}
          disabled={requesting || selCount === 0}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-700 px-4 py-2 text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-50"
        >
          <Icon name="external" className="h-4 w-4" /> {requesting ? "Requesting…" : `Request delivery${selCount ? ` (${selCount})` : ""}`}
        </button>
      </header>

      <div className="mx-auto w-full max-w-3xl p-4">
        {msg && <p className="mb-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-600 text-emerald-700 dark:text-emerald-300">{msg}</p>}
        {err && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-600 text-red-700 dark:text-red-400">{err}</p>}

        {computed.tables.length === 0 || computed.tables.every((t) => t.rows.length === 0) ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-10 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-[#20202c]">This quotation has no items.</div>
        ) : computed.tables.map((t, ti) => (
          <div key={ti} className="mb-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2.5 font-600 dark:border-white/10 dark:bg-[#191921]">{t.title || `Table ${ti + 1}`}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <th className="w-10 px-2 py-2 text-center font-600" />
                    <th className="w-16 px-3 py-2 text-center font-600">Image</th>
                    <th className="px-3 py-2 text-center font-600">Item</th>
                    <th className="px-2 py-2 text-center font-600">Model</th>
                    <th className="w-32 whitespace-nowrap px-3 py-2 text-center font-600">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {t.rows.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-4 text-center text-xs text-slate-400">No items.</td></tr>
                  ) : t.rows.map((r) => {
                    const ordered = r.calc.qty;
                    const agg = deliveredByItem[r.itemId] || { delivered: 0, returned: 0 };
                    const net = agg.delivered - agg.returned;
                    const remaining = Math.max(0, ordered - net);
                    const hasActivity = net > 0 || agg.returned > 0;
                    const fullyDelivered = remaining <= 0 && agg.delivered > 0;
                    const locked = (pending[r.itemId] || 0) > 0; // open request in flight
                    const sel = selected[r.id];
                    const disabled = !r.item || fullyDelivered || locked || remaining <= 0;
                    return (
                    <tr key={r.id} className="border-t border-slate-50 align-middle dark:border-white/5">
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!sel}
                          disabled={disabled}
                          onChange={() => toggle(r, remaining)}
                          title={fullyDelivered ? "Fully delivered" : locked ? "A delivery request is already open for this item" : remaining <= 0 ? "Nothing left to deliver" : undefined}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-40 dark:border-white/20 dark:bg-[#191921]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-center">
                          {r.item?.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={r.item.image} alt="" className="h-10 w-10 rounded border border-slate-200 object-contain dark:border-white/10" />
                          ) : <div className="h-10 w-10 rounded border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5" />}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-600 text-slate-800 dark:text-slate-100">{r.item?.name || <span className="text-slate-400">Item removed</span>}</td>
                      <td className="px-2 py-2 text-center text-xs text-slate-500 dark:text-slate-400">{r.item?.modelNumber || "—"}</td>
                      {/* Qty: one line "N Needed" by default; once delivered, Needed / Left /
                          Delivered stack on separate lines, no wrapping. */}
                      <td className="whitespace-nowrap px-3 py-2 text-center text-slate-700 dark:text-slate-200">
                        <div className="font-600">{ordered} Needed</div>
                        {hasActivity && (
                          <>
                            <div className="text-[11px] font-600 text-amber-600 dark:text-amber-400">{remaining} Left</div>
                            <div className="text-[11px] font-600 text-emerald-600 dark:text-emerald-400">{net} Delivered</div>
                          </>
                        )}
                        {locked && (() => {
                          const openTask = taskForItem(r.itemId);
                          const changePending = openTask?.qtyChange?.status === "pending";
                          if (changePending) return <div className="text-[11px] font-600 text-amber-600 dark:text-amber-400">Change pending</div>;
                          return (
                            <button
                              type="button"
                              onClick={async () => { if (await confirmDialog({ title: "Edit delivery request", message: "Modify the quantities on this open delivery request? The change is sent to Logistics for approval.", confirmLabel: "Edit request" })) openEditRequest(r.itemId); }}
                              className="group text-[11px] font-600 text-sky-600 hover:text-sky-700 dark:text-sky-400"
                              title="Edit the quantities on this open request"
                            >
                              <span className="group-hover:hidden">Request open</span>
                              <span className="hidden group-hover:inline">Edit Request</span>
                            </button>
                          );
                        })()}
                        {(() => { const eta = arrivalFor(r); return eta ? <div className="text-[11px] font-600 text-violet-600 dark:text-violet-400">Est. arrival: {eta}</div> : null; })()}
                        {sel && (
                          <div className="mt-1.5 inline-flex items-center gap-1">
                            <button type="button" onClick={() => setSelQty(r.id, sel.qty - 1, remaining)} className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5" aria-label="Decrease">−</button>
                            <input
                              type="number"
                              min={1}
                              max={remaining}
                              value={sel.qty}
                              onChange={(e) => setSelQty(r.id, e.target.value, remaining)}
                              className="w-12 rounded-md border border-slate-200 bg-white px-1 py-0.5 text-center text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white"
                            />
                            <button type="button" onClick={() => setSelQty(r.id, sel.qty + 1, remaining)} className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5" aria-label="Increase">+</button>
                            <button type="button" onClick={() => setSelQty(r.id, remaining, remaining)} title="Request all remaining" className="ms-0.5 rounded-md border border-brand-500 px-1.5 py-0.5 text-[11px] font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">All</button>
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {editReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !editBusy && setEditReq(null)}>
          <div className="max-h-[88vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 font-display text-lg font-700 text-slate-900 dark:text-white">Edit delivery request</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Change the quantity per item (0 removes it). Sending the change requires Logistics approval before it takes effect.</p>
            <div className="space-y-2">
              {editReq.rows.map((row, i) => (
                <div key={row.itemId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-600 text-slate-800 dark:text-slate-100">{row.name || row.itemId}</p>
                    <p className="text-xs text-slate-400">{row.model || "—"} · max {row.max}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => setEditReq((s) => ({ ...s, rows: s.rows.map((x, j) => j === i ? { ...x, qty: Math.max(0, x.qty - 1) } : x) }))} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5" aria-label="Decrease">−</button>
                    <input type="number" min={0} max={row.max} value={row.qty} onChange={(e) => { const v = Math.max(0, Math.min(row.max, parseInt(e.target.value, 10) || 0)); setEditReq((s) => ({ ...s, rows: s.rows.map((x, j) => j === i ? { ...x, qty: v } : x) })); }} className="w-14 rounded-md border border-slate-200 bg-white px-1 py-0.5 text-center text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white" />
                    <button type="button" onClick={() => setEditReq((s) => ({ ...s, rows: s.rows.map((x, j) => j === i ? { ...x, qty: Math.min(x.max, x.qty + 1) } : x) }))} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5" aria-label="Increase">+</button>
                  </div>
                </div>
              ))}
            </div>
            {(() => {
              const changed = editReq.rows.some((r) => { const init = editReq.initial.find((x) => x.itemId === r.itemId); return (Number(r.qty) || 0) !== (Number(init?.qty) || 0); });
              return (
                <div className="mt-5 flex justify-end gap-3">
                  <button onClick={() => setEditReq(null)} disabled={editBusy} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-600 text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5">Cancel</button>
                  <button onClick={submitQtyChange} disabled={editBusy || !changed} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-50">
                    {editBusy ? "Sending…" : "Confirm changes"}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
