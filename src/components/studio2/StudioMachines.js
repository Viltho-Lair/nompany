// MACHINES — each machine's reliability record over the last year.
//
// The work orders, read per machine: how often it failed, how long it was out
// each time, how much of the year it was available, and what keeps going
// wrong. Every figure is computed on the server from the orders
// (`reliabilityByAsset`) and each is a dash when it has no honest value — a
// machine that never failed has no time between failures, not an infinite one.
// Ordered so the machines that need looking at come first.
"use client";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, Empty, fmtDate } from "@/components/studio2/ui";
import { useMaintenance } from "@/components/studio2/maintenanceParts";

const th = "px-3 py-2 text-start text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const td = "px-3 py-2.5 align-top";

export default function StudioMachines({ slug }) {
  const { tr, data, error, reload } = useMaintenance(slug, "maintenance/assets");
  // Every figure here is derived from the work orders, which are written
  // under Work orders — so that is the section this screen listens to.
  useLiveUpdates(slug, "maintenance-orders", reload);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { machines = [], canSeeMachines } = data;
  const dash = <span className="text-slate-400">—</span>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className={h2}>{tr.machines}</h2>
        <p className={sub}>{tr.machinesSub}</p>
      </div>

      {!canSeeMachines ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.cannotSeeMachines}</p>
      ) : !machines.length ? (
        <Empty title={tr.noMachines} body={tr.noMachinesBody} />
      ) : (
        <section className={`${panel} p-0`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className={th}>{tr.asset}</th>
                  <th className={th}>{tr.statusCol}</th>
                  <th className={`${th} text-end`}>{tr.failures}</th>
                  <th className={`${th} text-end`}>{tr.mtbf}</th>
                  <th className={`${th} text-end`}>{tr.mttr}</th>
                  <th className={`${th} text-end`}>{tr.availability}</th>
                  <th className={`${th} text-end`}>{tr.openWorkCol}</th>
                  <th className={th}>{tr.commonest}</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100 dark:border-white/5">
                    <td className={td}>
                      <p className="font-600 text-slate-900 dark:text-white">{m.name}</p>
                      {m.category && <p className="text-xs text-slate-500 dark:text-slate-400">{m.category}</p>}
                    </td>
                    <td className={`${td} text-slate-600 dark:text-slate-300`}>{m.status || dash}</td>
                    <td className={`${td} text-end tabular-nums`}>
                      <span className={m.failures ? "font-600 text-slate-900 dark:text-white" : "text-slate-500"}>{m.failures}</span>
                      {m.lastFailureAt && <p className="text-xs text-slate-400">{fmtDate(m.lastFailureAt)}</p>}
                    </td>
                    <td className={`${td} text-end tabular-nums`}>{m.mtbfHours != null ? tr.duration(m.mtbfHours) : dash}</td>
                    <td className={`${td} text-end tabular-nums`}>{m.mttrHours != null ? tr.duration(m.mttrHours) : dash}</td>
                    <td className={`${td} text-end tabular-nums`}>
                      {m.availability != null ? (
                        <span className={m.availability < 95 ? "font-600 text-rose-600 dark:text-rose-300" : ""}>{m.availability}%</span>
                      ) : dash}
                    </td>
                    <td className={`${td} text-end tabular-nums`}>{m.openOrders || dash}</td>
                    <td className={`${td} text-slate-600 dark:text-slate-300`}>
                      {m.topProblems?.length
                        ? m.topProblems.map((p) => `${p.problem} (${p.count})`).join("، ")
                        : dash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
