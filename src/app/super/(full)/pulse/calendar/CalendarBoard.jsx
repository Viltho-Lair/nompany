"use client";

// THE GRID, driven by whatever is actually connected. Everything that used to
// be a literal in page.js — the month, the events, the "today" cell — is now
// state and a fetch: the pure arithmetic lives in shared/calendar (monthGrid,
// eventsByDay), which this file and the API route both import, so the grid and
// the server agree about what a day key and a month grid are.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHead, Row, Col, CardBody, Badge, Icon, toneBg, toneInk } from "../../../_components/ui";
import { monthGrid, eventsByDay } from "@/shared/calendar";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// The tone table, built from the console's ONE tone helper rather than being a
// ninth copy of the same hand-mixed rgba() values. See toneBg/toneFg in
// _components/ui: the tint composes from the semantic token, so it follows the
// design system and the theme instead of freezing the template's palette.
const TONE_NAMES = ["primary", "success", "warning", "info", "danger"];
const TONE_FG = Object.fromEntries(TONE_NAMES.map((t) => [t, toneInk(t)]));
const TONE_BG = Object.fromEntries(TONE_NAMES.map((t) => [t, toneBg(t)]));

// A GOOGLE EVENT CARRIES NO TONE OF ITS OWN — colorId is Google's own palette,
// not this console's five semantic tokens — so a chip's tone is picked
// deterministically from its id. Deterministic matters: the same event must
// land on the same tone every time the grid re-renders, not rotate because the
// array happened to sort differently after a refetch.
function toneForId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONE_NAMES[h % TONE_NAMES.length];
}

function Cell({ day, muted, today, events = [] }) {
  return (
    <div
      className="min-h-[104px] border-b border-e p-2"
      style={{ borderColor: "var(--ad-border)", opacity: muted ? 0.4 : 1 }}
    >
      <span
        className={`num inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${today ? "font-700 text-white" : "font-500"}`}
        style={today ? { backgroundColor: "var(--ad-primary)" } : undefined}
      >
        {day}
      </span>
      <div className="mt-1.5 space-y-1">
        {events.map((e) => {
          const tone = toneForId(e.id);
          return (
            <p
              key={e.id}
              className="truncate rounded px-1.5 py-0.5 text-[11px] font-500"
              style={{ backgroundColor: TONE_BG[tone], color: TONE_FG[tone] }}
              title={e.title}
            >
              {e.title}
            </p>
          );
        })}
      </div>
    </div>
  );
}

/* ---- date-key helpers ------------------------------------------------------
   These operate on the same "YYYY-MM-DD" keys shared/calendar.ts produces, in
   UTC throughout for the same reason that module states: stepping a date key
   through a LOCAL Date drops or repeats a day across a DST boundary. */

function shiftDays(key, delta) {
  return new Date(Date.parse(`${key}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);
}

// Month navigation clamps the day rather than letting it roll over — "31 Jan"
// plus one month landing on "3 Mar" (Date.UTC's own rollover) reads as a bug,
// not a feature, on a Prev/Next button.
function shiftMonth(key, delta) {
  const [y, m, d] = key.split("-").map(Number);
  let ny = y;
  let nm = m + delta;
  while (nm > 12) { nm -= 12; ny += 1; }
  while (nm < 1) { nm += 12; ny -= 1; }
  const daysInNewMonth = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const nd = Math.min(d, daysInNewMonth);
  return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

// "Today", in the CALENDAR'S OWN TIME ZONE — not the browser's. A calendar
// connected from Riyadh should mark "today" on the Riyadh date even when the
// operator viewing it is somewhere the date has not turned over yet.
function dateKeyIn(date, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    // An unrecognised IANA name (a hand-typed connection, or Google returning
    // something odd) falls back to UTC rather than throwing the whole board.
    return date.toISOString().slice(0, 10);
  }
}

function monthLabel(year, month) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

function dayLabel(key, opts) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

function fmtWhen(event, timeZone, todayKey) {
  if (event.allDay) {
    const key = event.start.slice(0, 10);
    return key === todayKey ? "Today · all day" : `${dayLabel(key, { weekday: "short", day: "numeric", month: "short" })} · all day`;
  }
  const start = new Date(event.start);
  const key = dateKeyIn(start, timeZone);
  const day = key === todayKey ? "Today" : start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone });
  const startTime = start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone });
  const endTime = new Date(event.end).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone });
  return `${day} · ${startTime}–${endTime}`;
}

const VIEWS = ["Month", "Week", "Day"];

export default function CalendarBoard({ connection }) {
  const router = useRouter();
  const todayKey = useMemo(() => dateKeyIn(new Date(), connection.timeZone), [connection.timeZone]);

  const [cursor, setCursor] = useState(todayKey);
  const [view, setView] = useState("Month");
  const [events, setEvents] = useState([]);
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // WHEN the last successful fetch landed, epoch ms — not read during render.
  // "Upcoming" needs an instant to filter against, and calling Date.now() in a
  // render (even inside useMemo, which still runs during render) is an impure
  // read React's purity rule refuses; capturing it once, in the effect that
  // already produced `events`, keeps the two in step without that call.
  const [asOf, setAsOf] = useState(0);

  const [cy, cm] = cursor.split("-").map(Number);
  const monthCells = useMemo(() => monthGrid({ year: cy, month: cm, todayKey }), [cy, cm, todayKey]);

  // WEEK AND DAY DO NOT GET THEIR OWN GRID FUNCTION — both slice the SAME
  // whole-week output monthGrid already produced (it pads to full Monday-start
  // weeks, so the week containing `cursor` is always inside its own month's
  // grid, even when that week spans into the next or previous month). Three
  // renderers would mean three places to keep the "which cell is today" logic
  // in sync; one array sliced three ways means one.
  const displayCells = useMemo(() => {
    if (view === "Month") return monthCells;
    const idx = monthCells.findIndex((c) => c.key === cursor);
    if (view === "Week") {
      const start = idx >= 0 ? idx - (idx % 7) : 0;
      return monthCells.slice(start, start + 7).map((c) => ({ ...c, inMonth: true }));
    }
    // Day: exactly one cell. `inMonth` is forced true — "muted" describes a
    // neighbouring month's day bleeding into this grid, which does not apply
    // when the grid IS that one day.
    const found = monthCells[idx];
    return [found ? { ...found, inMonth: true } : { key: cursor, day: Number(cursor.slice(8, 10)), inMonth: true, isToday: cursor === todayKey }];
  }, [view, monthCells, cursor, todayKey]);

  const from = `${displayCells[0].key}T00:00:00.000Z`;
  const to = `${shiftDays(displayCells[displayCells.length - 1].key, 1)}T00:00:00.000Z`;

  // NO setState BEFORE THE FIRST `await` — deliberately. The effect below calls
  // this directly, and everything up to a function's first `await` runs
  // synchronously; a setState there would be exactly the cascading-render
  // pattern the lint rule (rightly) warns about. Because the first statement
  // here is the fetch itself, nothing runs synchronously at all: `load()`
  // returns a pending promise to the effect and every state change happens
  // later, off the render.
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/super/google-calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Google's own message, verbatim — a 502 here means the connection is
        // broken, and rendering an empty week in its place would look exactly
        // like a quiet month rather than a calendar that stopped working. The
        // route now reports every failure on the Google/identity path with a
        // `detail` (see the route's own comment), so an empty body should not
        // happen — the status fallback is a diagnosable dead end if it ever does.
        setProblem(body?.detail || body?.error || `Couldn't load events (HTTP ${res.status}).`);
        setEvents([]);
        return;
      }
      setProblem("");
      setEvents(Array.isArray(body.events) ? body.events : []);
      setAsOf(Date.now());
    } catch {
      setProblem("Couldn't reach the calendar service.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  // THE RULE IS WRONG ABOUT THIS ONE, and contorting the code to satisfy it
  // would be worse than saying so. `load` is async and its first statement is
  // `await fetch(...)`, so nothing runs synchronously here at all — see the
  // comment on `load` above, and MfaCard.js for the fuller version of this note.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => eventsByDay(events), [events]);

  // "At or after now, from the same fetch" — literally: not a second request
  // scoped to "soon", just the range already on screen filtered forward from
  // `asOf`. Viewing a past month legitimately shows nothing upcoming.
  const upcoming = useMemo(() => {
    if (!asOf) return [];
    return events
      .filter((e) => Date.parse(e.start) >= asOf)
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
      .slice(0, 5);
  }, [events, asOf]);

  function step(delta) {
    setCursor((c) => {
      if (view === "Month") return shiftMonth(c, delta);
      if (view === "Week") return shiftDays(c, delta * 7);
      return shiftDays(c, delta);
    });
  }

  async function disconnect() {
    setBusy(true);
    await fetch("/api/super/google-calendar", { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  let title;
  if (view === "Month") {
    title = monthLabel(cy, cm);
  } else if (view === "Week") {
    const first = displayCells[0].key;
    const last = displayCells[displayCells.length - 1].key;
    title = `${dayLabel(first, { day: "numeric", month: "short" })} – ${dayLabel(last, { day: "numeric", month: "short", year: "numeric" })}`;
  } else {
    title = dayLabel(cursor, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  const countLabel = view === "Month" ? "events scheduled this month" : view === "Week" ? "events this week" : "events today";

  return (
    <Row>
      <Col span={9}>
        <Card>
          <CardHead
            title={title}
            action={
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: "var(--ad-border)" }}>
                  {VIEWS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="rounded px-2.5 py-1 text-xs font-500"
                      style={v === view ? { backgroundColor: "var(--ad-primary)", color: "var(--ad-primary-foreground)" } : { color: "var(--ad-muted-foreground)" }}
                      onClick={() => setView(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <button type="button" className="ad-icon-btn h-9 w-9" aria-label="Previous" onClick={() => step(-1)}>
                  <Icon name="chevronLeft" className="h-4 w-4" />
                </button>
                <button type="button" className="ad-icon-btn h-9 w-9" aria-label="Next" onClick={() => step(1)}>
                  <Icon name="chevronRight" className="h-4 w-4" />
                </button>
              </div>
            }
          />
          {problem ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: TONE_BG.danger, color: TONE_FG.danger }}>
                <Icon name="alert" className="h-5 w-5" />
              </span>
              <p className="max-w-md text-sm text-[var(--ad-destructive)]">{problem}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-7 border-t" style={{ borderColor: "var(--ad-border)" }}>
                  {DOW.map((d) => (
                    <div
                      key={d}
                      className="border-b border-e px-2 py-2.5 text-center text-[11px] font-600 uppercase tracking-wider text-[var(--ad-muted-foreground)]"
                      style={{ borderColor: "var(--ad-border)" }}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className={`grid ${view === "Day" ? "grid-cols-1" : "grid-cols-7"}`}>
                  {displayCells.map((c) => (
                    <Cell key={c.key} day={c.day} muted={!c.inMonth} today={c.isToday} events={byDay[c.key]} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </Col>

      <Col span={3}>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHead title="Upcoming" />
            <CardBody>
              {loading ? (
                <p className="text-sm text-[var(--ad-muted-foreground)]">Loading…</p>
              ) : upcoming.length === 0 ? (
                <p className="text-sm text-[var(--ad-muted-foreground)]">Nothing upcoming in the range shown.</p>
              ) : (
                <ul className="space-y-4">
                  {upcoming.map((e) => {
                    const tone = toneForId(e.id);
                    return (
                      <li key={e.id} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: TONE_BG[tone], color: TONE_FG[tone] }}
                        >
                          <Icon name="calendar" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-500">{e.title}</p>
                          <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{fmtWhen(e, connection.timeZone, todayKey)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Calendar" />
            <CardBody>
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: TONE_FG.primary }} />
                <span className="min-w-0 flex-1 truncate text-sm font-500">{connection.summary || connection.calendarId}</span>
              </div>
              <p className="mt-1.5 truncate font-mono text-[11px] text-[var(--ad-muted-foreground)]">{connection.calendarId}</p>
              <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{connection.timeZone}</p>
              <button
                type="button"
                className="ad-btn ad-btn-outline ad-btn-sm mt-4 w-full"
                onClick={disconnect}
                disabled={busy}
              >
                <Icon name="trash" className="h-3.5 w-3.5" /> {busy ? "Disconnecting…" : "Disconnect"}
              </button>
            </CardBody>
          </Card>

          <Card>
            <CardBody full className="flex items-center gap-3">
              <Badge tone="primary">{events.length}</Badge>
              <p className="text-xs text-[var(--ad-muted-foreground)]">{countLabel}</p>
            </CardBody>
          </Card>
        </div>
      </Col>
    </Row>
  );
}
