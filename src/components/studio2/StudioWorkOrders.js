// WORK ORDERS — Maintenance's register of authorised work.
//
// EVERY BUTTON IS A MOVE THE LADDER ALLOWS FROM HERE. The screen reads
// `ORDER_MOVES` from the same pure module the server refuses with, so "Start"
// is never offered on closed work and "Cancel" never on work in progress. Two
// moves ask something first: a hold asks why (the backlog is sorted by it), and
// completion asks what was done (the machine's next failure starts from it).
"use client";
import { useState } from "react";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, Empty, Dialog, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import {
  PRIORITIES, ORDER_TYPES, ORDER_MOVES, HOLD_REASONS, orderEditable, orderDeletable, orderOpen,
} from "@/modules/maintenance/model";
import {
  useMaintenance, Chip, priorityTone, Links, PhotoStrip, PhotoField, PeoplePicker, pickOptions,
} from "@/components/studio2/maintenanceParts";

const STATUS_TONE = {
  Open: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  "In progress": "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  "On hold": "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  Closed: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Cancelled: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};

export default function StudioWorkOrders({ slug }) {
  const { tr, data, error, busy, send, reload } = useMaintenance(slug, "maintenance/orders");
  // The orders are this section's rows; the request each one answers is shown
  // by reference, and requests are written under Work requests.
  useLiveUpdates(slug, "maintenance-orders", reload);
  useLiveUpdates(slug, "maintenance-requests", reload);
  const [filter, setFilter] = useState("open");
  const [form, setForm] = useState(null);
  const [holding, setHolding] = useState(null);
  const [completing, setCompleting] = useState(null);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { orders = [], pickers = {}, canCreate, canEdit, canDelete } = data;
  const open = orders.filter(orderOpen);
  const shown = filter === "open" ? open : filter === "done" ? orders.filter((o) => !orderOpen(o)) : orders;
  const overdue = open.filter((o) => o.overdue).length;
  const priorities = PRIORITIES.map((p) => ({ value: p, label: tr.priorityName(p) }));
  const types = ORDER_TYPES.map((t) => ({ value: t, label: tr.typeName(t) }));

  const openForm = (o) => setForm(o
    ? {
      id: o.id, reference: o.reference, title: o.title, description: o.description, type: o.type, priority: o.priority,
      assetId: o.assetId, locationId: o.locationId, assignedToCollaboratorIds: o.assignedToCollaboratorIds || [],
      dueOn: o.dueOn || "", estimatedHours: o.estimatedHours ?? "", photos: o.photos || [],
    }
    : {
      title: "", description: "", type: "corrective", priority: "normal", assetId: "", locationId: "",
      assignedToCollaboratorIds: [], dueOn: "", estimatedHours: "", photos: [],
    });

  const save = async () => {
    const { id, reference: _ref, ...payload } = form;
    const done = id ? await send("PUT", { ...payload, id }) : await send("POST", payload);
    if (done) setForm(null);
  };

  // WHICH WORD A MOVE IS CALLED depends on where it starts: back to In
  // progress is Start from Open, Resume from a hold, Reopen from Completed.
  const moveLabel = (from, to) => ({
    "In progress": from === "On hold" ? tr.resume : from === "Completed" ? tr.reopen : tr.start,
    "On hold": tr.hold,
    Completed: tr.complete,
    Closed: tr.close,
    Cancelled: tr.cancelWork,
  }[to]);

  const move = (o, to) => {
    if (to === "On hold") setHolding({ id: o.id, holdReason: "parts" });
    else if (to === "Completed") setCompleting({ id: o.id, resolution: o.resolution || "" });
    else send("PATCH", { id: o.id, status: to });
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.orders}</h2>
          <p className={sub}>{tr.ordersSub}</p>
          {orders.length > 0 && (
            <p className="mt-2 flex gap-3 text-sm tabular-nums">
              <span className="text-slate-600 dark:text-slate-300">{tr.openCount(open.length)}</span>
              {overdue > 0 && <span className="font-600 text-rose-600 dark:text-rose-300">{tr.overdueCount(overdue)}</span>}
            </p>
          )}
        </div>
        {canCreate && <button type="button" className={btn} onClick={() => openForm(null)}>{tr.newOrder}</button>}
      </div>

      {orders.length > 0 && (
        <div role="tablist" aria-label={tr.orders} className="flex flex-wrap gap-2">
          {[["open", tr.filterOpen], ["done", tr.filterDone], ["all", tr.filterAll]].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-sm font-600 transition-colors ${filter === key
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {!orders.length ? (
        <Empty title={tr.noOrders} body={tr.noOrdersBody} />
      ) : !shown.length ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.nothingHere}</p>
      ) : (
        <div className="space-y-3">
          {shown.map((o) => (
            <section key={o.id} className={`${panel} ${o.overdue ? "border-s-4 border-s-rose-400 dark:border-s-rose-500/70" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-slate-900 dark:text-white">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{o.reference}</span>
                    <span className="font-600">{o.title}</span>
                    <Chip tone={priorityTone(o.priority)}>{tr.priorityName(o.priority)}</Chip>
                    <Chip tone={STATUS_TONE[o.status]}>
                      {tr.status(o.status)}{o.status === "On hold" && o.holdReason ? ` · ${tr.holdName(o.holdReason)}` : ""}
                    </Chip>
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {tr.typeName(o.type)}
                    {o.requestReference ? ` · ${tr.fromRequest(o.requestReference)}` : ""}
                    {o.dueOn ? ` · ${tr.dueOn(fmtDate(o.dueOn))}` : ""}
                    {o.overdue && <span className="ms-2 font-600 text-rose-600 dark:text-rose-300">{tr.overdue}</span>}
                  </p>
                  {o.description && <p className="mt-2 max-w-prose whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{o.description}</p>}
                  <Links asset={o.asset} location={o.location} tr={tr} />
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">{tr.assignedTo}:</span>{" "}
                    {(o.assignees || []).length ? o.assignees.map((a) => a.alias || a.id).join("، ") : tr.nobody}
                  </p>
                  {o.resolution && (o.status === "Completed" || o.status === "Closed") && (
                    <p className="mt-2 max-w-prose whitespace-pre-line rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
                      <span className="font-600">{tr.resolution}:</span> {o.resolution}
                    </p>
                  )}
                  <PhotoStrip photos={o.photos} label={(n) => tr.photoAlt(o.reference, n)} />
                </div>
              </div>

              {(canEdit || canDelete) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {canEdit && (ORDER_MOVES[o.status] || []).map((to) => (
                    <button key={to} type="button" disabled={busy} onClick={() => move(o, to)}
                      className={to === "Cancelled" ? btnRowDanger : to === "In progress" || to === "Completed" ? btn : btnRow}>
                      {moveLabel(o.status, to)}
                    </button>
                  ))}
                  {canEdit && orderEditable(o) && (
                    <button type="button" className={btnGhost} disabled={busy} onClick={() => openForm(o)}>{tr.edit}</button>
                  )}
                  {canDelete && orderDeletable(o) && (
                    <button type="button" className={btnRowDanger} disabled={busy}
                      onClick={() => send("DELETE", { id: o.id })}>{tr.remove}</button>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {form && (
        <Dialog title={form.id ? tr.editOrder : tr.newOrder} onClose={() => setForm(null)} width="max-w-[760px]">
          <div className="space-y-4">
            <Field label={tr.title} required value={form.title}
              onChange={(v) => setForm((f) => ({ ...f, title: v }))} inputProps={{ maxLength: 200 }} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.type} as="select" required value={form.type}
                onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={types} />
              <Field label={tr.priority} as="select" required value={form.priority}
                onChange={(v) => setForm((f) => ({ ...f, priority: v }))} options={priorities} />
              <Field label={tr.asset} as="select" value={form.assetId}
                onChange={(v) => setForm((f) => ({ ...f, assetId: v }))} options={pickOptions(pickers.assets, tr.noAsset)} />
              <Field label={tr.location} as="select" value={form.locationId}
                onChange={(v) => setForm((f) => ({ ...f, locationId: v }))} options={pickOptions(pickers.locations, tr.noLocation)} />
              <Field label={tr.due} type="date" value={form.dueOn}
                onChange={(v) => setForm((f) => ({ ...f, dueOn: v }))} />
              <Field label={tr.estimatedHours} type="number" value={form.estimatedHours}
                onChange={(v) => setForm((f) => ({ ...f, estimatedHours: v }))} inputProps={{ min: 0, step: 0.25 }} />
            </div>
            <PeoplePicker people={pickers.people} value={form.assignedToCollaboratorIds} label={tr.assignedTo}
              hint={tr.assignedHint} onChange={(ids) => setForm((f) => ({ ...f, assignedToCollaboratorIds: ids }))} />
            <Field label={tr.description} as="textarea" value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))} inputProps={{ maxLength: 4000 }} />
            <PhotoField slug={slug} tr={tr} reference={form.reference || ""} photos={form.photos}
              onChange={(photos) => setForm((f) => ({ ...f, photos }))} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !form.title.trim()} onClick={save}>
                {busy ? tr.saving : tr.save}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {holding && (
        <Dialog title={tr.holdTitle} onClose={() => setHolding(null)} width="max-w-[480px]">
          <div className="space-y-4">
            <Field label={tr.holdReason} as="select" required value={holding.holdReason}
              onChange={(v) => setHolding((h) => ({ ...h, holdReason: v }))}
              options={HOLD_REASONS.map((r) => ({ value: r, label: tr.holdName(r) }))} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setHolding(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy}
                onClick={async () => { if (await send("PATCH", { ...holding, status: "On hold" })) setHolding(null); }}>
                {tr.hold}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {completing && (
        <Dialog title={tr.completeTitle} onClose={() => setCompleting(null)} width="max-w-[560px]">
          <div className="space-y-4">
            <Field label={tr.resolution} as="textarea" required value={completing.resolution} hint={tr.resolutionHint}
              onChange={(v) => setCompleting((c) => ({ ...c, resolution: v }))} inputProps={{ maxLength: 4000 }} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setCompleting(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !completing.resolution.trim()}
                onClick={async () => { if (await send("PATCH", { ...completing, status: "Completed" })) setCompleting(null); }}>
                {tr.complete}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
