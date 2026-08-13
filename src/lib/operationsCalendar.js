// Operations calendar helpers — client-safe, so the screens can import them
// without pulling the Redis-backed section store in with them. Same split
// lib/tickets.js makes for Sales and lib/quotations.js for Technical.

import { hhmmToHours } from "@/lib/projectSchedule";

export { hhmmToHours };

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The "Overtime" legend entry — a fixed, always-present type whose colour is the
// OT bar colour on the work calendar. Recolourable, never removable.
export const OT_LEGEND_ID = "ot";
export const OT_LEGEND = { id: OT_LEGEND_ID, label: "Overtime", color: "#c4b5fd" };

// The calendar legend: shift kinds and their colours, plus the fixed OT type.
// The SET is fixed — a studio can recolour or rename these, but not add or
// remove them, because a bar with no legend entry has no colour to be drawn in.
export const DEFAULT_LEGEND = [
  { id: "project", label: "Project Related", color: "#bfdbfe" },
  { id: "installation", label: "Installation", color: "#fef08a" },
  { id: "sla", label: "SLA", color: "#bbf7d0" },
  { ...OT_LEGEND },
];

// Default working hours — Sunday–Thursday 08:00–17:00, Friday and Saturday off.
// A studio anywhere else changes this in Settings; it is only a starting point.
export const DEFAULT_SCHEDULE = DAYS.reduce((acc, d) => {
  const working = d !== "Friday" && d !== "Saturday";
  acc[d] = { on: working, from: working ? "08:00" : "", to: working ? "17:00" : "" };
  return acc;
}, {});

export function normalizeSchedule(ws) {
  const out = {};
  for (const d of DAYS) {
    const v = (ws && ws[d]) || DEFAULT_SCHEDULE[d];
    out[d] = { on: !!v.on, from: v.from || "", to: v.to || "" };
  }
  return out;
}

export function normalizeLegend(legend) {
  const arr = Array.isArray(legend) && legend.length ? legend : DEFAULT_LEGEND;
  const out = arr.map((t) => ({ id: t.id || t.label, label: t.label || "", color: t.color || "#e2e8f0" }));
  // Overtime is always present, so a legend saved before it existed gains it.
  if (!out.some((t) => t.id === OT_LEGEND_ID)) out.push({ ...OT_LEGEND });
  return out;
}

// Local YYYY-MM-DD key for a Date.
export function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// The Sunday (00:00 local) that starts the week containing `d`.
export function startOfWeekSunday(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // getDay: Sunday = 0
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// The hour window the calendar draws. Full day unless "working hours only" is
// on, in which case it spans the earliest start to the latest end across the
// days that are actually worked — so an empty schedule still yields a sane grid
// rather than a zero-height one.
export function visibleWindow(schedule, workingOnly) {
  if (!workingOnly) return [0, 24];
  let min = 24, max = 0;
  for (const d of DAYS) {
    const s = schedule[d];
    if (!s || !s.on) continue;
    const from = hhmmToHours(s.from, 8);
    const to = hhmmToHours(s.to, 17);
    if (from < min) min = from;
    if (to > max) max = to;
  }
  if (min >= max) return [8, 17];
  return [Math.floor(min), Math.ceil(max)];
}

// Is `at` inside the configured working hours? Evaluated in the VIEWER's local
// time — unlike the Old System, which hard-coded UTC+3 because it served one
// company in one country. A studio's schedule means the hours where it works.
export function isWithinWorkingHours(schedule, at = new Date()) {
  const s = normalizeSchedule(schedule);
  const e = s[DAYS[at.getDay()]];
  if (!e || !e.on) return false;
  const h = at.getHours() + at.getMinutes() / 60;
  return h >= hhmmToHours(e.from, 0) && h < hhmmToHours(e.to, 24);
}

// Where a shift sits in the drawn window, as top/height percentages. Returns
// null when it falls entirely outside — a night shift on a working-hours-only
// grid has nowhere to be drawn, and inventing a sliver would misreport it.
export function barGeometry(startTime, endTime, [windowFrom, windowTo]) {
  const from = hhmmToHours(startTime, NaN);
  const to = hhmmToHours(endTime, NaN);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
  const span = windowTo - windowFrom;
  if (span <= 0) return null;
  const clampedFrom = Math.max(from, windowFrom);
  const clampedTo = Math.min(to, windowTo);
  if (clampedTo <= clampedFrom) return null;
  return {
    top: ((clampedFrom - windowFrom) / span) * 100,
    height: ((clampedTo - clampedFrom) / span) * 100,
    clipped: from < windowFrom || to > windowTo,
  };
}

// The plain-text roster for one day, which is what gets pasted into a group
// chat every morning. `prefix` is the studio's own standing header.
export function dayRoster(dateLabel, shifts, prefix = "") {
  const lines = shifts
    .slice()
    .sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || "")))
    .map((s) => {
      const where = [s.locationName, s.role].filter(Boolean).join(" · ");
      return `${s.startTime}–${s.endTime}  ${s.alias}${where ? `  (${where})` : ""}`;
    });
  return [prefix.trim(), dateLabel, ...(lines.length ? lines : ["Nobody scheduled."])]
    .filter(Boolean)
    .join("\n");
}
