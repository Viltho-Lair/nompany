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

import { money, StatTile, microLabel, fmtDate } from "@/components/studio2/ui";
import { useStudioLocale } from "@/components/studio2/locale";
import { inventoryDict } from "@/shared/studio/inventory";
import { Widget, StatRow, DashGrid, DashEmpty, DonutLegend } from "@/components/dashboard";
import { BarChart, BarList, ChartFrame, ComboChart, Donut } from "@/components/charts";
import {
  monthLabel, monthsBack, sumByMonth, countByMonth, weeksBack, sumByWeek,
  rankTotals, shortDay, peak, share,
} from "@/components/dashboard/series";
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
function derive({ items, orders }, tr) {
  // The value on the shelf, and the value on the shelf broken down by who it was
  // bought from. Items with no vendor are gathered under one heading rather than
  // dropped, so the parts still add up to the whole.
  const stockByVendor = new Map();
  for (const i of items) {
    const value = (i.onHand || 0) * (i.unitCost || 0);
    if (value <= 0) continue;
    const name = i.vendorName || tr.unassigned;
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
      const name = o.vendorName || tr.unknownVendor;
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
  const locale = useStudioLocale();
  const tr = inventoryDict(locale);
  const d = derive({ items, orders }, tr);
  const visible = useWidgetVisible();
  const href = (key) => (nav?.[key] ? `/${slug}/${key}` : "");
  const amt = (n) => <span className="num"><CurrencyGlyph currency={currency} />{money(n)}</span>;

  const recent = [...movements].slice(0, 7);
  const openPos = (summary?.awaiting ?? 0);

  // ---- the richer half (10/09/2026) ---------------------------------------
  const rtl = locale === "ar";
  const asOf = new Date().toISOString().slice(0, 10);
  // ONE STATE PER ITEM, decided in this order: nothing on the shelf is out of
  // stock whatever its level says; below the level is low; and an item with no
  // level set cannot be judged, so it is said to be so rather than called healthy.
  const health = { healthy: 0, low: 0, out: 0, noLevel: 0 };
  for (const i of items) {
    const onHand = Number(i.onHand) || 0;
    if (onHand <= 0) health.out += 1;
    else if (i.low) health.low += 1;
    else if (!(Number(i.reorderLevel) > 0)) health.noLevel += 1;
    else health.healthy += 1;
  }
  const healthSlices = [
    { label: tr.dashHealthy, value: health.healthy, color: "rgb(var(--chart-2))" },
    { label: tr.dashBelowReorder, value: health.low, color: "rgb(var(--chart-4))" },
    { label: tr.dashOutOfStock, value: health.out, color: "rgb(var(--chart-3))" },
    { label: tr.dashNoReorderLevel, value: health.noLevel, color: "rgb(var(--chart-5))" },
  ];
  const topItems = rankTotals(items, (i) => i.name, (i) => (Number(i.onHand) || 0) * (Number(i.unitCost) || 0), 8, null);
  // IN AND OUT BY WEEK. An adjustment corrects the count rather than moving
  // goods, so it belongs to neither series.
  const weeks = weeksBack(12, asOf);
  const inByWeek = sumByWeek(movements.filter((m) => m.kind === "in"), (m) => m.at, (m) => Math.abs(Number(m.qty) || 0), weeks);
  const outByWeek = sumByWeek(movements.filter((m) => m.kind === "out"), (m) => m.at, (m) => Math.abs(Number(m.qty) || 0), weeks);
  // ORDERS PER MONTH. The value counts only what was committed — a Draft is not
  // a commitment and a Cancelled one was withdrawn, the rule spend-by-vendor
  // follows — while the line counts every order raised, so the two may part.
  const months = monthsBack(12, asOf);
  const committed = orders.filter((o) => o.status === "Ordered" || o.status === "Partly received" || o.status === "Received");
  const orderValue = sumByMonth(committed, (o) => o.createdAt, (o) => Number(o.total) || 0, months);
  const orderCount = countByMonth(orders, (o) => o.createdAt, months);

  const sections = [
    { key: "inventory-items", label: tr.registeredItems2, desc: tr.descCatalogue, icon: "services" },
    { key: "inventory-stock", label: tr.stockManagement, desc: tr.descHeld, icon: "blueprint" },
    { key: "procurement-suppliers", label: tr.vendors, desc: tr.descVendors, icon: "vendors" },
    { key: "inventory-sheets", label: tr.projectSheets2, desc: tr.descSheets, icon: "report" },
    { key: "logistics-shipments", label: tr.awbTracking, desc: tr.descAwb, icon: "external" },
  ];

  return (
    <div className="space-y-5">
      {/* Basic — the summary everyone gets, before any detail. */}
      <StatRow>
        <StatTile label={tr.registeredItems} value={qty(summary?.items ?? items.length)} href={href("inventory-items")} />
        <StatTile label={tr.stockValue} value={amt(summary?.value ?? 0)} href={href("inventory-stock")} />
        <StatTile label={tr.belowReorder} value={qty(summary?.low ?? d.below.length)}
          tone={(summary?.low ?? 0) > 0 ? "text-amber-700 dark:text-amber-300" : ""} href={href("inventory-stock")} />
        <StatTile label={tr.openPurchaseOrders} value={qty(openPos)} href={href("inventory-sheets")} />
      </StatRow>

      <DashGrid>
        {/* Simple */}
        <Widget title={tr.belowReorderLevel} hint={tr.handAgainstLevelShould} locked={!visible("inventory.below-reorder")} lockedWhat={tr.belowReorderItems}>
          {d.below.length ? (
            <BarList items={d.below.slice(0, 8).map((b) => ({
              label: b.name,
              value: b.fill,
              color: b.fill < 50 ? "rgb(var(--chart-1))" : "rgb(var(--chart-3))",
              display: <span className="num">{qty(b.onHand)} / {qty(b.reorderLevel)} {b.unit}</span>,
            }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.nothingBelowReorderLevel}</p>}
        </Widget>

        <Widget title={tr.purchaseOrdersStatus} hint={tr.whereEveryOrderStands} locked={!visible("inventory.orders-by-status")} lockedWhat={tr.orderStatusBreakdown}>
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
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noPurchaseOrdersYet}</p>}
        </Widget>

        <Widget title={tr.spendVendor} hint={tr.committedOrderedPartlyReceived} locked={!visible("inventory.spend-by-vendor")} lockedWhat={tr.spendVendor}>
          {d.spend.length ? (
            <BarList items={d.spend.slice(0, 8).map((v) => ({
              label: v.name,
              value: d.spend[0].total > 0 ? Math.round((v.total / d.spend[0].total) * 100) : 0,
              display: amt(v.total),
            }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.nothingOrderedYet}</p>}
        </Widget>

        {/* Moderate */}
        <Widget title={tr.stockValueVendor} hint={tr.handQuantityValuedUnit} locked={!visible("inventory.stock-value-by-vendor")} lockedWhat={tr.stockValueVendor}>
          {d.stockVendor.length ? (
            <BarList items={d.stockVendor.slice(0, 8).map((v) => ({
              label: v.name,
              value: d.stockVendor[0].value > 0 ? Math.round((v.value / d.stockVendor[0].value) * 100) : 0,
              display: amt(v.value),
            }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noStockValueYet}</p>}
        </Widget>

        <Widget title={tr.outstandingOrder} hint={tr.valueStillExpectedArrive} locked={!visible("inventory.outstanding-on-order")} lockedWhat={tr.outstandingOrderValue}>
          {d.outstandingByOrder.length ? (
            <>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{tr.outstandingAcross(amt(d.outstandingValue), tr.nOrders(d.outstandingByOrder.length))}</p>
              <BarList items={d.outstandingByOrder.slice(0, 8).map((o) => ({
                label: `${o.reference}${o.vendorName ? ` · ${o.vendorName}` : ""}`,
                value: d.outstandingByOrder[0].value > 0 ? Math.round((o.value / d.outstandingByOrder[0].value) * 100) : 0,
                display: amt(o.value),
              }))} />
            </>
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.nothingOutstandingOrder}</p>}
        </Widget>

        <Widget title={tr.recentStockMovements} hint={tr.latestLedger} locked={!visible("inventory.recent-movements")} lockedWhat={tr.recentMovements}>
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
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noStockMovementsYet2}</p>}
        </Widget>

        {/* ---- the richer half (10/09/2026) ---- */}
        <Widget title={tr.dashStockHealth} hint={tr.dashStockHealthHint} locked={!visible("inventory.stock-health")} lockedWhat={tr.dashStockHealth}>
          {items.length ? <DonutLegend data={healthSlices} word={tr.dashItemsWord} /> : <DashEmpty text={tr.dashNoStock} />}
        </Widget>

        <Widget title={tr.dashMovementTrend} hint={tr.dashMovementTrendHint} span={2} locked={!visible("inventory.movement-trend")} lockedWhat={tr.dashMovementTrend}>
          {inByWeek.some(Boolean) || outByWeek.some(Boolean) ? (
            <ChartFrame labels={weeks.map((w, i) => (i % 2 === 0 ? shortDay(w) : ""))} height={200}
              legend={[{ name: tr.dashSeriesIn, color: "rgb(var(--chart-2))" }, { name: tr.dashSeriesOut, color: "rgb(var(--chart-3))" }]}>
              <BarChart height={200} rtl={rtl} labels={weeks}
                series={[
                  { name: tr.dashSeriesIn, data: inByWeek, color: "rgb(var(--chart-2))" },
                  { name: tr.dashSeriesOut, data: outByWeek, color: "rgb(var(--chart-3))" },
                ]} />
            </ChartFrame>
          ) : <DashEmpty text={tr.noStockMovementsYet2} />}
        </Widget>

        <Widget title={tr.dashTopItems} hint={tr.dashTopItemsHint} locked={!visible("inventory.top-items")} lockedWhat={tr.dashTopItems}>
          {topItems.length ? (
            <BarList items={topItems.map((t) => ({ label: t.label, value: share(t.value, peak(topItems)), display: amt(t.value) }))} />
          ) : <DashEmpty text={tr.noStockValueYet} />}
        </Widget>

        <Widget title={tr.dashOrderTrend} hint={tr.dashOrderTrendHint} span={2} locked={!visible("inventory.order-trend")} lockedWhat={tr.dashOrderTrend}>
          {orderCount.some(Boolean) ? (
            <ChartFrame labels={months.map((m) => monthLabel(m, locale))} height={220}
              legend={[{ name: tr.dashSeriesValue, color: "rgb(var(--chart-1))" }, { name: tr.dashSeriesOrders, color: "rgb(var(--chart-3))" }]}>
              <ComboChart height={220} rtl={rtl}
                bars={[{ name: tr.dashSeriesValue, data: orderValue, color: "rgb(var(--chart-1))" }]}
                line={{ name: tr.dashSeriesOrders, data: orderCount, color: "rgb(var(--chart-3))" }} />
            </ChartFrame>
          ) : <DashEmpty text={tr.noPurchaseOrdersYet} />}
        </Widget>
      </DashGrid>

      {/* The way into each sub-section — kept from the old dashboard, because the
          parent section is where a studio arrives and it still has to point on. */}
      <section>
        <p className={microLabel}>{tr.sections}</p>
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
