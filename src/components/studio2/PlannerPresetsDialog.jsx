"use client";

import { useMemo, useState } from "react";
import { Dialog, input, label, btn, btnGhost } from "@/components/studio2/ui";
import { DEFAULT_CALENDAR } from "@/components/planner/lib/schedule/calendar";

// THE NEW-PLAN PRESETS EDITOR. Part B of the planner integration: these four
// groups are the DEFAULTS a fresh plan is seeded from — not the settings of any
// one plan. Configured once per studio here, persisted through the planner PUT,
// and copied into every plan the studio creates thereafter.
//
// Why fall back to the app defaults when a field is absent: the API returns
// `presets: {}` for a studio that never configured them, and DEFAULT_CALENDAR /
// RESOURCE_POOL are the same seeds the scheduler itself starts a plan from. So
// an unconfigured studio sees the real starting values, not empties, and "Reset
// to app defaults" simply reloads them.

const WEEKDAYS = [
  { value: 0, short: "Sun" },
  { value: 1, short: "Mon" },
  { value: 2, short: "Tue" },
  { value: 3, short: "Wed" },
  { value: 4, short: "Thu" },
  { value: 5, short: "Fri" },
  { value: 6, short: "Sat" },
];

const ZOOM_LEVELS = ["hour", "day", "week", "month", "quarter"];
const COLOR_BY = ["phase", "status", "assignee", "priority"];

function seedCalendar(presetCal) {
  const c = presetCal && typeof presetCal === "object" ? presetCal : {};
  return {
    granularity: c.granularity === "hours" ? "hours" : "days",
    workingWeekdays: Array.isArray(c.workingWeekdays)
      ? [...c.workingWeekdays]
      : [...DEFAULT_CALENDAR.workingWeekdays],
    dayStartHour: Number.isFinite(c.dayStartHour)
      ? c.dayStartHour
      : DEFAULT_CALENDAR.dayStartHour,
    dayEndHour: Number.isFinite(c.dayEndHour)
      ? c.dayEndHour
      : DEFAULT_CALENDAR.dayEndHour,
    lunchHours: Number.isFinite(c.lunchHours)
      ? c.lunchHours
      : DEFAULT_CALENDAR.lunchHours,
    holidays: Array.isArray(c.holidays) ? [...c.holidays] : [],
  };
}

export default function PlannerPresetsDialog({ slug, presets, canEdit, onClose, onSaved }) {
  const [calendar, setCalendar] = useState(() => seedCalendar(presets?.calendar));
  const [zoom, setZoom] = useState(() =>
    ZOOM_LEVELS.includes(presets?.zoom) ? presets.zoom : "week",
  );
  const [colorBy, setColorBy] = useState(() =>
    COLOR_BY.includes(presets?.colorBy) ? presets.colorBy : "phase",
  );
  const [newHoliday, setNewHoliday] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sortedHolidays = useMemo(
    () => [...calendar.holidays].sort(),
    [calendar.holidays],
  );

  function toggleWeekday(day) {
    setCalendar((c) => {
      const has = c.workingWeekdays.includes(day);
      const next = has
        ? c.workingWeekdays.filter((d) => d !== day)
        : [...c.workingWeekdays, day].sort((a, b) => a - b);
      return { ...c, workingWeekdays: next };
    });
  }

  function setCalNumber(field, raw) {
    const n = raw === "" ? 0 : Number(raw);
    setCalendar((c) => ({ ...c, [field]: Number.isFinite(n) ? n : c[field] }));
  }

  function addHoliday() {
    const iso = newHoliday.trim();
    if (!iso || calendar.holidays.includes(iso)) {
      setNewHoliday("");
      return;
    }
    setCalendar((c) => ({ ...c, holidays: [...c.holidays, iso] }));
    setNewHoliday("");
  }

  function removeHoliday(iso) {
    setCalendar((c) => ({ ...c, holidays: c.holidays.filter((h) => h !== iso) }));
  }

  function resetToDefaults() {
    setCalendar(seedCalendar(undefined));
    setZoom("week");
    setColorBy("phase");
    setNewHoliday("");
    setError("");
  }

  async function save() {
    if (saving || !canEdit) return;
    setSaving(true);
    setError("");
    const payload = {
      presets: {
        calendar: {
          granularity: calendar.granularity,
          workingWeekdays: calendar.workingWeekdays,
          dayStartHour: calendar.dayStartHour,
          dayEndHour: calendar.dayEndHour,
          lunchHours: calendar.lunchHours,
          holidays: calendar.holidays,
        },
        zoom,
        colorBy,
      },
    };
    try {
      const res = await fetch(`/api/studios/${slug}/operations/planner`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(
          res.status === 403
            ? "You don't have permission to change these defaults."
            : "The defaults could not be saved. Please try again.",
        );
        setSaving(false);
        return;
      }
      const body = await res.json();
      onSaved?.(body?.presets ?? payload.presets);
      onClose?.();
    } catch {
      setError("The defaults could not be saved. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Dialog
      title="New-plan defaults"
      description="What every new plan in this studio starts from."
      onClose={onClose}
      width="max-w-[860px]"
    >
      <div className="flex flex-col gap-8">
        {/* ---- working week / calendar ---- */}
        <Section
          heading="Working week & calendar"
          hint="The working-time window every schedule is measured against."
        >
          <div>
            <span className={label}>Working weekdays</span>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = calendar.workingWeekdays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleWeekday(d.value)}
                    aria-pressed={on}
                    className={`inline-flex h-9 min-w-[3rem] items-center justify-center rounded-full border px-3 font-display text-sm font-600 transition-colors ${
                      on
                        ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:border-brand-400 dark:text-brand-300"
                        : "border-slate-200 text-[var(--geex-muted)] hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5"
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Day start (hour)">
              <input
                type="number"
                min={0}
                max={24}
                className={input}
                value={calendar.dayStartHour}
                onChange={(e) => setCalNumber("dayStartHour", e.target.value)}
              />
            </Field>
            <Field label="Day end (hour)">
              <input
                type="number"
                min={0}
                max={24}
                className={input}
                value={calendar.dayEndHour}
                onChange={(e) => setCalNumber("dayEndHour", e.target.value)}
              />
            </Field>
            <Field label="Lunch (hours)">
              <input
                type="number"
                min={0}
                max={24}
                step="0.25"
                className={input}
                value={calendar.lunchHours}
                onChange={(e) => setCalNumber("lunchHours", e.target.value)}
              />
            </Field>
            <Field label="Granularity">
              <select
                className={input}
                value={calendar.granularity}
                onChange={(e) =>
                  setCalendar((c) => ({ ...c, granularity: e.target.value }))
                }
              >
                <option value="days">Days</option>
                <option value="hours">Hours</option>
              </select>
            </Field>
          </div>

          <div>
            <span className={label}>Holidays</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                className={`${input} w-auto`}
                value={newHoliday}
                onChange={(e) => setNewHoliday(e.target.value)}
              />
              <button type="button" className={btnGhost} onClick={addHoliday}>
                Add holiday
              </button>
            </div>
            {sortedHolidays.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {sortedHolidays.map((iso) => (
                  <li
                    key={iso}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-[var(--geex-inset)] py-1 ps-3 pe-2 text-xs font-600 text-[var(--geex-muted)] dark:border-white/15"
                  >
                    <span className="font-mono tabular-nums">{iso}</span>
                    <button
                      type="button"
                      aria-label={`Remove holiday ${iso}`}
                      onClick={() => removeHoliday(iso)}
                      className="grid h-5 w-5 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        {/* The resource pool is gone: a plan's people are the studio's own
            collaborators now, assigned per task in the planner, not preset here. */}

        {/* ---- view defaults ---- */}
        <Section
          heading="View defaults"
          hint="How a new plan opens the first time it is viewed."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Default zoom">
              <select
                className={input}
                value={zoom}
                onChange={(e) => setZoom(e.target.value)}
              >
                {ZOOM_LEVELS.map((z) => (
                  <option key={z} value={z}>
                    {z.charAt(0).toUpperCase() + z.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Default colour-by">
              <select
                className={input}
                value={colorBy}
                onChange={(e) => setColorBy(e.target.value)}
              >
                {COLOR_BY.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {error && (
          <p className="text-sm font-600 text-rose-600 dark:text-rose-300" role="alert">
            {error}
          </p>
        )}

        {/* ---- footer ---- */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-4 dark:border-white/10">
          <button type="button" className={btnGhost} onClick={resetToDefaults} disabled={saving}>
            Reset to app defaults
          </button>
          <div className="ms-auto flex items-center gap-2">
            <button type="button" className={btnGhost} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className={btn}
              onClick={save}
              disabled={saving || !canEdit}
              title={!canEdit ? "You don't have permission to change these defaults." : undefined}
            >
              {saving ? "Saving…" : "Save defaults"}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function Section({ heading, hint, children }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h4 className="font-display text-sm font-800 uppercase tracking-wide text-[var(--geex-ink)]">
          {heading}
        </h4>
        {hint && <p className="mt-0.5 text-xs text-[var(--geex-muted)]">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label: fieldLabel, children }) {
  return (
    <label className="block">
      <span className={label}>{fieldLabel}</span>
      {children}
    </label>
  );
}
