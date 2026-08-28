"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import RecordLink from "@/components/studio2/RecordLink";
import { linkToProject, linkIf } from "@/modules/main/studioLinks";
import { microLabel, Dialog, fmtDate, fmtWeekday } from "@/components/studio2/ui";
import OperationsDashboard from "@/components/studio2/OperationsDashboard";
import { useAnalyticsLevel } from "@/components/studio2/analyticsLevel";
import { Field, BARE_CONTROL } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import {
  DAYS, normalizeSchedule, normalizeLegend, visibleWindow, startOfWeekSunday, addDays as addCalendarDays,
  dayKey, barGeometry, dayRoster,
} from "@/modules/operations/operationsCalendar";
import { loadGoogleMaps, defaultMapOptions, googleMapsKey } from "@/lib/googleMaps";
import { StatusPill } from "@/components/studio2/StatusPill";

const panel = "rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-6 dark:border-white/10";
const h2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
const sub = "mt-1 text-sm text-slate-500 dark:text-slate-400";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";

// Permit-state colours now live in the shared StatusPill map (kind "permit").

const fmt = fmtDate;
// A weekday LABEL localises fully — Arabic wants the Arabic day name, not "Sat".
const dayName = (iso) => fmtWeekday(iso);

// OPERATIONS — where the work happens, who is on site when, and the paperwork
// that says they may be there. Discrete work items live in Tasks; this is about
// coverage, which is why a shift can clash with another or with approved leave.
// `view` is the ACTIVE SUB-SECTION key: the parent renders a dashboard and each
// sub-section selects its screen. The remaining tabs are tabs of one screen.
export default function StudioOperations({ slug, view = "operations" }) {
  const tr = operationsDict(useStudioLocale());
  const [data, setData] = useState(null);
  // THE SCHEDULE SCREEN'S THREE PANELS — the rota, Permits and Locations. Permits
  // and Locations moved here off the Operations landing (the landing is now just
  // the dashboard), so all three are peers reached from the bottom bar and flip
  // in place. Which one is showing is remembered in the URL hash, so a refresh or
  // a shared link lands back on it. `window` is shadowed in this component (the
  // week window destructured from data), so the browser global is reached through
  // globalThis.
  const [sub, setSub] = useState("schedule");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const level = useAnalyticsLevel();

  useEffect(() => {
    if (view !== "operations-schedule") return;
    const h = (globalThis.location?.hash || "").replace("#", "");
    if (h === "permits" || h === "locations" || h === "schedule") setSub(h);
  }, [view]);

  const selectSub = useCallback((next) => {
    setSub(next);
    if (globalThis.location) {
      // Schedule is the default, so it clears the hash rather than writing
      // `#schedule`; the other two name themselves. replaceState keeps the Back
      // button pointing out of the planner, not around these three panels.
      const url = next === "schedule"
        ? globalThis.location.pathname + globalThis.location.search
        : `#${next}`;
      globalThis.history.replaceState(null, "", url);
    }
  }, []);

  // The Schedule screen reads its own sub-section door (operations.schedule); the
  // rest of Operations reads the root. One screen, two reads, chosen by view.
  // NOT A LABEL — this is the path the fetch below goes to. It was briefly a
  // dictionary lookup, which would have asked an Arabic studio for an endpoint
  // that does not exist.
  // NOT A LABEL — this is the path the fetch below goes to. It was briefly a
  // dictionary lookup, which would have asked an Arabic studio for an endpoint
  // that does not exist.
  const endpoint = view === "operations-schedule" ? "operations/schedule" : "operations";
  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/${endpoint}`, { cache: "no-store" });
    if (!res.ok) { setError(tr.accessOperationsStudio); return; }
    setData(await res.json());
  }, [slug, endpoint]);
  useEffect(() => { load(); }, [load]);
  // Shifts and permits change from more than one desk — stay current.
  useLiveUpdates(slug, "operations", load);

  // `kind` is the sub-path: "" addresses the section itself (settings).
  const send = useCallback(async (kind, method, payload) => {
    setError(""); setBusy(true);
    const url = kind ? `/api/studios/${slug}/operations/${kind}` : `/api/studios/${slug}/operations`;
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(message(out, tr)); return false; }
    await load();
    return true;
  }, [slug, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">{tr.loadingOperations}</p>;

  const {
    canManage: canManageParent, canManageTracking, canManageSettings, canManagePlaces,
    locations, permits, shifts, projects, people, window, positions, settings, summary, vocabulary, nav, me,
  } = data;
  // MANAGE IS ASKED OF THE SCREEN BEING SHOWN. `view` is the section key, and
  // the map is keyed the same way, so a sub-section grant answers for its own
  // screen and the parent's answer no longer stands in for all of them.
  const canManage = data.manage?.[view] ?? canManageParent;

  const banner = error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>;

  // THE PARENT SCREEN — locations, permits and shifts. Not a summary, but a
  // screen all the same, and until now nothing decided whether it could be
  // opened: it rode in on whichever sub-section grant got somebody into the
  // module. It answers to operations.dashboard.view now, like every other
  // module's own screen.
  if (view === "operations" && data.canViewDashboard === false) {
    return (
      <div className="space-y-6">
        {banner}
        <div className={`${panel} text-center`}>
          <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">This screen isn&apos;t yours to see</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Locations, permits and shifts are kept behind a right of their own here. Tracking and Settings are unaffected.
          </p>
        </div>
      </div>
    );
  }

  if (view === "operations-tracking") {
    return (
      <div className="space-y-6">
        {banner}
        <Tracking slug={slug} positions={positions} meId={me.collaboratorId} canManageTracking={canManageTracking}
          onClear={(collaboratorId) => send("tracking", "DELETE", { collaboratorId })} onRefresh={load} />
      </div>
    );
  }

  if (view === "operations-settings") {
    return (
      <div className="space-y-6">
        {banner}
        <OperationsSettings settings={settings} canManage={canManageSettings} busy={busy}
          onSave={(patch) => send("", "PATCH", patch)} />
      </div>
    );
  }

  // THE SCHEDULE SCREEN — the rota, and now Permits and Locations too, which moved
  // here off the Operations landing. All three are peers, reached from the bottom
  // bar and flipping in place. The rota answers to the schedule grant; Permits and
  // Locations to whether the caller may manage the operations root, which their
  // write routes enforce — `canManagePlaces`, computed on the server so the button
  // and the route can never disagree.
  if (view === "operations-schedule") {
    return (
      <div className="space-y-6 pb-20">
        {banner}
        {sub === "schedule" ? (
          <Schedule shifts={shifts} people={people} locations={locations} window={window}
            settings={settings} canManage={canManage} busy={busy} send={send} />
        ) : sub === "permits" ? (
          <Permits rows={permits} locations={locations} people={people} projects={projects} types={vocabulary.permitTypes}
            windowDays={vocabulary.expiryWindowDays} slug={slug} nav={nav} canManage={canManagePlaces} busy={busy} send={send} />
        ) : (
          <Locations rows={locations} kinds={vocabulary.locationKinds} canManage={canManagePlaces} busy={busy} send={send} />
        )}
        <OperationsBottomBar active={sub} onTab={selectSub} />
      </div>
    );
  }

  // THE OPERATIONS LANDING — now just the dashboard. Locations, permits and the
  // rota live under Schedule; the summary of them stays here the way every other
  // department's dashboard is its landing.
  return (
    <div className="space-y-6">
      {banner}
      <OperationsDashboard locations={locations} permits={permits} shifts={shifts}
        window={window} summary={summary} windowDays={vocabulary.expiryWindowDays} level={level} />
    </div>
  );
}

// THE OPERATIONS BOTTOM BAR — a strip along the bottom of the working area (never
// over the sidebar), the way you move between Schedule, Permits and Locations. All
// three now live on the one Schedule screen, so all three flip in place; none is a
// link any more.
function OperationsBottomBar({ active, onTab }) {
  const items = [["schedule", "Schedule"], ["permits", "Permits"], ["locations", "Locations"]];
  return (
    <div className="pointer-events-none fixed bottom-0 end-0 start-0 z-30 lg:start-72">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="pointer-events-auto flex items-center gap-2 rounded-t-geex border border-b-0 border-slate-200 bg-white/95 px-3 py-2 shadow-geex backdrop-blur dark:border-white/10 dark:bg-[#20202c]/95">
          {items.map(([key, label]) => {
            const on = key === active;
            const cls = `rounded-full px-4 py-1.5 font-display text-sm font-600 transition-colors ${
              on ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`;
            if (on) return <span key={key} className={cls} aria-current="page">{label}</span>;
            return <button key={key} type="button" className={cls} onClick={() => onTab(key)}>{label}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

// THE DICTIONARY COMES IN AS AN ARGUMENT — module scope, see StudioFinance.
function message(out, tr) {
  if (out.error === "read-only") return tr.mReadOnly;
  if (out.error === "duplicate") return tr.mDuplicate;
  if (out.error === "clash") return tr.mClash(out.startTime, out.endTime);
  if (out.error === "on-leave") return tr.mOnLeave(String(out.type || "").toLowerCase(), fmt(out.from), fmt(out.to));
  if (out.error === "in-use") {
    const bits = [];
    if (out.permits) bits.push(tr.countPermits(out.permits));
    if (out.shifts) bits.push(tr.countShifts(out.shifts));
    return tr.mInUse(tr.joinAnd(bits));
  }
  if (out.error === "range") return tr.mRange;
  if (out.error === "time") return tr.mTime;
  if (out.error === "person") return tr.mPerson;
  return tr.mDidntSave;
}

// ---- schedule --------------------------------------------------------------
// Two readings of the same rota: the CALENDAR, which answers "who is where at
// 10am on Tuesday", and the LIST, which is easier to scan and to remove from.
function Schedule({ shifts, people, locations, window, settings, canManage, busy, send }) {
  const tr = operationsDict(useStudioLocale());
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState("calendar");
  // Which week the calendar is showing, as an offset from the current one — so
  // "next week" survives a live refetch instead of snapping back to today.
  const [weekOffset, setWeekOffset] = useState(0);

  // Group by day so the rota reads as a week, not a list. Stepped in UTC, the
  // same zone the server builds the window in — walking these in local time
  // drops or repeats a day for any viewer who isn't on UTC.
  const days = useMemo(() => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(`${window.from}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      const iso = d.toISOString().slice(0, 10);
      out.push({ iso, shifts: shifts.filter((s) => s.date === iso) });
    }
    return out;
  }, [shifts, window.from]);

  const later = shifts.filter((s) => s.date > window.to);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-slate-200 p-0.5 dark:border-white/15">
          {[["calendar", "Calendar"], ["list", "List"]].map(([k, text]) => (
            <button key={k} type="button" onClick={() => setMode(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-600 transition-colors ${mode === k ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>
              {text}
            </button>
          ))}
        </div>
        {canManage && (
          <button className={`${btn} ms-auto`} onClick={() => setAdding(true)} disabled={people.length === 0}>{tr.scheduleShift}</button>
        )}
      </div>

      {adding && (
        <Dialog title={tr.scheduleShift} description={tr.whoWorkingWhenWhere} onClose={() => setAdding(false)}>
          <ShiftForm people={people} locations={locations} busy={busy}
            onCancel={() => setAdding(false)}
            onSave={async (v) => { if (await send("schedule/shifts", "POST", v)) setAdding(false); }} />
        </Dialog>
      )}

      {mode === "calendar" ? (
        <WorkCalendar shifts={shifts} settings={settings} weekOffset={weekOffset} onWeek={setWeekOffset} />
      ) : (
      <section className={panel}>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {fmt(window.from)} – {fmt(window.to)}
        </p>
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {days.map((d) => (
            <li key={d.iso} className="flex flex-wrap gap-4 py-3 first:pt-0 last:pb-0">
              <div className="w-24 shrink-0">
                <p className="font-600 text-slate-900 dark:text-white">{dayName(d.iso)}</p>
                <p className="text-xs text-slate-400">{fmt(d.iso)}</p>
              </div>
              <div className="min-w-0 flex-1">
                {d.shifts.length === 0 ? <p className="text-sm text-slate-400">{tr.noOneScheduled}</p> : (
                  <ul className="space-y-1.5">
                    {d.shifts.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          <span className="font-mono text-xs text-slate-400">{s.startTime}–{s.endTime}</span>
                          <span className="ms-2 font-600 text-slate-900 dark:text-white">{s.alias}</span>
                          {s.locationName && <span className="ms-2">· {s.locationName}</span>}
                          {s.role && <span className="ms-2 text-slate-400">· {s.role}</span>}
                          <span className="ms-2 text-xs text-slate-400">{s.hours}h</span>
                        </span>
                        {canManage && (
                          <button className="text-xs text-rose-600 hover:underline dark:text-rose-400"
                            disabled={busy} onClick={() => send("schedule/shifts", "DELETE", { id: s.id })}>remove</button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
        {later.length > 0 && (
          <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500 dark:border-white/5 dark:text-slate-400">
            {later.length} more {later.length === 1 ? "shift" : "shifts"} scheduled beyond this week.
          </p>
        )}
      </section>
      )}
    </>
  );
}

// The week grid. Each shift is a bar placed by its start and end against the
// hour window the studio configured, so the picture and the times can never
// disagree — the geometry IS the times.
function WorkCalendar({ shifts, settings, weekOffset, onWeek }) {
  const tr = operationsDict(useStudioLocale());
  const [copied, setCopied] = useState("");
  const schedule = useMemo(() => normalizeSchedule(settings?.workSchedule), [settings]);
  const legend = useMemo(() => normalizeLegend(settings?.legend), [settings]);
  const [windowFrom, windowTo] = useMemo(
    () => visibleWindow(schedule, settings?.showWorkingHoursOnly),
    [schedule, settings],
  );

  // The week being shown, walked in LOCAL time — this grid is a picture of
  // somebody's own week, unlike the server's rota window which is calendar days.
  const weekStart = useMemo(
    () => addCalendarDays(startOfWeekSunday(new Date()), weekOffset * 7),
    [weekOffset],
  );
  // Seven ROWS now — one per day — each carrying that day's shifts.
  const rows = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = addCalendarDays(weekStart, i);
    const iso = dayKey(date);
    return {
      iso, date,
      // Full name for the copied roster text; short (Sun/Mon…) for the column.
      dayName: DAYS[date.getDay()],
      dayShort: fmtWeekday(iso),
      working: schedule[DAYS[date.getDay()]]?.on,
      today: iso === dayKey(new Date()),
      shifts: shifts.filter((s) => s.date === iso),
    };
  }), [weekStart, schedule, shifts]);

  const hours = [];
  for (let h = Math.floor(windowFrom); h < Math.ceil(windowTo); h++) hours.push(h);
  const colourOf = (s) => (legend.find((t) => t.id === s.kind) || legend[0]).color;

  async function copyRoster(row) {
    const text = dayRoster(`${row.dayName} ${fmt(row.iso)}`, row.shifts, settings?.rosterPrefix || "");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(row.iso);
      setTimeout(() => setCopied(""), 2000);
    } catch { /* clipboard blocked — the roster is still readable on screen */ }
  }

  return (
    <section className={panel}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" className={btnGhost} onClick={() => onWeek(weekOffset - 1)}>←</button>
          <button type="button" className={btnGhost} onClick={() => onWeek(0)}>{tr.week}</button>
          <button type="button" className={btnGhost} onClick={() => onWeek(weekOffset + 1)}>→</button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {fmt(dayKey(weekStart))} – {fmt(dayKey(addCalendarDays(weekStart, 6)))}
        </p>
        <div className="ms-auto flex flex-wrap items-center gap-3">
          {legend.map((t) => (
            <span key={t.id} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: t.color }} />
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* TRANSPOSED: days down the side, hours across the top. A week reads as
          seven rows the way a rota is written, and the hour axis gets the wide
          dimension — which is the one that needs the room, since a shift is a
          span of hours rather than a span of days. */}
      <div className="overflow-x-auto">
        <div className="min-w-[780px]">
          {/* Hour ruler. The first column matches the day labels beneath it so
              the two grids line up. */}
          <div className="grid grid-cols-[7rem_minmax(0,1fr)]">
            <div />
            <div className="relative h-6">
              {hours.map((h, i) => (
                <span
                  key={h}
                  className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-400"
                  style={{ left: `${(i / hours.length) * 100}%` }}
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
          </div>

          {rows.map((c) => (
            <div key={c.iso} className="grid grid-cols-[7rem_minmax(0,1fr)] border-t border-slate-100 dark:border-white/5">
              <div className={`flex items-center gap-2 py-2 pe-3 ${c.today ? "text-brand-700 dark:text-brand-300" : "text-slate-600 dark:text-slate-300"}`}>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-700 uppercase tracking-wide">{c.dayShort}</span>
                  <span className="block text-[11px] text-slate-400">{fmt(c.iso).slice(0, 5)}</span>
                </span>
                {c.shifts.length > 0 && (
                  <button type="button" onClick={() => copyRoster(c)}
                    className="ms-auto shrink-0 text-[10px] font-600 text-brand-700 hover:underline dark:text-brand-300">
                    {copied === c.iso ? "copied" : "copy"}
                  </button>
                )}
              </div>

              <div className={`relative h-14 ${c.working ? "" : "bg-slate-50 dark:bg-white/[0.03]"}`}>
                {/* One divider per hour, so the bars can be read against the ruler. */}
                {hours.map((h, i) => (
                  <div key={h} className="absolute inset-y-0 border-s border-slate-100 dark:border-white/5"
                    style={{ left: `${(i / hours.length) * 100}%` }} />
                ))}
                {c.shifts.map((s) => {
                  const geo = barGeometry(s.startTime, s.endTime, [windowFrom, windowTo]);
                  // A shift entirely outside the drawn window has nowhere to go.
                  // It is named under the grid rather than silently dropped.
                  if (!geo) return null;
                  return (
                    <div key={s.id} title={`${s.startTime}–${s.endTime} · ${s.alias}${s.locationName ? ` · ${s.locationName}` : ""}`}
                      className="absolute inset-y-1 overflow-hidden rounded-md px-1.5 py-0.5 text-[10px] leading-tight text-slate-800"
                      style={{ left: `${geo.top}%`, width: `${geo.height}%`, backgroundColor: colourOf(s) }}>
                      <span className="block truncate font-700">{s.alias}</span>
                      <span className="block truncate">{s.startTime}–{s.endTime}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(() => {
        const hidden = rows.flatMap((c) => c.shifts.filter((s) => !barGeometry(s.startTime, s.endTime, [windowFrom, windowTo])));
        if (hidden.length === 0) return null;
        return (
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-amber-700 dark:border-white/5 dark:text-amber-300">
            {hidden.length} shift{hidden.length === 1 ? "" : "s"} fall outside the hours shown
            ({hidden.map((s) => `${s.alias} ${s.startTime}–${s.endTime}`).join(", ")}).
            Turn off &quot;working hours only&quot; in Settings to see them.
          </p>
        );
      })()}
    </section>
  );
}

function ShiftForm({ people, locations, busy, onCancel, onSave }) {
  const tr = operationsDict(useStudioLocale());
  const [form, setForm] = useState({
    collaboratorId: people[0]?.id || "", date: "", startTime: "08:00", endTime: "17:00",
    locationId: "", role: "", notes: "",
  });

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{tr.scheduleShift}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={tr.who} as="select" required value={form.collaboratorId}
          onChange={(v) => setForm((f) => ({ ...f, collaboratorId: v }))}
          options={people.map((p) => ({ value: p.id, label: p.alias }))} />
        <Field label={tr.date} required filled={!!form.date}>
          <StudioDate value={form.date} onChange={(iso) => setForm((f) => ({ ...f, date: iso }))} />
        </Field>
        <Field label={tr.location} as="select" value={form.locationId}
          onChange={(v) => setForm((f) => ({ ...f, locationId: v }))}
          options={locations.map((l) => ({ value: l.id, label: l.name }))} />
        <Field label={tr.start} type="time" value={form.startTime}
          onChange={(v) => setForm((f) => ({ ...f, startTime: v }))} />
        <Field label={tr.end} type="time" value={form.endTime}
          onChange={(v) => setForm((f) => ({ ...f, endTime: v }))} />
        <Field label={tr.role} value={form.role}
          onChange={(v) => setForm((f) => ({ ...f, role: v }))} hint={tr.roleShift} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !form.date || !form.collaboratorId} onClick={() => onSave(form)}>
          {busy ? tr.saving : tr.schedule}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </section>
  );
}

// ---- permits ---------------------------------------------------------------
function Permits({ rows, locations, people, projects, types, windowDays, slug, nav, canManage, busy, send }) {
  const tr = operationsDict(useStudioLocale());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const attention = rows.filter((p) => p.state === "Expiring" || p.state === "Expired");

  return (
    <>
      {canManage && <button className={btn} onClick={() => setAdding(true)}>{tr.addPermit}</button>}
      {(adding || editing) && (
        <Dialog
          title={editing ? tr.editPermit : tr.newPermit}
          description={tr.whatPermittedWhereUntil}
          onClose={() => { setAdding(false); setEditing(null); }}
        >
          <PermitForm permit={editing} locations={locations} people={people} projects={projects} types={types} busy={busy}
            onCancel={() => { setAdding(false); setEditing(null); }}
            onSave={async (v) => { if (await send("permits", editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v)) { setAdding(false); setEditing(null); } }} />
        </Dialog>
      )}

      {attention.length > 0 && (
        <div className="rounded-geex border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="font-display text-sm font-700 text-amber-800 dark:text-amber-200">
            Needs renewing — expired, or within {windowDays} days
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
            {attention.map((p) => (
              <li key={p.id}>
                {p.reference} · {p.title} — {p.state === "Expired"
                  ? `expired ${fmt(p.validTo)}`
                  : `expires ${fmt(p.validTo)} (${p.daysLeft} days)`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length === 0 ? <Empty title={tr.noPermitsYet} body={tr.permitsRecordWhatStudio} /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{p.reference}</span>
                    <span className="font-600 text-slate-900 dark:text-white">{p.title}</span>
                    <StatusPill kind="permit" status={p.state} />
                    {p.projectNumber && (
                      <RecordLink href={linkIf(nav?.projects, linkToProject(slug, p.projectId))} title={tr.openProject}>{p.projectNumber}</RecordLink>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {[p.type, p.locationName, p.number && `no. ${p.number}`, p.issuer].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {p.validFrom || p.validTo ? `${fmt(p.validFrom)} – ${fmt(p.validTo)}` : tr.noDatesSet}
                    {p.holderAliases.length > 0 && ` · ${p.holderAliases.join(", ")}`}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => setEditing(p)}>{tr.edit}</button>
                    <button className={btnDanger} disabled={busy} onClick={() => send("permits", "DELETE", { id: p.id })}>{tr.delete}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function PermitForm({ permit, locations, people, projects, types, busy, onCancel, onSave }) {
  const tr = operationsDict(useStudioLocale());
  const [form, setForm] = useState({
    title: permit?.title || "", type: permit?.type || types[0], number: permit?.number || "",
    issuer: permit?.issuer || "", locationId: permit?.locationId || "", projectId: permit?.projectId || "",
    validFrom: permit?.validFrom || "", validTo: permit?.validTo || "", notes: permit?.notes || "",
  });
  const [holders, setHolders] = useState(permit?.holderCollaboratorIds || []);

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{permit ? tr.editPermit : tr.newPermit}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={tr.title} required value={form.title}
          onChange={(v) => setForm((f) => ({ ...f, title: v }))} className="sm:col-span-2" />
        <Field label={tr.type} as="select" required value={form.type}
          onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={types} />
        <Field label={tr.permitNumber} value={form.number}
          onChange={(v) => setForm((f) => ({ ...f, number: v }))} />
        <Field label={tr.issued} value={form.issuer}
          onChange={(v) => setForm((f) => ({ ...f, issuer: v }))} />
        <Field label={tr.location} as="select" value={form.locationId}
          onChange={(v) => setForm((f) => ({ ...f, locationId: v }))}
          options={locations.map((l) => ({ value: l.id, label: l.name }))} />
        <Field label={tr.project} as="select" value={form.projectId}
          onChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
          options={projects.map((p) => ({ value: p.id, label: p.number }))} />
        <Field label={tr.valid} filled={!!form.validFrom}>
          <StudioDate value={form.validFrom} onChange={(iso) => setForm((f) => ({ ...f, validFrom: iso }))} />
        </Field>
        <Field label={tr.valid2} filled={!!form.validTo}>
          <StudioDate value={form.validTo} onChange={(iso) => setForm((f) => ({ ...f, validTo: iso }))} />
        </Field>
      </div>

      {people.length > 0 && (
        <div className="mt-5">
          <label className={label}>{tr.covers}</label>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => {
              const on = holders.includes(p.id);
              return (
                <button key={p.id} type="button"
                  onClick={() => setHolders((h) => (on ? h.filter((x) => x !== p.id) : [...h, p.id]))}
                  className={`rounded-full px-3 py-1.5 text-xs font-600 transition-colors ${on
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}>
                  {p.alias}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !form.title.trim()}
          onClick={() => onSave({ ...form, holderCollaboratorIds: holders })}>
          {busy ? tr.saving : tr.save}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </section>
  );
}

// ---- locations -------------------------------------------------------------
function Locations({ rows, kinds, canManage, busy, send }) {
  const tr = operationsDict(useStudioLocale());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  return (
    <>
      {canManage && <button className={btn} onClick={() => setAdding(true)}>{tr.addLocation}</button>}
      {(adding || editing) && (
        <Dialog
          title={editing ? tr.editLocation : tr.newLocation}
          description={tr.placeWorkHappensSite}
          onClose={() => { setAdding(false); setEditing(null); }}
        >
        <SimpleForm title={editing ? tr.editLocation : tr.newLocation} busy={busy}
          fields={[
            { key: "name", label: tr.name, required: true, value: editing?.name || "" },
            { key: "kind", label: tr.kind, value: editing?.kind || kinds[0], options: kinds.map((k) => ({ value: k, text: k })) },
            { key: "city", label: tr.city, value: editing?.city || "" },
            { key: "address", label: tr.address, value: editing?.address || "" },
            { key: "mapUrl", label: tr.mapLink, value: editing?.mapUrl || "" },
            { key: "notes", label: tr.notes, area: true, value: editing?.notes || "" },
          ]}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (v) => { if (await send("locations", editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v)) { setAdding(false); setEditing(null); } }} />
        </Dialog>
      )}

      {rows.length === 0 ? <Empty title={tr.noLocationsYet} body={tr.locationsPlacesWorkHappens} /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-600 text-slate-900 dark:text-white">{l.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{l.kind}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {[l.address, l.city].filter(Boolean).join(", ") || "No address"}
                    {l.mapUrl && (
                      <a href={l.mapUrl} target="_blank" rel="noopener noreferrer"
                        className="ms-2 text-brand-700 hover:underline dark:text-brand-300">map</a>
                    )}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => setEditing(l)}>{tr.edit}</button>
                    <button className={btnDanger} disabled={busy} onClick={() => send("locations", "DELETE", { id: l.id })}>{tr.delete}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// ---- shared bits -----------------------------------------------------------
function SimpleForm({ title, fields, busy, onCancel, onSave }) {
  const tr = operationsDict(useStudioLocale());
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""])));
  const ready = fields.filter((f) => f.required).every((f) => String(values[f.key] ?? "").trim());

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          f.options ? (
            <Field key={f.key} label={f.label} as="select" required={f.required}
              value={values[f.key]}
              onChange={(v) => setValues((vv) => ({ ...vv, [f.key]: v }))}
              options={f.options.map((o) => ({ value: o.value, label: o.text }))} />
          ) : f.area ? (
            <Field key={f.key} label={f.label} as="textarea" required={f.required}
              value={values[f.key]}
              onChange={(v) => setValues((vv) => ({ ...vv, [f.key]: v }))}
              className="sm:col-span-2" />
          ) : (
            <Field key={f.key} label={f.label} required={f.required}
              value={values[f.key]}
              onChange={(v) => setValues((vv) => ({ ...vv, [f.key]: v }))} />
          )
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave(values)}>{busy ? tr.saving : tr.save}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </section>
  );
}

function Empty({ title, body }) {
  return (
    <div className={`${panel} text-center`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}


// ---- tracking --------------------------------------------------------------
// WHERE PEOPLE ARE RIGHT NOW, and deliberately nothing more. Sharing is opt-in
// per session and stops the moment the page closes; the server keeps one row
// per person and overwrites it, so there is no trail of where anybody has been.
const STALE_MS = 5 * 60 * 1000;
const ageText = (iso) => {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
};

function Tracking({ slug, positions, meId, canManageTracking, onClear, onRefresh }) {
  const tr = operationsDict(useStudioLocale());
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState({ text: "Not sharing", tone: "idle" });
  const [fix, setFix] = useState(null);
  const [mapError, setMapError] = useState("");
  const mapRef = useRef(null);
  const gRef = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef({});
  const watchId = useRef(null);
  const lastSent = useRef(0);
  const mine = positions.find((p) => p.collaboratorId === meId);

  const tone = { live: "text-emerald-600 dark:text-emerald-400", warn: "text-amber-600 dark:text-amber-400", stop: "text-rose-600 dark:text-rose-400", idle: "text-slate-500 dark:text-slate-400" };

  // Build the map once, if there is a key to build it with.
  useEffect(() => {
    if (!googleMapsKey()) return undefined;
    let alive = true;
    loadGoogleMaps()
      .then((g) => {
        if (!alive || !mapRef.current) return;
        gRef.current = g;
        mapObj.current = new g.maps.Map(mapRef.current, defaultMapOptions());
      })
      .catch((e) => { if (alive) setMapError(e.message); });
    return () => { alive = false; };
  }, []);

  // Redraw whenever the reported positions change.
  useEffect(() => {
    const g = gRef.current, map = mapObj.current;
    if (!g || !map) return;
    const seen = new Set();
    const bounds = new g.maps.LatLngBounds();
    for (const p of positions) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      seen.add(p.collaboratorId);
      const stale = Date.now() - new Date(p.at).getTime() > STALE_MS;
      const at = { lat: p.lat, lng: p.lng };
      bounds.extend(at);
      let m = markers.current[p.collaboratorId];
      if (!m) {
        m = new g.maps.Marker({ map, position: at });
        markers.current[p.collaboratorId] = m;
      }
      m.setPosition(at);
      m.setTitle(`${p.alias} — ${stale ? `last seen ${ageText(p.at)}` : "live"}`);
      m.setLabel({ text: p.alias, fontSize: "11px", fontWeight: "700", color: stale ? "#6b7280" : "#065f46" });
      m.setIcon({ path: g.maps.SymbolPath.CIRCLE, scale: 8, fillColor: stale ? "#9ca3af" : "#059669", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 });
    }
    // Drop markers for anyone who has come off the map.
    for (const id of Object.keys(markers.current)) {
      if (!seen.has(id)) { markers.current[id].setMap(null); delete markers.current[id]; }
    }
    if (!bounds.isEmpty()) map.fitBounds(bounds, 80);
  }, [positions]);

  const send = useCallback(async (lat, lng, accuracy) => {
    // At most one write every 10 seconds — a phone reports far more often than
    // a dispatcher needs, and every fix is a write.
    if (Date.now() - lastSent.current < 10000) return;
    lastSent.current = Date.now();
    try {
      await fetch(`/api/studios/${slug}/operations/tracking`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, accuracy }), keepalive: true,
      });
      onRefresh();
    } catch { /* the next fix tries again */ }
  }, [slug, onRefresh]);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
  }, []);

  const beginWatch = useCallback(() => {
    if (!("geolocation" in navigator)) { setStatus({ text: "This browser can't report a location.", tone: "stop" }); return; }
    if (!window.isSecureContext) { setStatus({ text: "Location needs a secure connection.", tone: "stop" }); return; }
    setStatus({ text: "Acquiring signal…", tone: "warn" });
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setFix({ lat: latitude, lng: longitude, accuracy, at: pos.timestamp });
        setStatus({ text: "Sharing", tone: "live" });
        send(latitude, longitude, accuracy);
      },
      (err) => setStatus({
        text: { 1: "Permission denied — allow location for this site.", 2: "No fix available.", 3: "Timed out waiting for a fix." }[err.code] || "Location error",
        tone: "stop",
      }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  }, [send]);

  // Sharing pauses with the tab and stops entirely on unmount — leaving the
  // page IS how you stop being tracked, so it must actually stop.
  useEffect(() => {
    if (!sharing) return undefined;
    const onVisibility = () => {
      if (document.hidden) { stopWatch(); setStatus({ text: "Paused — page not in focus", tone: "warn" }); }
      else if (watchId.current === null) beginWatch();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [sharing, beginWatch, stopWatch]);
  useEffect(() => stopWatch, [stopWatch]);

  function start() { setSharing(true); beginWatch(); }
  function stop() {
    setSharing(false); stopWatch(); setFix(null);
    setStatus({ text: "Not sharing", tone: "idle" });
    onClear(meId);
  }

  return (
    <>
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={h2}>{tr.tracking}</h2>
            <p className={sub}>
              Where the team is right now. Sharing is per session — it stops when you close this page, and only your
              latest position is kept, never a history of where you have been.
            </p>
          </div>
          <span className={`text-sm font-600 ${tone[status.tone]}`}>{status.text}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {sharing
            ? <button className={btnGhost} onClick={stop}>{tr.stopSharing}</button>
            : <button className={btn} onClick={start}>{tr.shareMyLocation}</button>}
          {mine && !sharing && (
            <button className={btnGhost} onClick={() => onClear(meId)}>{tr.removeMyLastPosition}</button>
          )}
          {fix && (
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)} · ±{Math.round(fix.accuracy)} m
            </span>
          )}
        </div>
      </section>

      {!googleMapsKey() ? (
        <Empty title={tr.noMapConfigured} body={tr.listBelowStillWorks} />
      ) : (
        <section className={`${panel} p-0`}>
          <div ref={mapRef} className="h-[420px] w-full overflow-hidden rounded-geex" />
          {mapError && <p className="p-4 text-sm text-rose-600 dark:text-rose-400">{mapError}</p>}
        </section>
      )}

      <section className={panel}>
        <p className={microLabel}>{tr.reportedPositions}</p>
        {positions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">{tr.nobodySharingRightNow}</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
            {positions.map((p) => {
              const stale = Date.now() - new Date(p.at).getTime() > STALE_MS;
              return (
                <li key={p.collaboratorId} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stale ? "bg-slate-400" : "bg-emerald-500"}`} />
                    <span className="truncate font-600 text-slate-900 dark:text-white">{p.alias}</span>
                    {p.collaboratorId === meId && <span className="text-xs text-slate-400">(you)</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={`text-xs font-600 ${stale ? "text-slate-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {stale ? `last seen ${ageText(p.at)}` : `live · ${ageText(p.at)}`}
                    </span>
                    {(canManageTracking || p.collaboratorId === meId) && (
                      <button className="text-xs font-600 text-rose-600 hover:underline dark:text-rose-400"
                        onClick={() => onClear(p.collaboratorId)}>remove</button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

// ---- settings --------------------------------------------------------------
function OperationsSettings({ settings, canManage, busy, onSave }) {
  const tr = operationsDict(useStudioLocale());
  // Read-only here: the week belongs to Studio settings now. It is still
  // needed to work out what the grid's hour window would be.
  const schedule = normalizeSchedule(settings?.workSchedule);
  const [legend, setLegend] = useState(() => normalizeLegend(settings?.legend));
  const [workingOnly, setWorkingOnly] = useState(!!settings?.showWorkingHoursOnly);
  const [rosterPrefix, setRosterPrefix] = useState(settings?.rosterPrefix || "");
  const [saved, setSaved] = useState(false);

  const dirty = () => setSaved(false);
  const setLegendItem = (i, patch) => { setLegend((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x))); dirty(); };
  const [from, to] = visibleWindow(schedule, workingOnly);

  async function save() {
    const ok = await onSave({ legend, showWorkingHoursOnly: workingOnly, rosterPrefix });
    setSaved(!!ok);
  }

  return (
    <div className="space-y-6">
      {/* The working week is the STUDIO's, set in Studio settings, so it is
          described once rather than kept here as a second answer. */}
      <section className={panel}>
        <h2 className={h2}>{tr.workingHours}</h2>
        <p className={sub}>
          Taken from Studio settings — the days and hours the studio works are one
          answer for the whole product, not a per-section one. The calendar shades
          days that are off and draws against those hours.
        </p>
        <label className={`mt-4 flex w-fit items-center gap-2.5 text-sm ${canManage ? "cursor-pointer" : ""} text-slate-700 dark:text-slate-200`}>
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={workingOnly} disabled={!canManage}
            onChange={(e) => { setWorkingOnly(e.target.checked); dirty(); }} />
          Show only working hours on the calendar
        </label>
        <p className="mt-1 text-xs text-slate-400">
          The grid would run {String(from).padStart(2, "0")}:00–{String(to).padStart(2, "0")}:00.
          Anything scheduled outside that is listed under the calendar rather than drawn.
        </p>
      </section>

      <section className={panel}>
        <h2 className={h2}>{tr.calendarLegend}</h2>
        <p className={sub}>
          The colours the calendar draws shifts in. These kinds are fixed — recolour or rename them, but they cannot be
          added to or removed, because a shift whose kind has no entry would have no colour to be drawn in.
        </p>
        <div className="mt-4 space-y-2">
          {legend.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2">
              <input type="color" value={t.color} disabled={!canManage} onChange={(e) => setLegendItem(i, { color: e.target.value })}
                className="h-9 w-12 shrink-0 cursor-pointer rounded border border-slate-200 disabled:cursor-not-allowed dark:border-white/15" />
              <input className={input} value={t.label} disabled={!canManage} onChange={(e) => setLegendItem(i, { label: e.target.value })} />
            </div>
          ))}
        </div>
      </section>

      <section className={panel}>
        <h2 className={h2}>{tr.dayRosterPrefix}</h2>
        <p className={sub}>{tr.optionalTextAddedAbove}</p>
        <textarea rows={3} className={`${input} mt-4`} value={rosterPrefix} disabled={!canManage}
          onChange={(e) => { setRosterPrefix(e.target.value); dirty(); }} />
      </section>

      {canManage ? (
        <div className="flex items-center gap-3">
          <button className={btn} disabled={busy} onClick={save}>{busy ? tr.saving : tr.saveSettings}</button>
          {saved && <span className="text-sm text-emerald-700 dark:text-emerald-400">{tr.saved}</span>}
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">{tr.viewOnlyAccessOperations}</p>
      )}
    </div>
  );
}
