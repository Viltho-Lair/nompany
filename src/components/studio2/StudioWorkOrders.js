// WORK ORDERS — Maintenance's register of authorised work.
//
// EVERY BUTTON IS A MOVE THE LADDER ALLOWS FROM HERE. The screen reads
// `ORDER_MOVES` from the same pure module the server refuses with, so "Start"
// is never offered on closed work and "Cancel" never on work in progress. Two
// moves ask something first: a hold asks why (the backlog is sorted by it), and
// completion asks what was done (the machine's next failure starts from it).
//
// TWO VIEWS OF ONE LIST. The map draws the same orders the list does — open
// work at places that carry a pin — through the Phase 0 map, which loads only
// when somebody switches to it. Work with no pinned place is counted beneath
// the map rather than silently missing from it.
"use client";
import { useMemo, useState } from "react";
import nextDynamic from "next/dynamic";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, Empty, Dialog, fmtDate, fmtDateTime } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import {
  PRIORITIES, ORDER_TYPES, ORDER_MOVES, HOLD_REASONS, LABOUR_KINDS,
  orderEditable, orderDeletable, orderOpen, openWorkByPlace, labourProblem, downtimeHours,
} from "@/modules/maintenance/model";
import { placeCoordinates } from "@/shared/places";
import {
  useMaintenance, Chip, priorityTone, Links, PhotoStrip, PhotoField, PeoplePicker, pickOptions,
  toLocalInput, fromLocalInput,
} from "@/components/studio2/maintenanceParts";

// BEHIND A REAL LAZY BOUNDARY — `import()` from a client module, so nobody pays
// for the map until they switch to it.
const PlacesMap = nextDynamic(() => import("@/components/studio2/PlacesMap"),
  { ssr: false, loading: () => <div className="skel h-[360px] w-full rounded-geex" /> });

const STATUS_TONE = {
  Open: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  "In progress": "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  "On hold": "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  Closed: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Cancelled: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};

const pill = (on) => `rounded-full px-3 py-1 text-sm font-600 transition-colors ${on
  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"}`;

export default function StudioWorkOrders({ slug }) {
  const { tr, data, error, busy, send, reload } = useMaintenance(slug, "maintenance/orders");
  // The orders and their time entries are this section's rows; the request
  // each order answers is shown by reference, and requests are written under
  // Work requests.
  useLiveUpdates(slug, "maintenance-orders", reload);
  useLiveUpdates(slug, "maintenance-requests", reload);
  const [filter, setFilter] = useState("open");
  // `layout`, not `view`: `view` is the name screens give a SECTION key, and
  // tests/restructure.mjs holds every string compared against a variable of
  // that name to a real section key.
  const [layout, setLayout] = useState("list");
  const [form, setForm] = useState(null);
  const [holding, setHolding] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [logging, setLogging] = useState(null);

  // THE PINS: one per place that has both open work and coordinates. Memoised
  // on the data so a re-render of this screen is not a redraw of the map.
  const places = useMemo(() => {
    if (!data) return [];
    const byPlace = openWorkByPlace(data.orders || []);
    return (data.pickers?.locations || []).flatMap((l) => {
      const work = byPlace.get(l.id);
      const at = work ? placeCoordinates(l) : null;
      return at ? [{ id: l.id, name: l.name, kind: l.kind, at, lines: work.map((o) => `${o.reference} · ${o.title}`) }] : [];
    });
  }, [data]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { orders = [], pickers = {}, me, asOf, failureCodes = {}, canCreate, canEdit, canDelete } = data;
  const codeOptions = (list = [], none = "") => [{ value: "", label: none }, ...list.map((v) => ({ value: v, label: v }))];
  const open = orders.filter(orderOpen);
  const mine = open.filter((o) => (o.assignedToCollaboratorIds || []).includes(me));
  const shown = filter === "open" ? open
    : filter === "mine" ? mine
    : filter === "done" ? orders.filter((o) => !orderOpen(o))
    : orders;
  const overdue = open.filter((o) => o.overdue).length;
  const onMap = places.reduce((n, p) => n + p.lines.length, 0);
  const priorities = PRIORITIES.map((p) => ({ value: p, label: tr.priorityName(p) }));
  const types = ORDER_TYPES.map((t) => ({ value: t, label: tr.typeName(t) }));
  const people = (pickers.people || []).map((p) => ({ value: p.id, label: p.alias || p.id }));

  const openForm = (o) => setForm(o
    ? {
      id: o.id, reference: o.reference, title: o.title, description: o.description, type: o.type, priority: o.priority,
      assetId: o.assetId, locationId: o.locationId, assignedToCollaboratorIds: o.assignedToCollaboratorIds || [],
      dueOn: o.dueOn || "", estimatedHours: o.estimatedHours ?? "", photos: o.photos || [],
      downSince: toLocalInput(o.downSince), upAt: toLocalInput(o.upAt),
    }
    : {
      title: "", description: "", type: "corrective", priority: "normal", assetId: "", locationId: "",
      assignedToCollaboratorIds: [], dueOn: "", estimatedHours: "", photos: [], downSince: "", upAt: "",
    });

  const save = async () => {
    const { id, reference: _ref, downSince, upAt, ...rest } = form;
    // THE READER'S LOCAL TIME, SENT AS AN INSTANT — so "down for 12 h" is the
    // same twelve hours for a reader in another timezone.
    const payload = { ...rest, downSince: fromLocalInput(downSince), upAt: fromLocalInput(upAt) };
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
    else if (to === "Completed") setCompleting({
      id: o.id, resolution: o.resolution || "", corrective: o.type === "corrective",
      down: Boolean(o.downSince) && !o.upAt, upAt: "",
      failureProblem: o.failure?.problem || "", failureCause: o.failure?.cause || "", failureRemedy: o.failure?.remedy || "",
    });
    else send("PATCH", { id: o.id, status: to });
  };

  const labourBlocked = logging ? labourProblem(logging, asOf) : null;

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label={tr.orders} className="flex flex-wrap gap-2">
            {[["open", tr.filterOpen, open.length], ["mine", tr.filterMine, mine.length], ["done", tr.filterDone], ["all", tr.filterAll]].map(([key, label, n]) => (
              <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className={pill(filter === key)}>
                {label}{n != null && <span className="ms-1.5 tabular-nums opacity-70">{n}</span>}
              </button>
            ))}
          </div>
          <div role="tablist" aria-label={tr.viewMap} className="flex gap-1 rounded-full border border-slate-200 p-0.5 dark:border-white/10">
            {[["list", tr.viewList], ["map", tr.viewMap]].map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={layout === key} onClick={() => setLayout(key)} className={pill(layout === key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {layout === "map" && orders.length > 0 ? (
        <section className={`${panel} p-0`}>
          <p className="px-6 pt-4 pb-3 text-sm text-slate-500 dark:text-slate-400">{tr.mapSub}</p>
          {places.length ? <PlacesMap slug={slug} places={places} /> : (
            <p className="px-6 pb-5 text-sm text-slate-500 dark:text-slate-400">{tr.noOpenOnMap}</p>
          )}
          {places.length > 0 && open.length > onMap && (
            <p className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400">{tr.notOnMap(open.length - onMap)}</p>
          )}
        </section>
      ) : !orders.length ? (
        <Empty title={tr.noOrders} body={tr.noOrdersBody} />
      ) : !shown.length ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.nothingHere}</p>
      ) : (
        <div className="space-y-3">
          {shown.map((o) => (
            <section key={o.id} className={`${panel} ${o.overdue ? "border-s-4 border-s-rose-400 dark:border-s-rose-500/70" : ""}`}>
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
                  {o.planReference ? ` · ${tr.fromPlan(o.planReference)}` : ""}
                  {o.dueOn ? ` · ${tr.dueOn(fmtDate(o.dueOn))}` : ""}
                  {o.overdue && <span className="ms-2 font-600 text-rose-600 dark:text-rose-300">{tr.overdue}</span>}
                </p>
                {o.description && <p className="mt-2 max-w-prose whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{o.description}</p>}
                <Links asset={o.asset} location={o.location} tr={tr} />
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">{tr.assignedTo}:</span>{" "}
                  {(o.assignees || []).length ? o.assignees.map((a) => a.alias || a.id).join("، ") : tr.nobody}
                </p>
                {/* WHETHER THE MACHINE IS OUT — the one fact on the card that
                    changes what happens next on the floor. */}
                {o.downSince && !o.upAt && (
                  <p className="mt-1 text-sm font-600 text-rose-600 dark:text-rose-300">{tr.downNow(fmtDateTime(o.downSince))}</p>
                )}
                {downtimeHours(o) != null && (
                  <p className="mt-1 text-sm tabular-nums text-slate-600 dark:text-slate-300">{tr.downFor(downtimeHours(o))}</p>
                )}
                {o.failure?.problem && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">{tr.failure}:</span>{" "}
                    {[o.failure.problem, o.failure.cause, o.failure.remedy].filter(Boolean).join(" · ")}
                  </p>
                )}
                {(o.hoursLogged > 0 || o.estimatedHours != null) && (
                  <p className="mt-1 text-sm tabular-nums text-slate-600 dark:text-slate-300">
                    {tr.hoursLogged(o.hoursLogged || 0, o.estimatedHours)}
                  </p>
                )}
                {o.resolution && (o.status === "Completed" || o.status === "Closed") && (
                  <p className="mt-2 max-w-prose whitespace-pre-line rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <span className="font-600">{tr.resolution}:</span> {o.resolution}
                  </p>
                )}
                <PhotoStrip photos={o.photos} label={(n) => tr.photoAlt(o.reference, n)} />

                {/* THE PLAN'S STEPS, ONE TICK EACH. Tickable while the work is
                    open; Complete is refused with a step unticked, and the
                    screen says so rather than offering a button that fails. */}
                {(o.checklist || []).length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {tr.checklist} · {tr.checklistProgress(o.checklist.filter((i) => i.done).length, o.checklist.length)}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {o.checklist.map((i) => (
                        <li key={i.id}>
                          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={Boolean(i.done)}
                              disabled={busy || !canEdit || !orderOpen(o)}
                              onChange={(e) => send("PATCH", { id: o.id, check: i.id, done: e.target.checked })} />
                            <span className={i.done ? "text-slate-400 line-through" : ""}>{i.label}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(o.labour || []).length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-600 text-slate-600 dark:text-slate-300">{tr.timeEntries(o.labour.length)}</summary>
                    <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-white/5">
                      {o.labour.map((e) => (
                        <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-slate-600 dark:text-slate-300">
                          <span className="tabular-nums">{fmtDate(e.workedOn)}</span>
                          <span>{e.alias || e.collaboratorId}</span>
                          <span className="tabular-nums font-600">{e.hours} h</span>
                          <span className="text-slate-400">{tr.labourKind(e.kind)}</span>
                          {e.note && <span className="text-slate-500 dark:text-slate-400">{e.note}</span>}
                          {canEdit && orderEditable(o) && (e.createdByCollaboratorId === me || canDelete) && (
                            <button type="button" disabled={busy} onClick={() => send("DELETE", { id: e.id }, "maintenance/labour")}
                              className="ms-auto text-xs text-rose-600 hover:underline disabled:opacity-60 dark:text-rose-300">{tr.remove}</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
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
                    <button type="button" className={btnRow} disabled={busy}
                      onClick={() => setLogging({ workOrderId: o.id, reference: o.reference, collaboratorId: me, workedOn: asOf, hours: "", kind: "work", note: "" })}>
                      {tr.logTime}
                    </button>
                  )}
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
              <Field label={tr.downSince} type="datetime-local" value={form.downSince}
                onChange={(v) => setForm((f) => ({ ...f, downSince: v }))} />
              <Field label={tr.upAt} type="datetime-local" value={form.upAt}
                onChange={(v) => setForm((f) => ({ ...f, upAt: v }))} />
            </div>
            <PeoplePicker people={pickers.people} value={form.assignedToCollaboratorIds} label={tr.assignedTo}
              hint={tr.assignedHint} onChange={(ids) => setForm((f) => ({ ...f, assignedToCollaboratorIds: ids }))} />
            <Field label={tr.description} as="textarea" value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))} inputProps={{ maxLength: 4000 }} />
            <PhotoField slug={slug} tr={tr} reference={form.reference || ""} photos={form.photos}
              onChange={(photos) => setForm((f) => ({ ...f, photos }))} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !form.title.trim() || (Boolean(form.upAt) && !form.downSince)} onClick={save}>
                {busy ? tr.saving : tr.save}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {logging && (
        <Dialog title={tr.logTimeTitle(logging.reference)} onClose={() => setLogging(null)} width="max-w-[560px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.who} as="select" required value={logging.collaboratorId}
                onChange={(v) => setLogging((l) => ({ ...l, collaboratorId: v }))} options={people} />
              <Field label={tr.workedOn} type="date" required value={logging.workedOn}
                onChange={(v) => setLogging((l) => ({ ...l, workedOn: v }))} inputProps={{ max: asOf }} />
              <Field label={tr.hours} type="number" required value={logging.hours}
                onChange={(v) => setLogging((l) => ({ ...l, hours: v }))} inputProps={{ min: 0.25, max: 24, step: 0.25 }}
                error={String(logging.hours).trim() && labourBlocked ? tr.refuse[labourBlocked] : ""} />
              <Field label={tr.labourKindLabel} as="select" required value={logging.kind}
                onChange={(v) => setLogging((l) => ({ ...l, kind: v }))}
                options={LABOUR_KINDS.map((k) => ({ value: k, label: tr.labourKind(k) }))} />
            </div>
            <Field label={tr.note} value={logging.note}
              onChange={(v) => setLogging((l) => ({ ...l, note: v }))} inputProps={{ maxLength: 500 }} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setLogging(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || Boolean(labourBlocked)}
                onClick={async () => {
                  const { reference: _ref, ...entry } = logging;
                  if (await send("POST", entry, "maintenance/labour")) setLogging(null);
                }}>
                {busy ? tr.saving : tr.logTime}
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
            {/* CORRECTIVE WORK NAMES WHAT FAILED — from the studio's own lists
                (Master data → Categories), because a failure count is only as
                useful as what it can be grouped by. */}
            {completing.corrective && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={tr.problem} as="select" required value={completing.failureProblem}
                  onChange={(v) => setCompleting((c) => ({ ...c, failureProblem: v }))}
                  options={codeOptions(failureCodes.problems)} />
                <Field label={tr.cause} as="select" value={completing.failureCause}
                  onChange={(v) => setCompleting((c) => ({ ...c, failureCause: v }))}
                  options={codeOptions(failureCodes.causes, "—")} />
                <Field label={tr.remedy} as="select" value={completing.failureRemedy}
                  onChange={(v) => setCompleting((c) => ({ ...c, failureRemedy: v }))}
                  options={codeOptions(failureCodes.remedies, "—")} />
              </div>
            )}
            {completing.down && (
              <Field label={tr.upAt} type="datetime-local" value={completing.upAt}
                hint={tr.downNow("—").replace("—", "").trim() ? undefined : undefined}
                onChange={(v) => setCompleting((c) => ({ ...c, upAt: v }))} />
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setCompleting(null)}>{tr.cancel}</button>
              <button type="button" className={btn}
                disabled={busy || !completing.resolution.trim() || (completing.corrective && !completing.failureProblem)}
                onClick={async () => {
                  const { corrective: _c, down: _d, upAt, ...rest } = completing;
                  // Blank "back in service" is "now" — the server stamps the
                  // completion moment when none is given.
                  if (await send("PATCH", { ...rest, upAt: fromLocalInput(upAt), status: "Completed" })) setCompleting(null);
                }}>
                {tr.complete}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
