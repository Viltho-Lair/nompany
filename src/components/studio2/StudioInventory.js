"use client";

import { CURRENCIES_FROM_EXCHANGE_API } from "@/lib/currencies";
import { useCallback, useEffect, useMemo, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import RecordLink from "@/components/studio2/RecordLink";
import { Icon } from "@/components/studio2/icons";
import {
  panel, h2, sub, input, inputRO, microLabel, label, btn, btnGhost, th, stripeOn, stripeOff,
  money, fmtDate, fmtDateTime, Dialog, Toolbar, Empty, StatTile,
} from "@/components/studio2/ui";
import { linkToProject, linkIf } from "@/lib/studioLinks";
import { parseAwb, formatAwb } from "@/lib/awb";
import { statusLabel, isException, AWB_STATUS_BY_CODE } from "@/lib/awbStatus";

// INVENTORY — what the studio buys, holds, and issues to its projects.
// On-hand is summed from the movement ledger, so every number here can be traced
// to the movements that produced it. Each sub-section is its own screen:
//   inventory          -> the dashboard
//   inventory-items    -> the catalogue: what can be bought
//   inventory-stock    -> what is actually held, and the ledger behind it
//   inventory-vendors  -> who it is bought from, and what they supply
//   inventory-sheets   -> per project: what was ordered for it and issued to it
//   inventory-awb      -> air freight, followed by its waybill

const ORDER_TONE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Ordered: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  "Partly received": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Received: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};
const DN_TONE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Issued: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};
const MOVE_TONE = {
  in: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  out: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  adjust: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

const td = "py-3 pe-3 align-middle";
const num = (n) => new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(Number(n) || 0);

export default function StudioInventory({ slug, view = "inventory" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/inventory`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Inventory in this studio."); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  // Stock, deliveries and orders change from the floor — stay current.
  useLiveUpdates(slug, "inventory", load);

  const send = useCallback(async (kind, method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/inventory/${kind}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(message(out)); return false; }
    await load();
    return true;
  }, [slug, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Inventory…</p>;

  const {
    canManage: canManageParent,
    canManageStock, canManageVendors, canManageItems, canManageSheets, canManageAwb,
    vendors, items, movements, orders, deliveries, projects, shipments, airlines, summary, vocabulary, nav,
  } = data;
  // MANAGE IS ASKED OF THE SCREEN BEING SHOWN — here by the canManageX flag
  // handed to each screen below, one per sub-section, each resolved from that
  // sub-section's own key. That is the same answer `manage[view]` gives, so
  // this module needs no combined flag of its own and deliberately has none:
  // a bare `canManage` in this scope is exactly the parent's answer standing in
  // for all of them, which is the thing that was wrong in the first place.
  const banner = error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>;
  const wrap = (children) => <div className="space-y-6">{banner}{children}</div>;

  if (view === "inventory-items") {
    return wrap(<Items items={items} vendors={vendors} units={vocabulary.units}
      canManage={canManageItems} busy={busy} send={send} />);
  }
  if (view === "inventory-stock") {
    return wrap(<Stock items={items} movements={movements} canManage={canManageStock} busy={busy} send={send} />);
  }
  if (view === "inventory-vendors") {
    return wrap(<Vendors rows={vendors} items={items} canManage={canManageVendors} busy={busy} send={send} />);
  }
  if (view === "inventory-sheets") {
    return wrap(<Sheets orders={orders} deliveries={deliveries} vendors={vendors} items={items}
      projects={projects} slug={slug} nav={nav} canManage={canManageSheets} busy={busy} send={send} />);
  }
  if (view === "inventory-awb") {
    return wrap(<Awb shipments={shipments} airlines={airlines} projects={projects} statuses={vocabulary.awbStatuses || []}
      slug={slug} nav={nav} canManage={canManageAwb} busy={busy} send={send} />);
  }

  // The parent section is a place of its own: its own dashboard rather than a
  // redirect into whichever sub-section came first.
  return wrap(<InventoryDashboard slug={slug} summary={summary} vendors={vendors} items={items}
    orders={orders} deliveries={deliveries} shipments={shipments} nav={nav} />);
}

function message(out) {
  if (out.error === "read-only") return "You have view-only access to this part of Inventory.";
  if (out.error === "duplicate") return "That name is already in use.";
  if (out.error === "duplicate-sku") return "That SKU is already in use.";
  if (out.error === "prefix") return "An airline prefix is exactly 3 digits.";
  if (out.error === "awb") return out.reason || "That isn't a valid AWB number.";
  if (out.error === "status") return "Pick a milestone.";
  if (out.error === "in-use") {
    const bits = [];
    if (out.movements) bits.push(`${out.movements} stock ${out.movements === 1 ? "movement" : "movements"}`);
    if (out.items) bits.push(`${out.items} ${out.items === 1 ? "item" : "items"}`);
    if (out.orders) bits.push(`${out.orders} ${out.orders === 1 ? "order" : "orders"}`);
    if (out.deliveries) bits.push(`${out.deliveries} ${out.deliveries === 1 ? "delivery" : "deliveries"}`);
    if (out.shipments) bits.push(`${out.shipments} ${out.shipments === 1 ? "shipment" : "shipments"}`);
    return `Still referenced by ${bits.join(" and ")} — that history can't be erased.`;
  }
  if (out.error === "insufficient") {
    if (Array.isArray(out.short) && out.short.length) {
      return `Not enough stock: ${out.short.map((s) => `need ${num(s.needed)}, have ${num(s.have)}`).join("; ")}.`;
    }
    return `Not enough stock — you have ${num(out.have)} and asked for ${num(out.needed)}.`;
  }
  if (out.error === "over-receive") return `That's more than the order still expects (${num(out.remaining)} outstanding).`;
  if (out.error === "received-already") return "Goods have already been received against this order — cancel it instead.";
  if (out.error === "already-issued") return "That delivery has already been issued.";
  if (out.error === "derived-status") return "Received status follows the goods — record what arrived instead.";
  if (out.error === "not-ordered") return "Mark the order as Ordered before receiving against it.";
  if (out.error === "lines") return "Add at least one line with a quantity.";
  if (out.error === "vendor") return "Pick a vendor.";
  if (out.error === "project") return "Pick a project.";
  if (out.error === "nothing") return "Enter what actually arrived.";
  return "That didn't save.";
}

// ---- dashboard -------------------------------------------------------------
function InventoryDashboard({ slug, summary, vendors, items, orders, deliveries, shipments, nav }) {
  const href = (key) => (nav?.[key] ? `/${slug}/${key}` : "");
  const sections = [
    { key: "inventory-items", label: "Registered Items", desc: "The catalogue, by vendor", icon: "services" },
    { key: "inventory-stock", label: "Stock Management", desc: "What is held, and the ledger behind it", icon: "blueprint" },
    { key: "inventory-vendors", label: "Vendors", desc: "Who you buy from, and what they supply", icon: "vendors" },
    { key: "inventory-sheets", label: "Project Sheets", desc: "Ordered for and issued to each project", icon: "report" },
    { key: "inventory-awb", label: "AWB Tracking", desc: "Air freight, by waybill", icon: "external" },
  ];

  return (
    <>
      <section className={panel}>
        <h2 className={h2}>Inventory</h2>
        <p className={sub}>Vendors, the catalogue, what is on the shelf, and what is still in the air.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Vendors" value={vendors.length} href={href("inventory-vendors")} />
          <StatTile label="Registered items" value={items.length} href={href("inventory-items")} />
          <StatTile label="Units in stock" value={num(summary.units)} href={href("inventory-stock")} />
          <StatTile label="Stock value" value={money(summary.value)} href={href("inventory-stock")} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatTile label="Below reorder" value={num(summary.low)}
            tone={summary.low > 0 ? "text-amber-700 dark:text-amber-300" : ""} href={href("inventory-stock")} />
          <StatTile label="Orders awaiting" value={num(summary.awaiting)} href={href("inventory-sheets")} />
          <StatTile label="In transit" value={num(summary.inTransit)} href={href("inventory-awb")} />
        </div>
      </section>

      <section className={panel}>
        <p className={microLabel}>Sections</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((s) => {
            const to = href(s.key);
            const body = (
              <>
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-700 text-slate-900 dark:text-white">{s.label}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{s.desc}</span>
                </span>
              </>
            );
            const cls = "flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/15 dark:bg-[#191921]";
            return to ? (
              <a key={s.key} href={to} className={`${cls} transition-colors hover:border-brand-500 dark:hover:border-brand-500/40`}>{body}</a>
            ) : (
              // No grant for that sub-section — the card still says what exists,
              // it just doesn't pretend to be a way in.
              <div key={s.key} className={`${cls} opacity-60`}>{body}</div>
            );
          })}
        </div>
      </section>
    </>
  );
}

// ---- registered items (the catalogue) --------------------------------------
function Items({ items, vendors, units, canManage, busy, send }) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null);
  const closeForm = useCallback(() => setForm(null), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.name} ${i.sku} ${i.modelNumber || ""} ${i.vendorName || ""} ${i.category || ""}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <>
      <Toolbar canManage={canManage} label="Add item" onAdd={() => setForm({ row: null })}>
        {items.length > 0 && (
          <input type="search" className={`${input} sm:max-w-xs`} placeholder="Search name, SKU, model or vendor…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
      </Toolbar>

      {form && (
        <Dialog title={form.row ? `Edit ${form.row.name}` : "Add item"}
          description="The catalogue entry — what this thing is and who supplies it. Quantities live in Stock Management."
          onClose={closeForm}>
          <ItemForm row={form.row} vendors={vendors} units={units} busy={busy} onCancel={closeForm}
            onSave={async (v) => { if (await send("items", form.row ? "PUT" : "POST", form.row ? { ...v, id: form.row.id } : v)) setForm(null); }} />
        </Dialog>
      )}

      {items.length === 0 ? (
        <Empty title="Nothing registered yet" body="Register the things you buy. Quantities come from receiving orders and issuing deliveries." />
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} of {items.length} item{items.length === 1 ? "" : "s"}.</p>
          <section className={panel}>
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">No items match that search.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10">
                      {["Item", "Vendor", "Type", "Scope", "Unit cost", "On hand"].map((head, i) => (
                        <th key={head} className={`${th} ${i >= 4 ? "text-end" : "text-start"}`}>{head}</th>
                      ))}
                      <th className={`${th} text-end`} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((i) => (
                      <tr key={i.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                        <td className={td}>
                          <span className="font-mono text-xs text-slate-400">{i.sku}</span>
                          <span className="ms-2 font-600 text-slate-900 dark:text-white">{i.name}</span>
                          {i.modelNumber && <div className="text-xs text-slate-400">{i.modelNumber}</div>}
                        </td>
                        <td className={`${td} text-slate-600 dark:text-slate-300`}>{i.vendorName || "—"}</td>
                        <td className={`${td} text-slate-600 dark:text-slate-300`}>
                          {i.itemType || "—"}
                          {i.deliveryWeeks !== "" && i.deliveryWeeks != null && (
                            <span className="ms-1 text-xs text-slate-400">· {i.deliveryWeeks} wk</span>
                          )}
                        </td>
                        <td className={td}>
                          <span className="flex flex-wrap gap-1">
                            {i.needsInstallation && <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-600 text-brand-700 dark:text-brand-300">Installation</span>}
                            {i.needsProgramming && <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-600 text-brand-700 dark:text-brand-300">Programming</span>}
                            {!i.needsInstallation && !i.needsProgramming && <span className="text-slate-400">—</span>}
                          </span>
                        </td>
                        <td className={`${td} text-end tabular-nums text-slate-600 dark:text-slate-300`}>{i.unitCost > 0 ? money(i.unitCost) : "—"}</td>
                        <td className={`${td} text-end font-600 text-slate-900 dark:text-white`}>
                          {num(i.onHand)} <span className="text-xs font-400 text-slate-400">{i.unit}</span>
                        </td>
                        <td className={`${td} text-end`}>
                          {canManage && (
                            <span className="inline-flex gap-2">
                              <button className={btnGhost} onClick={() => setForm({ row: i })}>Edit</button>
                              <button className={btnGhost} disabled={busy} onClick={() => send("items", "DELETE", { id: i.id })}>Delete</button>
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
        </>
      )}
    </>
  );
}

// HALF A MEGABYTE, deliberately: an item picture is a thumbnail in a quotation
// table, not a photograph. The cap is checked before the upload leaves the
// browser so somebody dragging a 12 MP photo in is told immediately.
const MAX_ITEM_IMAGE = 500 * 1024;

function ItemImage({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Choose an image file."); return; }
    if (file.size > MAX_ITEM_IMAGE) { setErr("Images must be 500 KB or smaller."); return; }
    setBusy(true); setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      const up = await fetch("/api/media", { method: "POST", body: form });
      const media = await up.json().catch(() => ({}));
      if (!up.ok || !media.url) throw new Error("upload");
      onChange(media.url);
    } catch { setErr("We couldn't upload that image."); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <label className={label}>Image <span className="font-400 normal-case text-slate-400">(500 KB max)</span></label>
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-white/15 dark:bg-[#191921]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt="" className="h-full w-full object-cover" />
                 : <Icon name="services" className="h-5 w-5 text-slate-300" />}
        </span>
        <div className="min-w-0">
          <input type="file" accept="image/*" disabled={busy}
            className="block w-full text-xs text-slate-500 file:me-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-600 file:text-slate-700 dark:file:bg-white/10 dark:file:text-slate-200"
            onChange={(e) => pick(e.target.files?.[0])} />
          {value && !busy && (
            <button type="button" className="mt-1 text-xs text-slate-400 hover:text-rose-600" onClick={() => onChange("")}>Remove</button>
          )}
          {busy && <p className="mt-1 text-xs text-slate-400">Uploading…</p>}
          {err && <p className="mt-1 text-xs text-rose-600">{err}</p>}
        </div>
      </div>
    </div>
  );
}

function ItemForm({ row, vendors, units, busy, onSave, onCancel }) {
  const [f, setF] = useState({
    name: row?.name || "", sku: row?.sku || "", modelNumber: row?.modelNumber || "",
    unit: row?.unit || units[0], category: row?.category || "", vendorId: row?.vendorId || "",
    itemType: row?.itemType || "", deliveryWeeks: row?.deliveryWeeks ?? "",
    needsInstallation: !!row?.needsInstallation, needsProgramming: !!row?.needsProgramming,
    reorderLevel: row?.reorderLevel || "", unitCost: row?.unitCost || "", notes: row?.notes || "",
    currency: row?.currency || "", image: row?.image || "",
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const vendor = vendors.find((v) => v.id === f.vendorId);
  const types = Array.isArray(vendor?.itemTypes) ? vendor.itemTypes : [];

  // Picking a type takes the vendor's own delivery estimate with it — that is
  // the point of keeping the estimate on the vendor rather than on each item.
  function pickType(type) {
    const match = types.find((t) => t.type === type);
    setF((s) => ({ ...s, itemType: type, deliveryWeeks: match ? (match.weeks ?? "") : "" }));
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={label}>Name *</label><input className={input} value={f.name} onChange={set("name")} /></div>
        <div><label className={label}>Model number</label><input className={input} value={f.modelNumber} onChange={set("modelNumber")} placeholder="The vendor's part number" /></div>
        <div><label className={label}>SKU</label><input className={input} value={f.sku} onChange={set("sku")} placeholder="auto" /></div>
        <div>
          <label className={label}>Unit</label>
          <select className={input} value={f.unit} onChange={set("unit")}>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Vendor</label>
          <select className={input} value={f.vendorId}
            onChange={(e) => setF((s) => ({ ...s, vendorId: e.target.value, itemType: "", deliveryWeeks: "" }))}>
            <option value="">—</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>
            Type of item
            {f.itemType && f.deliveryWeeks !== "" && (
              <span className="font-500 normal-case text-slate-400"> · est. {f.deliveryWeeks} week{Number(f.deliveryWeeks) === 1 ? "" : "s"}</span>
            )}
          </label>
          {!f.vendorId ? (
            <p className="pt-2 text-sm text-slate-400">Pick a vendor first.</p>
          ) : types.length === 0 ? (
            <p className="pt-2 text-sm text-slate-400">This vendor has no item types yet — add them on the vendor.</p>
          ) : (
            <select className={input} value={f.itemType} onChange={(e) => pickType(e.target.value)}>
              <option value="">— select type —</option>
              {types.map((t) => (
                <option key={t.type} value={t.type}>{t.type}{t.weeks !== "" && t.weeks != null ? ` (${t.weeks} wk)` : ""}</option>
              ))}
            </select>
          )}
        </div>
        <div><label className={label}>Category</label><input className={input} value={f.category} onChange={set("category")} /></div>
        <div className="grid grid-cols-[1fr,7.5rem] gap-3">
          <div><label className={label}>Unit cost</label><input type="number" min="0" step="0.01" className={input} value={f.unitCost} onChange={set("unitCost")} /></div>
          {/* What that cost is IN. Blank means the studio's own currency, so an
              item priced in the studio's money needs nothing said about it. */}
          <div>
            <label className={label}>Currency</label>
            <select className={input} value={f.currency} onChange={set("currency")}>
              <option value="">Studio</option>
              {CURRENCIES_FROM_EXCHANGE_API.map((c) => (<option key={c.code} value={c.code}>{c.code}</option>))}
            </select>
          </div>
        </div>
        <div><label className={label}>Reorder level</label><input type="number" min="0" className={input} value={f.reorderLevel} onChange={set("reorderLevel")} /></div>
        <ItemImage value={f.image} onChange={(v) => setF((st) => ({ ...st, image: v }))} />
      </div>

      <div className="mt-4">
        <label className={label}>Scope <span className="font-400 normal-case text-slate-400">(does this need fitting or configuring once it lands?)</span></label>
        <div className="flex flex-wrap gap-3">
          {[["needsInstallation", "Installation"], ["needsProgramming", "Programming"]].map(([k, text]) => (
            <label key={k} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-600 text-slate-700 dark:border-white/15 dark:bg-[#191921] dark:text-slate-200">
              <input type="checkbox" checked={f[k]} onChange={(e) => setF((s) => ({ ...s, [k]: e.target.checked }))} className="h-4 w-4 accent-brand-600" />
              {text}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4"><label className={label}>Notes</label><textarea rows={2} className={input} value={f.notes} onChange={set("notes")} /></div>

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !f.name.trim()} onClick={() => onSave(f)}>{busy ? "Saving…" : "Save item"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

// ---- stock management ------------------------------------------------------
function Stock({ items, movements, canManage, busy, send }) {
  const [tab, setTab] = useState("onhand");
  const [query, setQuery] = useState("");
  const [adjusting, setAdjusting] = useState(null);
  const [serialsFor, setSerialsFor] = useState(null);
  const closeAdjust = useCallback(() => setAdjusting(null), []);
  const closeSerials = useCallback(() => setSerialsFor(null), []);

  // Keep the open serial dialog on the freshly loaded row after a save.
  useEffect(() => {
    setSerialsFor((cur) => (cur ? items.find((i) => i.id === cur.id) || null : null));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.name} ${i.sku} ${i.vendorName || ""} ${(i.serials || []).join(" ")}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-slate-200 p-0.5 dark:border-white/15">
          {[["onhand", "On hand"], ["movements", "Movements"]].map(([k, text]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-600 transition-colors ${tab === k ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>
              {text}
            </button>
          ))}
        </div>
        {tab === "onhand" && items.length > 0 && (
          <input type="search" className={`${input} sm:max-w-xs`} placeholder="Search item, vendor or serial…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
        {!canManage && <span className="ms-auto rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>}
      </div>

      {adjusting && (
        <Dialog title={`Adjust stock — ${adjusting.name}`}
          description={`On hand: ${num(adjusting.onHand)} ${adjusting.unit}. A positive number adds, a negative one removes.`}
          onClose={closeAdjust} width="max-w-[520px]">
          <AdjustForm item={adjusting} busy={busy} onCancel={closeAdjust}
            onSave={async (v) => { if (await send("stock", "POST", { ...v, itemId: adjusting.id })) setAdjusting(null); }} />
        </Dialog>
      )}

      {serialsFor && (
        <Dialog title={`Serial numbers — ${serialsFor.name}`}
          description="Which units are held. On-hand still comes from the ledger; this records the individual pieces behind it."
          onClose={closeSerials} width="max-w-[620px]">
          <SerialsForm item={serialsFor} busy={busy} canManage={canManage} onCancel={closeSerials}
            onSave={async (serials) => { await send("items", "PUT", { id: serialsFor.id, serials }); }} />
        </Dialog>
      )}

      {tab === "movements" ? (
        <Movements rows={movements} />
      ) : items.length === 0 ? (
        <Empty title="Nothing in stock yet" body="Register items first, then receive an order against them — that is what brings stock in." />
      ) : (
        <section className={panel}>
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Nothing matches that search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    {["Item", "Vendor", "Serials", "On hand", "Reorder"].map((head, i) => (
                      <th key={head} className={`${th} ps-2 ${i >= 3 ? "text-end" : "text-start"}`}>{head}</th>
                    ))}
                    <th className={`${th} text-end`} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => (
                    // Below its reorder level is the row that needs acting on.
                    <tr key={i.id} className={`border-s-4 border-b border-slate-100 last:border-b-0 dark:border-white/5 ${i.low ? stripeOn : stripeOff}`}>
                      <td className={`${td} ps-2`}>
                        <span className="font-mono text-xs text-slate-400">{i.sku}</span>
                        <span className="ms-2 font-600 text-slate-900 dark:text-white">{i.name}</span>
                        {i.low && <span className="ms-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-600 text-amber-700 dark:text-amber-300">Low</span>}
                      </td>
                      <td className={`${td} ps-2 text-slate-600 dark:text-slate-300`}>{i.vendorName || "—"}</td>
                      <td className={`${td} ps-2`}>
                        {(i.serials || []).length === 0 ? <span className="text-slate-400">—</span> : (
                          <span className="flex flex-wrap items-center gap-1">
                            {i.serials.slice(0, 4).map((sn) => (
                              <span key={sn} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-white/10 dark:text-slate-300">{sn}</span>
                            ))}
                            {i.serials.length > 4 && <span className="text-[11px] text-slate-400">+{i.serials.length - 4} more</span>}
                            {i.serialMismatch && (
                              <span title={`${i.serials.length} serials recorded against ${num(i.onHand)} on hand`}
                                className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-600 text-amber-700 dark:text-amber-300">
                                {i.serials.length} ≠ {num(i.onHand)}
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className={`${td} ps-2 text-end font-600 text-slate-900 dark:text-white`}>
                        {num(i.onHand)} <span className="text-xs font-400 text-slate-400">{i.unit}</span>
                      </td>
                      <td className={`${td} ps-2 text-end text-slate-500 dark:text-slate-400`}>{i.reorderLevel > 0 ? num(i.reorderLevel) : "—"}</td>
                      <td className={`${td} text-end`}>
                        <span className="inline-flex flex-wrap justify-end gap-2">
                          <button className={btnGhost} onClick={() => setSerialsFor(i)}>Serials</button>
                          {canManage && <button className={btnGhost} onClick={() => setAdjusting(i)}>Adjust</button>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function AdjustForm({ item, busy, onSave, onCancel }) {
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const after = Number(item.onHand) + (Number(qty) || 0);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={label}>Quantity *</label><input type="number" className={input} value={qty} onChange={(e) => setQty(e.target.value)} /></div>
        <div><label className={label}>Reason</label><input className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. stock-take correction" /></div>
      </div>
      {qty !== "" && (
        <p className={`mt-3 text-sm ${after < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
          {after < 0 ? "That would take on-hand below zero." : <>On hand would become <span className="font-600">{num(after)} {item.unit}</span>.</>}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || qty === "" || Number(qty) === 0} onClick={() => onSave({ qty, reason })}>
          {busy ? "Saving…" : "Record adjustment"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

function SerialsForm({ item, busy, canManage, onSave, onCancel }) {
  const [serials, setSerials] = useState(item.serials || []);
  const [draft, setDraft] = useState("");
  useEffect(() => { setSerials(item.serials || []); }, [item.serials]);

  // Serials arrive pasted off a packing list, so commas and newlines both split.
  function add() {
    const parts = draft.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setSerials((cur) => [...new Set([...cur, ...parts])]);
    setDraft("");
  }

  return (
    <>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {serials.length} recorded against <span className="font-600">{num(item.onHand)} {item.unit}</span> on hand.
        {item.serialMismatch && <span className="text-amber-600 dark:text-amber-400"> They disagree — stock has moved without its serial being noted.</span>}
      </p>

      {canManage && (
        <div className="mt-4 flex gap-2">
          <input className={input} placeholder="Enter serial(s), comma or newline separated" value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
          <button type="button" className={btnGhost} onClick={add}>Add</button>
        </div>
      )}

      {serials.length > 0 && (
        <div className="mt-3 flex max-h-52 flex-wrap gap-1.5 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/15 dark:bg-[#191921]">
          {serials.map((sn) => (
            <span key={sn} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-mono text-[11px] text-slate-700 dark:bg-white/10 dark:text-slate-200">
              {sn}
              {canManage && (
                <button type="button" aria-label={`Remove ${sn}`} className="text-slate-400 hover:text-rose-600"
                  onClick={() => setSerials((cur) => cur.filter((x) => x !== sn))}>×</button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        {canManage && <button className={btn} disabled={busy} onClick={() => onSave(serials)}>{busy ? "Saving…" : "Save serials"}</button>}
        <button className={btnGhost} onClick={onCancel}>Close</button>
      </div>
    </>
  );
}

function Movements({ rows }) {
  if (rows.length === 0) {
    return <Empty title="No stock movements yet" body="Every receipt, issue and adjustment lands here — this ledger is where on-hand quantities come from." />;
  }
  return (
    <section className={panel}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10">
              {["When", "Item", "Movement", "Qty", "Reason", "By"].map((head, i) => (
                <th key={head} className={`${th} ${i === 3 ? "text-end" : "text-start"}`}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                <td className={`${td} text-slate-500 dark:text-slate-400`}>{fmtDate(m.at)}</td>
                <td className={`${td} text-slate-900 dark:text-white`}>{m.itemLabel}</td>
                <td className={td}><span className={`rounded-full px-2.5 py-1 text-xs font-600 ${MOVE_TONE[m.kind]}`}>{m.kind}</span></td>
                <td className={`${td} text-end font-600 tabular-nums text-slate-900 dark:text-white`}>
                  {m.kind === "out" ? "−" : m.kind === "adjust" && m.qty < 0 ? "" : "+"}{num(Math.abs(m.qty))}
                </td>
                <td className={`${td} text-slate-500 dark:text-slate-400`}>{m.reason || "—"}</td>
                <td className={`${td} text-slate-500 dark:text-slate-400`}>{m.byAlias || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---- vendors ---------------------------------------------------------------
function Vendors({ rows, items, canManage, busy, send }) {
  const [form, setForm] = useState(null);
  const closeForm = useCallback(() => setForm(null), []);
  const itemCount = useMemo(() => {
    const counts = {};
    for (const i of items) if (i.vendorId) counts[i.vendorId] = (counts[i.vendorId] || 0) + 1;
    return counts;
  }, [items]);

  return (
    <>
      <Toolbar canManage={canManage} label="Add vendor" onAdd={() => setForm({ row: null })} />

      {form && (
        <Dialog title={form.row ? `Edit ${form.row.name}` : "Add vendor"}
          description="Who you buy from, and what they supply — the item types here are what an item picks its delivery estimate from."
          onClose={closeForm}>
          <VendorForm row={form.row} busy={busy} onCancel={closeForm}
            onSave={async (v) => { if (await send("vendors", form.row ? "PUT" : "POST", form.row ? { ...v, id: form.row.id } : v)) setForm(null); }} />
        </Dialog>
      )}

      {rows.length === 0 ? (
        <Empty title="No vendors yet" body="Vendors are who you buy from. Items and orders point at them." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((v) => (
            <section key={v.id} className={panel}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{v.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {[v.contactName, v.email, v.phone].filter(Boolean).join(" · ") || "No contact details"}
                  </p>
                </div>
                {canManage && (
                  <span className="flex shrink-0 gap-2">
                    <button className={btnGhost} onClick={() => setForm({ row: v })}>Edit</button>
                    <button className={btnGhost} disabled={busy} onClick={() => send("vendors", "DELETE", { id: v.id })}>Delete</button>
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400">{itemCount[v.id] || 0} registered item{(itemCount[v.id] || 0) === 1 ? "" : "s"}</p>
              {(v.itemTypes || []).length > 0 && (
                <div className="mt-3">
                  <p className={microLabel}>Supplies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {v.itemTypes.map((t) => (
                      <span key={t.type} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-600 text-slate-700 dark:bg-white/5 dark:text-slate-200">
                        {t.type}
                        {t.weeks !== "" && t.weeks != null && <span className="ms-1 font-400 text-slate-400">{t.weeks} wk</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function VendorForm({ row, busy, onSave, onCancel }) {
  const [f, setF] = useState({
    name: row?.name || "", contactName: row?.contactName || "", email: row?.email || "",
    phone: row?.phone || "", notes: row?.notes || "",
  });
  const [types, setTypes] = useState(row?.itemTypes || []);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setType = (i, k, v) => setTypes((cur) => cur.map((t, n) => (n === i ? { ...t, [k]: v } : t)));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={label}>Name *</label><input className={input} value={f.name} onChange={set("name")} /></div>
        <div><label className={label}>Contact</label><input className={input} value={f.contactName} onChange={set("contactName")} /></div>
        <div><label className={label}>Email</label><input type="email" className={input} value={f.email} onChange={set("email")} /></div>
        <div><label className={label}>Phone</label><input className={input} value={f.phone} onChange={set("phone")} /></div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={microLabel}>Item types</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">What this vendor supplies, and how long each kind takes. An item picking a type takes the estimate with it.</p>
          </div>
          <button type="button" className={btnGhost} onClick={() => setTypes((cur) => [...cur, { type: "", weeks: "" }])}>Add type</button>
        </div>
        {types.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">None yet.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {types.map((t, i) => (
              <div key={i} className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/15 dark:bg-[#191921]">
                <div className="flex-1"><label className={microLabel}>Type</label><input className={input} value={t.type} onChange={(e) => setType(i, "type", e.target.value)} placeholder="Cameras" /></div>
                <div className="w-32"><label className={microLabel}>Weeks</label><input type="number" min="0" className={input} value={t.weeks} onChange={(e) => setType(i, "weeks", e.target.value)} /></div>
                <button type="button" aria-label="Remove" title="Remove"
                  className="mb-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-rose-600 dark:hover:bg-white/5"
                  onClick={() => setTypes((cur) => cur.filter((_, n) => n !== i))}>
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4"><label className={label}>Notes</label><textarea rows={2} className={input} value={f.notes} onChange={set("notes")} /></div>

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !f.name.trim()} onClick={() => onSave({ ...f, itemTypes: types })}>{busy ? "Saving…" : "Save vendor"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

// ---- project sheets --------------------------------------------------------
// One sheet per project: what was ordered for it, and what has been issued to
// it. Grouped by project rather than listed flat, because the question this
// screen answers is always "where is this project's material?".
function Sheets({ orders, deliveries, vendors, items, projects, slug, nav, canManage, busy, send }) {
  const [drafting, setDrafting] = useState(null); // "order" | "delivery"
  const [receiving, setReceiving] = useState(null);
  const closeDraft = useCallback(() => setDrafting(null), []);
  const closeReceive = useCallback(() => setReceiving(null), []);

  const groups = useMemo(() => {
    const byId = new Map();
    const add = (id, number, key, row) => {
      if (!byId.has(id)) byId.set(id, { id, number, orders: [], deliveries: [] });
      byId.get(id)[key].push(row);
    };
    for (const o of orders) add(o.projectId || "", o.projectNumber || "", "orders", o);
    for (const d of deliveries) add(d.projectId || "", d.projectNumber || "", "deliveries", d);
    return [...byId.values()].sort((a, b) => {
      // The unassigned pile sorts last — it is the leftovers, not a project.
      if (!a.id) return 1;
      if (!b.id) return -1;
      return String(a.number).localeCompare(String(b.number));
    });
  }, [orders, deliveries]);

  const canOrder = vendors.length > 0 && items.length > 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canManage ? (
          <>
            <button className={btn} onClick={() => setDrafting("order")} disabled={!canOrder}
              title={!canOrder ? "Add a vendor and at least one item first" : undefined}>New order</button>
            <button className={btnGhost} onClick={() => setDrafting("delivery")} disabled={projects.length === 0 || items.length === 0}
              title={projects.length === 0 ? "Deliveries go out to a project — open one first" : undefined}>New delivery note</button>
          </>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>
        )}
      </div>

      {drafting === "order" && (
        <Dialog title="New purchase order" description="What you are asking a vendor for. Receiving against it is what brings the stock in." onClose={closeDraft}>
          <LineForm items={items} priced busy={busy} onCancel={closeDraft}
            extra={[
              { key: "vendorId", label: "Vendor", required: true, options: vendors.map((v) => ({ value: v.id, text: v.name })) },
              { key: "projectId", label: "For project", options: [{ value: "", text: "—" }, ...projects.map((p) => ({ value: p.id, text: p.number }))] },
              { key: "expectedAt", label: "Expected", type: "date" },
            ]}
            onSave={async (v) => { if (await send("orders", "POST", v)) setDrafting(null); }} />
        </Dialog>
      )}

      {drafting === "delivery" && (
        <Dialog title="New delivery note" description="Issuing it is what takes the stock out." onClose={closeDraft}>
          <LineForm items={items} busy={busy} onCancel={closeDraft}
            extra={[{ key: "projectId", label: "To project", required: true, options: projects.map((p) => ({ value: p.id, text: p.number })) }]}
            onSave={async (v) => { if (await send("deliveries", "POST", v)) setDrafting(null); }} />
        </Dialog>
      )}

      {receiving && (
        <Dialog title={`Receive against ${receiving.reference}`} description="Record what actually arrived — this is what brings the stock in." onClose={closeReceive}>
          <Receive order={receiving} busy={busy} onCancel={closeReceive}
            onSave={async (lines) => { if (await send("orders", "PUT", { id: receiving.id, receive: lines })) setReceiving(null); }} />
        </Dialog>
      )}

      {groups.length === 0 ? (
        <Empty title="No project sheets yet" body="A sheet builds itself: order material for a project, then issue it. Both sides show up here under that project." />
      ) : groups.map((g) => (
        <section key={g.id || "unassigned"} className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">
                {g.id ? (g.number || "Project") : "Not assigned to a project"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {g.orders.length} order{g.orders.length === 1 ? "" : "s"} · {g.deliveries.length} delivery note{g.deliveries.length === 1 ? "" : "s"}
              </p>
            </div>
            {g.id && (
              <RecordLink href={linkIf(nav?.projects, linkToProject(slug, g.id))} title="Open the project">{g.number || "project"}</RecordLink>
            )}
          </div>

          {g.orders.length > 0 && (
            <div className="mt-4">
              <p className={microLabel}>Ordered</p>
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {g.orders.map((o) => (
                  <li key={o.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-slate-400">{o.reference}</span>
                          <span className="font-600 text-slate-900 dark:text-white">{o.vendorName}</span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${ORDER_TONE[o.status]}`}>{o.status}</span>
                        </div>
                        <ul className="mt-1.5 space-y-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {o.lines.map((l) => (
                            <li key={l.itemId}>
                              {l.itemLabel} — {num(l.qty)}
                              {l.received > 0 && <span className="text-emerald-600 dark:text-emerald-400"> · {num(l.received)} received</span>}
                              {l.unitPrice > 0 && <span className="text-slate-400"> · {money(l.unitPrice)} each</span>}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1 text-xs text-slate-400">
                          Total {money(o.total)}{o.expectedAt ? ` · expected ${fmtDate(o.expectedAt)}` : ""}
                        </p>
                      </div>
                      {canManage && (
                        <div className="flex flex-wrap gap-2">
                          {o.status === "Draft" && <button className={btn} disabled={busy} onClick={() => send("orders", "PUT", { id: o.id, status: "Ordered" })}>Mark ordered</button>}
                          {(o.status === "Ordered" || o.status === "Partly received") && <button className={btn} onClick={() => setReceiving(o)}>Receive</button>}
                          {o.status !== "Cancelled" && o.status !== "Received" && (
                            <button className={btnGhost} disabled={busy} onClick={() => send("orders", "PUT", { id: o.id, status: "Cancelled" })}>Cancel</button>
                          )}
                          {o.outstanding === o.lines.reduce((n, l) => n + l.qty, 0) && (
                            <button className={btnGhost} disabled={busy} onClick={() => send("orders", "DELETE", { id: o.id })}>Delete</button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {g.deliveries.length > 0 && (
            <div className="mt-4">
              <p className={microLabel}>Issued</p>
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {g.deliveries.map((d) => (
                  <li key={d.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-slate-400">{d.reference}</span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${DN_TONE[d.status]}`}>{d.status}</span>
                        </div>
                        <ul className="mt-1.5 space-y-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {d.lines.map((l) => <li key={l.itemId}>{l.itemLabel} — {num(l.qty)}</li>)}
                        </ul>
                        {d.status === "Issued" && (
                          <p className="mt-1 text-xs text-slate-400">Issued {fmtDate(d.issuedAt)}{d.issuedByAlias ? ` by ${d.issuedByAlias}` : ""}</p>
                        )}
                      </div>
                      {canManage && d.status === "Draft" && (
                        <div className="flex flex-wrap gap-2">
                          <button className={btn} disabled={busy} onClick={() => send("deliveries", "PUT", { id: d.id })}>Issue</button>
                          <button className={btnGhost} disabled={busy} onClick={() => send("deliveries", "DELETE", { id: d.id })}>Delete</button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}
    </>
  );
}

function Receive({ order, busy, onCancel, onSave }) {
  const outstanding = order.lines.filter((l) => l.qty - (l.received || 0) > 0);
  const [got, setGot] = useState(() => Object.fromEntries(outstanding.map((l) => [l.itemId, String(l.qty - (l.received || 0))])));

  return (
    <>
      <div className="space-y-3">
        {outstanding.map((l) => (
          <div key={l.itemId} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className={label}>{l.itemLabel}</label>
              <input type="number" className={input} value={got[l.itemId] ?? ""}
                onChange={(e) => setGot((g) => ({ ...g, [l.itemId]: e.target.value }))} />
            </div>
            <span className="pb-3 text-xs text-slate-400">{num(l.qty - (l.received || 0))} outstanding</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy}
          onClick={() => onSave(Object.entries(got).map(([itemId, qty]) => ({ itemId, qty: Number(qty) || 0 })).filter((l) => l.qty > 0))}>
          {busy ? "Recording…" : "Record receipt"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

// Orders and delivery notes are the same shape — a header plus item lines — so
// they share one form. `priced` adds the unit-price column that only orders use.
function LineForm({ extra, items, priced, busy, onCancel, onSave }) {
  const [head, setHead] = useState(() => Object.fromEntries(extra.map((f) => [f.key, f.options ? (f.options[0]?.value ?? "") : ""])));
  const [lines, setLines] = useState([{ itemId: "", qty: "", unitPrice: "" }]);

  const setLine = (i, k, v) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, [k]: v } : l)));
  const filled = lines.filter((l) => l.itemId && Number(l.qty) > 0);
  const ready = extra.filter((f) => f.required).every((f) => head[f.key]) && filled.length > 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {extra.map((f) => (
          <div key={f.key}>
            <label className={label}>{f.label}{f.required && <span className="text-rose-500"> *</span>}</label>
            {f.options ? (
              <select className={input} value={head[f.key]} onChange={(e) => setHead((h) => ({ ...h, [f.key]: e.target.value }))}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
              </select>
            ) : (
              <input type={f.type || "text"} className={input} value={head[f.key]} onChange={(e) => setHead((h) => ({ ...h, [f.key]: e.target.value }))} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className={label}>Item</label>
              <select className={input} value={l.itemId} onChange={(e) => setLine(i, "itemId", e.target.value)}>
                <option value="">Choose…</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.sku} · {it.name}</option>)}
              </select>
            </div>
            <div className="w-28">
              <label className={label}>Qty</label>
              <input type="number" className={input} value={l.qty} onChange={(e) => setLine(i, "qty", e.target.value)} />
            </div>
            {priced && (
              <div className="w-32">
                <label className={label}>Unit price</label>
                <input type="number" className={input} value={l.unitPrice} onChange={(e) => setLine(i, "unitPrice", e.target.value)} />
              </div>
            )}
            {lines.length > 1 && <button className={btnGhost} onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}>Remove</button>}
          </div>
        ))}
        <button className={btnGhost} onClick={() => setLines((ls) => [...ls, { itemId: "", qty: "", unitPrice: "" }])}>Add line</button>
      </div>

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave({ ...head, lines: filled })}>{busy ? "Saving…" : "Save"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

// ---- AWB tracking ----------------------------------------------------------
function StatusBadge({ code, delivered }) {
  if (!code) return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">Not moved yet</span>;
  const tone = delivered
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : isException(code)
      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
      : "bg-brand-500/10 text-brand-700 dark:text-brand-300";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${tone}`} title={AWB_STATUS_BY_CODE[code]?.desc || ""}>{statusLabel(code)}</span>;
}

function Awb({ shipments, airlines, projects, statuses, slug, nav, canManage, busy, send }) {
  const [raw, setRaw] = useState("");
  const [detail, setDetail] = useState(null);
  const [registry, setRegistry] = useState(false);
  const closeDetail = useCallback(() => setDetail(null), []);
  const closeRegistry = useCallback(() => setRegistry(false), []);

  // Parsed as you type, so the field can say what is wrong before anything is
  // sent — an AWB's check digit is arithmetic, not a lookup.
  const parsed = useMemo(() => (raw.trim() ? parseAwb(raw) : null), [raw]);
  const carrier = useMemo(
    () => (parsed?.valid ? airlines.find((a) => a.prefix === parsed.prefix) : null),
    [parsed, airlines],
  );

  // Keep the open detail dialog on the freshly loaded shipment after a save.
  useEffect(() => {
    setDetail((cur) => (cur ? shipments.find((s) => s.id === cur.id) || null : null));
  }, [shipments]);

  async function track() {
    if (!parsed?.valid) return;
    if (await send("awb", "POST", { awbNumber: parsed.digits })) setRaw("");
  }

  return (
    <>
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={h2}>AWB Tracking</h2>
            <p className={sub}>Follow air freight by its waybill. Eleven digits: a 3-digit carrier prefix, a 7-digit serial and a check digit.</p>
          </div>
          {canManage && <button className={btnGhost} onClick={() => setRegistry(true)}>Airline registry</button>}
        </div>

        {canManage && (
          <div className="mt-4">
            <label className={label}>AWB number</label>
            <div className="flex flex-wrap gap-2">
              <input className={`${input} sm:max-w-xs`} placeholder="e.g. 176-12345675" value={raw}
                onChange={(e) => setRaw(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && parsed?.valid) { e.preventDefault(); track(); } }} />
              <button className={btn} disabled={busy || !parsed?.valid} onClick={track}>{busy ? "Adding…" : "Track"}</button>
            </div>
            {parsed && (
              <p className={`mt-2 text-xs ${parsed.valid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {parsed.valid
                  ? <>Valid — {formatAwb(parsed.digits)}{carrier ? ` · ${carrier.name}` : ` · prefix ${parsed.prefix} is not in the registry yet`}</>
                  : parsed.reason}
              </p>
            )}
          </div>
        )}
      </section>

      {registry && (
        <Dialog title="Airline registry" description="The 3-digit prefix on a waybill is what identifies its carrier." onClose={closeRegistry} width="max-w-[640px]">
          <Airlines rows={airlines} busy={busy} onCancel={closeRegistry}
            onSave={(method, payload) => send("awb/airlines", method, payload)} />
        </Dialog>
      )}

      {detail && (
        <Dialog title={detail.awbNumber} description={[detail.airlineName, detail.reference].filter(Boolean).join(" · ") || undefined}
          onClose={closeDetail} width="max-w-[680px]">
          <Shipment shipment={detail} statuses={statuses} projects={projects} canManage={canManage} busy={busy}
            slug={slug} nav={nav} onClose={closeDetail}
            onSave={(payload) => send("awb", "PUT", { id: detail.id, ...payload })}
            onDelete={async () => { if (await send("awb", "DELETE", { id: detail.id })) setDetail(null); }} />
        </Dialog>
      )}

      {shipments.length === 0 ? (
        <Empty title="Nothing in the air" body="Paste a waybill number above to start following a shipment. Its milestones build up as they are recorded." />
      ) : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {["AWB", "Carrier", "Route", "Pieces", "Status", "Last event"].map((head, i) => (
                    <th key={head} className={`${th} ps-2 ${i === 3 ? "text-end" : "text-start"}`}>{head}</th>
                  ))}
                  <th className={`${th} text-end`} />
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  // Anything not yet delivered is what this screen is for.
                  <tr key={s.id} className={`border-s-4 border-b border-slate-100 last:border-b-0 dark:border-white/5 ${s.delivered ? stripeOff : stripeOn}`}>
                    <td className={`${td} ps-2`}>
                      <span className="font-mono text-slate-900 dark:text-white">{s.awbNumber}</span>
                      {s.reference && <div className="text-xs text-slate-400">{s.reference}</div>}
                    </td>
                    <td className={`${td} ps-2 text-slate-600 dark:text-slate-300`}>
                      {s.airlineName || <span className="text-slate-400">prefix {s.prefix}</span>}
                    </td>
                    <td className={`${td} ps-2 text-slate-600 dark:text-slate-300`}>
                      {s.origin || "—"} → {s.destination || "—"}
                    </td>
                    <td className={`${td} ps-2 text-end tabular-nums text-slate-600 dark:text-slate-300`}>
                      {s.pieces || "—"}{s.weightKg > 0 && <span className="text-xs text-slate-400"> · {num(s.weightKg)} kg</span>}
                    </td>
                    <td className={`${td} ps-2`}><StatusBadge code={s.currentStatus} delivered={s.delivered} /></td>
                    <td className={`${td} ps-2 text-slate-500 dark:text-slate-400`}>{s.currentStatusAt ? fmtDateTime(s.currentStatusAt) : "—"}</td>
                    <td className={`${td} text-end`}>
                      <span className="inline-flex gap-2">
                        {s.trackUrl && (
                          <a href={s.trackUrl} target="_blank" rel="noreferrer" className={btnGhost} title="Open the carrier's own tracking page">Carrier</a>
                        )}
                        <button className={btnGhost} onClick={() => setDetail(s)}>Open</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function Shipment({ shipment: s, statuses, projects, canManage, busy, slug, nav, onSave, onDelete, onClose }) {
  const [code, setCode] = useState("RCS");
  const [at, setAt] = useState("");
  const [station, setStation] = useState("");
  const [flightNo, setFlightNo] = useState("");
  const [note, setNote] = useState("");

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className={label}>Carrier</label><input className={inputRO} readOnly value={s.airlineName || `Prefix ${s.prefix}`} /></div>
        <div><label className={label}>Route</label><input className={inputRO} readOnly value={`${s.origin || "—"} → ${s.destination || "—"}`} /></div>
        <div><label className={label}>Consignment</label><input className={inputRO} readOnly value={`${s.pieces || 0} pcs${s.weightKg > 0 ? ` · ${num(s.weightKg)} kg` : ""}`} /></div>
      </div>
      {s.projectId && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-600 uppercase tracking-wide">For</span>
          <RecordLink href={linkIf(nav?.projects, linkToProject(slug, s.projectId))} title="Open the project">
            {projects.find((p) => p.id === s.projectId)?.number || "project"}
          </RecordLink>
        </p>
      )}

      <p className={`${microLabel} mt-5`}>Timeline</p>
      {(s.movements || []).length === 0 ? (
        <p className="text-sm text-slate-400">Nothing recorded yet.</p>
      ) : (
        <ol className="space-y-2">
          {s.movements.map((m) => (
            <li key={m.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm ${
              isException(m.code) ? "border-rose-500/30 bg-rose-500/5" : "border-slate-200 dark:border-white/10"}`}>
              <span className="flex min-w-0 items-center gap-2">
                <StatusBadge code={m.code} delivered={m.code === "DLV"} />
                <span className="text-slate-600 dark:text-slate-300">
                  {[m.station, m.flightNo].filter(Boolean).join(" · ")}
                  {m.note && <span className="text-slate-400"> — {m.note}</span>}
                </span>
              </span>
              <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{fmtDateTime(m.at)}</span>
            </li>
          ))}
        </ol>
      )}

      {canManage && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/15 dark:bg-[#191921]">
          <p className={microLabel}>Record a milestone</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Status</label>
              <select className={input} value={code} onChange={(e) => setCode(e.target.value)}>
                {statuses.map((st) => <option key={st.code} value={st.code}>{st.code} — {st.label}</option>)}
              </select>
            </div>
            <div><label className={label}>When <span className="font-400 normal-case text-slate-400">(now if blank)</span></label><input type="datetime-local" className={input} value={at} onChange={(e) => setAt(e.target.value)} /></div>
            <div><label className={label}>Station</label><input className={input} value={station} onChange={(e) => setStation(e.target.value.toUpperCase())} placeholder="RUH" /></div>
            <div><label className={label}>Flight</label><input className={input} value={flightNo} onChange={(e) => setFlightNo(e.target.value.toUpperCase())} placeholder="EK802" /></div>
            <div className="sm:col-span-2"><label className={label}>Note</label><input className={input} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </div>
          <p className="mt-2 text-xs text-slate-400">{AWB_STATUS_BY_CODE[code]?.desc}</p>
          <div className="mt-3">
            <button className={btn} disabled={busy} onClick={async () => {
              const ok = await onSave({ movement: { code, at: at ? new Date(at).toISOString() : "", station, flightNo, note } });
              if (ok) { setStation(""); setFlightNo(""); setNote(""); setAt(""); }
            }}>{busy ? "Recording…" : "Record"}</button>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        {canManage
          ? <button className="text-sm font-600 text-rose-600 hover:underline dark:text-rose-400" onClick={onDelete}>Stop tracking</button>
          : <span />}
        <button className={btnGhost} onClick={onClose}>Close</button>
      </div>
    </>
  );
}

function Airlines({ rows, busy, onSave, onCancel }) {
  const [form, setForm] = useState(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((a) => `${a.prefix} ${a.name} ${a.iata || ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" className={`${input} sm:max-w-xs`} placeholder="Search prefix, name or IATA…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className={btn} onClick={() => setForm({ prefix: "", name: "", iata: "", trackUrlTemplate: "" })}>Add airline</button>
      </div>

      {form && (
        <div className="mt-4 rounded-xl border border-brand-500/40 bg-slate-50 p-4 dark:bg-[#191921]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={label}>Prefix (3 digits)</label><input className={input} value={form.prefix}
              onChange={(e) => setForm((s) => ({ ...s, prefix: e.target.value.replace(/\D/g, "").slice(0, 3) }))} placeholder="176" /></div>
            <div><label className={label}>IATA code</label><input className={input} value={form.iata}
              onChange={(e) => setForm((s) => ({ ...s, iata: e.target.value.toUpperCase().slice(0, 3) }))} placeholder="EK" /></div>
            <div className="sm:col-span-2"><label className={label}>Airline name</label><input className={input} value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></div>
            <div className="sm:col-span-2">
              <label className={label}>Tracking URL template <span className="font-400 normal-case text-slate-400">(tokens {"{AWB} {PREFIX} {SERIAL}"})</span></label>
              <input className={input} value={form.trackUrlTemplate}
                onChange={(e) => setForm((s) => ({ ...s, trackUrlTemplate: e.target.value }))} placeholder="https://airline.com/track?awb={SERIAL}" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button className={btn} disabled={busy || form.prefix.length !== 3 || !form.name.trim()}
              onClick={async () => { if (await onSave(form.id ? "PUT" : "POST", form)) setForm(null); }}>
              {busy ? "Saving…" : "Save airline"}
            </button>
            <button className={btnGhost} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No airlines yet. A waybill still tracks without one — it just shows the bare prefix.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
          {filtered.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-600 text-slate-900 dark:text-white">
                  <span className="font-mono text-slate-500 dark:text-slate-400">{a.prefix}</span> {a.name}
                  {a.iata && <span className="ms-1.5 text-xs text-slate-400">{a.iata}</span>}
                </p>
                {a.trackUrlTemplate && <p className="truncate text-xs text-slate-400">{a.trackUrlTemplate}</p>}
              </div>
              <span className="flex gap-2">
                <button className={btnGhost} onClick={() => setForm({ ...a })}>Edit</button>
                <button className={btnGhost} disabled={busy} onClick={() => onSave("DELETE", { id: a.id })}>Delete</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex justify-end"><button className={btnGhost} onClick={onCancel}>Close</button></div>
    </>
  );
}
