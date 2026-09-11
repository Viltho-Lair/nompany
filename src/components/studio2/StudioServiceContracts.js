// SERVICE CONTRACTS (SLA) — the maintenance a studio sells.
//
// A contract is a term, planned visits spread evenly across it, and an
// allowance of call-outs. It was a Projects screen where each visit was a
// checkbox; it is Maintenance's now (the owner, 11/09/2026), and each visit
// becomes a work order on its own when it falls due. What a visit came to is
// read off that order — done, open, missed — never a tick somebody has to keep
// in step with it. The one tick left is for a visit kept outside the system.
//
// THE RULES ARE modules/maintenance/contracts, the same file the server refuses
// with, so Save is offered only when it would be accepted and the visit dates
// previewed in the form are the dates the contract will have.
"use client";
import { useState } from "react";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, Empty, Dialog, fmtDate, money } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { PRIORITIES } from "@/modules/maintenance/model";
import { contractProblem, plannedVisits } from "@/modules/maintenance/contracts";
import {
  useMaintenance, Chip, Links, PeoplePicker, pickOptions, linkText,
} from "@/components/studio2/maintenanceParts";

const STATE_TONE = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  upcoming: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  ended: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};
const VISIT_TONE = {
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  open: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  due: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  upcoming: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  missed: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};

/** The form's strings, turned into what the server and `contractProblem` read. */
const payload = (f) => ({
  ...f,
  durationDays: Number(f.durationDays),
  visits: Number(f.visits),
  emergencyVisits: Number(f.emergencyVisits),
  leadDays: Number(f.leadDays),
  // BLANK STAYS BLANK — "not stated" is not a contract worth nought.
  value: String(f.value ?? "").trim() === "" ? "" : Number(f.value),
  checklist: String(f.checklist || "").split("\n").map((s) => s.trim()).filter(Boolean),
});

export default function StudioServiceContracts({ slug }) {
  const { tr, data, error, busy, send, reload } = useMaintenance(slug, "maintenance/contracts");
  // THE CONTRACTS ARE WRITTEN UNDER `projects-sla` — a filed-only section
  // (keys.ts), so that is the key a write there rings — and what each visit
  // came to is read off the work orders, written under Work orders.
  useLiveUpdates(slug, "projects-sla", reload);
  useLiveUpdates(slug, "maintenance-orders", reload);
  const [form, setForm] = useState(null);
  const [visitsOf, setVisitsOf] = useState("");
  const [callOut, setCallOut] = useState(null);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const {
    contracts = [], pickers = {}, projects = [], covers = [], currency = "", asOf, filed,
    canCreate, canEdit, canDelete, canCallOut,
  } = data;
  const amount = (n) => `${money(n || 0)}${currency ? ` ${currency}` : ""}`;
  const units = (pickers.installed || []).map((u) => ({ id: u.id, alias: u.name }));
  const priorities = PRIORITIES.map((p) => ({ value: p, label: tr.priorityName(p) }));
  const shown = contracts.find((c) => c.id === visitsOf) || null;

  const openForm = (c) => setForm(c
    ? {
      id: c.id, title: c.title || "", customer: c.customer || "", projectId: c.projectId || "", cover: c.cover || "",
      value: c.value ?? "", signingDate: c.signingDate || "", startDate: c.startDate || "",
      durationDays: String(c.durationDays ?? 365), visits: String(c.visits ?? 1),
      emergencyVisits: String(c.emergencyVisits ?? 0), leadDays: String(c.leadDays ?? 0),
      locationId: c.locationId || "", installedIds: c.installedIds || [],
      assignedToCollaboratorIds: c.assignedToCollaboratorIds || [],
      checklist: (c.checklist || []).join("\n"), notes: c.notes || "",
    }
    : {
      title: "", customer: "", projectId: "", cover: "", value: "", signingDate: asOf, startDate: asOf,
      durationDays: "365", visits: "4", emergencyVisits: "0", leadDays: "0",
      locationId: "", installedIds: [], assignedToCollaboratorIds: [], checklist: "", notes: "",
    });

  // THE SAME RULE THE SERVER REFUSES WITH, and the same dates it will keep.
  const blocked = form ? contractProblem(payload(form)) : null;
  const preview = form && !blocked ? plannedVisits(payload(form)) : [];

  const save = async () => {
    const { id, ...rest } = payload(form);
    const done = id ? await send("PUT", { ...rest, id }) : await send("POST", rest);
    if (done) setForm(null);
  };

  const openCallOut = (c) => {
    const covered = (c.units || []).filter((u) => u?.state === "found");
    setCallOut({
      id: c.id, name: c.title, title: "", description: "", priority: "high", dueOn: asOf,
      installedId: covered.length === 1 ? covered[0].id : "",
      assignedToCollaboratorIds: c.assignedToCollaboratorIds || [],
      covered,
    });
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.contracts}</h2>
          <p className={sub}>{tr.contractsSub}</p>
        </div>
        {canCreate && filed && <button type="button" className={btn} onClick={() => openForm(null)}>{tr.newContract}</button>}
      </div>

      {!filed && <p className="text-sm text-slate-500 dark:text-slate-400">{tr.notFiled}</p>}

      {!contracts.length ? (
        filed && <Empty title={tr.noContracts} body={tr.noContractsBody} />
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => {
            const s = c.summary || {};
            const cancelled = s.state === "cancelled";
            const unitNames = (c.units || []).map((u) => linkText(u, tr.installedHidden, tr.installedDeleted)).filter(Boolean);
            return (
              <section key={c.id} className={`${panel} ${s.missed > 0 && !cancelled ? "border-s-4 border-s-rose-400 dark:border-s-rose-500/70" : ""}`}>
                <p className="flex flex-wrap items-center gap-2 text-slate-900 dark:text-white">
                  <span className="font-600">{c.title || "—"}</span>
                  <Chip tone={STATE_TONE[s.state]}>{tr.contractState(s.state)}</Chip>
                  {c.cover && <Chip>{tr.coverName(c.cover)}</Chip>}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {[c.customer, c.project?.name].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-slate-600 dark:text-slate-300">
                  <span>{fmtDate(c.startDate)} – {fmtDate(s.end)}</span>
                  {c.value != null && c.value !== "" && <span>{amount(c.value)}</span>}
                </p>
                {s.keptByPlans && (
                  <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-300">{tr.keptByPlans((c.plans || []).join("، "))}</p>
                )}
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-slate-600 dark:text-slate-300">
                  <span>{tr.visitsProgress(s.done || 0, s.planned || 0)}</span>
                  {s.missed > 0 && <span className="font-600 text-rose-600 dark:text-rose-300">{tr.missedCount(s.missed)}</span>}
                  {!cancelled && <span>{s.next ? tr.nextVisit(fmtDate(s.next.dueOn)) : tr.noNextVisit}</span>}
                  {s.allowance > 0 && <span>{tr.callOutsOf(s.callOutsUsed || 0, s.allowance)}</span>}
                </p>
                <Links location={c.location} tr={tr} />
                {unitNames.length > 0 && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">{tr.units}:</span> {unitNames.join("، ")}
                  </p>
                )}
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">{tr.assignedTo}:</span>{" "}
                  {(c.assignees || []).length ? c.assignees.map((a) => a.alias || a.id).join("، ") : tr.nobody}
                </p>
                {c.notes && <p className="mt-2 max-w-prose whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{c.notes}</p>}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={btnRow} onClick={() => setVisitsOf(c.id)}>{tr.visits}</button>
                  {canCallOut && s.state === "active" && (
                    <button type="button" className={btn} disabled={busy} onClick={() => openCallOut(c)}>{tr.callOut}</button>
                  )}
                  {canEdit && !cancelled && (
                    <button type="button" className={btnGhost} disabled={busy} onClick={() => openForm(c)}>{tr.edit}</button>
                  )}
                  {canEdit && (
                    <button type="button" className={cancelled ? btnRow : btnRowDanger} disabled={busy}
                      onClick={() => send("PUT", { id: c.id, action: cancelled ? "reinstate" : "cancel" })}>
                      {cancelled ? tr.reinstate : tr.cancelContract}
                    </button>
                  )}
                  {canDelete && !c.raised && (
                    <button type="button" className={btnRowDanger} disabled={busy}
                      onClick={() => send("DELETE", { id: c.id })}>{tr.remove}</button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {shown && (
        <Dialog title={tr.visitsTitle(shown.title || "—")} onClose={() => setVisitsOf("")} width="max-w-[640px]">
          <div className="space-y-5">
            {/* A CONTRACT KEPT BY ITS PLANS HAS NO EVEN SCHEDULE — its visits
                are the orders those plans raise, in Work orders. */}
            {shown.summary?.keptByPlans && (
              <p className="text-sm text-indigo-700 dark:text-indigo-300">{tr.keptByPlans((shown.plans || []).join("، "))}</p>
            )}
            <ul className="space-y-2">
              {(shown.summary?.keptByPlans ? [] : shown.visits || []).map((v) => (
                <li key={v.index} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-2.5 text-sm dark:border-white/10">
                  <span className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-200">
                    <span className="tabular-nums">{tr.visitLine(v.index, shown.visits.length)} · {fmtDate(v.dueOn)}</span>
                    <Chip tone={VISIT_TONE[v.state]}>{tr.visitState(v.state)}</Chip>
                    {v.order?.reference && <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{v.order.reference}</span>}
                  </span>
                  {/* THE HAND TICK IS ONLY FOR A VISIT WITH NO ORDER — one kept
                      outside the system. A visit with an order is done when the
                      order is; a tick beside it would be a second answer. */}
                  {!v.order && canEdit && shown.summary?.state !== "cancelled" && (
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={Boolean(v.ticked)} disabled={busy}
                        onChange={(e) => send("PUT", { id: shown.id, action: "tick", visit: v.index, done: e.target.checked })} />
                      {tr.tickDone}
                    </label>
                  )}
                </li>
              ))}
            </ul>

            <div>
              <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {tr.callOutsHeading}{shown.summary?.allowance > 0 ? ` · ${tr.callOutsOf(shown.summary.callOutsUsed || 0, shown.summary.allowance)}` : ""}
              </p>
              {!(shown.callOuts || []).length && !(shown.emergencyVisitsList || []).length ? (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.noCallOuts}</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  {(shown.callOuts || []).map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center gap-x-3">
                      <span className="tabular-nums">{fmtDate(o.dueOn)}</span>
                      {o.reference && <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{o.reference}</span>}
                      {o.title && <span>{o.title}</span>}
                      <span className="text-slate-400">{tr.status(o.status)}</span>
                    </li>
                  ))}
                  {(shown.emergencyVisitsList || []).map((e) => (
                    <li key={e.id} className="text-slate-500 dark:text-slate-400">{tr.legacyCallOut(fmtDate(e.date))}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end">
              <button type="button" className={btnGhost} onClick={() => setVisitsOf("")}>{tr.close}</button>
            </div>
          </div>
        </Dialog>
      )}

      {callOut && (
        <Dialog title={tr.callOutTitle(callOut.name || "—")} description={tr.callOutHint} onClose={() => setCallOut(null)} width="max-w-[640px]">
          <div className="space-y-4">
            <Field label={tr.title} required value={callOut.title}
              onChange={(v) => setCallOut((c) => ({ ...c, title: v }))} inputProps={{ maxLength: 200 }} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.priority} as="select" required value={callOut.priority}
                onChange={(v) => setCallOut((c) => ({ ...c, priority: v }))} options={priorities} />
              <Field label={tr.due} type="date" value={callOut.dueOn}
                onChange={(v) => setCallOut((c) => ({ ...c, dueOn: v }))} />
              {callOut.covered.length > 1 && (
                <Field label={tr.installed} as="select" value={callOut.installedId}
                  onChange={(v) => setCallOut((c) => ({ ...c, installedId: v }))}
                  options={pickOptions(callOut.covered, tr.noInstalled)} />
              )}
            </div>
            <PeoplePicker people={pickers.people} value={callOut.assignedToCollaboratorIds} label={tr.assignedTo}
              hint={tr.assignedHint} onChange={(ids) => setCallOut((c) => ({ ...c, assignedToCollaboratorIds: ids }))} />
            <Field label={tr.description} as="textarea" value={callOut.description}
              onChange={(v) => setCallOut((c) => ({ ...c, description: v }))} inputProps={{ maxLength: 4000 }} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setCallOut(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !callOut.title.trim()}
                onClick={async () => {
                  const { id, name: _n, covered: _c, ...rest } = callOut;
                  if (await send("PATCH", { ...rest, id })) setCallOut(null);
                }}>
                {busy ? tr.saving : tr.callOut}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {form && (
        <Dialog title={form.id ? tr.editContract : tr.newContract} onClose={() => setForm(null)} width="max-w-[760px]">
          <div className="space-y-4">
            <Field label={tr.contractTitle} required value={form.title}
              onChange={(v) => setForm((f) => ({ ...f, title: v }))} inputProps={{ maxLength: 200 }} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.customer} value={form.customer}
                onChange={(v) => setForm((f) => ({ ...f, customer: v }))} inputProps={{ maxLength: 200 }} />
              {(projects.length > 0 || form.projectId) && (
                <Field label={tr.project} as="select" value={form.projectId}
                  onChange={(v) => setForm((f) => ({ ...f, projectId: v }))} options={pickOptions(projects, tr.noProject)} />
              )}
              <Field label={tr.cover} as="select" value={form.cover}
                onChange={(v) => setForm((f) => ({ ...f, cover: v }))}
                options={[{ value: "", label: tr.noCover }, ...covers.map((c) => ({ value: c, label: tr.coverName(c) }))]} />
              <Field label={currency ? `${tr.value} (${currency})` : tr.value} type="number" value={form.value}
                onChange={(v) => setForm((f) => ({ ...f, value: v }))} inputProps={{ min: 0, step: "any" }} />
              <Field label={tr.signingDate} type="date" value={form.signingDate}
                onChange={(v) => setForm((f) => ({ ...f, signingDate: v }))} />
              <Field label={tr.startDate} type="date" required value={form.startDate}
                onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} />
              <Field label={tr.durationDays} type="number" required value={form.durationDays}
                onChange={(v) => setForm((f) => ({ ...f, durationDays: v }))} inputProps={{ min: 1, max: 3650, step: 1 }} />
              <Field label={tr.visitCount} type="number" required value={form.visits}
                onChange={(v) => setForm((f) => ({ ...f, visits: v }))} inputProps={{ min: 1, step: 1 }} />
              <Field label={tr.allowance} type="number" value={form.emergencyVisits}
                onChange={(v) => setForm((f) => ({ ...f, emergencyVisits: v }))} inputProps={{ min: 0, step: 1 }} />
              <Field label={tr.leadDays} type="number" value={form.leadDays} hint={tr.leadDaysHint}
                onChange={(v) => setForm((f) => ({ ...f, leadDays: v }))} inputProps={{ min: 0, max: 60, step: 1 }} />
              <Field label={tr.location} as="select" value={form.locationId}
                onChange={(v) => setForm((f) => ({ ...f, locationId: v }))} options={pickOptions(pickers.locations, tr.noLocation)} />
            </div>
            {preview.length > 0 && (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm tabular-nums text-slate-600 dark:bg-white/[0.03] dark:text-slate-300">
                {tr.schedulePreview(fmtDate(preview[0].dueOn), fmtDate(preview[preview.length - 1].dueOn), preview.length)}{" "}
                <span className="text-slate-400">{tr.scheduleHint}</span>
              </p>
            )}
            {units.length > 0 && (
              <PeoplePicker people={units} value={form.installedIds} label={tr.units} hint={tr.unitsHint}
                onChange={(ids) => setForm((f) => ({ ...f, installedIds: ids }))} />
            )}
            <PeoplePicker people={pickers.people} value={form.assignedToCollaboratorIds} label={tr.assignedTo}
              hint={tr.assignedHint} onChange={(ids) => setForm((f) => ({ ...f, assignedToCollaboratorIds: ids }))} />
            <Field label={tr.checklist} as="textarea" value={form.checklist} hint={tr.checklistHint}
              onChange={(v) => setForm((f) => ({ ...f, checklist: v }))} />
            <Field label={tr.note} as="textarea" value={form.notes}
              onChange={(v) => setForm((f) => ({ ...f, notes: v }))} inputProps={{ maxLength: 4000 }} />
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
