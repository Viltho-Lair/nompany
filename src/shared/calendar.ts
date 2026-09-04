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

// A date-time that already says WHICH INSTANT it is: a "Z" or a "±hh:mm"
// designator on the end. Google's `dateTime` always carries one; Microsoft's
// never does (see microsoftInstant below).
const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

// The zone names that mean UTC EXACTLY, so no arithmetic is being guessed at.
// "UTC" is what Graph answers with by default, and therefore what nearly every
// real event carries; the rest cost nothing and name the same instant.
const UTC_ZONE_NAMES = new Set(["utc", "gmt", "z", "etc/utc", "etc/gmt", "coordinated universal time"]);

/**
 * A Microsoft wall-clock date-time + its sibling zone → an instant, as RFC-3339
 * with a real offset.
 *
 * MICROSOFT GRAPH RETURNS NO OFFSET DESIGNATOR. It puts the zone in a sibling
 * field instead: `{ dateTime: "2026-09-03T09:30:00.0000000", timeZone: "UTC" }`.
 * JavaScript parses an offset-less date-time as LOCAL time, so copying
 * `dateTime` through verbatim renders a 09:30 UTC meeting as 09:30 to a viewer
 * in Riyadh instead of 12:30 — wrong by the viewer's whole UTC offset, on EVERY
 * timed Microsoft event, with nothing on screen saying so. It also mis-buckets
 * eventDayKeys near midnight and scrambles the cross-provider sort in the
 * events route, which orders by Date.parse.
 *
 * A GRAPH `Prefer: outlook.timezone` HEADER DOES NOT FIX THIS. That header
 * changes WHICH zone Graph answers in; it does not add the designator. The
 * conversion has to happen here, which is also the only place both halves of
 * the pair are in hand.
 *
 * THREE CASES, AND THE LAST IS DELIBERATELY NOT A GUESS:
 *  1. The string already carries an offset — returned untouched.
 *  2. `timeZone` names UTC — "Z" appended, exactly.
 *  3. An IANA name ("Asia/Riyadh") is resolved through Intl, which computes the
 *     zone's REAL offset at that instant, DST included, rather than assuming
 *     one. A WINDOWS ZONE NAME — "Arab Standard Time", which Graph returns when
 *     an event was written in its organiser's own zone — is not something this
 *     file can map without shipping a Windows→IANA table, and Intl rejects it
 *     outright. The value is then left EXACTLY as Graph gave it: still
 *     offset-less, still rendered in the viewer's own zone. That is the old bug
 *     for that one case, and it is the right trade: inventing an offset would
 *     put the meeting at a confidently wrong time instead of an unconverted one,
 *     and a wrong answer is harder to notice than an unchanged one.
 */
function microsoftInstant(rawDateTime: string, timeZone: string): string {
  if (!rawDateTime || HAS_OFFSET.test(rawDateTime)) return rawDateTime;
  const zone = timeZone.trim();
  // No zone at all is not "assume UTC" — it is a pair Graph should never have
  // sent, and case 3's reasoning applies to it just as much.
  if (!zone) return rawDateTime;
  // GRAPH WRITES SEVEN FRACTIONAL DIGITS (".0000000"). V8 tolerates them, but
  // the date-time grammar every other parser agrees on stops at milliseconds,
  // and this value is also what a browser later renders.
  const wall = rawDateTime.replace(/(\.\d{3})\d+$/, "$1");
  const ms = UTC_ZONE_NAMES.has(zone.toLowerCase())
    ? Date.parse(`${wall}Z`)
    : instantInZone(wall, zone);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : rawDateTime;
}

/**
 * A wall-clock string read AS IF in `zone` → the instant it names, or NaN when
 * the zone is not one Intl knows (a Windows name, or anything malformed).
 *
 * TWO ROUNDS, NOT ONE. The zone's offset is only defined AT an instant, and the
 * instant is what is being solved for — so the first offset has to be read at
 * the wrong one (the wall time treated as UTC), which is off by the offset
 * itself. Whenever a DST transition falls inside THAT gap — a window as wide as
 * the zone's own offset, up to half a day, not merely the hour around the
 * change — the first read lands on the far side of it and comes back an hour
 * out. Re-reading the offset at the corrected instant settles it. The test
 * suite pins a real case (Pacific/Auckland, +13, the day its DST ends) where a
 * single round is provably an hour wrong.
 */
function instantInZone(wall: string, zone: string): number {
  const asIfUtc = Date.parse(`${wall}Z`);
  if (!Number.isFinite(asIfUtc)) return NaN;
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    // RangeError — Intl does not know this zone. Refusing here is what sends
    // the caller back to the raw value rather than to an invented offset.
    return NaN;
  }
  const offsetAt = (ms: number): number => zoneWallMs(fmt, ms) - ms;
  const first = asIfUtc - offsetAt(asIfUtc);
  return asIfUtc - offsetAt(first);
}

/** What clock `zone` shows at instant `ms`, expressed as if that reading were UTC. */
function zoneWallMs(fmt: Intl.DateTimeFormat, ms: number): number {
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(new Date(ms))) p[part.type] = part.value;
  // hour12:false renders midnight as "24" under some ICU versions (the h24
  // cycle), which Date.UTC would roll into the next day.
  const hour = p.hour === "24" ? 0 : Number(p.hour);
  return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second));
}

/**
 * One Microsoft Graph event → one CalendarEvent, the SAME shape the Google
 * normaliser above produces — so nothing downstream (eventDayKeys, the grid)
 * knows or cares which provider a meeting came from.
 *
 * MICROSOFT'S ALL-DAY END IS EXCLUSIVE TOO, exactly like Google's `end.date`:
 * a one-day event on the 3rd is `start: 2026-09-03T00:00`, `end:
 * 2026-09-04T00:00`. Graph has no separate date-only field the way Google
 * does (`start.date` vs `start.dateTime`) — every event carries `dateTime`,
 * and `isAllDay` is what says which arithmetic applies. Trimming to the date
 * part HERE, for an all-day event only, is what feeds eventDayKeys' existing
 * exclusive-end handling unchanged rather than growing a second copy of that
 * off-by-one logic.
 */
export function normaliseMicrosoftEvent(raw: unknown): CalendarEvent | null {
  const e = (raw ?? {}) as Record<string, any>;
  const id = String(e.id || "");
  const rawStart = String(e.start?.dateTime || "");
  if (!id || !rawStart) return null;
  const allDay = Boolean(e.isAllDay);
  const rawEnd = String(e.end?.dateTime || rawStart);
  // AN ALL-DAY EVENT IS A DATE, NOT AN INSTANT, so it is deliberately NOT run
  // through microsoftInstant: a holiday is the 3rd everywhere, and converting
  // its local midnight into a UTC instant is what moves it onto the 2nd for
  // everybody east of Greenwich. Trimming to the date part is what feeds
  // eventDayKeys' exclusive-end handling, exactly as before.
  const start = allDay ? rawStart.slice(0, 10) : microsoftInstant(rawStart, String(e.start?.timeZone || ""));
  const end = allDay ? rawEnd.slice(0, 10) : microsoftInstant(rawEnd, String(e.end?.timeZone || ""));
  return {
    id,
    // Same reasoning as Google's placeholder: a Microsoft event may genuinely
    // carry no subject, and an empty chip explains nothing.
    title: String(e.subject || "(no title)"),
    start,
    end,
    allDay,
    location: String(e.location?.displayName || ""),
    htmlLink: String(e.webLink || ""),
    colorId: "",
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

export type GridCell = { key: string; day: number; inMonth: boolean; isToday: boolean };

/**
 * The month's cells, as whole Monday-start weeks.
 *
 * `month` IS 1-BASED (September is 9). The JS Date constructor is 0-based, and
 * mixing the two is a whole-month-off bug that renders perfectly.
 *
 * ALL ARITHMETIC IS UTC. These are date keys, not instants; stepping them
 * through a local Date drops or repeats a day across a DST boundary, in exactly
 * the two weeks of the year nobody is testing.
 */
export function monthGrid({ year, month, todayKey }: { year: number; month: number; todayKey: string }): GridCell[] {
  const firstMs = Date.UTC(year, month - 1, 1);
  // getUTCDay is 0=Sunday; the screen's header row is Mon…Sun, so Monday is 0.
  const lead = (new Date(firstMs).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;

  const cells: GridCell[] = [];
  for (let i = 0; i < total; i++) {
    const ms = firstMs + (i - lead) * 86_400_000;
    const d = new Date(ms);
    const key = d.toISOString().slice(0, 10);
    cells.push({
      key,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month - 1 && d.getUTCFullYear() === year,
      isToday: key === todayKey,
    });
  }
  return cells;
}

/** Events keyed by the day cells they paint. One event may appear in several. */
export function eventsByDay(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const out: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    for (const key of eventDayKeys(e)) (out[key] ||= []).push(e);
  }
  return out;
}

/**
 * WHEN SOMEBODY IS BUSY, AND NOTHING ELSE. No id, no title, no location, no
 * organiser — deliberately two fields, so that a colleague-facing surface built
 * on this type cannot render a detail it was never given.
 *
 * Both ends are ISO instants (…Z). A wall-clock string would be meaningless
 * here: this is compared against another person's calendar, in another zone.
 */
export type BusyInterval = { start: string; end: string };

/**
 * Busy intervals from anywhere → sorted, non-overlapping, back-to-back runs
 * fused into one.
 *
 * ONE FUNCTION FOR BOTH PROVIDERS. Google's freeBusy returns raw, possibly
 * overlapping periods (a person double-booked at 09:30 gets two rows covering
 * the same minutes); Microsoft's availabilityView is already a run of slots.
 * Merging both through here is what makes "busy from 09:00 to 11:00" mean the
 * same thing whichever calendar it came from, and it is why a caller can count
 * intervals without knowing the provider.
 *
 * TOUCHING INTERVALS FUSE (`<=`, not `<`). Two back-to-back half-hours are one
 * busy hour to anybody looking for a gap; leaving them as two rows invites a
 * reader to see a zero-length opening between them that does not exist.
 *
 * OUTPUT IS RE-SERIALISED, NOT COPIED THROUGH. Google says
 * "2026-09-03T09:00:00Z" and the Microsoft path computes from milliseconds —
 * two spellings of one instant. Normalising here means a caller comparing or
 * de-duplicating two providers' answers is comparing instants, not strings.
 *
 * An unparseable or backwards interval is DROPPED rather than repaired: a
 * guessed end time renders as somebody being busy when they are not, and
 * nothing on screen would say it was invented.
 */
export function mergeBusy(intervals: BusyInterval[]): BusyInterval[] {
  const spans: { start: number; end: number }[] = [];
  for (const iv of intervals || []) {
    const start = Date.parse(iv?.start ?? "");
    const end = Date.parse(iv?.end ?? "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    spans.push({ start, end });
  }
  // SORTED FIRST, ALWAYS. Neither provider promises ordered periods, and a
  // single unsorted pass leaves overlapping rows uncoalesced — which reads as
  // twice as many meetings as there are.
  spans.sort((a, b) => a.start - b.start);

  const out: BusyInterval[] = [];
  let open: { start: number; end: number } | null = null;
  for (const span of spans) {
    if (open && span.start <= open.end) {
      // CONTAINMENT IS NOT EXTENSION: a short meeting sitting entirely inside a
      // long one must not shorten the long one's end.
      if (span.end > open.end) open.end = span.end;
      continue;
    }
    if (open) out.push(isoSpan(open));
    open = { start: span.start, end: span.end };
  }
  if (open) out.push(isoSpan(open));
  return out;
}

function isoSpan(span: { start: number; end: number }): BusyInterval {
  return { start: new Date(span.start).toISOString(), end: new Date(span.end).toISOString() };
}

/**
 * Microsoft's `availabilityView` → busy intervals.
 *
 * THE STRING IS ONE CHARACTER PER SLOT, and the slots run consecutively from
 * the window's start: "002200" over 30-minute slots from 09:00 means free,
 * free, busy, busy, free, free — one busy interval, 10:00 to 11:00. "0" is
 * free; every other code (1 tentative, 2 busy, 3 out of office, 4 working
 * elsewhere) is some form of not-free and is treated identically here. That
 * flattening is deliberate: the distinction between "tentative" and "out of
 * office" is a fact about a person's day that this feature promises not to
 * tell colleagues, and it is not needed to answer "is there a gap".
 *
 * THIS FIELD IS THE WHOLE REASON THE MICROSOFT PATH IS SAFE — see the comment
 * at its read in lib/data/calendarFreeBusy.ts.
 *
 * ARITHMETIC IN UTC, from a millisecond stamp: the slot grid is a count of
 * minutes from an instant, so stepping a local Date through it would drop or
 * repeat a slot across a DST boundary.
 */
export function availabilityViewToIntervals(view: string, fromISO: string, slotMinutes: number): BusyInterval[] {
  const from = Date.parse(fromISO);
  const slotMs = Math.round(slotMinutes * 60_000);
  // A bad anchor or slot size cannot produce a defensible interval, and
  // inventing one would put a colleague's day at a time nothing measured.
  if (!view || !Number.isFinite(from) || !(slotMs > 0)) return [];

  const out: BusyInterval[] = [];
  let runStart = -1;
  // ONE PAST THE END, so a run that reaches the last slot is closed by the same
  // branch that closes every other run rather than by a copy of it after the loop.
  for (let i = 0; i <= view.length; i++) {
    const busy = i < view.length && view[i] !== "0";
    if (busy) {
      if (runStart < 0) runStart = i;
      continue;
    }
    if (runStart >= 0) {
      out.push(isoSpan({ start: from + runStart * slotMs, end: from + i * slotMs }));
      runStart = -1;
    }
  }
  return out;
}
