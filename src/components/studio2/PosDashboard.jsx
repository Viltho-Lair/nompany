// THE POINT OF SALE DASHBOARD (17/09/2026) — what the counter took in a period,
// what sold most, and everything that sold.
//
// EVERY FIGURE IS THE SERVER'S (modules/sales/pos → posReports), for the period
// this screen worked out in the reader's own time. Nothing is recounted here
// except the day buckets, which have to be the READER's days.
//
// THE FREE FLOOR IS NEVER GATED: takings, sales, tax, the average sale and the
// full list of what sold. A shop that cannot see what it sold because it did not
// buy analytics is being sold its own till back. The best-sellers chart and the
// takings trend are the paid widgets.
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStudioLocale } from "@/components/studio2/locale";
import { posDeptDict } from "@/shared/studio/posDept";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { h2, StatTile, money, th, btn, btnGhost } from "@/components/studio2/ui";
import { StatRow, DashGrid, Widget, DashEmpty } from "@/components/dashboard";
import { BarList, BarChart } from "@/components/charts";
import { useWidgetGate } from "@/components/studio2/analyticsLevel";
import { PeriodPicker, usePosPeriod, rangeQuery } from "@/components/studio2/posParts";
import ReorderList from "@/components/studio2/ReorderList";

// NAMED `*Dashboard.jsx` DELIBERATELY: the widget-gate scan reads exactly that
// filename pattern to prove every registry key is drawn by something.
export default function PosDashboard({ slug }) {
  const locale = useStudioLocale();
  const tr = posDeptDict(locale);
  const period = usePosPeriod("day");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const gate = useWidgetGate();
  const query = rangeQuery(period.range);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/pos/dashboard?${query}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || "failed"); return; }
    setError("");
    setData({ query, ...body });
  }, [slug, query]);

  useEffect(() => {
    let current = true;
    (async () => { if (current) await load(); })();
    return () => { current = false; };
  }, [load]);
  // Every sale is filed under the till's row.
  useLiveUpdates(slug, "crm-sales-pos", load);

  // THE READER'S DAYS across the period — at most a year of them.
  const byDay = useMemo(() => {
    if (!data?.sales) return { labels: [], values: [] };
    const from = new Date(period.range.from);
    const to = new Date(period.range.to);
    const days = [];
    for (let d = new Date(from); d < to && days.length < 366; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    const key = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const totals = new Map(days.map((d) => [key(d), 0]));
    for (const s of data.sales) {
      const k = key(new Date(s.at));
      if (totals.has(k)) totals.set(k, totals.get(k) + Number(s.total || 0));
    }
    return {
      labels: days.map((d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`),
      values: days.map((d) => Math.round(totals.get(key(d)) * 100) / 100),
    };
  }, [data, period.range]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error === "forbidden" ? tr.refused : error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { totals = {}, items = [], terms = {}, may = {}, openShifts = 0, reorder = null, offers = null } = data;
  const cur = terms.currency || "";
  const amount = (n) => `${money(n || 0, cur)}${cur ? ` ${cur}` : ""}`;
  const top = items.slice(0, 10);
  const most = Math.max(1, ...top.map((i) => i.units));
  const stale = data.query !== query;

  return (
    <div className={`space-y-5 ${stale ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodPicker tr={tr} value={period} />
        <div className="flex flex-wrap gap-2">
          <Link href={`/${slug}/pos-till`} className={btn}>{tr.openTill}</Link>
          {may.export && (
            <a className={btnGhost} href={`/api/studios/${slug}/pos/export?${rangeQuery(period.range, { kind: "items" })}`}>
              {tr.download}: {tr.downloadItems}
            </a>
          )}
        </div>
      </div>

      <StatRow>
        <StatTile label={tr.takings} value={amount(totals.total)} href={may.sales ? `/${slug}/pos-sales` : ""} />
        <StatTile label={tr.salesCount} value={<span className="num">{totals.sales ?? 0}</span>} href={may.sales ? `/${slug}/pos-sales` : ""} />
        <StatTile label={tr.averageSale} value={amount(totals.average)} />
        <StatTile label={tr.unitsSold} value={<span className="num">{totals.items ?? 0}</span>} />
        <StatTile label={tr.tax} value={amount(totals.vat)} />
        <StatTile label={tr.openDrawers} value={<span className="num">{openShifts}</span>} href={may.shifts ? `/${slug}/pos-shifts` : ""} />
        {/* ABSENT, NOT NOUGHT, when the offers are not this reader's to see or
            the department is switched off — a nought would be a claim about
            what the shop is running. */}
        {offers && (
          <StatTile label={tr.offersRunning} value={<span className="num">{offers.running}</span>}
            sub={offers.endingSoon > 0 ? `${offers.endingSoon} · ${tr.offersEndingSoon(offers.withinDays)}` : ""}
            href={`/${slug}/pos-promotions`} />
        )}
      </StatRow>

      <DashGrid>
        <Widget title={tr.topProducts} hint={tr.topProductsHint} span={2}
          {...gate("pos.top-products")} lockedWhat={tr.topProducts}>
          {top.length ? (
            <BarList items={top.map((i) => ({
              label: i.name,
              value: Math.round((i.units / most) * 100),
              display: <span className="num text-xs text-slate-500 dark:text-slate-400">{i.units} · {amount(i.value)}</span>,
            }))} />
          ) : <DashEmpty text={tr.noSales} />}
        </Widget>

        {period.period !== "day" && (
          <Widget title={tr.takingsByDay} span={2} {...gate("pos.takings-by-day")} lockedWhat={tr.takingsByDay}>
            {totals.sales ? (
              <BarChart height={220} labels={byDay.labels} rtl={locale === "ar"}
                series={[{ name: tr.takings, data: byDay.values }]} />
            ) : <DashEmpty text={tr.noSales} />}
          </Widget>
        )}
      </DashGrid>

      {/* WHAT IS RUNNING LOW, for whoever holds the stock alert (the server sends
          null to everybody else). */}
      {reorder && <ReorderList rows={reorder} href={`/${slug}/inventory-stock`} />}

      {/* EVERYTHING THAT SOLD — the free list the owner asked for. */}
      <section className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
        <h2 className={h2}>{tr.allItemsSold}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.allItemsSoldHint}</p>
        {items.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className={`${th} text-start`}>#</th>
                  <th className={`${th} text-start`}>{tr.item}</th>
                  <th className={`${th} text-end`}>{tr.units}</th>
                  <th className={`${th} text-end`}>{tr.value}{cur ? ` (${cur})` : ""}</th>
                  <th className={`${th} text-end`}>{tr.receipts}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, n) => (
                  <tr key={i.itemId} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className="py-2.5 pe-3 text-slate-400">{n + 1}</td>
                    <td className="py-2.5 pe-3 font-600 text-[var(--geex-ink)]">{i.name}</td>
                    <td className="num py-2.5 pe-3 text-end">{i.units}</td>
                    <td className="num py-2.5 pe-3 text-end">{money(i.value, cur)}</td>
                    <td className="num py-2.5 text-end text-slate-500 dark:text-slate-400">{i.receipts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{tr.noSales}</p>}
      </section>
    </div>
  );
}
