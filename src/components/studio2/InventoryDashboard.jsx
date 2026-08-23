"use client";

// THE INVENTORY DASHBOARD (UI/UX overhaul §2.4). Inventory has no analytics
// module of its own, so every number here is DERIVED inline from what the screen
// already holds — items with on-hand and unit cost, purchase orders with their
// lines and status, vendors, deliveries and movements. Nothing is fetched here
// and nothing is invented: a widget with no data behind it says so rather than
// drawing an empty frame.
//
// ANALYTICS IS PAID, so each widget is gated by the per-component SELECTION model:
// `useWidgetVisible()` answers whether this studio's tier includes a given widget
// key, and a widget it does not sees the locked teaser instead of the number. The
// free floor gets the KPI row; each gated widget carries its registry key.

import { money, StatTile, h2, sub, microLabel, fmtDate } from "@/components/studio2/ui";
import { Widget, StatRow, DashGrid } from "@/components/dashboard";
import { BarList, Donut } from "@/components/charts";
import { CurrencySymbol } from "@/components/Currency";
import { Icon } from "@/components/studio2/icons";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";
import { StatusPill } from "@/components/studio2/StatusPill";

// Quantities are counts, not money — three decimals at most, no forced pair.
const qty = (n) => new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(Number(n) || 0);

// PO status → its slot on the chart ramp, so the donut, its legend and the KPI
// row never disagree about what "Ordered" looks like.
const PO_STATUS_COLOR = {
  Draft: "rgb(var(--chart-4))",
  Ordered: "rgb(var(--chart-1))",
  "Partly received": "rgb(var(--chart-3))",
  Received: "rgb(var(--chart-2))",
  Cancelled: "rgb(var(--chart-5))",
};
const PO_STATUS_ORDER = ["Draft", "Ordered", "Partly received", "Received", "Cancelled"];

// Stock-move kind colours now come from the shared StatusPill map (kind
// "movement"), the same one StudioInventory's ledger uses.

// PURE DERIVATION — no React, so what each widget shows can be read in one place
// and reasoned about without the component around it. Everything is summed from
// the rows the screen was handed; a client never tells us what a total is.
function derive({ items, orders }) {
  // The value on the shelf, and the value on the shelf broken down by who it was
  // bought from. Items with no vendor are gathered under one heading rather than
  // dropped, so the parts still add up to the whole.
  const stockByVendor = new Map();
  for (const i of items) {
    const value = (i.onHand || 0) * (i.unitCost || 0);
    if (value <= 0) continue;
    const name = i.vendorName || "Unassigned";
    stockByVendor.set(name, (stockByVendor.get(name) || 0) + value);
  }

  // Below reorder level, most urgent first — the emptiest shelf relative to the
  // level it should sit at, which is not the same as the smallest count.
  const below = items
    .filter((i) => i.low)
    .map((i) => ({
      name: i.name,
      onHand: i.onHand || 0,
      reorderLevel: i.reorderLevel || 0,
      unit: i.unit,
      fill: i.reorderLevel > 0 ? Math.min(100, Math.round(((i.onHand || 0) / i.reorderLevel) * 100)) : 0,
    }))
    .sort((a, b) => a.fill - b.fill);

  // Purchase orders counted by status, and the money committed to each vendor.
  // Spend is what has actually been ordered — a Draft is not a commitment and a
  // Cancelled one was withdrawn, so neither counts against a vendor.
  const statusCount = {};
  const spendByVendor = new Map();
  let outstandingValue = 0;
  const outstandingByOrder = [];
  for (const o of orders) {
    statusCount[o.status] = (statusCount[o.status] || 0) + 1;
    const committed = o.status === "Ordered" || o.status === "Partly received" || o.status === "Received";
    if (committed) {
      const name = o.vendorName || "Unknown vendor";
      spendByVendor.set(name, (spendByVendor.get(name) || 0) + (o.total || 0));
    }
    // Money still expected to arrive: the remaining quantity on each line valued
    // at its own price. `o.outstanding` counts units; this weights them.
    if (o.status === "Ordered" || o.status === "Partly received") {
      const val = (o.lines || []).reduce(
        (s, l) => s + Math.max(0, (l.qty || 0) - Number(l.received || 0)) * (Number(l.unitPrice) || 0), 0,
      );
      if (val > 0) {
        outstandingValue += val;
        outstandingByOrder.push({ reference: o.reference, vendorName: o.vendorName, value: val });
      }
    }
  }
  outstandingByOrder.sort((a, b) => b.value - a.value);

  const spend = [...spendByVendor.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  const stockVendor = [...stockByVendor.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const statusSlices = PO_STATUS_ORDER
    .filter((s) => statusCount[s] > 0)
    .map((s) => ({ label: s, value: statusCount[s], color: PO_STATUS_COLOR[s] }));
  const poTotal = orders.length;

  return { below, spend, stockVendor, statusSlices, poTotal, outstandingValue, outstandingByOrder };
}

export default function InventoryDashboard({
  slug, summary, items = [], orders = [], movements = [], nav,
  currency = "",
}) {
  const d = derive({ items, orders });
  const visible = useWidgetVisible();
  const href = (key) => (nav?.[key] ? `/${slug}/${key}` : "");
  const amt = (n) => <span className="num"><CurrencyGlyph currency={currency} />{money(n)}</span>;

  const recent = [...movements].slice(0, 7);
  const openPos = (summary?.awaiting ?? 0);

  const sections = [
    { key: "inventory-items", label: "Registered Items", desc: "The catalogue, by vendor", icon: "services" },
    { key: "inventory-stock", label: "Stock Management", desc: "What is held, and the ledger behind it", icon: "blueprint" },
    { key: "inventory-vendors", label: "Vendors", desc: "Who you buy from, and what they supply", icon: "vendors" },
    { key: "inventory-sheets", label: "Project Sheets", desc: "Ordered for and issued to each project", icon: "report" },
    { key: "inventory-awb", label: "AWB Tracking", desc: "Air freight, by waybill", icon: "external" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className={h2}>Inventory</h2>
        <p className={sub}>Vendors, the catalogue, what is on the shelf, and what is still in the air.</p>
      </div>

      {/* Basic — the summary everyone gets, before any detail. */}
      <StatRow>
        <StatTile label="Registered items" value={qty(summary?.items ?? items.length)} href={href("inventory-items")} />
        <StatTile label="Stock value" value={amt(summary?.value ?? 0)} href={href("inventory-stock")} />
        <StatTile label="Below reorder" value={qty(summary?.low ?? d.below.length)}
          tone={(summary?.low ?? 0) > 0 ? "text-amber-700 dark:text-amber-300" : ""} href={href("inventory-stock")} />
        <StatTile label="Open purchase orders" value={qty(openPos)} href={href("inventory-sheets")} />
      </StatRow>

      <DashGrid>
        {/* Simple */}
        <Widget title="Below reorder level" hint="On hand against the level it should sit at" locked={!visible("inventory.below-reorder")} lockedWhat="Below-reorder items">
          {d.below.length ? (
            <BarList items={d.below.slice(0, 8).map((b) => ({
              label: b.name,
              value: b.fill,
              color: b.fill < 50 ? "rgb(var(--chart-1))" : "rgb(var(--chart-3))",
              display: <span className="num">{qty(b.onHand)} / {qty(b.reorderLevel)} {b.unit}</span>,
            }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">Nothing below reorder level.</p>}
        </Widget>

        <Widget title="Purchase orders by status" hint="Where every order stands" locked={!visible("inventory.orders-by-status")} lockedWhat="Order status breakdown">
          {d.poTotal ? (
            <div className="flex flex-wrap items-center justify-center gap-5 py-2">
              <Donut size={168} data={d.statusSlices.map((s) => ({ label: s.label, value: s.value, color: s.color }))}
                center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{qty(d.poTotal)}</p><p className="text-[11px] text-slate-400">orders</p></div>} />
              <ul className="space-y-1.5">
                {d.statusSlices.map((s) => (
                  <li key={s.label} className="flex items-center gap-2 text-xs">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-600 dark:text-slate-300">{s.label}</span>
                    <span className="num ms-auto ps-3 font-600 text-slate-700 dark:text-slate-200">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">No purchase orders yet.</p>}
        </Widget>

        <Widget title="Spend by vendor" hint="Committed on ordered, partly-received and received POs" locked={!visible("inventory.spend-by-vendor")} lockedWhat="Spend by vendor">
          {d.spend.length ? (
            <BarList items={d.spend.slice(0, 8).map((v) => ({
              label: v.name,
              value: d.spend[0].total > 0 ? Math.round((v.total / d.spend[0].total) * 100) : 0,
              display: amt(v.total),
            }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">Nothing ordered yet.</p>}
        </Widget>

        {/* Moderate */}
        <Widget title="Stock value by vendor" hint="On-hand quantity valued at unit cost" locked={!visible("inventory.stock-value-by-vendor")} lockedWhat="Stock value by vendor">
          {d.stockVendor.length ? (
            <BarList items={d.stockVendor.slice(0, 8).map((v) => ({
              label: v.name,
              value: d.stockVendor[0].value > 0 ? Math.round((v.value / d.stockVendor[0].value) * 100) : 0,
              display: amt(v.value),
            }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">No stock value yet.</p>}
        </Widget>

        <Widget title="Outstanding on order" hint="Value still expected to arrive, by order" locked={!visible("inventory.outstanding-on-order")} lockedWhat="Outstanding order value">
          {d.outstandingByOrder.length ? (
            <>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{amt(d.outstandingValue)} outstanding across {d.outstandingByOrder.length} order{d.outstandingByOrder.length === 1 ? "" : "s"}.</p>
              <BarList items={d.outstandingByOrder.slice(0, 8).map((o) => ({
                label: `${o.reference}${o.vendorName ? ` · ${o.vendorName}` : ""}`,
                value: d.outstandingByOrder[0].value > 0 ? Math.round((o.value / d.outstandingByOrder[0].value) * 100) : 0,
                display: amt(o.value),
              }))} />
            </>
          ) : <p className="py-8 text-center text-sm text-slate-400">Nothing outstanding on order.</p>}
        </Widget>

        <Widget title="Recent stock movements" hint="The latest of the ledger" locked={!visible("inventory.recent-movements")} lockedWhat="Recent movements">
          {recent.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {recent.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                  <StatusPill kind="movement" status={m.kind} base="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-600" />
                  <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{m.itemLabel}</span>
                  <span className="num shrink-0 font-600 text-slate-900 dark:text-white">
                    {m.kind === "out" ? "−" : m.kind === "adjust" && m.qty < 0 ? "" : "+"}{qty(Math.abs(m.qty))}
                  </span>
                  <span className="num shrink-0 text-xs text-slate-400">{fmtDate(m.at)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="py-8 text-center text-sm text-slate-400">No stock movements yet.</p>}
        </Widget>
      </DashGrid>

      {/* The way into each sub-section — kept from the old dashboard, because the
          parent section is where a studio arrives and it still has to point on. */}
      <section>
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
            const cls = "flex items-center gap-4 rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-4 dark:border-white/15";
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
    </div>
  );
}

// The currency glyph before an amount, when the studio has one configured.
function CurrencyGlyph({ currency }) {
  if (!currency) return null;
  return <span className="me-0.5 text-slate-400"><CurrencySymbol code={currency} /></span>;
}
