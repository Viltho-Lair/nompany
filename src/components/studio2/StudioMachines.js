// MACHINES — each machine's reliability record over the last year, and its
// meters.
//
// The work orders, read per machine: how often it failed, how long it was out
// each time, how much of the year it was available, what keeps going wrong,
// and what it cost in parts and hours. Every figure is computed on the server
// (`reliabilityByAsset`, `costByAsset`) and each is a dash when it has no
// honest value — a machine that never failed has no time between failures, not
// an infinite one. Ordered so the machines that need looking at come first.
//
// AND HOW FAR EACH HAS RUN. A reading is recorded here; a meter plan that the
// reading brings due raises its work order straight away (the readings route
// asks the plan run), and the screen says how many it raised.
"use client";
import { useState } from "react";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, btnRow, Empty, Dialog, fmtDate, fmtDateTime, money } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { useMaintenance, toLocalInput, fromLocalInput } from "@/components/studio2/maintenanceParts";

const th = "px-3 py-2 text-start text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const td = "px-3 py-2.5 align-top";

export default function StudioMachines({ slug }) {
  const { tr, data, error, busy, send, reload } = useMaintenance(slug, "maintenance/assets");
  // Every figure here is derived from the work orders, which are written
  // under Work orders — so that is the section this screen listens to.
  useLiveUpdates(slug, "maintenance-orders", reload);
  // ...and the parts cost off Inventory's ledger.
  useLiveUpdates(slug, "inventory-stock", reload);
  // ...and the readings, filed under Machines itself.
  useLiveUpdates(slug, "maintenance-assets", reload);
  const [reading, setReading] = useState(null);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { machines = [], canSeeMachines, currency = "", meterUnits = [], me, canRecord, canRemoveAny } = data;
  const dash = <span className="text-slate-400">—</span>;
  const machine = reading ? machines.find((m) => m.id === reading.assetId) : null;
  const last = machine ? (machine.meters || []).find((x) => x.unit === reading.unit) : null;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
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
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className={th}>{tr.asset}</th>
                  <th className={th}>{tr.statusCol}</th>
                  <th className={th}>{tr.meters}</th>
                  <th className={`${th} text-end`}>{tr.failures}</th>
                  <th className={`${th} text-end`}>{tr.mtbf}</th>
                  <th className={`${th} text-end`}>{tr.mttr}</th>
                  <th className={`${th} text-end`}>{tr.availability}</th>
                  <th className={`${th} text-end`}>{tr.openWorkCol}</th>
                  <th className={`${th} text-end`}>{tr.partsCost}</th>
                  <th className={`${th} text-end`}>{tr.hoursCol}</th>
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
                    <td className={`${td} tabular-nums text-slate-600 dark:text-slate-300`}>
                      {(m.meters || []).length
                        ? m.meters.map((x) => <p key={x.unit}>{x.value} {tr.unitShort(x.unit)}</p>)
                        : dash}
                      {canRecord && (
                        <button type="button" className={`${btnRow} mt-1 text-xs`}
                          onClick={() => setReading({ assetId: m.id, name: m.name, unit: m.meters?.[0]?.unit || meterUnits[0] || "hours", value: "", readAt: toLocalInput(new Date().toISOString()), reset: false, note: "" })}>
                          {tr.recordReading}
                        </button>
                      )}
                    </td>
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
                    <td className={`${td} text-end tabular-nums`}>
                      {m.partsCost ? `${money(m.partsCost)}${currency ? ` ${currency}` : ""}` : dash}
                    </td>
                    <td className={`${td} text-end tabular-nums`}>{m.labourHours || dash}</td>
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

      {reading && (
        <Dialog title={tr.readingTitle(reading.name)} onClose={() => setReading(null)} width="max-w-[520px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.meterUnit} as="select" required value={reading.unit}
                onChange={(v) => setReading((r) => ({ ...r, unit: v }))}
                options={meterUnits.map((u) => ({ value: u, label: tr.unitName(u) }))} />
              <Field label={tr.readingValue} type="number" required value={reading.value}
                onChange={(v) => setReading((r) => ({ ...r, value: v }))} inputProps={{ min: 0, step: "any" }} />
              <Field label={tr.readAt} type="datetime-local" required value={reading.readAt}
                onChange={(v) => setReading((r) => ({ ...r, readAt: v }))} className="sm:col-span-2" />
            </div>
            {/* THE LAST READING, so a typo is visible before it is saved — and
                taken back here if it already was. Only the latest can go. */}
            {last && (
              <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                {tr.lastReading(last.value, last.unit, fmtDateTime(last.readAt))}
                {(last.createdByCollaboratorId === me || canRemoveAny) && (
                  <button type="button" disabled={busy} className="text-xs text-rose-600 hover:underline dark:text-rose-300"
                    onClick={() => send("DELETE", { id: last.id }, "maintenance/readings")}>{tr.removeLast}</button>
                )}
              </p>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={reading.reset}
                onChange={(e) => setReading((r) => ({ ...r, reset: e.target.checked }))} />
              {tr.meterReset}
            </label>
            <Field label={tr.note} value={reading.note}
              onChange={(v) => setReading((r) => ({ ...r, note: v }))} inputProps={{ maxLength: 300 }} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setReading(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || String(reading.value).trim() === ""}
                onClick={async () => {
                  const done = await send("POST", {
                    assetId: reading.assetId, unit: reading.unit, value: Number(reading.value),
                    readAt: fromLocalInput(reading.readAt), reset: reading.reset, note: reading.note,
                  }, "maintenance/readings");
                  if (done) setReading(null);
                }}>
                {busy ? tr.saving : tr.save}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
