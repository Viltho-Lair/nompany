// Operations calendar + expiry helpers (client-safe, no Node imports).

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The "Overtime" legend entry — a fixed, always-present type whose colour is the
// OT bar colour on the Work Calendar. Recolourable in settings, never removable.
export const OT_LEGEND_ID = "ot";
export const OT_LEGEND = { id: OT_LEGEND_ID, label: "Overtime", color: "#c4b5fd" };

// Calendar legend — work-task types with colours (+ the fixed OT type).
// Overridable in settings (settings.operationsLegend); items are recolourable
// but the set is fixed (no add/delete). Colours are soft fills.
export const DEFAULT_LEGEND = [
  { id: "project", label: "Project Related", color: "#bfdbfe" },
  { id: "installation", label: "Installation", color: "#fef08a" },
  { id: "sla", label: "SLA", color: "#bbf7d0" },
  { ...OT_LEGEND },
];

// Default working hours — Sunday–Thursday 08:00–17:00 (KSA week), Fri/Sat off.
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
  // The OT type is always present (older saved legends gain it).
  if (!out.some((t) => t.id === OT_LEGEND_ID)) out.push({ ...OT_LEGEND });
  return out;
}

// "HH:MM" → fractional hours (e.g. "08:30" → 8.5). Empty → fallback.
export function hhmmToHours(hhmm, fallback = 0) {
  if (!hhmm || typeof hhmm !== "string" || !hhmm.includes(":")) return fallback;
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h)) return fallback;
  return h + (Number.isNaN(m) ? 0 : m) / 60;
}

// Fractional hour of a Date (local): e.g. 14:30 → 14.5.
export function dateToHours(d) {
  return d.getHours() + d.getMinutes() / 60;
}

// Is `now` within the configured working hours? Evaluated in KSA local time
// (UTC+3, no DST) so it's correct regardless of the server's or visitor's own
// timezone. Used by the website chat to show an out-of-hours notice.
export function isWithinWorkingHours(schedule, now = new Date()) {
  const s = normalizeSchedule(schedule);
  const ksa = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const e = s[DAYS[ksa.getUTCDay()]];
  if (!e || !e.on) return false;
  const h = ksa.getUTCHours() + ksa.getUTCMinutes() / 60;
  return h >= hhmmToHours(e.from, 0) && h < hhmmToHours(e.to, 24);
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
  x.setDate(x.getDate() - x.getDay()); // getDay: Sun=0
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function fmtDMY(d) {
  return d.toLocaleDateString("en-GB");
}

// Whole days from today until `dateStr` (YYYY-MM-DD). Negative = already past.
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

// The visible hour window for the calendar. Full = [0,24]; working-hours mode =
// [min from, max to] across enabled days (fallback 8–17 if nothing configured).
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
