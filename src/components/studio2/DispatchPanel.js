"use client";

import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import { dispatchDict } from "@/shared/studio/dispatch";
import { useReload } from "@/components/studio2/useReload";
import { useStudioLocale } from "@/components/studio2/locale";
import { fmtDate } from "@/components/studio2/ui";
import { fmtTime } from "@/lib/format";
import { addDaysISO } from "@/shared/dates";

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
//
// THE LANGUAGE IS THE STUDIO SHELL'S (useStudioLocale), never a prop that
// defaulted to English for any caller that forgot it.
export default function DispatchPanel({ slug }) {
  const tr = dispatchDict(useStudioLocale());
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
    if (!res.ok) { setProblem(tr.problem(body.error || "failed")); return; }
    setProblem("");
    setData(body);
    // THE DAY COMES BACK FROM THE SERVER on the first load, because "today" is
    // the STUDIO's (its time zone, set in Studio settings) and a browser's idea
    // of it is not. Adopting the answer means the picker and the board can
    // never be a day apart.
    setDay((d) => d || body.day);
  }, [slug, day, tr, setData, setDay, setProblem]);

  useReload(load);

  if (!data) return <ScreenSkeleton />;

  const { lanes = [], unassigned = [], stranded = [], totalHours, today } = data;
  // THE STUDIO'S CLOCK FORMAT, not a slice of the stored string. A bare date (a
  // PM visit is due on a day, not at an hour) has no time to show.
  const time = (v) => (v && String(v).includes("T") ? fmtTime(v) : "—");
  const jobLine = (j) => `${time(j.scheduledStart)}–${time(j.scheduledEnd)} · ${j.title || tr.untitled}`;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{tr.title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
        </div>
        {/* THE SHARED PICKER, not the browser's: a native date input draws
            in the device's locale and format, so an Arabic studio on an
            English laptop picked its day off an American calendar. */}
        <Field label={tr.day} filled={!!day} className="w-full sm:w-44 sm:ms-auto">
          <StudioDate value={day} onChange={(iso) => { if (iso) setDay(iso); }} />
        </Field>
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
                <span className="num">{fmtDate(j.scheduledStart)}</span>
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
        {tr.booked(totalHours)}{day && day !== today ? ` · ${fmtDate(day)}` : ""}
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
  // THE DAY AND ITS TWO CLOCK TIMES, picked the way the rota's shift form picks
  // them — the shared date picker for the day and two time fields — rather than
  // the browser's datetime-local, which drew in the device's locale. What is
  // sent is the same zoneless wall clock that input produced ("2026-09-27T08:30"),
  // which the board reads as the studio's own time (dispatch.dayOf).
  const [f, setF] = useState({
    title: "", kind: "service-job", projectId: "", contractId: "", installedUnitId: "",
    location: "", day: "", from: "", to: "", assignee: "",
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
    const { assignee, day, from, to, ...rest } = f;
    // AN END EARLIER THAN THE START RUNS PAST MIDNIGHT — the rota's own rule for
    // an overnight shift — so a 22:00–06:00 call-out is one job, not a refusal.
    const scheduledStart = day ? (from ? `${day}T${from}` : day) : "";
    const scheduledEnd = day && to ? `${from && to <= from ? addDaysISO(day, 1) : day}T${to}` : "";
    const res = await fetch(`/api/studios/${slug}/operations/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rest, scheduledStart, scheduledEnd, assignedToCollaboratorIds: assignee ? [assignee] : [] }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(tr.problem(body.error || "failed")); return; }
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
        <Field label={tr.jobDay} filled={!!f.day}>
          <StudioDate value={f.day} onChange={(iso) => set({ day: iso })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr.jobStart} type="time" value={f.from} onChange={(v) => set({ from: v })} />
          <Field label={tr.jobEnd} type="time" value={f.to} onChange={(v) => set({ to: v })} />
        </div>
      </div>
      {f.from && f.to && f.to <= f.from && <p className="text-xs text-slate-500 dark:text-slate-400">{tr.jobOvernight}</p>}
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
