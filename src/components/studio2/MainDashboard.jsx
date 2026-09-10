"use client";

// The studio Overview's executive widgets. Gating is two-layered and the layers
// AGREE: the route sends executive.widgets[key] ONLY for entitled keys (no premium
// figure reaches an unentitled client), and visible(key) — the same entitlement,
// resolved client-side — drives the locked teaser. A widget is locked exactly when
// the server withheld its data. Every source was already visibility-filtered
// server-side (invariant 2), so an empty series means "no section you can see",
// rendered as a note, never a fabricated zero.

import { Widget, DashGrid } from "@/components/dashboard";
import { AreaChart, Sparkline, ChartFrame, PALETTE } from "@/components/charts";
import { sectionName } from "@/shared/studio/sections";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";
import { drillHref } from "@/components/dashboard/drill";
import { fmtDate } from "@/lib/format";
import { toCSV, downloadCSV } from "@/components/dashboard/exportTable";
import { useStudioLocale } from "@/components/studio2/locale";
import { mainDict } from "@/shared/studio/main";

const NoData = ({ text }) => (
  <p className="py-8 text-center text-sm text-slate-400">{text}</p>
);

export default function MainDashboard({ slug, executive }) {
  const locale = useStudioLocale();
  const tr = mainDict(locale);
  const visible = useWidgetVisible();
  const w = executive?.widgets || {};
  const activity = w["main.activity"] || [];
  const queue = w["main.awaiting-you"] || [];
  const ribbon = w["main.event-ribbon"] || [];
  const trends = w["main.headline-trend"] || [];

  // ---- the richer half (10/09/2026) ---------------------------------------
  const rtl = locale === "ar";
  // A DEPARTMENT'S NAME, not its key — the lookup the sidebar uses, so a row
  // reads "CRM & Sales" (or its Arabic) rather than "crm-sales".
  const nameOf = (key) => sectionName(key, "", locale) || key;
  const totalOf = (d) => (d.series || []).reduce((a, s) => a + (Number(s.value) || 0), 0);
  // THE BUSIEST FIVE on one axis; every department still gets its own row below.
  const busiest = [...activity].sort((a, b) => totalOf(b) - totalOf(a)).slice(0, 5);
  const activityLabels = (busiest[0]?.series || []).map((s, i) => (i % 5 === 0 ? s.label : ""));
  const trendPeak = Math.max(1, ...trends.map((r) => Math.abs(Number(r.deltaPct) || 0)));

  return (
    <DashGrid>
      <Widget title={tr.departmentActivity} hint={tr.departmentActivityHint} span={2}
        locked={!visible("main.activity")} lockedWhat={tr.departmentActivity}>
        {activity.length ? (
          <>
            {/* WHO IS CARRYING THE STUDIO, on one axis — the five busiest as
                lines, then every department as a row with its own sparkline,
                which keeps the way into each one. A sparkline alone could not
                be compared: each was scaled to its own peak. */}
            <ChartFrame labels={activityLabels} height={160}
              legend={busiest.map((d, i) => ({ name: nameOf(d.section), color: PALETTE[i % PALETTE.length] }))}>
              <AreaChart height={160} fill={false} showY={false} rtl={rtl} labels={activityLabels}
                series={busiest.map((d, i) => ({ name: d.section, data: (d.series || []).map((s) => s.value), color: PALETTE[i % PALETTE.length] }))} />
            </ChartFrame>
            <ul className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2">
              {activity.map((d) => (
                <li key={d.section} className="flex items-center gap-3">
                  <a href={drillHref(slug, d.section)} className="w-28 shrink-0 truncate text-sm text-slate-600 hover:underline dark:text-slate-300">{nameOf(d.section)}</a>
                  <span className="min-w-0 flex-1"><Sparkline data={(d.series || []).map((s) => s.value)} height={28} /></span>
                  <span className="num w-10 shrink-0 text-end text-xs font-600 text-slate-700 dark:text-slate-200">{totalOf(d)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : <NoData text={tr.noSectionsVisible} />}
      </Widget>

      <Widget title={tr.awaitingYou} hint={tr.awaitingYouHint}
        locked={!visible("main.awaiting-you")} lockedWhat={tr.awaitingYou}>
        {queue.length ? (
          <>
            <ul>{queue.map((q) => (
              <li key={q.id}>
                <a href={drillHref(slug, q.section, { id: q.id })} className="flex justify-between text-sm">
                  <span>{q.label}</span><span className="num text-muted-foreground">{fmtDate(q.at)}</span>
                </a>
              </li>
            ))}</ul>
            <button type="button" className="mt-2 text-xs text-muted-foreground hover:underline"
              onClick={() => downloadCSV("awaiting-you.csv", toCSV(queue, [
                { key: "label", header: tr.item },
                { key: "section", header: tr.csvSection },
                { key: "kind", header: tr.csvKind },
                { key: "at", header: tr.date },
              ]))}>
              {tr.exportCsv}
            </button>
          </>
        ) : <NoData text={tr.nothingWaiting} />}
      </Widget>

      <Widget title={tr.activityRibbon} hint={tr.activityRibbonHint} span={2}
        locked={!visible("main.event-ribbon")} lockedWhat={tr.activityRibbon}>
        {ribbon.length ? (
          <ChartFrame labels={ribbon.map((d, i) => (i % 5 === 0 ? d.label : ""))} height={120}>
            <AreaChart height={120} labels={ribbon.map((d) => d.label)}
              series={[{ name: tr.events, data: ribbon.map((d) => d.value), color: "rgb(var(--chart-1))" }]} />
          </ChartFrame>
        ) : <NoData text={tr.noRecentActivity} />}
      </Widget>

      <Widget title={tr.headlineTrends} hint={tr.headlineTrendsHint}
        locked={!visible("main.headline-trend")} lockedWhat={tr.headlineTrends}>
        {trends.length ? (
          <>
            <ul className="space-y-2.5">{trends.map((row) => {
              const delta = row.deltaPct;
              const up = delta !== null && delta >= 0;
              return (
                <li key={row.key} className="text-sm">
                  <div className="flex justify-between gap-3">
                    <a href={drillHref(slug, row.key)} className="truncate hover:underline">{nameOf(row.key)}</a>
                    <span className="num shrink-0">{row.current}{delta === null ? "" : ` (${up ? "+" : ""}${delta}%)`}</span>
                  </div>
                  {/* THE MOVEMENT AS A BAR, scaled to the largest swing on the
                      list, so what moved most reads first. NO BAR where there was
                      no prior period: null is not a 0% change. */}
                  {delta !== null && (
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                      <div className="h-full rounded-full"
                        style={{ width: `${Math.max(3, Math.round((Math.abs(delta) / trendPeak) * 100))}%`, backgroundColor: up ? "rgb(var(--chart-2))" : "rgb(var(--chart-3))" }} />
                    </div>
                  )}
                </li>
              );
            })}</ul>
            <button type="button" className="mt-2 text-xs text-muted-foreground hover:underline"
              onClick={() => downloadCSV("headline-trends.csv", toCSV(trends, [
                { key: "key", header: tr.csvSection },
                { key: "current", header: tr.csvThisPeriod },
                { key: "previous", header: tr.csvPriorPeriod },
                { key: "deltaPct", header: tr.csvChangePct },
              ]))}>
              {tr.exportCsv}
            </button>
          </>
        ) : <NoData text={tr.noTrendData} />}
      </Widget>
    </DashGrid>
  );
}
