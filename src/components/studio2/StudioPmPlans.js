// PREVENTIVE PLANS — work that comes round on a calendar.
//
// A plan says what, where, how often and who; the daily run raises a work order
// from it when it falls due, one open at a time, carrying its checklist. This
// screen keeps the plans and shows what each has done — the order it has open,
// when it was last finished, and how often it was finished on time. All three
// are derived from the orders, never stored on the plan.
"use client";
import { useState } from "react";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, Empty, Dialog, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { PRIORITIES } from "@/modules/maintenance/model";
import { PLAN_MOVES, SCHEDULE_MODES, planProblem } from "@/modules/maintenance/schedule";
import {
  useMaintenance, Chip, priorityTone, Links, PeoplePicker, pickOptions,
} from "@/components/studio2/maintenanceParts";

const STATUS_TONE = {
  Active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  Paused: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  Retired: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};
const MOVE_ACTION = { Active: "resume", Paused: "pause", Retired: "retire" };

export default function StudioPmPlans({ slug }) {
  const { tr, data, error, busy, send, reload } = useMaintenance(slug, "maintenance/plans");
  // The plans are this section's rows; what each has open, last finished and
  // its compliance are derived from the orders it raised, written under Work
  // orders — so an order moving there has to move this list.
  useLiveUpdates(slug, "maintenance-plans", reload);
  useLiveUpdates(slug, "maintenance-orders", reload);
  const [form, setForm] = useState(null);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { plans = [], pickers = {}, frequencies = [], compliance, asOf, canCreate, canEdit, canDelete } = data;
  const priorities = PRIORITIES.map((p) => ({ value: p, label: tr.priorityName(p) }));
  const types = ["preventive", "inspection"].map((t) => ({ value: t, label: tr.typeName(t) }));

  const openForm = (p) => setForm(p
    ? {
      id: p.id, title: p.title, description: p.description, type: p.type, priority: p.priority,
      assetId: p.assetId, locationId: p.locationId, assignedToCollaboratorIds: p.assignedToCollaboratorIds || [],
      frequency: p.frequency, scheduleMode: p.scheduleMode, nextDue: p.nextDue, leadDays: String(p.leadDays ?? 0),
      estimatedHours: p.estimatedHours ?? "", checklist: (p.checklist || []).join("\n"),
    }
    : {
      title: "", description: "", type: "preventive", priority: "normal", assetId: "", locationId: "",
      assignedToCollaboratorIds: [], frequency: "Monthly", scheduleMode: "fixed", nextDue: asOf, leadDays: "0",
      estimatedHours: "", checklist: "",
    });

  const payload = (f) => ({
    ...f,
    leadDays: Number(f.leadDays) || 0,
    checklist: String(f.checklist || "").split("\n").map((s) => s.trim()).filter(Boolean),
  });
  // THE SAME RULE THE SERVER REFUSES WITH, so Save is offered only when it would
  // be accepted.
  const blocked = form ? planProblem(payload(form)) : null;

  const save = async () => {
    const { id, ...rest } = payload(form);
    const done = id ? await send("PUT", { ...rest, id }) : await send("POST", rest);
    if (done) setForm(null);
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.plans}</h2>
          <p className={sub}>{tr.plansSub}</p>
          {compliance?.percent != null && (
            <p className="mt-2 text-sm tabular-nums text-slate-600 dark:text-slate-300">
              {tr.studioCompliance(compliance.percent, compliance.total)}
            </p>
          )}
        </div>
        {canCreate && <button type="button" className={btn} onClick={() => openForm(null)}>{tr.newPlan}</button>}
      </div>

      {!plans.length ? (
        <Empty title={tr.noPlans} body={tr.noPlansBody} />
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <section key={p.id} className={panel}>
              <p className="flex flex-wrap items-center gap-2 text-slate-900 dark:text-white">
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.reference}</span>
                <span className="font-600">{p.title}</span>
                <Chip tone={STATUS_TONE[p.status]}>{tr.planStatus(p.status)}</Chip>
                <Chip tone={priorityTone(p.priority)}>{tr.priorityName(p.priority)}</Chip>
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {tr.typeName(p.type)} · {tr.frequencyName(p.frequency)} · {tr.modeName(p.scheduleMode)}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-slate-600 dark:text-slate-300">
                {p.status !== "Retired" && <span>{tr.nextDue}: {fmtDate(p.nextDue)}</span>}
                <span>{p.lastDoneOn ? tr.lastDone(fmtDate(p.lastDoneOn)) : tr.neverDone}</span>
                <span>{p.compliance?.percent != null ? tr.complianceOf(p.compliance.percent, p.compliance.total) : tr.complianceNone}</span>
              </p>
              {p.openOrder && (
                <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-300">{tr.openNow(p.openOrder.reference, tr.status(p.openOrder.status))}</p>
              )}
              <Links asset={p.asset} location={p.location} tr={tr} />
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">{tr.assignedTo}:</span>{" "}
                {(p.assignees || []).length ? p.assignees.map((a) => a.alias || a.id).join("، ") : tr.nobody}
              </p>
              {(p.checklist || []).length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-600 text-slate-600 dark:text-slate-300">{tr.checklist} ({p.checklist.length})</summary>
                  <ol className="mt-1 list-decimal ps-6 text-sm text-slate-600 dark:text-slate-300">
                    {p.checklist.map((step, i) => <li key={i}>{step}</li>)}
                  </ol>
                </details>
              )}

              {(canEdit || canDelete) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {canEdit && (PLAN_MOVES[p.status] || []).map((to) => (
                    <button key={to} type="button" disabled={busy}
                      className={to === "Retired" ? btnRowDanger : btnRow}
                      onClick={() => send("PUT", { id: p.id, action: MOVE_ACTION[to] })}>
                      {to === "Active" ? tr.resume : to === "Paused" ? tr.pause : tr.retire}
                    </button>
                  ))}
                  {canEdit && p.status !== "Retired" && (
                    <button type="button" className={btnGhost} disabled={busy} onClick={() => openForm(p)}>{tr.edit}</button>
                  )}
                  {canDelete && !p.raised && (
                    <button type="button" className={btnRowDanger} disabled={busy}
                      onClick={() => send("DELETE", { id: p.id })}>{tr.remove}</button>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {form && (
        <Dialog title={form.id ? tr.editPlan : tr.newPlan} onClose={() => setForm(null)} width="max-w-[760px]">
          <div className="space-y-4">
            <Field label={tr.title} required value={form.title}
              onChange={(v) => setForm((f) => ({ ...f, title: v }))} inputProps={{ maxLength: 200 }} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.frequency} as="select" required value={form.frequency}
                onChange={(v) => setForm((f) => ({ ...f, frequency: v }))}
                options={frequencies.map((x) => ({ value: x, label: tr.frequencyName(x) }))} />
              <Field label={tr.scheduleMode} as="select" required value={form.scheduleMode}
                onChange={(v) => setForm((f) => ({ ...f, scheduleMode: v }))}
                options={SCHEDULE_MODES.map((x) => ({ value: x, label: tr.modeName(x) }))} />
              <Field label={form.id ? tr.nextDue : tr.firstDue} type="date" required value={form.nextDue}
                onChange={(v) => setForm((f) => ({ ...f, nextDue: v }))} />
              <Field label={tr.leadDays} type="number" value={form.leadDays} hint={tr.leadDaysHint}
                onChange={(v) => setForm((f) => ({ ...f, leadDays: v }))} inputProps={{ min: 0, max: 60, step: 1 }} />
              <Field label={tr.type} as="select" required value={form.type}
                onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={types} />
              <Field label={tr.priority} as="select" required value={form.priority}
                onChange={(v) => setForm((f) => ({ ...f, priority: v }))} options={priorities} />
              <Field label={tr.asset} as="select" value={form.assetId}
                onChange={(v) => setForm((f) => ({ ...f, assetId: v }))} options={pickOptions(pickers.assets, tr.noAsset)} />
              <Field label={tr.location} as="select" value={form.locationId}
                onChange={(v) => setForm((f) => ({ ...f, locationId: v }))} options={pickOptions(pickers.locations, tr.noLocation)} />
              <Field label={tr.estimatedHours} type="number" value={form.estimatedHours}
                onChange={(v) => setForm((f) => ({ ...f, estimatedHours: v }))} inputProps={{ min: 0, step: 0.25 }} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{tr.modeHint}</p>
            <PeoplePicker people={pickers.people} value={form.assignedToCollaboratorIds} label={tr.assignedTo}
              hint={tr.assignedHint} onChange={(ids) => setForm((f) => ({ ...f, assignedToCollaboratorIds: ids }))} />
            <Field label={tr.checklist} as="textarea" value={form.checklist} hint={tr.checklistHint}
              onChange={(v) => setForm((f) => ({ ...f, checklist: v }))} />
            <Field label={tr.description} as="textarea" value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))} inputProps={{ maxLength: 4000 }} />
            {blocked && form.title.trim() && (
              <p className="text-sm text-rose-600 dark:text-rose-300">{tr.refuse[blocked] || blocked}</p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || Boolean(blocked)} onClick={save}>
                {busy ? tr.saving : tr.save}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
