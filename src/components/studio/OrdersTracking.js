"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confirmDialog } from "@/lib/appDialog";

const asArr = (v) => (Array.isArray(v) ? v : []);

// Orders & Tracking: like Project Sheets (one tab per project), but shows the
// per-item shortfall (needed − assigned − in-stock) grouped by vendor, so
// logistics can raise a material order per vendor for what's missing.
export default function OrdersTracking() {
  const [rows, setRows] = useState([]);
  const [projectsById, setProjectsById] = useState({});
  const [catalog, setCatalog] = useState({ items: {}, stock: {} });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [orderQty, setOrderQty] = useState({}); // itemId -> qty to order
  const [busyVendor, setBusyVendor] = useState("");
  const [msg, setMsg] = useState("");
  const tabsRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes, cRes, oRes] = await Promise.all([
        fetch("/api/project-sheets", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
        fetch("/api/project-sheets/catalog", { cache: "no-store" }),
        fetch("/api/material-orders", { cache: "no-store" }),
      ]);
      if (sRes.status === 403) throw new Error("You don't have access to Orders & Tracking.");
      const sheets = sRes.ok ? await sRes.json() : [];
      const projects = pRes.ok ? await pRes.json() : [];
      setProjectsById(Object.fromEntries((Array.isArray(projects) ? projects : []).map((p) => [p.id, p])));
      setCatalog(cRes.ok ? await cRes.json() : { items: {}, stock: {} });
      setOrders(oRes.ok ? await oRes.json() : []);
      setRows(Array.isArray(sheets) ? sheets : []);
      setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const labelFor = useCallback(
    (s) => projectsById[s.projectId]?.projectNumber || s.projectTitle || s.quotationNumber || "Untitled",
    [projectsById]
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => !q || `${labelFor(r)} ${r.projectTitle} ${r.clientName}`.toLowerCase().includes(q));
  }, [rows, query, labelFor]);

  const open = useMemo(() => rows.find((r) => r.id === openId) || null, [rows, openId]);

  // Aggregate items across the sheet, resolve vendor + stock, group by vendor.
  const vendorGroups = useMemo(() => {
    if (!open) return [];
    const agg = {}; // itemId -> { needed, assigned }
    for (const t of open.tables || []) for (const r of t.rows || []) {
      if (!r.itemId) continue;
      if (!agg[r.itemId]) agg[r.itemId] = { needed: 0, assigned: 0 };
      agg[r.itemId].needed += Number(r.qty) || 0;
      agg[r.itemId].assigned += asArr(r.serials).length;
    }
    const groups = {};
    for (const [itemId, a] of Object.entries(agg)) {
      const cat = catalog.items?.[itemId] || {};
      const available = asArr(catalog.stock?.[itemId]?.serials).length;
      const moreRequired = Math.max(0, a.needed - a.assigned - available);
      const vKey = cat.vendorId || "__none__";
      if (!groups[vKey]) groups[vKey] = { vendorId: cat.vendorId || "", vendorName: cat.vendorName || "Unassigned vendor", items: [] };
      groups[vKey].items.push({ itemId, name: cat.name || itemId, model: cat.model || "", needed: a.needed, assigned: a.assigned, available, moreRequired });
    }
    return Object.values(groups).sort((a, b) => a.vendorName.localeCompare(b.vendorName));
  }, [open, catalog]);

  function selectSheet(s) {
    // default the order qty to each item's shortfall
    const buf = {};
    const agg = {};
    for (const t of s.tables || []) for (const r of t.rows || []) {
      if (!r.itemId) continue;
      if (!agg[r.itemId]) agg[r.itemId] = { needed: 0, assigned: 0 };
      agg[r.itemId].needed += Number(r.qty) || 0;
      agg[r.itemId].assigned += asArr(r.serials).length;
    }
    for (const [itemId, a] of Object.entries(agg)) {
      const available = asArr(catalog.stock?.[itemId]?.serials).length;
      buf[itemId] = Math.max(0, a.needed - a.assigned - available);
    }
    setOrderQty(buf);
    setMsg(""); setError("");
    setOpenId(s.id);
  }

  const projectOrders = useMemo(() => orders.filter((o) => o.projectId === openId), [orders, openId]);

  async function sendOrder(group) {
    const items = group.items
      .map((it) => ({ itemId: it.itemId, name: it.name, model: it.model, qty: Number(orderQty[it.itemId]) || 0 }))
      .filter((it) => it.qty > 0);
    if (!items.length) { setError("Set a quantity for at least one item to order."); return; }
    const totalQty = items.reduce((a, it) => a + it.qty, 0);
    if (!(await confirmDialog({
      title: "Send order request",
      message: `Send an order request for ${items.length} item${items.length === 1 ? "" : "s"} (${totalQty} unit${totalQty === 1 ? "" : "s"}) from ${group.vendorName}? This raises a purchase-order approval task to Finance and Management.`,
      confirmLabel: "Send request",
    }))) return;
    setBusyVendor(group.vendorId || group.vendorName); setError(""); setMsg("");
    try {
      const res = await fetch("/api/material-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: open.id, projectName: open.projectTitle, vendorId: group.vendorId, vendorName: group.vendorName, items }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMsg(`Order request sent to Finance & Management for approval (${group.vendorName}).`);
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusyVendor(""); }
  }

  const scrollTabs = (dir) => tabsRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });

  return (
    <div className="-mb-8 flex h-[calc(100vh-5rem)] min-h-[520px] flex-col gap-4">
      <div className="shrink-0 rounded-geex border border-slate-200/70 bg-white p-4 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
        {open ? (
          <div>
            <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{open.projectTitle || labelFor(open)}</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Order material to cover the shortfall (needed − assigned − in stock), grouped by vendor.</p>
          </div>
        ) : (
          <div className="flex items-center justify-center py-2 text-sm text-slate-500 dark:text-slate-400">Orders &amp; Tracking — <span className="ms-1 font-600">select a project below.</span></div>
        )}
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {msg && <p className="mt-3 text-sm font-600 text-emerald-600 dark:text-emerald-400">{msg}</p>}
      </div>

      <div className="flex-1 overflow-auto rounded-geex border border-slate-200/70 bg-slate-50/50 p-4 shadow-geex-sm dark:border-white/10 dark:bg-[#191921]/40">
        {!open ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">{loading ? "Loading…" : "No project selected — choose a tab below."}</div>
        ) : vendorGroups.length === 0 ? (
          <div className="rounded-geex border border-slate-200/70 bg-white p-10 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-[#20202c]">This project sheet has no items.</div>
        ) : (
          <>
            {vendorGroups.map((g) => {
              const anyShort = g.items.some((it) => it.moreRequired > 0);
              return (
                <div key={g.vendorId || g.vendorName} className="mb-4 overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-[#191921]">
                    <span className="font-600 text-slate-800 dark:text-slate-100">{g.vendorName}</span>
                    <button onClick={() => sendOrder(g)} disabled={busyVendor === (g.vendorId || g.vendorName) || !anyShort} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-1.5 text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-50">
                      {busyVendor === (g.vendorId || g.vendorName) ? "Sending…" : "Send order request"}
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
                          <TableCell className="text-center">
                            <input type="number" min="0" value={orderQty[it.itemId] ?? 0} onChange={(e) => setOrderQty((s) => ({ ...s, [it.itemId]: Math.max(0, parseInt(e.target.value, 10) || 0) }))} className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-sm focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}

            {projectOrders.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
                <div className="border-b border-slate-100 bg-slate-50 px-3 py-2.5 font-600 dark:border-white/10 dark:bg-[#191921]">Requested orders</div>
                <ul className="divide-y divide-slate-100 dark:divide-white/5">
                  {projectOrders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-600 text-slate-800 dark:text-slate-100">{o.vendorName}</p>
                        <p className="text-xs text-slate-400">{(o.items || []).map((i) => `${i.name} ×${i.qty}`).join(", ")}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-600 ${o.status === "approved" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>{o.status === "pending-approval" ? "Pending approval" : (o.status || "requested")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Project tabs */}
      <div className="z-10 flex shrink-0 items-center gap-3 rounded-t-geex border border-b-0 border-slate-200/70 bg-white p-2 shadow-[0_-8px_22px_-14px_rgba(20,30,72,0.16)] dark:border-white/10 dark:bg-[#20202c]">
        <span className="ps-1 text-sm font-600 text-slate-500 dark:text-slate-400">Search</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Project…" className="w-48 shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-sm focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white" />
        <div className="mx-1 h-6 w-px shrink-0 bg-slate-200 dark:bg-white/10" />
        <div ref={tabsRef} className="flex flex-1 items-center gap-1 overflow-x-auto scroll-smooth">
          {filtered.length === 0 ? (
            <span className="px-2 text-xs text-slate-400">{rows.length === 0 ? "No project sheets yet." : "No projects match."}</span>
          ) : filtered.map((s) => (
            <button key={s.id} onClick={() => selectSheet(s)} className={`shrink-0 whitespace-nowrap rounded-t-md border px-3 py-1.5 text-sm font-600 transition-colors ${s.id === openId ? "border-brand-500 bg-brand-500/10 text-brand-800 dark:border-brand-400 dark:text-brand-200" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:bg-[#191921] dark:text-slate-300 dark:hover:bg-white/5"}`}>
              {labelFor(s)}
            </button>
          ))}
        </div>
        <button onClick={() => scrollTabs(1)} aria-label="Scroll tabs" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">
          <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:-scale-x-100" fill="currentColor"><path d="M8 5l8 7-8 7z" /></svg>
        </button>
      </div>
    </div>
  );
}
