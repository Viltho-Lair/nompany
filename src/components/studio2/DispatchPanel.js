"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { dispatchDict } from "@/shared/studio/dispatch";
import { useReload } from "@/components/studio2/useReload";

// THE DISPATCH BOARD — one day, every crew, and the jobs nobody is on.
//
// The Schedule already draws the jobs. This answers the three questions about
// the PEOPLE that a calendar cannot: who is unstaffed, who is double-booked,
// and who has room. See `modules/operations/dispatch` for why each one is here.
//
// READ-ONLY FOR STAFFING. Staffing a job is editing the job, and it answers to
// the jobs route like every other change to one — a second write path out of a
// board would be two ways to staff a job, free to disagree about what that means.
//
// BUT A JOB CAN BE RAISED HERE (tier 5). No screen could create one before: the
// jobs POST existed and was reachable only by hand, so the dispatch board showed
// a collection nothing could add to. "New job" posts to that same route.
export default function DispatchPanel({ slug, locale = "en" }) {
  const tr = dispatchDict(locale);
  const [data, setData] = useState(null);
  const [day, setDay] = useState("");
  const [problem, setProblem] = useState("");
  const [options, setOptions] = useState(null);
  const [creating, setCreating] = useState(false);

  // WHETHER TO OFFER THE FORM, and what it picks from — the jobs route answers
  // both, from the rights this reader holds.
  const loadOptions = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/operations/jobs`, { cache: "no-store" });
    if (!res.ok) return;
    const body = await res.json().catch(() => ({}));
    setOptions({ canCreate: Boolean(body.canCreate), pickers: body.pickers || {} });
  }, [slug]);
  useReload(loadOptions);

  const load = useCallback(async () => {
    const qs = day ? `?day=${encodeURIComponent(day)}` : "";
    const res = await fetch(`/api/studios/${slug}/operations/dispatch${qs}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setData(body);
    // THE DAY COMES BACK FROM THE SERVER on the first load, because the records
    // are UTC and a browser's idea of "today" is not. Adopting the answer means
    // the picker and the board can never be a day apart.
    setDay((d) => d || body.day);
  }, [slug, day, setData, setDay, setProblem]);

  useReload(load);

  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const { lanes = [], unassigned = [], stranded = [], totalHours, today } = data;
  const time = (v) => (v ? String(v).slice(11, 16) : "—");
  const jobLine = (j) => `${time(j.scheduledStart)}–${time(j.scheduledEnd)} · ${j.title || tr.untitled}`;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{tr.title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
        </div>
        <Field label={tr.day} type="date" className="w-full sm:w-44 sm:ms-auto"
          value={day} onChange={(v) => setDay(v)} />
        {options?.canCreate && !creating && (
          <button type="button" className={BTN} onClick={() => setCreating(true)}>{tr.newJob}</button>
        )}
      </div>

      {creating && options && (
        <NewJobForm slug={slug} tr={tr} pickers={options.pickers} lanes={lanes}
          onCancel={() => setCreating(false)}
          onDone={() => { setCreating(false); void load(); }} />
      )}

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      {/* A JOB SCHEDULED FOR LAST TUESDAY THAT NOBODY WAS PUT ON is invisible
          on every day view, including this one — so it sits above the board
          rather than inside it. */}
      {stranded.length > 0 && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 dark:bg-rose-500/10">
          <h3 className="font-display text-sm font-700 text-rose-700 dark:text-rose-300">{tr.stranded}</h3>
          <p className="mt-1 text-sm text-rose-700/80 dark:text-rose-300/80">{tr.strandedLead}</p>
          <ul className="mt-2 space-y-0.5">
            {stranded.map((j) => (
              <li key={j.id} className="flex justify-between text-sm text-rose-700 dark:text-rose-300">
                <span>{j.title || tr.untitled}</span>
                <span className="num">{String(j.scheduledStart || "").slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* THE UNASSIGNED PEN. On a calendar a job with nobody on it looks
          identical to a job with a full crew. */}
      <div className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">
          {tr.unassigned} {unassigned.length > 0 && <span className="num text-slate-400">· {unassigned.length}</span>}
        </h3>
        {unassigned.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.everyoneAssigned}</p>
        ) : (
          <ul className="mt-2 space-y-0.5">
            {unassigned.map((j) => (
              <li key={j.id} className="flex flex-wrap justify-between gap-2 text-sm text-slate-700 dark:text-slate-200">
                <span>{jobLine(j)}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{j.location || ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- the lanes --------------------------------------------------- */}
      <div className="space-y-2">
        {lanes.map((lane) => (
          <div key={lane.collaboratorId}
            className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] px-4 py-3 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-700 text-slate-900 dark:text-white">{lane.alias}</span>
              {/* CLASHES ARE SHOWN, NEVER REFUSED: a dispatcher deliberately
                  overlaps a handover, so this is something to see. */}
              {lane.clashes.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-600 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  {tr.clashes(lane.clashes.length)}
                </span>
              )}
              <span className="num ms-auto text-sm text-slate-500 dark:text-slate-400">{tr.hours(lane.hours)}</span>
            </div>
            {/* A PERSON WITH NOTHING ON IS THE ANSWER TO "who can take this",
                so an empty lane says it rather than being dropped. */}
            {lane.jobs.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{tr.free}</p>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {lane.jobs.map((j) => (
                  <li key={j.id} className="flex flex-wrap justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span>{jobLine(j)}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{j.location || ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        {tr.booked(totalHours)}{day && day !== today ? ` · ${day}` : ""}
      </p>
    </div>
  );
}

const BTN = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const BTN_GHOST = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const KINDS = ["service-job", "scheduled-visit", "work-package", "work-order"];

// THE NEW JOB FORM. A project is optional: a job with none opens its own
// field-service deal (Template D — "a warranty call is a job with no sale"),
// and the form says so rather than asking for a deal id nobody can find.
function NewJobForm({ slug, tr, pickers, lanes, onCancel, onDone }) {
  const [f, setF] = useState({
    title: "", kind: "service-job", projectId: "", contractId: "", installedUnitId: "",
    location: "", scheduledStart: "", scheduledEnd: "", assignee: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const none = (list) => [{ value: "", label: tr.none }, ...list];
  const projects = (pickers.projects || []).map((p) => ({ value: p.id, label: [p.number, p.title].filter(Boolean).join(" · ") }));
  const contracts = (pickers.contracts || []).map((c) => ({ value: c.id, label: c.name }));
  const units = (pickers.units || []).map((u) => ({ value: u.id, label: u.name }));

  async function submit() {
    setBusy(true);
    setError("");
    const { assignee, ...rest } = f;
    const res = await fetch(`/api/studios/${slug}/operations/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rest, assignedToCollaboratorIds: assignee ? [assignee] : [] }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(body.error || String(res.status)); return; }
    onDone();
  }

  return (
    <div className="space-y-3 rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
      <Field label={tr.jobTitle} value={f.title} onChange={(v) => set({ title: v })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tr.jobKind} as="select" value={f.kind} onChange={(v) => set({ kind: v })}
          options={KINDS.map((k) => ({ value: k, label: tr.kindName(k) }))} />
        <Field label={tr.jobAssignee} as="select" value={f.assignee} onChange={(v) => set({ assignee: v })}
          options={[{ value: "", label: tr.nobody }, ...lanes.map((l) => ({ value: l.collaboratorId, label: l.alias }))]} />
        <Field label={tr.jobProject} as="select" value={f.projectId} onChange={(v) => set({ projectId: v })}
          options={none(projects)} />
        <Field label={tr.jobLocation} value={f.location} onChange={(v) => set({ location: v })} />
        {contracts.length > 0 && (
          <Field label={tr.jobContract} as="select" value={f.contractId} onChange={(v) => set({ contractId: v })}
            options={none(contracts)} />
        )}
        {units.length > 0 && (
          <Field label={tr.jobUnit} as="select" value={f.installedUnitId} onChange={(v) => set({ installedUnitId: v })}
            options={none(units)} />
        )}
        <Field label={tr.jobStart} type="datetime-local" value={f.scheduledStart} onChange={(v) => set({ scheduledStart: v })} />
        <Field label={tr.jobEnd} type="datetime-local" value={f.scheduledEnd} onChange={(v) => set({ scheduledEnd: v })} />
      </div>
      {!f.projectId && <p className="text-xs text-slate-500 dark:text-slate-400">{tr.jobProjectHint}</p>}
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BTN} disabled={busy || !f.title.trim()} onClick={submit}>
          {busy ? tr.creating : tr.createJob}
        </button>
        <button type="button" className={BTN_GHOST} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </div>
  );
}
