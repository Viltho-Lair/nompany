// THE MAINTENANCE DASHBOARD — the section's five registers, answered at once.
//
// EVERY FIGURE IS A REGISTER'S OWN NUMBER, computed server-side by the pure
// model that owns it (modules/maintenance/dashboard). Nothing is recounted
// here: a dashboard with arithmetic of its own is a second answer free to
// disagree with the screen it summarises.
//
// A BLOCK THE READER MAY NOT OPEN IS NOT DRAWN, and was never read either —
// `may` comes from the server. So this screen cannot become a way to see what
// the registers themselves refuse, and somebody who holds only work orders sees
// the work-order figures rather than an empty grid.
//
// THE FREE FLOOR IS NEVER GATED: open work, what is overdue, what is waiting on
// triage and what has stopped. A studio that cannot see its own broken machines
// because it did not buy analytics is being sold its own problems back.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { maintenanceDict } from "@/shared/studio/maintenance";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { h2, sub, StatTile, money, fmtDate } from "@/components/studio2/ui";
import { StatRow, DashGrid, Widget, DashEmpty } from "@/components/dashboard";
import { BarList, Radial } from "@/components/charts";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";

// NAMED `*Dashboard.jsx` DELIBERATELY: the widget-gate scan reads exactly that
// filename pattern to prove every registry key is drawn by something, so a
// dashboard called anything else would leave its keys gating nothing.
export default function MaintenanceDashboard({ slug }) {
  const tr = maintenanceDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  // IT RETURNS A PREDICATE, not an answer — calling it with a key gives back a
  // function, which is truthy, and every paid widget would be free for
  // everybody, silently.
  const widgetVisible = useWidgetVisible();

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/maintenance/dashboard`, { cache: "no-store" });
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, []);

  useEffect(() => {
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [read, apply]);

  const reload = useCallback(async () => { apply(await read()); }, [read, apply]);
  // THE SECTIONS THIS SUMMARY IS BUILT FROM. Requests, orders, plans and the
  // meter readings ride the `maintenance` parent's fan-out; the contracts are
  // FOREIGN — filed under `projects-sla` — and the parts come off Inventory's
  // ledger, so both are named.
  useLiveUpdates(slug, "maintenance", reload);
  useLiveUpdates(slug, "projects-sla", reload);
  useLiveUpdates(slug, "inventory-stock", reload);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{tr.refuse[error] || error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const {
    may = {}, asOf, currency = "",
    backlog = {}, planned = {}, cost = {}, machines = [], requests = {}, contracts = {},
  } = data;
  const amount = (n) => `${money(n || 0)}${currency ? ` ${currency}` : ""}`;
  const num = (n) => <span className="num">{n}</span>;
  const worst = machines.filter((m) => m.failures > 0);
  const busiest = Math.max(1, ...worst.map((m) => m.failures));

  return (
    <div className="space-y-5">
      <div>
        <h2 className={h2}>{tr.dashboard}</h2>
        <p className={sub}>{tr.dashboardSub(fmtDate(asOf))}</p>
      </div>

      {/* THE FREE FLOOR. Four facts a maintenance manager acts on before any
          analysis: how much work is open, how much is late, what nobody has
          triaged, and what is stopped right now. */}
      <StatRow>
        <StatTile label={tr.openWork} value={num(backlog.open ?? 0)}
          href={may.orders ? `/${slug}/maintenance-orders` : ""} />
        <StatTile label={tr.overdue} value={num(backlog.overdue ?? 0)}
          tone={backlog.overdue > 0 ? "text-rose-600 dark:text-rose-400" : ""}
          href={may.orders ? `/${slug}/maintenance-orders` : ""} />
        <StatTile label={tr.waitingTriage} value={num(requests.waiting ?? 0)}
          href={may.requests ? `/${slug}/maintenance-requests` : ""} />
        <StatTile label={tr.machinesDown} value={num(backlog.down ?? 0)}
          tone={backlog.down > 0 ? "text-rose-600 dark:text-rose-400" : ""}
          href={may.orders ? `/${slug}/maintenance-orders` : ""} />
      </StatRow>

      <DashGrid>
        {may.orders && (
          <Widget title={tr.backlogByPriority} hint={tr.backlogHint}
            locked={!widgetVisible("maintenance.backlog-by-priority")} lockedWhat={tr.backlogByPriority}>
            {backlog.open > 0 ? (
              <>
                <BarList items={(backlog.byPriority || []).filter((p) => p.count > 0).map((p) => ({
                  label: tr.priorityName(p.priority),
                  value: Math.round((p.count / Math.max(1, backlog.open)) * 100),
                  display: num(p.count),
                }))} />
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {tr.unassignedCount(backlog.unassigned ?? 0)} · {tr.mineCount(backlog.mine ?? 0)}
                </p>
              </>
            ) : <DashEmpty text={tr.nothingOpen} />}
          </Widget>
        )}

        {may.plans && (
          <Widget title={tr.compliance} hint={tr.complianceHint}
            locked={!widgetVisible("maintenance.pm-compliance")} lockedWhat={tr.compliance}>
            {/* NULL IS NOT NOUGHT: nothing fallen due yet is "no history", which
                is a different answer from "none of it was on time". */}
            {planned.percent != null ? (
              <div className="flex justify-center py-2">
                <Radial value={planned.percent} label={`${planned.percent}%`}
                  sub={tr.complianceOf(planned.percent, planned.due)} color="rgb(var(--chart-2))" />
              </div>
            ) : <DashEmpty text={tr.complianceNone} />}
            <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              {tr.activePlansCount(planned.activePlans ?? 0)}
            </p>
          </Widget>
        )}

        {may.contracts && (
          <Widget title={tr.contracts} hint={tr.contractsHint}
            locked={!widgetVisible("maintenance.contracts")} lockedWhat={tr.contracts}>
            {contracts.active > 0 || contracts.allowance > 0 ? (
              <div className="grid grid-cols-3 gap-3 py-2 text-center">
                <div>
                  <p className="num text-3xl font-800 text-slate-900 dark:text-white">{contracts.active ?? 0}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{tr.activeContracts}</p>
                </div>
                <div>
                  <p className={`num text-3xl font-800 ${contracts.ending > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>{contracts.ending ?? 0}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{tr.endingSoon}</p>
                </div>
                <div>
                  <p className={`num text-3xl font-800 ${contracts.missedVisits > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>{contracts.missedVisits ?? 0}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{tr.missedVisits}</p>
                </div>
              </div>
            ) : <DashEmpty text={tr.noContracts} />}
            {contracts.allowance > 0 && (
              <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                {tr.callOutsOf(contracts.callOutsUsed ?? 0, contracts.allowance)}
              </p>
            )}
          </Widget>
        )}

        {may.orders && may.machines && (
          <Widget title={tr.worstMachines} hint={tr.worstHint} span={2}
            locked={!widgetVisible("maintenance.worst-machines")} lockedWhat={tr.worstMachines}>
            {worst.length ? (
              <BarList items={worst.map((m) => ({
                label: m.name,
                value: Math.round((m.failures / busiest) * 100),
                display: (
                  <span className="num text-xs text-slate-500 dark:text-slate-400">
                    {tr.failuresAndAvailability(m.failures, m.availability)}
                  </span>
                ),
              }))} />
            ) : <DashEmpty text={tr.noFailures} />}
          </Widget>
        )}

        {may.orders && (
          <Widget title={tr.costTitle} hint={tr.costHint}
            locked={!widgetVisible("maintenance.cost")} lockedWhat={tr.costTitle}>
            <div className="grid grid-cols-2 gap-3 py-2 text-center">
              <div>
                <p className="num text-2xl font-800 text-slate-900 dark:text-white">{amount(cost.partsCost)}</p>
                <p className="mt-1 text-[11px] text-slate-400">{tr.partsCost}</p>
              </div>
              <div>
                <p className="num text-2xl font-800 text-slate-900 dark:text-white">{cost.hours ?? 0}</p>
                <p className="mt-1 text-[11px] text-slate-400">{tr.hoursCol}</p>
              </div>
            </div>
            {/* HOURS STAY HOURS. Nothing says what one costs, and multiplying by
                a guessed rate would be a figure nobody chose. */}
            <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">{tr.costFootnote}</p>
          </Widget>
        )}
      </DashGrid>
    </div>
  );
}
