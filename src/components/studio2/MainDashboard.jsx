"use client";

// The studio Overview's executive widgets. Gating is two-layered and the layers
// AGREE: the route sends executive.widgets[key] ONLY for entitled keys (no premium
// figure reaches an unentitled client), and visible(key) — the same entitlement,
// resolved client-side — drives the locked teaser. A widget is locked exactly when
// the server withheld its data. Every source was already visibility-filtered
// server-side (invariant 2), so an empty series means "no section you can see",
// rendered as a note, never a fabricated zero.

import { Widget, DashGrid } from "@/components/dashboard";
import { AreaChart, Sparkline, ChartFrame } from "@/components/charts";
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
  const tr = mainDict(useStudioLocale());
  const visible = useWidgetVisible();
  const w = executive?.widgets || {};
  const activity = w["main.activity"] || [];
  const queue = w["main.awaiting-you"] || [];
  const ribbon = w["main.event-ribbon"] || [];
  const trends = w["main.headline-trend"] || [];

  return (
    <DashGrid>
      <Widget title={tr.departmentActivity} hint={tr.departmentActivityHint} span={2}
        locked={!visible("main.activity")} lockedWhat={tr.departmentActivity}>
        {activity.length ? activity.map((d) => (
          <div key={d.section} className="mb-2">
            <a href={drillHref(slug, d.section)} className="text-sm text-muted-foreground">{d.section}</a>
            <Sparkline data={(d.series || []).map((s) => s.value)} />
          </div>
        )) : <NoData text={tr.noSectionsVisible} />}
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
            <ul>{trends.map((row) => (
              <li key={row.key} className="flex justify-between text-sm">
                <a href={drillHref(slug, row.key)}>{row.key}</a>
                <span className="num">{row.current}{row.deltaPct === null ? "" : ` (${row.deltaPct >= 0 ? "+" : ""}${row.deltaPct}%)`}</span>
              </li>
            ))}</ul>
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
