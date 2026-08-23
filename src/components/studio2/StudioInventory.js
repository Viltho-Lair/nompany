"use client";

import { CURRENCIES_FROM_EXCHANGE_API } from "@/shared/currencies";
import { useCallback, useEffect, useMemo, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { Field } from "@/components/fields/Field";
import RecordLink from "@/components/studio2/RecordLink";
import { Icon } from "@/components/studio2/icons";
import InventoryDashboard from "@/components/studio2/InventoryDashboard";
import { useAnalyticsLevel } from "@/components/studio2/analyticsLevel";
import {
  panel, h2, sub, input, inputRO, microLabel, label, btn, btnGhost, th, stripeOn, stripeOff,
  money, fmtDate, fmtDateTime, Dialog, Toolbar, Empty,
} from "@/components/studio2/ui";
import { linkToProject, linkIf } from "@/modules/main/studioLinks";
import { parseAwb, formatAwb } from "@/modules/inventory/awb";
import { statusLabel, isException, AWB_STATUS_BY_CODE } from "@/modules/inventory/awbStatus";
import { StatusPill } from "@/components/studio2/StatusPill";

// INVENTORY — what the studio buys, holds, and issues to its projects.
// On-hand is summed from the movement ledger, so every number here can be traced
// to the movements that produced it. Each sub-section is its own screen:
//   inventory          -> the dashboard
//   inventory-items    -> the catalogue: what can be bought
//   inventory-stock    -> what is actually held, and the ledger behind it
//   inventory-vendors  -> who it is bought from, and what they supply
//   inventory-sheets   -> per project: what was ordered for it and issued to it
//   inventory-awb      -> air freight, followed by its waybill

// Order (kind "order"), delivery-note (kind "delivery") and stock-move (kind
// "movement") colours now live in the shared StatusPill map. Order and delivery
// have no render site here today; the ledger's move-kind badge is below.

const td = "py-3 pe-3 align-middle";
const num = (n) => new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(Number(n) || 0);

export default function StudioInventory({ slug, view = "inventory" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const level = useAnalyticsLevel();

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
    vendors, items, movements, orders, projects, shipments, airlines, summary, vocabulary, nav,
    currency: studioCurrency = "",
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
    return wrap(<Items items={items} vendors={vendors} units={vocabulary.units} studioCurrency={studioCurrency}
      canManage={canManageItems} busy={busy} send={send} />);
  }
  if (view === "inventory-stock") {
    return wrap(<Stock items={items} movements={movements} canManage={canManageStock} busy={busy} send={send} />);
  }
  if (view === "inventory-vendors") {
    return wrap(<Vendors rows={vendors} items={items} canManage={canManageVendors} busy={busy} send={send} />);
  }
  // NO BRANCH FOR inventory-sheets. The sub-section IS the sheet workspace now
  // — an empty work portion with the project bar along the bottom — and it is
  // rendered straight from the studio route, not from here. What used to be on
  // this screen was purchase orders and delivery notes raised by hand, and
  // those buttons are not wanted: material comes from what was quoted.
  if (view === "inventory-awb") {
    return wrap(<Awb shipments={shipments} airlines={airlines} projects={projects} statuses={vocabulary.awbStatuses || []}
      slug={slug} nav={nav} canManage={canManageAwb} busy={busy} send={send} />);
  }

  // The parent section is a place of its own: its own dashboard rather than a
  // redirect into whichever sub-section came first — and, being a place of its
  // own, a right of its own.
  if (data.canViewDashboard === false) return wrap(<Empty title="The dashboard isn't yours to see" body="This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar." />);
  return wrap(<InventoryDashboard slug={slug} summary={summary} items={items}
    orders={orders} movements={movements} nav={nav}
    level={level} currency={studioCurrency} />);
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
  if (out.error === "charges") return "An item priced in another currency needs its shipping and customs charges.";
  if (out.error === "project") return "Pick a project.";
  if (out.error === "nothing") return "Enter what actually arrived.";
  return "That didn't save.";
}

// ---- registered items (the catalogue) --------------------------------------
function Items({ items, vendors, units, studioCurrency, canManage, busy, send }) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null);
  const closeForm = useCallback(() => setForm(null), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.name} ${i.sku} ${i.modelNumber || ""} ${i.vendorName || ""}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <>
      <Toolbar canManage={canManage} label="Add item" onAdd={() => setForm({ row: null })}>
        {items.length > 0 && (
          <Field label="Search" type="search" hint="Name, SKU, model or vendor"
            value={query} onChange={(v) => setQuery(v)} className="sm:max-w-xs" />
        )}
      </Toolbar>

      {form && (
        <Dialog title={form.row ? `Edit ${form.row.name}` : "Add item"}
          description="The catalogue entry — what this thing is and who supplies it. Quantities live in Stock Management."
          onClose={closeForm}>
          <ItemForm row={form.row} vendors={vendors} units={units} studioCurrency={studioCurrency} busy={busy} onCancel={closeForm}
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

function ItemForm({ row, vendors, units, studioCurrency = "", busy, onSave, onCancel }) {
  const [f, setF] = useState({
    name: row?.name || "", sku: row?.sku || "", modelNumber: row?.modelNumber || "",
    unit: row?.unit || units[0], vendorId: row?.vendorId || "",
    itemType: row?.itemType || "", deliveryWeeks: row?.deliveryWeeks ?? "",
    needsInstallation: !!row?.needsInstallation, needsProgramming: !!row?.needsProgramming,
    reorderLevel: row?.reorderLevel || "", unitCost: row?.unitCost || "", notes: row?.notes || "",
    currency: row?.currency || "", image: row?.image || "",
    shippingCharges: row?.shippingCharges ?? "", customsCharges: row?.customsCharges ?? "",
  });
  const vendor = vendors.find((v) => v.id === f.vendorId);
  const types = Array.isArray(vendor?.itemTypes) ? vendor.itemTypes : [];

  // BOUGHT IN SOMEBODY ELSE'S MONEY: it has to be shipped in and cleared, and
  // neither of those is free. Blank means the studio's own currency, so it is
  // never foreign; the same is true of picking the studio's own code by hand.
  const foreign = !!f.currency && f.currency !== studioCurrency;
  const missingCharges = foreign && (String(f.shippingCharges).trim() === "" || String(f.customsCharges).trim() === "");

  // Picking a type takes the vendor's own delivery estimate with it — that is
  // the point of keeping the estimate on the vendor rather than on each item.
  function pickType(type) {
    const match = types.find((t) => t.type === type);
    setF((s) => ({ ...s, itemType: type, deliveryWeeks: match ? (match.weeks ?? "") : "" }));
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required value={f.name} onChange={(v) => setF((s) => ({ ...s, name: v }))} />
        <Field label="Model number" value={f.modelNumber} onChange={(v) => setF((s) => ({ ...s, modelNumber: v }))} hint="The vendor's part number" />
        <Field label="SKU" value={f.sku} onChange={(v) => setF((s) => ({ ...s, sku: v }))} hint="Assigned automatically if left blank" />
        <Field label="Unit" as="select" required value={f.unit} onChange={(v) => setF((s) => ({ ...s, unit: v }))} options={units} />
        <Field label="Vendor" as="select" value={f.vendorId}
          onChange={(v) => setF((s) => ({ ...s, vendorId: v, itemType: "", deliveryWeeks: "" }))}
          options={vendors.map((v) => ({ value: v.id, label: v.name }))} />
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
        <div className="grid grid-cols-[1fr,7.5rem] gap-3">
          <Field label="Unit cost" type="number" min="0" value={f.unitCost} onChange={(v) => setF((s) => ({ ...s, unitCost: v }))} inputProps={{ step: "0.01" }} />
          {/* What that cost is IN. Blank means the studio's own currency, so an
              item priced in the studio's money needs nothing said about it. */}
          <Field label="Currency" as="select" required value={f.currency} onChange={(v) => setF((s) => ({ ...s, currency: v }))}
            options={[{ value: "", label: "Studio" }, ...CURRENCIES_FROM_EXCHANGE_API.map((c) => ({ value: c.code, label: c.code }))]} />
        </div>
        <Field label="Reorder level" type="number" min="0" value={f.reorderLevel} onChange={(v) => setF((s) => ({ ...s, reorderLevel: v }))} />
        {/* Only for an item priced in somebody else's money — and then both are
            asked for, because "we didn't say" and "it was nothing" are
            different answers and only one of them is worth storing. */}
        {foreign && (
          <>
            <Field label={<>Shipping charges <span className="font-400 normal-case text-slate-400">({f.currency})</span></>}
              required type="number" min="0" value={f.shippingCharges} onChange={(v) => setF((s) => ({ ...s, shippingCharges: v }))} inputProps={{ step: "0.01" }} />
            <Field label={<>Customs charges <span className="font-400 normal-case text-slate-400">({f.currency})</span></>}
              required type="number" min="0" value={f.customsCharges} onChange={(v) => setF((s) => ({ ...s, customsCharges: v }))} inputProps={{ step: "0.01" }} />
          </>
        )}
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

      <div className="mt-4"><Field label="Notes" as="textarea" value={f.notes} onChange={(v) => setF((s) => ({ ...s, notes: v }))} inputProps={{ rows: 2 }} /></div>

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !f.name.trim() || missingCharges} onClick={() => onSave(f)}>{busy ? "Saving…" : "Save item"}</button>
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
          <Field label="Search" type="search" hint="Item, vendor or serial"
            value={query} onChange={(v) => setQuery(v)} className="sm:max-w-xs" />
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
        <Field label="Quantity" required type="number" value={qty} onChange={(v) => setQty(v)} />
        <Field label="Reason" value={reason} onChange={(v) => setReason(v)} hint="e.g. stock-take correction" />
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
  // RESERVED is derived on the server from what the project sheets hold —
  // never a flag on the item, so releasing a sheet line frees the unit with
  // nothing here to remember to undo.
  const reserved = item.reservedSerials || [];
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
        {serials.length} recorded against <span className="font-600">{num(item.onHand)} {item.unit}</span> on hand
        {reserved.length > 0 && <>, <span className="font-600">{reserved.length} reserved</span> to project sheets</>}.
        {item.serialMismatch && <span className="text-amber-600 dark:text-amber-400"> They disagree — stock has moved without its serial being noted.</span>}
      </p>

      {canManage && (
        <div className="mt-4 flex gap-2">
          <Field label="Serial(s)" hint="Comma or newline separated" value={draft} className="flex-1"
            onChange={(v) => setDraft(v)}
            inputProps={{ onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } } }} />
          <button type="button" className={btnGhost} onClick={add}>Add</button>
        </div>
      )}

      {serials.length > 0 && (
        <div className="mt-3 flex max-h-52 flex-wrap gap-1.5 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/15 dark:bg-[#191921]">
          {/* RESERVED UNITS ARE STRUCK THROUGH. A serial allocated to a project
              sheet is still physically on the shelf, so it is still listed —
              but it is spoken for, and nobody should be shortlisting it for
              another quotation. The state is DERIVED from what the sheets have
              taken, so releasing a line frees the unit with nothing to undo
              here, and removing one by hand is refused while it is held. */}
          {serials.map((sn) => {
            const held = reserved.includes(sn);
            return (
              <span key={sn}
                title={held ? "Reserved — allocated to a project sheet" : undefined}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] ${
                  held
                    ? "bg-slate-100 text-slate-400 line-through dark:bg-white/5 dark:text-slate-500"
                    : "bg-white text-slate-700 dark:bg-white/10 dark:text-slate-200"}`}>
                {sn}
                {canManage && !held && (
                  <button type="button" aria-label={`Remove ${sn}`} className="text-slate-400 hover:text-rose-600"
                    onClick={() => setSerials((cur) => cur.filter((x) => x !== sn))}>×</button>
                )}
              </span>
            );
          })}
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
                <td className={td}><StatusPill kind="movement" status={m.kind} /></td>
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
  const setType = (i, k, v) => setTypes((cur) => cur.map((t, n) => (n === i ? { ...t, [k]: v } : t)));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required value={f.name} onChange={(v) => setF((s) => ({ ...s, name: v }))} />
        <Field label="Contact" value={f.contactName} onChange={(v) => setF((s) => ({ ...s, contactName: v }))} />
        <Field label="Email" type="email" value={f.email} onChange={(v) => setF((s) => ({ ...s, email: v }))} />
        <Field label="Phone" value={f.phone} onChange={(v) => setF((s) => ({ ...s, phone: v }))} />
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
                <Field label="Type" value={t.type} onChange={(v) => setType(i, "type", v)} hint="e.g. Cameras" className="flex-1" />
                <Field label="Weeks" type="number" min="0" value={t.weeks} onChange={(v) => setType(i, "weeks", v)} className="w-32" />
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

      <div className="mt-4"><Field label="Notes" as="textarea" value={f.notes} onChange={(v) => setF((s) => ({ ...s, notes: v }))} inputProps={{ rows: 2 }} /></div>

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
function StatusBadge({ code, delivered }) {
  // Waybill tone is chosen by the delivered/exception flags, not by the raw code,
  // so we hand StatusPill a synthesised token (kind "awb") and the code's label.
  if (!code) return <StatusPill kind="awb" status="notmoved" label="Not moved yet" />;
  const status = delivered ? "delivered" : isException(code) ? "exception" : "intransit";
  return <StatusPill kind="awb" status={status} label={statusLabel(code)} title={AWB_STATUS_BY_CODE[code]?.desc || ""} />;
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
            <div className="flex flex-wrap gap-2">
              <Field label="AWB number" hint="e.g. 176-12345675" value={raw} className="sm:max-w-xs"
                onChange={(v) => setRaw(v)}
                inputProps={{ onKeyDown: (e) => { if (e.key === "Enter" && parsed?.valid) { e.preventDefault(); track(); } } }} />
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
            <Field label="Status" as="select" required value={code} onChange={(v) => setCode(v)}
              options={statuses.map((st) => ({ value: st.code, label: `${st.code} — ${st.label}` }))} />
            <Field label={<>When <span className="font-400 normal-case text-slate-400">(now if blank)</span></>} type="datetime-local" value={at} onChange={(v) => setAt(v)} />
            <Field label="Station" value={station} onChange={(v) => setStation(v.toUpperCase())} hint="e.g. RUH" />
            <Field label="Flight" value={flightNo} onChange={(v) => setFlightNo(v.toUpperCase())} hint="e.g. EK802" />
            <Field label="Note" value={note} onChange={(v) => setNote(v)} className="sm:col-span-2" />
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
        <Field label="Search" type="search" hint="Prefix, name or IATA" value={query} onChange={(v) => setQuery(v)} className="sm:max-w-xs" />
        <button className={btn} onClick={() => setForm({ prefix: "", name: "", iata: "", trackUrlTemplate: "" })}>Add airline</button>
      </div>

      {form && (
        <div className="mt-4 rounded-xl border border-brand-500/40 bg-slate-50 p-4 dark:bg-[#191921]">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prefix (3 digits)" value={form.prefix} hint="e.g. 176"
              onChange={(v) => setForm((s) => ({ ...s, prefix: v.replace(/\D/g, "").slice(0, 3) }))} />
            <Field label="IATA code" value={form.iata} hint="e.g. EK"
              onChange={(v) => setForm((s) => ({ ...s, iata: v.toUpperCase().slice(0, 3) }))} />
            <Field label="Airline name" value={form.name} className="sm:col-span-2"
              onChange={(v) => setForm((s) => ({ ...s, name: v }))} />
            <Field className="sm:col-span-2" value={form.trackUrlTemplate} hint="https://airline.com/track?awb={SERIAL}"
              label={<>Tracking URL template <span className="font-400 normal-case text-slate-400">(tokens {"{AWB} {PREFIX} {SERIAL}"})</span></>}
              onChange={(v) => setForm((s) => ({ ...s, trackUrlTemplate: v }))} />
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
