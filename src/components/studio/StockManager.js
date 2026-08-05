"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { useLivePoll } from "@/lib/useLivePoll";
import { fmtSAR } from "@/lib/format";
import { confirmDialog } from "@/lib/appDialog";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const card = "overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const btnPrimary = "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

export default function StockManager() {
  const [stock, setStock] = useState([]);
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [serialDraft, setSerialDraft] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [sRes, iRes, vRes] = await Promise.all([
        fetch("/api/inventoryStock", { cache: "no-store" }),
        fetch("/api/inventoryItems", { cache: "no-store" }),
        fetch("/api/inventoryVendors", { cache: "no-store" }),
      ]);
      if (sRes.status === 403) throw new Error("You need Inventory access.");
      setStock(sRes.ok ? await sRes.json() : []);
      setItems(iRes.ok ? await iRes.json() : []);
      setVendors(vRes.ok ? await vRes.json() : []);
      setError("");
    } catch (e) {
      setError(e.message || "Could not load stock.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLivePoll(() => load(true), 5000);

  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const vendorsById = useMemo(() => Object.fromEntries(vendors.map((v) => [v.id, v])), [vendors]);
  const itemLabel = (id) => itemsById[id]?.name || "—";
  const vendorLabel = (item) => (item ? vendorsById[item.vendorId]?.name || "—" : "—");
  const qtyOf = (rec) => (Array.isArray(rec.serials) ? rec.serials.length : 0);
  // Serials booked to a project sheet are assigned out — no longer in stock.
  const assignedOf = (rec) => (Array.isArray(rec.booked) ? rec.booked.length : 0);

  const stockedItemIds = useMemo(() => new Set(stock.map((s) => s.itemId)), [stock]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stock;
    return stock.filter((rec) => {
      const it = itemsById[rec.itemId];
      return `${itemLabel(rec.itemId)} ${it?.modelNumber || ""} ${vendorLabel(it)} ${(rec.serials || []).join(" ")}`.toLowerCase().includes(q);
    });
  }, [stock, query, itemsById, vendorsById]);

  const itemMatches = useMemo(() => {
    if (!form) return [];
    const q = (form.itemQuery || "").trim().toLowerCase();
    let list = items;
    // when creating, hide items that already have a stock record
    if (form.mode === "create") list = list.filter((i) => !stockedItemIds.has(i.id));
    if (q) list = list.filter((i) => `${i.name || ""} ${i.modelNumber || ""}`.toLowerCase().includes(q));
    return list.slice(0, 8);
  }, [form, items, stockedItemIds]);

  function openCreate() {
    setForm({ mode: "create", itemId: "", itemQuery: "", serials: [] });
    setSerialDraft("");
  }
  function openEdit(rec) {
    setForm({ mode: "edit", id: rec.id, itemId: rec.itemId, itemQuery: itemLabel(rec.itemId), serials: [...(rec.serials || [])] });
    setSerialDraft("");
  }

  function addSerials() {
    const parts = serialDraft.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setForm((s) => {
      const set = new Set(s.serials);
      parts.forEach((p) => set.add(p));
      return { ...s, serials: Array.from(set) };
    });
    setSerialDraft("");
  }
  function removeSerial(sn) {
    setForm((s) => ({ ...s, serials: s.serials.filter((x) => x !== sn) }));
  }

  async function save() {
    setError("");
    if (!form.itemId) return setError("Please select an item.");
    const payload = { itemId: form.itemId, serials: form.serials };
    setSaving(true);
    try {
      const url = form.mode === "edit" ? `/api/inventoryStock/${form.id}` : "/api/inventoryStock";
      const res = await fetch(url, { method: form.mode === "edit" ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Save failed.");
      setForm(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!(await confirmDialog({ title: "Remove stock", message: "Remove this stock record? This cannot be undone.", confirmLabel: "Remove", tone: "danger" }))) return;
    try {
      const res = await fetch(`/api/inventoryStock/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Could not delete.");
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <input type="search" placeholder="Search item, vendor, serial…" value={query} onChange={(e) => setQuery(e.target.value)} className={`${input} sm:w-72`} />
        <button onClick={openCreate} className={btnPrimary}><Icon name="plus" className="h-4 w-4" /> Add stock</button>
      </div>

      {error && !form && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className={card}>
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">{stock.length === 0 ? "No stock recorded yet." : "No records match your search."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#2c2c3a] dark:text-slate-500">
                  <th className="px-5 py-3.5 text-start font-600">Item</th>
                  <th className="px-5 py-3.5 text-start font-600">Vendor</th>
                  <th className="px-5 py-3.5 text-start font-600">Quantity</th>
                  <th className="px-5 py-3.5 text-start font-600">Serial numbers</th>
                  <th className="px-5 py-3.5 text-end font-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rec) => {
                  const it = itemsById[rec.itemId];
                  const serials = rec.serials || [];
                  return (
                    <tr key={rec.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03]">
                      <td className="px-5 py-3.5 font-600 text-slate-800 dark:text-slate-100">
                        {itemLabel(rec.itemId)}
                        {it?.modelNumber && <span className="ms-1 text-xs font-400 text-slate-400">· {it.modelNumber}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{vendorLabel(it)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-600 text-brand-700 dark:text-brand-300">{qtyOf(rec)} in stock</span>
                          {assignedOf(rec) > 0 && (
                            <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-600 text-amber-700 dark:text-amber-300" title="Assigned to a project — no longer available">{assignedOf(rec)} assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="max-w-sm px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {serials.slice(0, 6).map((sn) => (
                            <span key={sn} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-white/10 dark:text-slate-300">{sn}</span>
                          ))}
                          {serials.length > 6 && <span className="text-[11px] text-slate-400">+{serials.length - 6} more</span>}
                          {serials.length === 0 && assignedOf(rec) === 0 && <span className="text-xs text-slate-400">—</span>}
                          {(rec.booked || []).slice(0, 4).map((b) => (
                            <span key={b.serial} className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px] text-amber-700 line-through dark:text-amber-300" title="Assigned to a project">{b.serial}</span>
                          ))}
                          {assignedOf(rec) > 4 && <span className="text-[11px] text-amber-600 dark:text-amber-400">+{assignedOf(rec) - 4} assigned</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => openEdit(rec)} className="rounded-md px-2.5 py-1 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-400">Edit</button>
                          <button onClick={() => remove(rec.id)} className="rounded-md px-2.5 py-1 text-xs font-600 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7">
            <h2 className="mb-5 font-display text-lg font-700 text-slate-900 dark:text-white">{form.mode === "edit" ? "Edit stock" : "Add stock"}</h2>
            {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="relative mb-4">
              <label className={label}>Item <span className="text-red-500">*</span></label>
              {form.mode === "edit" ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-600 text-slate-700 dark:border-white/15 dark:bg-[#191921] dark:text-slate-200">{form.itemQuery}</div>
              ) : (
                <>
                  <input
                    className={input}
                    placeholder="Search a registered item…"
                    value={form.itemQuery}
                    onChange={(e) => setForm((s) => ({ ...s, itemQuery: e.target.value, itemId: "" }))}
                    onFocus={() => setItemOpen(true)}
                    onBlur={() => setTimeout(() => setItemOpen(false), 120)}
                    autoComplete="off"
                  />
                  {itemOpen && itemMatches.length > 0 && (
                    <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/15 dark:bg-[#191921]">
                      {itemMatches.map((i) => (
                        <li key={i.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setForm((s) => ({ ...s, itemId: i.id, itemQuery: i.name })); setItemOpen(false); }}
                            className="flex w-full items-center gap-2 px-3.5 py-2 text-start text-sm text-slate-700 hover:bg-brand-500/10 dark:text-slate-200"
                          >
                            <span className="font-600">{i.name}</span>
                            {i.modelNumber && <span className="text-xs text-slate-400">· {i.modelNumber}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {form.mode === "create" && itemOpen && itemMatches.length === 0 && (
                    <p className="mt-1 text-xs text-slate-400">No available items — every item already has a stock record, or none are registered.</p>
                  )}
                </>
              )}
            </div>

            <div className="mb-2">
              <label className={label}>Serial numbers <span className="font-400 normal-case text-slate-400">({form.serials.length} in stock)</span></label>
              <div className="flex gap-2">
                <input
                  className={input}
                  placeholder="Enter serial(s), comma or newline separated"
                  value={serialDraft}
                  onChange={(e) => setSerialDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSerials(); } }}
                />
                <button type="button" onClick={addSerials} className={btnGhost}>Add</button>
              </div>
            </div>
            {form.serials.length > 0 && (
              <div className="mb-4 flex max-h-40 flex-wrap gap-1.5 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#191921]">
                {form.serials.map((sn) => (
                  <span key={sn} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-mono text-[11px] text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200">
                    {sn}
                    <button type="button" onClick={() => removeSerial(sn)} className="text-slate-400 hover:text-red-500" aria-label={`Remove ${sn}`}>×</button>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setForm(null)} className={btnGhost}>Cancel</button>
              <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
