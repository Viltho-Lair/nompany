"use client";

import { CURRENCIES_FROM_EXCHANGE_API } from "@/shared/currencies";
import { marginPct } from "@/shared/pricing";
import { useStudioLocale } from "@/components/studio2/locale";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { inventoryDict } from "@/shared/studio/inventory";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import nextDynamic from "next/dynamic";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { StudioDataGridSkeleton } from "@/components/studio2/StudioDataGrid.skeleton";
import { Field } from "@/components/fields/Field";
import RecordLink from "@/components/studio2/RecordLink";
import { Icon } from "@/components/studio2/icons";
import InventoryDashboard from "@/components/studio2/InventoryDashboard";
import { useAnalyticsLevel } from "@/components/studio2/analyticsLevel";
import {
  panel, h2, sub, input, inputRO, microLabel, label, btn, btnGhost, btnRow, th, stripeOn, stripeOff,
  money, fmtDate, fmtDateTime, Dialog, Toolbar, Empty,
} from "@/components/studio2/ui";
import { linkToProject, linkIf } from "@/modules/main/studioLinks";
import { parseAwb, formatAwb } from "@/modules/inventory/awb";
import { readVendorCsv } from "@/modules/inventory/vendorCsv";
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

// The dense-table grid, loaded in its own async chunk so @mui/x-data-grid never
// folds into Inventory's initial bundle — see StudioDataGrid's header. The
// skeleton reserves the seven-column box while that chunk arrives.
const StudioDataGrid = nextDynamic(() => import("@/components/studio2/StudioDataGrid"), {
  ssr: false,
  loading: () => <StudioDataGridSkeleton columns={7} pageSize={10} />,
});

export default function StudioInventory({ slug, view = "inventory" }) {
  const tr = inventoryDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const level = useAnalyticsLevel();

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/inventory`, { cache: "no-store" });
    if (!res.ok) { setError(tr.accessInventoryStudio); return; }
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
    if (!res.ok) { setError(message(out, tr)); return false; }
    await load();
    // THE BODY, not `true`. Every caller here tests this as a boolean and an
    // object is truthy, so nothing changes for them — but the import needs to
    // read what came back (how many landed, which lines did not), and a helper
    // that throws the answer away would force a second fetch to ask again.
    return out;
  }, [slug, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingInventory} />;

  // `canManage` IS NOT DESTRUCTURED, and neither is `canManageSheets`. Both are
  // in the response; neither has a reader here. See the note below for
  // `canManage` — leaving it unbound in this scope is the point, and binding it
  // under another name only to never read it said the same thing more quietly.
  //
  // `canManageSheets` lost its consumer rather than never having one: there is
  // no `inventory-sheets` branch below (see the comment where it would be),
  // because that screen is rendered straight from the studio route. It gates on
  // a FINER right from a different route — StudioSheetViewer reads
  // `canWriteInventoryColumns`, which projects/route.ts derives per column
  // owner — so the coarse flag here answers a question nobody asks any more.
  const {
    canManageStock, canManageVendors, canManageItems, canManageAwb,
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
    return wrap(<Items items={items} vendors={vendors} units={vocabulary.units} serviceActions={vocabulary.serviceActions || []}
      studioCurrency={studioCurrency} canManage={canManageItems} busy={busy} send={send} />);
  }
  if (view === "inventory-stock") {
    return wrap(<Stock items={items} movements={movements} canManage={canManageStock} busy={busy} send={send} />);
  }
  if (view === "procurement-suppliers") {
    return wrap(<Vendors rows={vendors} items={items} canManage={canManageVendors} busy={busy} send={send} />);
  }
  // NO BRANCH FOR inventory-sheets. The sub-section IS the sheet workspace now
  // — an empty work portion with the project bar along the bottom — and it is
  // rendered straight from the studio route, not from here. What used to be on
  // this screen was purchase orders and delivery notes raised by hand, and
  // those buttons are not wanted: material comes from what was quoted.
  if (view === "logistics-shipments") {
    return wrap(<Awb shipments={shipments} airlines={airlines} projects={projects} statuses={vocabulary.awbStatuses || []}
      slug={slug} nav={nav} canManage={canManageAwb} busy={busy} send={send} />);
  }

  // The parent section is a place of its own: its own dashboard rather than a
  // redirect into whichever sub-section came first — and, being a place of its
  // own, a right of its own.
  if (data.canViewDashboard === false) return wrap(<Empty title={tr.dashboardIsnYoursSee} body={tr.studioKeepsModuleDashboards} />);
  return wrap(<InventoryDashboard slug={slug} summary={summary} items={items}
    orders={orders} movements={movements} nav={nav}
    level={level} currency={studioCurrency} />);
}

// THE DICTIONARY COMES IN AS AN ARGUMENT — module scope, see StudioFinance.
//
// The counted phrases are functions rather than `${n} item${s}`, because the
// English rule (one form or the other) is not the Arabic one (four, in the
// ranges a stock ledger reaches), and the joining word is not "and" either.
function message(out, tr) {
  if (out.error === "read-only") return tr.mReadOnly;
  if (out.error === "duplicate") return tr.mDuplicate;
  if (out.error === "duplicate-sku") return tr.mDuplicateSku;
  if (out.error === "prefix") return tr.mPrefix;
  if (out.error === "awb") return out.reason || tr.mAwb;
  if (out.error === "status") return tr.mStatus;
  if (out.error === "in-use") {
    const bits = [];
    if (out.movements) bits.push(tr.countMovements(out.movements));
    if (out.items) bits.push(tr.countItems(out.items));
    if (out.orders) bits.push(tr.countOrders(out.orders));
    if (out.deliveries) bits.push(tr.countDeliveries(out.deliveries));
    if (out.shipments) bits.push(tr.countShipments(out.shipments));
    return tr.mInUse(tr.joinAnd(bits));
  }
  if (out.error === "insufficient") {
    if (Array.isArray(out.short) && out.short.length) {
      return tr.mShort(out.short.map((s) => tr.mShortNeedHave(num(s.needed), num(s.have))).join("; "));
    }
    return tr.mInsufficient(num(out.have), num(out.needed));
  }
  if (out.error === "over-receive") return tr.mOverReceive(num(out.remaining));
  if (out.error === "received-already") return tr.mReceivedAlready;
  if (out.error === "already-issued") return tr.mAlreadyIssued;
  if (out.error === "derived-status") return tr.mDerivedStatus;
  if (out.error === "not-ordered") return tr.mNotOrdered;
  if (out.error === "lines") return tr.mLines;
  if (out.error === "vendor") return tr.mVendor;
  if (out.error === "charges") return tr.mCharges;
  if (out.error === "project") return tr.mProject;
  if (out.error === "nothing") return tr.mNothing;
  return tr.mDidntSave;
}

// ---- registered items (the catalogue) --------------------------------------
function Items({ items, vendors, units, serviceActions, studioCurrency, canManage, busy, send }) {
  const tr = inventoryDict(useStudioLocale());
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
      <Toolbar canManage={canManage} label={tr.addItem} onAdd={() => setForm({ row: null })}>
        {items.length > 0 && (
          <Field label={tr.search} type="search" hint={tr.nameSkuModelVendor}
            value={query} onChange={(v) => setQuery(v)} className="sm:max-w-xs" />
        )}
      </Toolbar>

      {form && (
        <Dialog title={form.row ? `Edit ${form.row.name}` : tr.addItem}
          description={tr.catalogueEntryWhatThing}
          onClose={closeForm}>
          <ItemForm row={form.row} vendors={vendors} units={units} serviceActions={serviceActions} studioCurrency={studioCurrency} busy={busy} onCancel={closeForm}
            onSave={async (v) => { if (await send("items", form.row ? "PUT" : "POST", form.row ? { ...v, id: form.row.id } : v)) setForm(null); }} />
        </Dialog>
      )}

      {items.length === 0 ? (
        <Empty title={tr.nothingRegisteredYet} body={tr.registerThingsBuyQuantities} />
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tr.nItemsOf(filtered.length, items.length)}</p>
          <section className={panel}>
            {/* A Data Grid now — sortable, paged — reproducing the catalogue table
                column for column: SKU + name + model, vendor, type (with the lead
                time), the Installation/Programming scope badges, unit cost and
                on-hand both tabular via `.num`, and the same Edit/Delete actions
                gated on `canManage`. The "No items match that search" case is the
                grid's own no-rows overlay. Nothing was dropped. */}
            <StudioDataGrid
              rows={filtered}
              getRowId={(r) => r.id}
              ariaLabel={tr.registeredItems}
              emptyLabel={tr.noItemsMatchSearch}
              emptyIcon="package"
              columns={[
                {
                  field: "name", headerName: tr.item, minWidth: 200, flex: 1.4,
                  renderCell: ({ row }) => (
                    <span className="min-w-0">
                      <span className="num text-xs text-slate-400">{row.sku}</span>
                      <span className="ms-2 font-600 text-slate-900 dark:text-white">{row.name}</span>
                      {row.modelNumber && <span className="ms-2 text-xs text-slate-400">{row.modelNumber}</span>}
                    </span>
                  ),
                },
                {
                  field: "vendorName", headerName: tr.vendor, minWidth: 130, flex: 0.9,
                  renderCell: ({ row }) => <span className="text-slate-600 dark:text-slate-300">{row.vendorName || "—"}</span>,
                },
                {
                  field: "itemType", headerName: tr.type, minWidth: 120, flex: 0.8,
                  renderCell: ({ row }) => (
                    <span className="text-slate-600 dark:text-slate-300">
                      {row.itemType || "—"}
                      {row.deliveryWeeks !== "" && row.deliveryWeeks != null && (
                        <span className="ms-1 text-xs text-slate-400">· {row.deliveryWeeks} wk</span>
                      )}
                    </span>
                  ),
                },
                {
                  field: "scope", headerName: tr.scope, minWidth: 170, flex: 1, sortable: false,
                  // ONE LINE, ALWAYS. The row is a fixed 52px, so a wrapping badge
                  // list grows taller than the row and the overflow is clipped —
                  // that is what "bulky and not visible" looked like. A service
                  // action is a phrase, not a word ("Programming & Configuration"),
                  // so only the first is drawn and the rest collapse into a +N;
                  // two side by side left both of them truncated to nothing
                  // legible. The cell carries the whole list as its title.
                  renderCell: ({ row }) => {
                    const scope = row.scope || [];
                    if (scope.length === 0) return <span className="text-slate-400">—</span>;
                    return (
                      <span className="flex min-w-0 items-center gap-1.5" title={scope.join(", ")}>
                        <span className="truncate rounded bg-brand-500/10 px-1.5 text-[11px] font-600 leading-5 text-brand-700 dark:text-brand-300">{scope[0]}</span>
                        {scope.length > 1 && <span className="shrink-0 text-[11px] font-600 text-slate-400">+{scope.length - 1}</span>}
                      </span>
                    );
                  },
                },
                {
                  field: "unitCost", headerName: tr.unitCost, type: "number", minWidth: 110, flex: 0.7,
                  align: "right", headerAlign: "right",
                  renderCell: ({ row }) => <span className="num text-slate-600 dark:text-slate-300">{row.unitCost > 0 ? money(row.unitCost) : "—"}</span>,
                },
                {
                  // SELL PRICE AND THE MARGIN IT IMPLIES, beside the cost. The
                  // margin is shown rather than left to be worked out: it is
                  // the number somebody scanning this list is actually after,
                  // and it is the one that reveals an item priced below cost.
                  field: "sellPrice", headerName: tr.sellPrice, type: "number", minWidth: 130, flex: 0.8,
                  align: "right", headerAlign: "right",
                  renderCell: ({ row }) => {
                    const m = marginPct(row.sellPrice, row.unitCost);
                    if (!(row.sellPrice > 0)) return <span className="text-slate-400">—</span>;
                    return (
                      <span className="num text-slate-700 dark:text-slate-200">
                        {money(row.sellPrice)}
                        {m != null && (
                          <span className={`ms-1.5 text-[11px] font-600 ${m < 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-400"}`}>
                            {m}%
                          </span>
                        )}
                      </span>
                    );
                  },
                },
                {
                  field: "onHand", headerName: tr.hand, type: "number", minWidth: 110, flex: 0.7,
                  align: "right", headerAlign: "right",
                  renderCell: ({ row }) => (
                    <span className="font-600 text-slate-900 dark:text-white">
                      <span className="num">{num(row.onHand)}</span> <span className="text-xs font-400 text-slate-400">{row.unit}</span>
                    </span>
                  ),
                },
                {
                  field: "actions", headerName: "", minWidth: 160, flex: 0.8, sortable: false,
                  align: "right", headerAlign: "right",
                  renderCell: ({ row }) => (canManage ? (
                    <span className="inline-flex items-center gap-2">
                      <button className={btnRow} onClick={() => setForm({ row })}>{tr.edit}</button>
                      <button className={btnRow} disabled={busy} onClick={() => send("items", "DELETE", { id: row.id })}>{tr.delete}</button>
                    </span>
                  ) : null),
                },
              ]}
            />
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
  const tr = inventoryDict(useStudioLocale());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  async function pick(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr(tr.chooseImageFile); return; }
    if (file.size > MAX_ITEM_IMAGE) { setErr(tr.imagesMust500Kb); return; }
    setBusy(true); setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      const up = await fetch("/api/media", { method: "POST", body: form });
      const media = await up.json().catch(() => ({}));
      if (!up.ok || !media.url) throw new Error("upload");
      onChange(media.url);
    } catch { setErr(tr.couldnUploadImage); }
    finally { setBusy(false); }
  }

  // Same styled, hidden-input upload as the client logo — never the browser's
  // raw "Choose File / No file chosen", which reads differently in every browser
  // and never matched the field beside it. Wrapped in <Field> so its box lines
  // up with the other controls in the grid.
  return (
    <Field label={<>{tr.image} <span className="font-400 normal-case text-slate-400">(500 KB max)</span></>} filled error={err || undefined}>
      <div className="flex items-center gap-3 px-3.5 pb-1.5 pt-5">
        <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt="" className="h-full w-full object-cover" />
                 : <Icon name="services" className="h-3.5 w-3.5 text-slate-300" />}
        </span>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <div className="ms-auto flex items-center gap-1.5">
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-600 text-[var(--geex-muted)] transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/5">
            {busy ? tr.uploading : value ? tr.change : tr.upload}
          </button>
          {value && !busy && (
            <button type="button" onClick={() => onChange("")}
              className="rounded-full px-2 py-1 text-xs font-600 text-slate-400 transition-colors hover:text-rose-600 dark:hover:text-rose-300">
              Remove
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}

function ItemForm({ row, vendors, units, serviceActions = [], studioCurrency = "", busy, onSave, onCancel }) {
  const tr = inventoryDict(useStudioLocale());
  const [f, setF] = useState({
    name: row?.name || "", sku: row?.sku || "", modelNumber: row?.modelNumber || "",
    unit: row?.unit || units[0], vendorId: row?.vendorId || "",
    itemType: row?.itemType || "", deliveryWeeks: row?.deliveryWeeks ?? "",
    scope: Array.isArray(row?.scope) ? row.scope : [],
    reorderLevel: row?.reorderLevel || "", unitCost: row?.unitCost || "", notes: row?.notes || "",
    sellPrice: row?.sellPrice || "",
    currency: row?.currency || "", image: row?.image || "",
    shippingCharges: row?.shippingCharges ?? "", customsCharges: row?.customsCharges ?? "",
  });

  // THE MARGIN THE TYPED PRICE IMPLIES, as it is typed. A price BELOW cost is
  // the mistake this catches and it is invisible otherwise — two numbers in
  // different boxes do not compare themselves. Null when there is no cost to
  // compare against, which is an unknown margin rather than a margin of 100%.
  const margin = marginPct(f.sellPrice, f.unitCost);
  const sellHint = margin == null ? undefined : tr.marginIs(margin);
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
        <Field label={tr.name} required value={f.name} onChange={(v) => setF((s) => ({ ...s, name: v }))} />
        <Field label={tr.modelNumber} value={f.modelNumber} onChange={(v) => setF((s) => ({ ...s, modelNumber: v }))} hint={tr.vendorPartNumber} />
        <Field label="SKU" value={f.sku} onChange={(v) => setF((s) => ({ ...s, sku: v }))} hint={tr.assignedAutomaticallyIfLeft} />
        <Field label={tr.unit} as="select" required value={f.unit} onChange={(v) => setF((s) => ({ ...s, unit: v }))} options={units} />
        <Field label={tr.vendor} as="select" value={f.vendorId}
          onChange={(v) => setF((s) => ({ ...s, vendorId: v, itemType: "", deliveryWeeks: "" }))}
          options={vendors.map((v) => ({ value: v.id, label: v.name }))} />
        {/* A real <Field as="select"> so it shares the box, height and floating
            label of the Vendor/Unit selects beside it — the guidance that used to
            be free-floating text now rides in the field's own hint line. */}
        <Field label={<>Type of item
            {f.itemType && f.deliveryWeeks !== "" && (
              <span className="font-500 normal-case text-slate-400"> · {tr.est} {tr.nWeeks(Number(f.deliveryWeeks))}</span>
            )}</>}
          as="select" value={f.itemType} onChange={pickType}
          disabled={!f.vendorId || types.length === 0}
          options={types.map((t) => ({ value: t.type, label: `${t.type}${t.weeks !== "" && t.weeks != null ? ` (${t.weeks} wk)` : ""}` }))}
          hint={!f.vendorId ? tr.pickVendorFirst : types.length === 0 ? tr.vendorNoItemTypes : undefined} />
        <div className="grid grid-cols-[1fr,7.5rem] gap-3">
          <Field label={tr.unitCost} type="number" min="0" value={f.unitCost} onChange={(v) => setF((s) => ({ ...s, unitCost: v }))} inputProps={{ step: "0.01" }} />
          {/* What that cost is IN. Blank means the studio's own currency, so an
              item priced in the studio's money needs nothing said about it. */}
          <Field label={tr.currency} as="select" required value={f.currency} onChange={(v) => setF((s) => ({ ...s, currency: v }))}
            options={[{ value: "", label: tr.studio }, ...CURRENCIES_FROM_EXCHANGE_API.map((c) => ({ value: c.code, label: c.code }))]} />
        </div>
        {/* WHAT IT SELLS FOR, in the studio's own money whatever it was
            bought in — the cost above is converted before anything is quoted
            (landedUnitCost), and a sell price in a second currency would have
            to be converted too and would be one more thing to keep true.
            Blank means unpriced: shared/pricing falls back to cost and says so,
            rather than quoting a nought somebody has to notice. */}
        <Field label={tr.sellPrice} type="number" min="0" value={f.sellPrice}
          onChange={(v) => setF((s) => ({ ...s, sellPrice: v }))} inputProps={{ step: "0.01" }}
          hint={sellHint} />
        <Field label={tr.reorderLevel} type="number" min="0" value={f.reorderLevel} onChange={(v) => setF((s) => ({ ...s, reorderLevel: v }))} />
        {/* Only for an item priced in somebody else's money — and then both are
            asked for, because "we didn't say" and "it was nothing" are
            different answers and only one of them is worth storing. */}
        {foreign && (
          <>
            <Field label={<>{tr.shippingCharges} <span className="font-400 normal-case text-slate-400">({f.currency})</span></>}
              required type="number" min="0" value={f.shippingCharges} onChange={(v) => setF((s) => ({ ...s, shippingCharges: v }))} inputProps={{ step: "0.01" }} />
            <Field label={<>{tr.customsCharges} <span className="font-400 normal-case text-slate-400">({f.currency})</span></>}
              required type="number" min="0" value={f.customsCharges} onChange={(v) => setF((s) => ({ ...s, customsCharges: v }))} inputProps={{ step: "0.01" }} />
          </>
        )}
        <ItemImage value={f.image} onChange={(v) => setF((st) => ({ ...st, image: v }))} />
      </div>

      <div className="mt-4">
        <label className={label}>{tr.scope} <span className="font-400 normal-case text-slate-400">(which service actions does this need once it lands?)</span></label>
        {serviceActions.length === 0 ? (
          <p className="text-xs text-slate-400">{tr.noServiceActionsYet}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {serviceActions.map((action) => (
              <label key={action} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-[var(--geex-inset)] px-3.5 py-2.5 text-sm font-600 text-slate-700 dark:border-white/15 dark:text-slate-200">
                <input type="checkbox" checked={f.scope.includes(action)}
                  onChange={(e) => setF((s) => ({
                    ...s,
                    scope: e.target.checked ? [...s.scope, action] : s.scope.filter((a) => a !== action),
                  }))}
                  className="h-4 w-4 accent-brand-600" />
                {action}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4"><Field label={tr.notes} as="textarea" value={f.notes} onChange={(v) => setF((s) => ({ ...s, notes: v }))} inputProps={{ rows: 2 }} /></div>

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !f.name.trim() || missingCharges} onClick={() => onSave(f)}>{busy ? tr.saving : tr.saveItem}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

// ---- stock management ------------------------------------------------------
function Stock({ items, movements, canManage, busy, send }) {
  const tr = inventoryDict(useStudioLocale());
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
          {[["onhand", tr.onHandTab], ["movements", tr.movementsTab]].map(([k, text]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-600 transition-colors ${tab === k ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>
              {text}
            </button>
          ))}
        </div>
        {tab === "onhand" && items.length > 0 && (
          <Field label={tr.search} type="search" hint={tr.itemVendorSerial}
            value={query} onChange={(v) => setQuery(v)} className="sm:max-w-xs" />
        )}
        {!canManage && <span className="ms-auto rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{tr.viewOnly}</span>}
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
          description={tr.whichUnitsHeldHand}
          onClose={closeSerials} width="max-w-[620px]">
          <SerialsForm item={serialsFor} busy={busy} canManage={canManage} onCancel={closeSerials}
            onSave={async (serials) => { await send("items", "PUT", { id: serialsFor.id, serials }); }} />
        </Dialog>
      )}

      {tab === "movements" ? (
        <Movements rows={movements} />
      ) : items.length === 0 ? (
        <Empty title={tr.nothingStockYet} body={tr.registerItemsFirstThen} />
      ) : (
        <section className={panel}>
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">{tr.nothingMatchesSearch}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    {[tr.item, tr.vendor, tr.serials, tr.hand, tr.reorder].map((head, i) => (
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
                        {i.low && <span className="ms-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-600 text-amber-700 dark:text-amber-300">{tr.low}</span>}
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
                          <button className={btnGhost} onClick={() => setSerialsFor(i)}>{tr.serials}</button>
                          {canManage && <button className={btnGhost} onClick={() => setAdjusting(i)}>{tr.adjust}</button>}
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
  const tr = inventoryDict(useStudioLocale());
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const after = Number(item.onHand) + (Number(qty) || 0);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr.quantity} required type="number" value={qty} onChange={(v) => setQty(v)} />
        <Field label={tr.reason} value={reason} onChange={(v) => setReason(v)} hint={tr.eGStockTake} />
      </div>
      {qty !== "" && (
        <p className={`mt-3 text-sm ${after < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
          {after < 0 ? tr.wouldTakeHandBelow : <>{tr.handWouldBecome} <span className="font-600">{num(after)} {item.unit}</span>.</>}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || qty === "" || Number(qty) === 0} onClick={() => onSave({ qty, reason })}>
          {busy ? tr.saving : tr.recordAdjustment}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

function SerialsForm({ item, busy, canManage, onSave, onCancel }) {
  const tr = inventoryDict(useStudioLocale());
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
        {reserved.length > 0 && <>, <span className="font-600">{reserved.length} reserved</span> {tr.projectSheets}</>}.
        {item.serialMismatch && <span className="text-amber-600 dark:text-amber-400"> {tr.theyDisagreeStockMoved}</span>}
      </p>

      {canManage && (
        <div className="mt-4 flex gap-2">
          <Field label={tr.serial} hint={tr.commaNewlineSeparated} value={draft} className="flex-1"
            onChange={(v) => setDraft(v)}
            inputProps={{ onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } } }} />
          <button type="button" className={btnGhost} onClick={add}>{tr.add}</button>
        </div>
      )}

      {serials.length > 0 && (
        <div className="mt-3 flex max-h-52 flex-wrap gap-1.5 overflow-auto rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-3 dark:border-white/15">
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
                title={held ? tr.reservedAllocatedProjectSheet : undefined}
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
        {canManage && <button className={btn} disabled={busy} onClick={() => onSave(serials)}>{busy ? tr.saving : tr.saveSerials}</button>}
        <button className={btnGhost} onClick={onCancel}>{tr.close}</button>
      </div>
    </>
  );
}

function Movements({ rows }) {
  const tr = inventoryDict(useStudioLocale());
  if (rows.length === 0) {
    return <Empty title={tr.noStockMovementsYet} body={tr.everyReceiptIssueAdjustment} />;
  }
  return (
    <section className={panel}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10">
              {[tr.when, tr.item, tr.movement, tr.qty, tr.reason, tr.by].map((head, i) => (
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
  const tr = inventoryDict(useStudioLocale());
  const [form, setForm] = useState(null);
  const [importing, setImporting] = useState(false);
  const closeForm = useCallback(() => setForm(null), []);
  const closeImport = useCallback(() => setImporting(false), []);
  const itemCount = useMemo(() => {
    const counts = {};
    for (const i of items) if (i.vendorId) counts[i.vendorId] = (counts[i.vendorId] || 0) + 1;
    return counts;
  }, [items]);

  return (
    <>
      <Toolbar canManage={canManage} label={tr.addVendor} onAdd={() => setForm({ row: null })}
        before={<button type="button" className={btnGhost} onClick={() => setImporting(true)}>{tr.importLabel}</button>} />

      {importing && (
        <Dialog title={tr.importVendors} description={tr.importVendorsHint} onClose={closeImport}>
          <VendorImport busy={busy} onCancel={closeImport} send={send} />
        </Dialog>
      )}

      {form && (
        <Dialog title={form.row ? `Edit ${form.row.name}` : tr.addVendor}
          description={tr.whoBuyWhatThey}
          onClose={closeForm}>
          <VendorForm row={form.row} busy={busy} onCancel={closeForm}
            onSave={async (v) => { if (await send("vendors", form.row ? "PUT" : "POST", form.row ? { ...v, id: form.row.id } : v)) setForm(null); }} />
        </Dialog>
      )}

      {rows.length === 0 ? (
        <Empty title={tr.noVendorsYet} body={tr.vendorsWhoBuyItems} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((v) => (
            <section key={v.id} className={panel}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{v.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {[v.contactName, v.email, v.phone].filter(Boolean).join(" · ") || tr.noContactDetails}
                  </p>
                </div>
                {canManage && (
                  <span className="flex shrink-0 gap-2">
                    <button className={btnGhost} onClick={() => setForm({ row: v })}>{tr.edit}</button>
                    <button className={btnGhost} disabled={busy} onClick={() => send("vendors", "DELETE", { id: v.id })}>{tr.delete}</button>
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400">{tr.nRegisteredItems(itemCount[v.id] || 0)}</p>
              {(v.itemTypes || []).length > 0 && (
                <div className="mt-3">
                  <p className={microLabel}>{tr.supplies}</p>
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

// IMPORTING A LIST somebody was handed, rather than typing it in one vendor at
// a time. Three things happen in here, and they are deliberately separate:
//
//   1. THE FILE IS READ IN THE BROWSER. It is already here; sending it to be
//      parsed elsewhere would add a round trip and a multipart body for no
//      answer we cannot work out locally. What goes up is JSON the route
//      re-validates from scratch, so nothing is trusted for having been parsed.
//   2. WHAT IT SAYS IS SHOWN BEFORE IT IS COMMITTED. Attaching tells you how
//      many vendors are in there and how many lines have no name; nobody
//      imports two hundred rows blind.
//   3. THE PROMPT IS THE ANSWER TO "I DON'T HAVE A FILE". Most people asked for
//      a CSV have no idea how to produce one, so the dialog carries the exact
//      words to hand an AI along with whatever list they do have.
function VendorImport({ busy, onCancel, send }) {
  const tr = inventoryDict(useStudioLocale());
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [read, setRead] = useState(null);   // what the attached file turned out to hold
  const [result, setResult] = useState(null); // what the server did with it
  const [copied, setCopied] = useState(false);
  // Set only when the clipboard refuses (an insecure origin, a browser policy).
  // The prompt is then shown to be selected by hand — a Copy button that fails
  // silently is a button that teaches people the feature is broken.
  const [showPrompt, setShowPrompt] = useState(false);

  async function pick(file) {
    setResult(null);
    if (!file) { setFileName(""); setRead(null); return; }
    setFileName(file.name);
    setRead(readVendorCsv(await file.text()));
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(tr.importAiPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowPrompt(true); // blocked — let them take it by hand instead
    }
  }

  async function run() {
    const out = await send("vendors/import", "POST", { rows: read.rows });
    // `false` is a refusal, and the banner on the screen behind already says
    // why. Anything else is the tally.
    if (out) setResult(out);
  }

  // `read.rows` carries the nameless ones too — they are sent so the server can
  // report them by line (see readVendorCsv) — so what is READY is what is left
  // after them.
  const nameless = read?.nameless.length || 0;
  const ready = (read?.rows.length || 0) - nameless;

  return (
    <>
      {/* The prompt comes FIRST, because not having a file is the state most
          people open this dialog in. */}
      <div className="rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-4 dark:border-white/15">
        <p className="text-sm text-slate-600 dark:text-slate-300">{tr.importPromptHint}</p>
        <button type="button" className={`${btnGhost} mt-3`} onClick={copyPrompt}>
          {copied ? tr.copied : tr.copy}
        </button>
        {showPrompt && (
          <textarea readOnly rows={8} value={tr.importAiPrompt}
            className={`${input} mt-3 font-mono text-xs`} onFocus={(e) => e.target.select()} />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden"
          onChange={(e) => pick(e.target.files?.[0])} />
        <button type="button" className={btnGhost} onClick={() => fileRef.current?.click()}>{tr.attachFile}</button>
        <span className="min-w-0 truncate text-sm text-slate-500 dark:text-slate-400">{fileName || tr.noFileChosen}</span>
      </div>

      {/* What the file turned out to hold, before anything is sent. */}
      {read && !result && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {read.noNameColumn || read.rows.length === 0
            ? tr.mEmptyFile
            : <>{tr.importReady(ready)}{nameless > 0 && <span className="text-amber-600 dark:text-amber-400"> · {tr.importSkipping(nameless)}</span>}</>}
        </p>
      )}

      {/* What the server actually did. A row can be refused for a reason the
          file alone could not know — the name is already on the list — so this
          is not the same list as the one above and never stands in for it. */}
      {result && (
        <div className="mt-3">
          <p className="text-sm font-600 text-slate-900 dark:text-white">{tr.importDone(result.created || 0)}</p>
          {(result.skipped || []).length > 0 && (
            <>
              <p className={`${microLabel} mt-3`}>{tr.importNotImported}</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {result.skipped.map((s) => (
                  <li key={s.line}>
                    {tr.importLine(s.line)} — {s.name ? `${s.name}: ` : ""}
                    {s.reason === "duplicate" ? tr.importTaken : tr.importNoName}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        {/* Once it has run, Import is spent: pressing it again would re-send the
            same rows, and every one of them would come back a duplicate. */}
        {!result && (
          <button className={btn} disabled={busy || !ready} onClick={run}>
            {busy ? tr.importing : tr.importLabel}
          </button>
        )}
        <button className={btnGhost} onClick={onCancel}>{result ? tr.close : tr.cancel}</button>
      </div>
    </>
  );
}

function VendorForm({ row, busy, onSave, onCancel }) {
  const tr = inventoryDict(useStudioLocale());
  const [f, setF] = useState({
    name: row?.name || "", contactName: row?.contactName || "", email: row?.email || "",
    phone: row?.phone || "", notes: row?.notes || "",
  });
  const [types, setTypes] = useState(row?.itemTypes || []);
  const setType = (i, k, v) => setTypes((cur) => cur.map((t, n) => (n === i ? { ...t, [k]: v } : t)));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr.name} required value={f.name} onChange={(v) => setF((s) => ({ ...s, name: v }))} />
        <Field label={tr.contact} value={f.contactName} onChange={(v) => setF((s) => ({ ...s, contactName: v }))} />
        <Field label={tr.email} type="email" value={f.email} onChange={(v) => setF((s) => ({ ...s, email: v }))} />
        <Field label={tr.phone} value={f.phone} onChange={(v) => setF((s) => ({ ...s, phone: v }))} />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={microLabel}>{tr.itemTypes}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{tr.whatVendorSuppliesHow}</p>
          </div>
          <button type="button" className={btnGhost} onClick={() => setTypes((cur) => [...cur, { type: "", weeks: "" }])}>{tr.addType}</button>
        </div>
        {types.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">{tr.noneYet}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {types.map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-3 dark:border-white/15">
                <Field label={tr.type} value={t.type} onChange={(v) => setType(i, "type", v)} className="flex-1" />
                <Field label={tr.weeks} type="number" min="0" value={t.weeks} onChange={(v) => setType(i, "weeks", v)} className="w-32" />
                <button type="button" aria-label={tr.remove} title={tr.remove}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-rose-600 dark:hover:bg-white/5"
                  onClick={() => setTypes((cur) => cur.filter((_, n) => n !== i))}>
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4"><Field label={tr.notes} as="textarea" value={f.notes} onChange={(v) => setF((s) => ({ ...s, notes: v }))} inputProps={{ rows: 2 }} /></div>

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !f.name.trim()} onClick={() => onSave({ ...f, itemTypes: types })}>{busy ? tr.saving : tr.saveVendor}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

// ---- project sheets --------------------------------------------------------
// One sheet per project: what was ordered for it, and what has been issued to
// it. Grouped by project rather than listed flat, because the question this
// screen answers is always "where is this project's material?".
function StatusBadge({ code, delivered }) {
  const tr = inventoryDict(useStudioLocale());
  // Waybill tone is chosen by the delivered/exception flags, not by the raw code,
  // so we hand StatusPill a synthesised token (kind "awb") and the code's label.
  if (!code) return <StatusPill kind="awb" status="notmoved" label={tr.notMovedYet} />;
  const status = delivered ? "delivered" : isException(code) ? "exception" : "intransit";
  return <StatusPill kind="awb" status={status} label={statusLabel(code)} title={AWB_STATUS_BY_CODE[code]?.desc || ""} />;
}

function Awb({ shipments, airlines, projects, statuses, slug, nav, canManage, busy, send }) {
  const tr = inventoryDict(useStudioLocale());
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
            <h2 className={h2}>{tr.awbTracking}</h2>
            <p className={sub}>{tr.awbLead}</p>
          </div>
          {canManage && <button className={btnGhost} onClick={() => setRegistry(true)}>{tr.airlineRegistry}</button>}
        </div>

        {canManage && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <Field label={tr.awbNumber} hint={tr.prefix8Digits} value={raw} className="sm:max-w-xs"
                onChange={(v) => setRaw(v)}
                inputProps={{ onKeyDown: (e) => { if (e.key === "Enter" && parsed?.valid) { e.preventDefault(); track(); } } }} />
              <button className={btn} disabled={busy || !parsed?.valid} onClick={track}>{busy ? tr.adding : tr.track}</button>
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
        <Dialog title={tr.airlineRegistry} description={tr.airlineRegistryHint} onClose={closeRegistry} width="max-w-[640px]">
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
        <Empty title={tr.nothingAir} body={tr.pasteWaybillNumberAbove} />
      ) : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {[tr.colAwb, tr.colCarrier, tr.colRoute, tr.colPieces, tr.colStatus, tr.colLastEvent].map((head, i) => (
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
                          <a href={s.trackUrl} target="_blank" rel="noreferrer" className={btnGhost} title={tr.openCarrierOwnTracking}>{tr.carrier}</a>
                        )}
                        <button className={btnGhost} onClick={() => setDetail(s)}>{tr.open}</button>
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
  const tr = inventoryDict(useStudioLocale());
  const [code, setCode] = useState("RCS");
  const [at, setAt] = useState("");
  const [station, setStation] = useState("");
  const [flightNo, setFlightNo] = useState("");
  const [note, setNote] = useState("");

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className={label}>{tr.carrier}</label><input className={inputRO} readOnly value={s.airlineName || `Prefix ${s.prefix}`} /></div>
        <div><label className={label}>{tr.route}</label><input className={inputRO} readOnly value={`${s.origin || "—"} → ${s.destination || "—"}`} /></div>
        <div><label className={label}>{tr.consignment}</label><input className={inputRO} readOnly value={`${s.pieces || 0} pcs${s.weightKg > 0 ? ` · ${num(s.weightKg)} kg` : ""}`} /></div>
      </div>
      {s.projectId && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-600 uppercase tracking-wide">{tr.for}</span>
          <RecordLink href={linkIf(nav?.projects, linkToProject(slug, s.projectId))} title={tr.openProject}>
            {projects.find((p) => p.id === s.projectId)?.number || "project"}
          </RecordLink>
        </p>
      )}

      <p className={`${microLabel} mt-5`}>{tr.timeline}</p>
      {(s.movements || []).length === 0 ? (
        <p className="text-sm text-slate-400">{tr.nothingRecordedYet}</p>
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
        <div className="mt-5 rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-4 dark:border-white/15">
          <p className={microLabel}>{tr.recordMilestone}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={tr.status} as="select" required value={code} onChange={(v) => setCode(v)}
              options={statuses.map((st) => ({ value: st.code, label: `${st.code} — ${st.label}` }))} />
            <Field label={<>{tr.when} <span className="font-400 normal-case text-slate-400">(now if blank)</span></>} type="datetime-local" value={at} onChange={(v) => setAt(v)} />
            <Field label={tr.station} value={station} onChange={(v) => setStation(v.toUpperCase())} hint={tr.airportCodeHint} />
            <Field label={tr.flight} value={flightNo} onChange={(v) => setFlightNo(v.toUpperCase())} hint={tr.airlineCodeNumber} />
            <Field label={tr.note} value={note} onChange={(v) => setNote(v)} className="sm:col-span-2" />
          </div>
          <p className="mt-2 text-xs text-slate-400">{AWB_STATUS_BY_CODE[code]?.desc}</p>
          <div className="mt-3">
            <button className={btn} disabled={busy} onClick={async () => {
              const ok = await onSave({ movement: { code, at: at ? new Date(at).toISOString() : "", station, flightNo, note } });
              if (ok) { setStation(""); setFlightNo(""); setNote(""); setAt(""); }
            }}>{busy ? tr.recording : tr.record}</button>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        {canManage
          ? <button className="text-sm font-600 text-rose-600 hover:underline dark:text-rose-400" onClick={onDelete}>{tr.stopTracking}</button>
          : <span />}
        <button className={btnGhost} onClick={onClose}>{tr.close}</button>
      </div>
    </>
  );
}

function Airlines({ rows, busy, onSave, onCancel }) {
  const tr = inventoryDict(useStudioLocale());
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
        <Field label={tr.search} type="search" hint={tr.prefixNameIata} value={query} onChange={(v) => setQuery(v)} className="sm:max-w-xs" />
        <button className={btn} onClick={() => setForm({ prefix: "", name: "", iata: "", trackUrlTemplate: "" })}>{tr.addAirline}</button>
      </div>

      {form && (
        <div className="mt-4 rounded-xl border border-brand-500/40 bg-[var(--geex-inset)] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={tr.prefix3Digits} value={form.prefix} hint={tr.airline3DigitPrefix}
              onChange={(v) => setForm((s) => ({ ...s, prefix: v.replace(/\D/g, "").slice(0, 3) }))} />
            <Field label={tr.iataCode} value={form.iata} hint="2-letter airline code"
              onChange={(v) => setForm((s) => ({ ...s, iata: v.toUpperCase().slice(0, 3) }))} />
            <Field label={tr.airlineName} value={form.name} className="sm:col-span-2"
              onChange={(v) => setForm((s) => ({ ...s, name: v }))} />
            <Field className="sm:col-span-2" value={form.trackUrlTemplate} hint="https://airline.com/track?awb={SERIAL}"
              label={<>{tr.trackingUrlTemplate} <span className="font-400 normal-case text-slate-400">(tokens {"{AWB} {PREFIX} {SERIAL}"})</span></>}
              onChange={(v) => setForm((s) => ({ ...s, trackUrlTemplate: v }))} />
          </div>
          <div className="mt-4 flex gap-3">
            <button className={btn} disabled={busy || form.prefix.length !== 3 || !form.name.trim()}
              onClick={async () => { if (await onSave(form.id ? "PUT" : "POST", form)) setForm(null); }}>
              {busy ? tr.saving : tr.saveAirline}
            </button>
            <button className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{tr.noAirlinesYetWaybill}</p>
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
                <button className={btnGhost} onClick={() => setForm({ ...a })}>{tr.edit}</button>
                <button className={btnGhost} disabled={busy} onClick={() => onSave("DELETE", { id: a.id })}>{tr.delete}</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex justify-end"><button className={btnGhost} onClick={onCancel}>{tr.close}</button></div>
    </>
  );
}
