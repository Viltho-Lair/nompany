"use client";

import { useMemo, useState } from "react";
import { Dialog, input, label, btn, btnGhost } from "@/components/studio2/ui";
import { DEFAULT_CALENDAR } from "@/components/planner/lib/schedule/calendar";
import { RESOURCE_POOL } from "@/components/planner/lib/templates";

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

// Two capital letters from the name — first letter of the first two words, or
// the first two letters of a single-word name. Kept in sync on every name edit
// so the studio never hand-maintains an avatar chip.
function deriveInitials(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function mintResourceId() {
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `r-${rand}`;
}

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

function seedResources(presetResources) {
  const source = Array.isArray(presetResources) && presetResources.length
    ? presetResources
    : RESOURCE_POOL;
  return source.map((r) => ({
    id: r.id || mintResourceId(),
    name: r.name || "",
    initials: r.initials || deriveInitials(r.name || ""),
    role: r.role || "",
    color: r.color || "#4573D2",
    rate: Number.isFinite(r.rate) ? r.rate : 0,
    capacity: Number.isFinite(r.capacity) ? r.capacity : 100,
  }));
}

export default function PlannerPresetsDialog({ slug, presets, canEdit, onClose, onSaved }) {
  const [calendar, setCalendar] = useState(() => seedCalendar(presets?.calendar));
  const [resources, setResources] = useState(() => seedResources(presets?.resources));
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

  function addResource() {
    setResources((rs) => [
      ...rs,
      {
        id: mintResourceId(),
        name: "",
        initials: "?",
        role: "",
        color: "#4573D2",
        rate: 0,
        capacity: 100,
      },
    ]);
  }

  function updateResource(id, patch) {
    setResources((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        // initials are derived, never stored independently — re-mint on rename
        if (Object.prototype.hasOwnProperty.call(patch, "name")) {
          next.initials = deriveInitials(next.name);
        }
        return next;
      }),
    );
  }

  function removeResource(id) {
    setResources((rs) => rs.filter((r) => r.id !== id));
  }

  function resetToDefaults() {
    setCalendar(seedCalendar(undefined));
    setResources(seedResources(undefined));
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
        resources: resources.map((r) => ({
          id: r.id,
          name: r.name,
          initials: r.initials,
          role: r.role,
          color: r.color,
          rate: Number(r.rate) || 0,
          capacity: Number(r.capacity) || 0,
        })),
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

        {/* ---- resource pool ---- */}
        <Section
          heading="Resource pool"
          hint="The default team a new plan can assign work to."
        >
          <ul className="flex flex-col gap-2">
            {resources.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] items-end gap-2 rounded-geex border border-slate-200/70 bg-[var(--geex-inset)] p-2.5 dark:border-white/10"
              >
                <div>
                  <span className={label}>Colour</span>
                  <input
                    type="color"
                    aria-label={`Colour for ${r.name || "resource"}`}
                    className="h-9 w-10 cursor-pointer rounded-xl border border-slate-200 bg-transparent p-0.5 dark:border-white/15"
                    value={r.color}
                    onChange={(e) => updateResource(r.id, { color: e.target.value })}
                  />
                </div>
                <Field label="Name">
                  <input
                    className={input}
                    placeholder="Full name"
                    value={r.name}
                    onChange={(e) => updateResource(r.id, { name: e.target.value })}
                  />
                </Field>
                <Field label="Role">
                  <input
                    className={input}
                    placeholder="Role"
                    value={r.role}
                    onChange={(e) => updateResource(r.id, { role: e.target.value })}
                  />
                </Field>
                <Field label="Rate/hr">
                  <input
                    type="number"
                    min={0}
                    className={`${input} w-24 text-end tabular-nums`}
                    value={r.rate}
                    onChange={(e) =>
                      updateResource(r.id, { rate: e.target.value === "" ? 0 : Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Capacity %">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={`${input} w-24 text-end tabular-nums`}
                    value={r.capacity}
                    onChange={(e) =>
                      updateResource(r.id, { capacity: e.target.value === "" ? 0 : Number(e.target.value) })
                    }
                  />
                </Field>
                <button
                  type="button"
                  aria-label={`Remove ${r.name || "resource"}`}
                  onClick={() => removeResource(r.id)}
                  className="grid h-9 w-9 place-items-center self-end rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          {resources.length === 0 && (
            <p className="text-sm text-[var(--geex-muted)]">
              No resources — a new plan will start with an empty pool.
            </p>
          )}
          <div>
            <button type="button" className={btnGhost} onClick={addResource}>
              + Add resource
            </button>
          </div>
        </Section>

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
