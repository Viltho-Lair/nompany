"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deliveredByItem } from "@/lib/projectKpis";
import { confirmDialog } from "@/lib/appDialog";
import { parseAwb } from "@/lib/awb";
import { statusLabel, isException } from "@/lib/awbStatus";

// Compact AWB status badge (shared by the Requested-orders list + Tracking tab).
function AwbBadge({ shipment }) {
  if (!shipment) return null;
  const code = shipment.currentStatus;
  const cls = shipment.delivered
    ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
    : !code
      ? "bg-slate-500/10 text-slate-500 dark:bg-white/10 dark:text-slate-400"
      : isException(code)
        ? "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300"
        : "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-600 ${cls}`}>{code ? `${code} · ${statusLabel(code)}` : "No AWB updates"}</span>;
}

const countItems = (sheet) => (sheet?.tables || []).reduce((n, t) => n + (t.rows || []).length, 0);
const asArr = (v) => (Array.isArray(v) ? v : []);

// Excel-style Project Sheets: each project is a "sheet tab" along the bottom.
// A selected project now has a Main | Orders sub-bar — Main books serials from
// stock; Orders is the shortfall/vendor-order view (formerly "Orders & Tracking")
// with per-order tracking numbers. A global "Tracking" tab (left of Search)
// lists every order that has a tracking number.
export default function InventoryProjectSheets() {
  const [rows, setRows] = useState([]);
  const [projectsById, setProjectsById] = useState({});
  const [catalog, setCatalog] = useState({ items: {}, stock: {} });
  const [orders, setOrders] = useState([]);
  const [awbShipments, setAwbShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [view, setView] = useState("main"); // "main" | "orders"
  const [showTracking, setShowTracking] = useState(false);
  const [serials, setSerials] = useState({}); // rowId -> [booked serial strings]
  const [editRow, setEditRow] = useState(null);
  const [pickSearch, setPickSearch] = useState("");
  const [deliveries, setDeliveries] = useState([]); // deliveries for the open project
  const [orderQty, setOrderQty] = useState({}); // itemId -> qty to order
  const [busyVendor, setBusyVendor] = useState("");
  const [ordersMsg, setOrdersMsg] = useState("");
  const [trackModal, setTrackModal] = useState(null); // material order being edited
  const tabsRef = useRef(null);

  const loadStock = useCallback(async () => {
    const r = await fetch("/api/project-sheets/catalog", { cache: "no-store" });
    if (r.ok) setCatalog(await r.json());
  }, []);
  const loadOrders = useCallback(async () => {
    try { const r = await fetch("/api/material-orders", { cache: "no-store" }); if (r.ok) setOrders(await r.json()); } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes, cRes, oRes, awbRes] = await Promise.all([
        fetch("/api/project-sheets", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
        fetch("/api/project-sheets/catalog", { cache: "no-store" }),
        fetch("/api/material-orders", { cache: "no-store" }),
        fetch("/api/awb", { cache: "no-store" }),
      ]);
      if (sRes.status === 403) throw new Error("You don't have access to Project Sheets.");
      if (!sRes.ok) throw new Error("Could not load project sheets.");
      const sheets = await sRes.json();
      const projects = pRes.ok ? await pRes.json() : [];
      setProjectsById(Object.fromEntries((Array.isArray(projects) ? projects : []).map((p) => [p.id, p])));
      setCatalog(cRes.ok ? await cRes.json() : { items: {}, stock: {} });
      setOrders(oRes.ok ? await oRes.json() : []);
      setAwbShipments(awbRes.ok ? await awbRes.json() : []);
      setRows(Array.isArray(sheets) ? sheets : []);
      setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const stockByItem = useMemo(() => {
    const m = {};
    for (const [itemId, s] of Object.entries(catalog.stock || {})) m[itemId] = { available: asArr(s.serials) };
    return m;
  }, [catalog]);
  const vendorOf = useCallback((itemId) => catalog.items?.[itemId]?.vendorName || "—", [catalog]);
  const deliveredMap = useMemo(() => deliveredByItem(deliveries), [deliveries]);

  const labelFor = useCallback(
    (sheet) => projectsById[sheet.projectId]?.projectNumber || sheet.projectTitle || sheet.quotationNumber || "Untitled",
    [projectsById]
  );

  const open = useMemo(() => rows.find((r) => r.id === openId) || null, [rows, openId]);

  // Tracking numbers per project (for the bottom-bar search) + orders with a
  // tracking number (for the global Tracking tab).
  const trackingByProject = useMemo(() => {
    const m = {};
    for (const o of orders) if (o.trackingNumber) (m[o.projectId] = m[o.projectId] || []).push(o.trackingNumber);
    return m;
  }, [orders]);
  const trackedOrders = useMemo(() => orders.filter((o) => o.trackingNumber).sort((a, b) => (b.trackingAt || b.createdAt || "").localeCompare(a.trackingAt || a.createdAt || "")), [orders]);
  // AWB shipment for an order (by its stored awbNumber, or a parsed tracking №).
  const shipmentByAwb = useMemo(() => Object.fromEntries(awbShipments.map((s) => [s.awbNumber, s])), [awbShipments]);
  const awbOf = useCallback((o) => {
    const key = o.awbNumber || (o.trackingNumber ? parseAwb(o.trackingNumber).formatted : "");
    return key ? shipmentByAwb[key] || null : null;
  }, [shipmentByAwb]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const bookedSerials = (r.tables || []).flatMap((t) => (t.rows || []).flatMap((rw) => asArr(rw.serials)));
      const tracks = (trackingByProject[r.projectId] || []).join(" ");
      return `${labelFor(r)} ${r.projectTitle} ${r.quotationNumber} ${r.clientName} ${bookedSerials.join(" ")} ${tracks}`.toLowerCase().includes(q);
    });
  }, [rows, query, labelFor, trackingByProject]);

  // Orders view — aggregate the open sheet's items by vendor with the shortfall,
  // netting out quantities already on order for this project.
  const vendorGroups = useMemo(() => {
    if (!open) return [];
    const agg = {};
    for (const t of open.tables || []) for (const r of t.rows || []) {
      if (!r.itemId) continue;
      if (!agg[r.itemId]) agg[r.itemId] = { needed: 0, assigned: 0 };
      agg[r.itemId].needed += Number(r.qty) || 0;
      agg[r.itemId].assigned += asArr(r.serials).length;
    }
    const already = {};
    for (const o of orders) { if (o.projectId !== open.projectId) continue; for (const it of o.items || []) if (it.itemId) already[it.itemId] = (already[it.itemId] || 0) + (Number(it.qty) || 0); }
    const groups = {};
    for (const [itemId, a] of Object.entries(agg)) {
      const cat = catalog.items?.[itemId] || {};
      const available = asArr(catalog.stock?.[itemId]?.serials).length;
      const moreRequired = Math.max(0, a.needed - a.assigned - available);
      const outstanding = Math.max(0, moreRequired - (already[itemId] || 0));
      const vKey = cat.vendorId || "__none__";
      if (!groups[vKey]) groups[vKey] = { vendorId: cat.vendorId || "", vendorName: cat.vendorName || "Unassigned vendor", items: [] };
      groups[vKey].items.push({ itemId, name: cat.name || itemId, model: cat.model || "", needed: a.needed, assigned: a.assigned, available, moreRequired, ordered: already[itemId] || 0, outstanding });
    }
    return Object.values(groups).sort((a, b) => a.vendorName.localeCompare(b.vendorName));
  }, [open, catalog, orders]);

  const projectOrders = useMemo(() => (open ? orders.filter((o) => o.projectId === open.projectId).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")) : []), [orders, open]);

  function selectSheet(sheet) {
    const buf = {};
    (sheet.tables || []).forEach((t) => (t.rows || []).forEach((r) => { buf[r.id] = asArr(r.serials); }));
    setSerials(buf);
    setEditRow(null); setError(""); setOrdersMsg("");
    setOpenId(sheet.id);
    setShowTracking(false); setView("main");
    setOrderQty({});
    setDeliveries([]);
    if (sheet.projectId) {
      fetch(`/api/deliveries?projectId=${encodeURIComponent(sheet.projectId)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setDeliveries(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
  }

  // Book / un-book a serial for a row (immediately reflected in stock).
  async function toggleSerial(row, sn) {
    const cur = serials[row.id] || [];
    let next;
    if (cur.includes(sn)) next = cur.filter((x) => x !== sn);
    else { if (cur.length >= (Number(row.qty) || 0)) return; next = [...cur, sn]; }
    setSerials((s) => ({ ...s, [row.id]: next })); // optimistic
    try {
      const res = await fetch(`/api/project-sheets/${open.id}/book`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rowId: row.id, serials: next }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      setSerials((s) => ({ ...s, [row.id]: data.serials }));
      await loadStock();
    } catch (e) { setError(e.message); await load(); }
  }

  async function sendOrder(group) {
    const items = group.items
      .map((it) => ({ itemId: it.itemId, name: it.name, model: it.model, qty: Math.min(Number(orderQty[it.itemId] ?? it.outstanding) || 0, it.outstanding) }))
      .filter((it) => it.qty > 0);
    if (!items.length) { setError("Set a quantity for at least one item to order."); return; }
    const totalQty = items.reduce((a, it) => a + it.qty, 0);
    if (!(await confirmDialog({ title: "Send order request", message: `Send an order request for ${items.length} item${items.length === 1 ? "" : "s"} (${totalQty} unit${totalQty === 1 ? "" : "s"}) from ${group.vendorName}? This raises a purchase-order approval task to Finance and Management.`, confirmLabel: "Send request" }))) return;
    setBusyVendor(group.vendorId || group.vendorName); setError(""); setOrdersMsg("");
    try {
      const res = await fetch("/api/material-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: open.projectId, projectName: open.projectTitle, vendorId: group.vendorId, vendorName: group.vendorName, items }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setOrdersMsg(`Order request sent to Finance & Management for approval (${group.vendorName}).`);
      setOrderQty({});
      await loadOrders();
    } catch (e) { setError(e.message); }
    finally { setBusyVendor(""); }
  }

  async function saveTracking(id, trackingNumber, note) {
    const res = await fetch(`/api/material-orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackingNumber, note }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not save");
    setTrackModal(null);
    await loadOrders();
  }

  const scrollTabs = (dir) => tabsRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });

  const OrderStatus = ({ status }) => (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-600 ${status === "approved" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>{status === "pending-approval" ? "Pending approval" : (status || "requested")}</span>
  );

  return (
    <div className="-mb-8 flex h-[calc(100vh-5rem)] min-h-[520px] flex-col gap-4">
      {/* Header info box */}
      <div className="shrink-0 rounded-geex border border-slate-200/70 bg-white p-4 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
        {showTracking ? (
          <div><h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">Tracking</h2><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">All order requests that have a tracking number.</p></div>
        ) : open ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{open.projectTitle || labelFor(open)}</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {[projectsById[open.projectId]?.projectNumber && `Project ${projectsById[open.projectId].projectNumber}`, open.quotationNumber && `Quotation ${open.quotationNumber}`, open.clientName, `${countItems(open)} item${countItems(open) === 1 ? "" : "s"}`].filter(Boolean).join("  ·  ")}
              </p>
            </div>
            <span className="text-xs text-slate-400">{view === "main" ? "Serials auto-save as you book them." : "Order material to cover the shortfall, grouped by vendor."}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center py-2 text-sm text-slate-500 dark:text-slate-400">Project and Quotation information — <span className="ms-1 font-600">select a project sheet below.</span></div>
        )}
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {ordersMsg && <p className="mt-3 text-sm font-600 text-emerald-600 dark:text-emerald-400">{ordersMsg}</p>}
      </div>

      {/* Middle content */}
      <div className="flex-1 overflow-auto rounded-geex border border-slate-200/70 bg-slate-50/50 p-4 shadow-geex-sm dark:border-white/10 dark:bg-[#191921]/40">
        {showTracking ? (
          <TrackingList orders={trackedOrders} projectsById={projectsById} onOpen={setTrackModal} StatusBadge={OrderStatus} awbOf={awbOf} />
        ) : !open ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">{loading ? "Loading…" : "No project selected — choose a sheet tab at the bottom to view its items."}</div>
        ) : view === "orders" ? (
          <OrdersView groups={vendorGroups} orderQty={orderQty} setOrderQty={setOrderQty} busyVendor={busyVendor} onSend={sendOrder} orders={projectOrders} onOpenOrder={setTrackModal} StatusBadge={OrderStatus} awbOf={awbOf} />
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Image, model and quantity mirror the approved quotation. Qty shows <span className="font-600">ordered (available in stock)</span>. Book serial numbers from stock via the pencil. <span className="font-600">Delivered</span> is tracked from delivery notes.</p>
            {(open.tables || []).length === 0 ? (
              <div className="rounded-geex border border-slate-200/70 bg-white p-10 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-[#20202c]">This project sheet has no items.</div>
            ) : (open.tables || []).map((t) => (
              <div key={t.id} className="mb-4 overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
                <div className="border-b border-slate-100 bg-slate-50 px-3 py-2.5 font-600 dark:border-white/10 dark:bg-[#191921]">{t.title || "Items"}</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Image</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="w-28 text-center">Qty (in stock)</TableHead>
                      <TableHead className="w-24 text-center">Delivered</TableHead>
                      <TableHead className="min-w-[18rem]">Serial numbers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(t.rows || []).length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-xs text-slate-400">No items.</TableCell></TableRow>
                    ) : (t.rows || []).map((r) => {
                      const selected = serials[r.id] || [];
                      const available = stockByItem[r.itemId]?.available || [];
                      const qty = Number(r.qty) || 0;
                      const full = selected.length >= qty;
                      const pick = available.filter((sn) => !pickSearch || sn.toLowerCase().includes(pickSearch.toLowerCase()));
                      return (
                        <TableRow key={r.id} className="align-top">
                          <TableCell>
                            {r.image ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={r.image} alt="" className="h-9 w-9 rounded border border-slate-200 object-contain dark:border-white/10" />
                            ) : <div className="h-9 w-9 rounded border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5" />}
                          </TableCell>
                          <TableCell className="font-600 text-slate-800 dark:text-slate-100">{r.name || "—"}</TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400">{r.model || "—"}</TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400">{vendorOf(r.itemId)}</TableCell>
                          <TableCell className="whitespace-nowrap text-center text-slate-700 dark:text-slate-200">{qty} <span className="text-slate-400">({available.length} in stock)</span></TableCell>
                          <TableCell className="text-center text-xs">
                            {(() => { const del = deliveredMap[r.itemId] || 0; const f = del >= qty && qty > 0; return <span className={f ? "font-600 text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}>{del}/{qty}</span>; })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                {selected.length === 0 ? (
                                  <span className="text-xs text-slate-400">No serials booked ({selected.length}/{qty}).</span>
                                ) : (
                                  <ul className="space-y-1">
                                    {selected.map((sn) => (
                                      <li key={sn} className="flex items-center justify-between gap-2 rounded-md bg-brand-500/10 px-2 py-1 text-xs font-600 text-brand-800 dark:text-brand-200">
                                        <span className="truncate">{sn}</span>
                                        {editRow === r.id && (<button onClick={() => toggleSerial(r, sn)} className="text-brand-700 hover:text-red-600 dark:text-brand-300" aria-label="Release serial">×</button>)}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {editRow === r.id && (
                                  <div className="mt-2 rounded-lg border border-slate-200 p-2 dark:border-white/15">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                      <input type="search" value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} placeholder="Search serials…" className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white" />
                                      <span className={`shrink-0 text-[11px] font-600 ${full ? "text-amber-600" : "text-slate-400"}`}>{selected.length}/{qty}</span>
                                    </div>
                                    {pick.length === 0 ? (
                                      <p className="px-1 py-1 text-[11px] text-slate-400">{available.length === 0 ? "No stock available for this item." : "No serials match."}</p>
                                    ) : (
                                      <div className="max-h-40 space-y-0.5 overflow-auto">
                                        {pick.map((sn) => (
                                          <button key={sn} onClick={() => toggleSerial(r, sn)} disabled={full} className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-start text-xs text-slate-700 transition-colors hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200">
                                            <Icon name="plus" className="h-3.5 w-3.5 text-brand-600" /> {sn}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    {full && <p className="mt-1 px-1 text-[11px] text-amber-600">Ordered quantity reached — release one to book another.</p>}
                                  </div>
                                )}
                              </div>
                              <button onClick={() => { setEditRow(editRow === r.id ? null : r.id); setPickSearch(""); }} title={editRow === r.id ? "Done" : "Edit serials"} aria-label={editRow === r.id ? "Done editing serials" : "Edit serials"} className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${editRow === r.id ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}>
                                <Icon name={editRow === r.id ? "check" : "pencil"} className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Sub-bar: Main | Orders (only when a project is selected) */}
      {open && !showTracking && (
        <div className="z-10 flex shrink-0 items-center gap-1.5 px-2">
          {[["main", "Main"], ["orders", "Orders"]].map(([k, lbl]) => (
            <button key={k} onClick={() => setView(k)} className={`rounded-t-md border border-b-0 px-4 py-1.5 text-sm font-600 transition-colors ${view === k ? "border-brand-500 bg-brand-500/10 text-brand-800 dark:border-brand-400 dark:text-brand-200" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:bg-[#191921] dark:text-slate-300 dark:hover:bg-white/5"}`}>{lbl}</button>
          ))}
        </div>
      )}

      {/* Bottom bar: Tracking + search + project sheet tabs + scroll arrow */}
      <div className="z-10 flex shrink-0 items-center gap-3 rounded-t-geex border border-b-0 border-slate-200/70 bg-white p-2 shadow-[0_-8px_22px_-14px_rgba(20,30,72,0.16)] dark:border-white/10 dark:bg-[#20202c]">
        <button onClick={() => setShowTracking(true)} className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-600 transition-colors ${showTracking ? "border-brand-500 bg-brand-500/10 text-brand-800 dark:border-brand-400 dark:text-brand-200" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:bg-[#191921] dark:text-slate-300 dark:hover:bg-white/5"}`}>
          <Icon name="location" className="me-1 inline h-3.5 w-3.5" /> Tracking
        </button>
        <span className="ps-1 text-sm font-600 text-slate-500 dark:text-slate-400">Search</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Project, serial № or tracking №…" className="w-56 shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white" />
        <div className="mx-1 h-6 w-px shrink-0 bg-slate-200 dark:bg-white/10" />
        <div ref={tabsRef} className="flex flex-1 items-center gap-1 overflow-x-auto scroll-smooth">
          {filtered.length === 0 ? (
            <span className="px-2 text-xs text-slate-400">{rows.length === 0 ? "No project sheets yet — created when a project is approved." : "No sheets match your search."}</span>
          ) : filtered.map((sheet) => {
            const active = !showTracking && sheet.id === openId;
            return (
              <button key={sheet.id} onClick={() => selectSheet(sheet)} title={[sheet.projectTitle, sheet.quotationNumber, sheet.clientName].filter(Boolean).join(" · ")} className={`shrink-0 whitespace-nowrap rounded-t-md border px-3 py-1.5 text-sm font-600 transition-colors ${active ? "border-brand-500 bg-brand-500/10 text-brand-800 dark:border-brand-400 dark:text-brand-200" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:bg-[#191921] dark:text-slate-300 dark:hover:bg-white/5"}`}>
                {labelFor(sheet)}
              </button>
            );
          })}
        </div>
        <button onClick={() => scrollTabs(1)} aria-label="Scroll tabs" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">
          <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:-scale-x-100" fill="currentColor"><path d="M8 5l8 7-8 7z" /></svg>
        </button>
      </div>

      {trackModal && <TrackingModal order={trackModal} onClose={() => setTrackModal(null)} onSave={saveTracking} />}
    </div>
  );
}

function OrdersView({ groups, orderQty, setOrderQty, busyVendor, onSend, orders, onOpenOrder, StatusBadge, awbOf }) {
  if (groups.length === 0) return <div className="rounded-geex border border-slate-200/70 bg-white p-10 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-[#20202c]">This project sheet has no items.</div>;
  return (
    <>
      {groups.map((g) => {
        const anyOutstanding = g.items.some((it) => it.outstanding > 0);
        const busy = busyVendor === (g.vendorId || g.vendorName);
        return (
          <div key={g.vendorId || g.vendorName} className="mb-4 overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-[#191921]">
              <span className="font-600 text-slate-800 dark:text-slate-100">{g.vendorName}</span>
              <button onClick={() => onSend(g)} disabled={busy || !anyOutstanding} title={!anyOutstanding ? "The full shortfall has already been requested" : ""} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-1.5 text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-50">
                {busy ? "Sending…" : "Send order request"}
              </button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="w-20 text-center">Needed</TableHead>
                  <TableHead className="w-20 text-center">Assigned</TableHead>
                  <TableHead className="w-20 text-center">In stock</TableHead>
                  <TableHead className="w-24 text-center">More required</TableHead>
                  <TableHead className="w-20 text-center">Ordered</TableHead>
                  <TableHead className="w-28 text-center">Order qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {g.items.map((it) => (
                  <TableRow key={it.itemId}>
                    <TableCell className="font-600 text-slate-800 dark:text-slate-100">{it.name}</TableCell>
                    <TableCell className="text-xs text-slate-500 dark:text-slate-400">{it.model || "—"}</TableCell>
                    <TableCell className="text-center">{it.needed}</TableCell>
                    <TableCell className="text-center">{it.assigned}</TableCell>
                    <TableCell className="text-center">{it.available}</TableCell>
                    <TableCell className={`text-center font-600 ${it.moreRequired > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>{it.moreRequired}</TableCell>
                    <TableCell className="text-center text-slate-500 dark:text-slate-400">{it.ordered}</TableCell>
                    <TableCell className="text-center">
                      <input type="number" min="0" max={it.outstanding} disabled={it.outstanding <= 0} value={orderQty[it.itemId] ?? it.outstanding} onChange={(e) => setOrderQty((s) => ({ ...s, [it.itemId]: Math.max(0, Math.min(it.outstanding, parseInt(e.target.value, 10) || 0)) }))} className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-sm focus:border-brand-500 focus:outline-none disabled:opacity-40 dark:border-white/15 dark:bg-[#191921] dark:text-white" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}

      {orders.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2.5 font-600 dark:border-white/10 dark:bg-[#191921]">Requested orders</div>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {orders.map((o) => (
              <li key={o.id}>
                <button onClick={() => onOpenOrder(o)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-sm transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.03]">
                  <div className="min-w-0">
                    <p className="font-600 text-slate-800 dark:text-slate-100">{o.vendorName}</p>
                    <p className="text-xs text-slate-400">{(o.items || []).map((i) => `${i.name} ×${i.qty}`).join(", ")}</p>
                    {o.trackingNumber && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-600 text-brand-700 dark:text-brand-300">
                        Tracking: {o.trackingNumber}
                        <AwbBadge shipment={awbOf(o)} />
                      </p>
                    )}
                  </div>
                  <StatusBadge status={o.status} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function TrackingList({ orders, projectsById, onOpen, StatusBadge, awbOf }) {
  if (orders.length === 0) return <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">No orders have a tracking number yet.</div>;
  return (
    <div className="overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Tracking №</TableHead>
            <TableHead>Shipment (AWB)</TableHead>
            <TableHead className="text-center">Order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => {
            const ship = awbOf ? awbOf(o) : null;
            return (
              <TableRow key={o.id} onClick={() => onOpen(o)} className="cursor-pointer hover:bg-slate-50/70 dark:hover:bg-white/[0.03]">
                <TableCell className="font-600 text-slate-800 dark:text-slate-100">{projectsById[o.projectId]?.projectNumber || o.projectName || "—"}</TableCell>
                <TableCell className="text-slate-700 dark:text-slate-200">{o.vendorName}</TableCell>
                <TableCell className="text-xs text-slate-500 dark:text-slate-400">{(o.items || []).map((i) => `${i.name} ×${i.qty}`).join(", ")}</TableCell>
                <TableCell className="font-600 text-brand-700 dark:text-brand-300">
                  {ship ? (
                    <a href="/studio/inventory/awb" onClick={(e) => e.stopPropagation()} className="hover:underline">{o.trackingNumber}</a>
                  ) : o.trackingNumber}
                </TableCell>
                <TableCell>{ship ? <AwbBadge shipment={ship} /> : <span className="text-xs text-slate-400">{o.note || "—"}</span>}</TableCell>
                <TableCell className="text-center"><StatusBadge status={o.status} /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TrackingModal({ order, onClose, onSave }) {
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || "");
  const [note, setNote] = useState(order.note || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
  async function submit() {
    setBusy(true); setErr("");
    try { await onSave(order.id, trackingNumber.trim(), note.trim()); }
    catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 font-display text-lg font-700 text-slate-900 dark:text-white">Order tracking</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{order.vendorName}{order.projectName ? ` · ${order.projectName}` : ""} — {(order.items || []).reduce((a, i) => a + (Number(i.qty) || 0), 0)} unit(s)</p>
        {err && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{err}</p>}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Tracking number</label>
            <input className={inputCls} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="AWB e.g. 176-12345675 (or a courier number)" />
            {(() => {
              const p = parseAwb(trackingNumber);
              if (!trackingNumber.trim()) return null;
              return p.valid
                ? <p className="mt-1.5 text-xs font-600 text-emerald-600 dark:text-emerald-400">✓ Valid AWB ({p.formatted}) — this shipment will appear in AWB Tracking.</p>
                : <p className="mt-1.5 text-xs text-slate-400">Not a valid AWB — stored as a plain tracking number.</p>;
            })()}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Note</label>
            <textarea rows={3} className={`${inputCls} resize-y`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Carrier, expected arrival, remarks…" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-600 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5">Cancel</button>
          <button onClick={submit} disabled={busy} className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2.5 text-sm font-600 text-white hover:bg-brand-950 disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
