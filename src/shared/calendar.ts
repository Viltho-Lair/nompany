// PURE CALENDAR ARITHMETIC — no store, no network, no Google client. Both the
// server component and the client grid import this, which is why it lives in
// shared/ and may not reach for anything server-only.

export type CalendarEvent = {
  id: string;
  title: string;
  /** RFC-3339 for a timed event, "YYYY-MM-DD" for an all-day one. Google's own shape, kept. */
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  htmlLink: string;
  colorId: string;
};

/**
 * One Google event → one CalendarEvent, or null for anything unrenderable.
 *
 * DROPPING IS DELIBERATE. An event with no id or no start cannot be keyed or
 * placed; rendering it puts a blank chip in a cell that nothing explains.
 */
export function normaliseEvent(raw: unknown): CalendarEvent | null {
  const e = (raw ?? {}) as Record<string, any>;
  const id = String(e.id || "");
  const start = String(e.start?.dateTime || e.start?.date || "");
  if (!id || !start) return null;
  const allDay = Boolean(e.start?.date && !e.start?.dateTime);
  return {
    id,
    // A GOOGLE EVENT MAY GENUINELY HAVE NO SUMMARY. Google's own UI shows
    // "(no title)"; an empty string would render as a chip with nothing in it.
    title: String(e.summary || "(no title)"),
    start,
    end: String(e.end?.dateTime || e.end?.date || start),
    allDay,
    location: String(e.location || ""),
    htmlLink: String(e.htmlLink || ""),
    colorId: String(e.colorId || ""),
  };
}

/**
 * Which day cells an event paints, as "YYYY-MM-DD", inclusive of both ends.
 *
 * GOOGLE'S ALL-DAY `end.date` IS EXCLUSIVE: a one-day event on the 3rd is stored
 * as 2026-09-03 → 2026-09-04. Treating it as inclusive paints every all-day
 * event one cell too wide, which is a bug that looks like a data problem.
 */
export function eventDayKeys(event: CalendarEvent): string[] {
  const first = event.start.slice(0, 10);
  const lastExclusive = event.allDay ? event.end.slice(0, 10) : "";
  const last = event.allDay ? dayBefore(lastExclusive) : event.end.slice(0, 10);
  const out: string[] = [];
  // UTC THROUGHOUT. These are date strings, not instants — stepping them through
  // a local-time Date is how a day goes missing across a DST boundary.
  for (let d = Date.parse(`${first}T00:00:00Z`); d <= Date.parse(`${last}T00:00:00Z`); d += 86_400_000) {
    out.push(new Date(d).toISOString().slice(0, 10));
    if (out.length > 400) break;   // a runaway range cannot hang the render
  }
  return out.length ? out : [first];
}

function dayBefore(key: string): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}
