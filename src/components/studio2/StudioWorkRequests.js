// WORK REQUESTS — anybody's report that something is wrong.
//
// The fault reporter's screen and the supervisor's triage queue in one: a
// report is written here, and somebody holding the work-order right accepts it
// (a corrective work order is raised naming it) or declines it with a reason.
// Accepted is DERIVED from that work order, so deleting the order puts the
// request back in the queue rather than leaving it reading as handled.
"use client";
import { useState } from "react";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, Empty, Dialog, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { PRIORITIES } from "@/modules/maintenance/model";
import {
  useMaintenance, Chip, priorityTone, Links, PhotoStrip, PhotoField, PeoplePicker, pickOptions,
} from "@/components/studio2/maintenanceParts";

const STATE_TONE = {
  Open: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  Accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  Declined: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};

export default function StudioWorkRequests({ slug }) {
  const { tr, data, error, busy, send, reload } = useMaintenance(slug, "maintenance/requests");
  // The requests are this section's rows; whether one is ACCEPTED is derived
  // from a work order naming it, written under Work orders — so a colleague
  // accepting a request has to move this list, and only the second watch can
  // tell it.
  useLiveUpdates(slug, "maintenance-requests", reload);
  useLiveUpdates(slug, "maintenance-orders", reload);
  const [filter, setFilter] = useState("Open");
  const [form, setForm] = useState(null);
  const [accepting, setAccepting] = useState(null);
  const [declining, setDeclining] = useState(null);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { requests = [], pickers = {}, canCreate, canEdit, canDelete, canTriage } = data;
  const shown = filter === "all" ? requests : requests.filter((r) => r.state === filter);
  const priorities = PRIORITIES.map((p) => ({ value: p, label: tr.priorityName(p) }));

  const openForm = (r) => setForm(r
    ? { id: r.id, reference: r.reference, title: r.title, description: r.description, priority: r.priority,
      assetId: r.assetId, locationId: r.locationId, photos: r.photos || [] }
    : { title: "", description: "", priority: "normal", assetId: "", locationId: "", photos: [] });

  const save = async () => {
    const payload = {
      title: form.title, description: form.description, priority: form.priority,
      assetId: form.assetId, locationId: form.locationId, photos: form.photos,
    };
    const done = form.id ? await send("PUT", { ...payload, id: form.id }) : await send("POST", payload);
    if (done) setForm(null);
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.requests}</h2>
          <p className={sub}>{tr.requestsSub}</p>
        </div>
        {canCreate && <button type="button" className={btn} onClick={() => openForm(null)}>{tr.reportFault}</button>}
      </div>

      {requests.length > 0 && (
        <div role="tablist" aria-label={tr.requests} className="flex flex-wrap gap-2">
          {[["Open", tr.filterOpen], ["Accepted", tr.filterAccepted], ["Declined", tr.filterDeclined], ["all", tr.filterAll]].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-sm font-600 transition-colors ${filter === key
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"}`}>
              {label}
              <span className="ms-1.5 tabular-nums opacity-70">
                {key === "all" ? requests.length : requests.filter((r) => r.state === key).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {!requests.length ? (
        <Empty title={tr.noRequests} body={tr.noRequestsBody} />
      ) : !shown.length ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.nothingHere}</p>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <section key={r.id} className={panel}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-slate-900 dark:text-white">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.reference}</span>
                    <span className="font-600">{r.title}</span>
                    <Chip tone={priorityTone(r.priority)}>{tr.priorityName(r.priority)}</Chip>
                    <Chip tone={STATE_TONE[r.state]}>{tr.state(r.state)}</Chip>
                  </p>
                  {r.description && <p className="mt-1 max-w-prose whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{r.description}</p>}
                  <Links asset={r.asset} location={r.location} tr={tr} />
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    {tr.reportedBy(r.createdByAlias, fmtDate(r.createdAt))}
                  </p>
                  {r.state === "Accepted" && (
                    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                      {r.orderReference ? tr.becameOrder(r.orderReference, tr.status(r.orderStatus)) : tr.becameOrderHidden}
                    </p>
                  )}
                  {r.state === "Declined" && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {r.declineReason ? tr.declinedBecause(r.declineReason) : tr.declinedNoReason}
                    </p>
                  )}
                  <PhotoStrip photos={r.photos} label={(n) => tr.photoAlt(r.reference, n)} />
                </div>
              </div>

              {r.state === "Open" && (canTriage || canEdit || canDelete) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {canTriage && (
                    <>
                      <button type="button" className={btn} disabled={busy}
                        onClick={() => setAccepting({ id: r.id, priority: r.priority, dueOn: "", assignedToCollaboratorIds: [] })}>
                        {tr.accept}
                      </button>
                      <button type="button" className={btnRowDanger} disabled={busy}
                        onClick={() => setDeclining({ id: r.id, reason: "" })}>{tr.decline}</button>
                    </>
                  )}
                  {canEdit && <button type="button" className={btnRow} disabled={busy} onClick={() => openForm(r)}>{tr.edit}</button>}
                  {canDelete && (
                    <button type="button" className={btnRowDanger} disabled={busy}
                      onClick={() => send("DELETE", { id: r.id })}>{tr.remove}</button>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {form && (
        <Dialog title={form.id ? tr.editRequest : tr.newRequest} onClose={() => setForm(null)}>
          <div className="space-y-4">
            <Field label={tr.title} required value={form.title}
              onChange={(v) => setForm((f) => ({ ...f, title: v }))} inputProps={{ maxLength: 200 }} />
            <Field label={tr.description} as="textarea" value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))} inputProps={{ maxLength: 4000 }} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={tr.priority} as="select" required value={form.priority}
                onChange={(v) => setForm((f) => ({ ...f, priority: v }))} options={priorities} />
              <Field label={tr.asset} as="select" value={form.assetId}
                onChange={(v) => setForm((f) => ({ ...f, assetId: v }))} options={pickOptions(pickers.assets, tr.noAsset)} />
              <Field label={tr.location} as="select" value={form.locationId}
                onChange={(v) => setForm((f) => ({ ...f, locationId: v }))} options={pickOptions(pickers.locations, tr.noLocation)} />
            </div>
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

      {accepting && (
        <Dialog title={tr.acceptTitle} description={tr.acceptHint} onClose={() => setAccepting(null)} width="max-w-[560px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.priority} as="select" required value={accepting.priority}
                onChange={(v) => setAccepting((a) => ({ ...a, priority: v }))} options={priorities} />
              <Field label={tr.due} type="date" value={accepting.dueOn}
                onChange={(v) => setAccepting((a) => ({ ...a, dueOn: v }))} />
            </div>
            <PeoplePicker people={pickers.people} value={accepting.assignedToCollaboratorIds} label={tr.assignedTo}
              hint={tr.assignedHint} onChange={(ids) => setAccepting((a) => ({ ...a, assignedToCollaboratorIds: ids }))} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setAccepting(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy}
                onClick={async () => { if (await send("PUT", { ...accepting, action: "accept" })) setAccepting(null); }}>
                {tr.createOrder}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {declining && (
        <Dialog title={tr.decline} onClose={() => setDeclining(null)} width="max-w-[520px]">
          <div className="space-y-4">
            <Field label={tr.declineReason} as="textarea" value={declining.reason} hint={tr.declineHint}
              onChange={(v) => setDeclining((d) => ({ ...d, reason: v }))} inputProps={{ maxLength: 1000 }} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setDeclining(null)}>{tr.cancel}</button>
              <button type="button" className={btnRowDanger} disabled={busy}
                onClick={async () => { if (await send("PUT", { ...declining, action: "decline" })) setDeclining(null); }}>
                {tr.decline}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
