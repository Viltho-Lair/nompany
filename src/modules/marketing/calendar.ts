// WHAT RUNS WHEN — Marketing's calendar, purely (22/09/2026).
//
// THE GAP THIS CLOSES. The register sorts campaigns by status and date, which
// answers "what is on" and not "what is on AT ONCE". A studio with four email
// campaigns overlapping in one week cannot see that anywhere: each looks
// reasonable on its own row, and the only place the collision exists is in a
// person's head — or in the inbox of whoever receives all four.
//
// IT OWNS NOTHING AND CHANGES NOTHING. Every bar here is a campaign that
// already exists, read where the register keeps it; moving a bar is editing
// that campaign's dates and answers to `marketing.campaigns.edit`. A calendar
// that stored its own copy of when things run would be a second answer to a
// question the campaign already answers.
//
// No store and no clock: `asOf` arrives from the caller, as everywhere else.

const DAY = 86400000;

/** A campaign as the calendar sees it. Everything else about it is the register's. */
export type Scheduled = {
  id: string;
  reference?: string;
  name?: string;
  status?: string;
  startOn?: string;
  endOn?: string;
  channels?: readonly string[];
  parentId?: string;
};

const day = (v: unknown) => {
  const s = String(v ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const addDays = (d: string, n: number) => new Date(ms(d) + n * DAY).toISOString().slice(0, 10);
const between = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY);

/**
 * THE WINDOW THE SCREEN DRAWS: whole weeks, starting on the Monday on or before
 * `from`, so every column is a week and nothing begins mid-column. Weeks rather
 * than months because a marketing calendar is read at the granularity things
 * are scheduled at — "week of the 6th", not "October".
 */
export function window(from: string, weeks: number) {
  const start = day(from) || new Date().toISOString().slice(0, 10);
  // Monday of that week. getUTCDay is 0 on Sunday, so Sunday steps back six.
  const weekday = new Date(ms(start)).getUTCDay();
  const monday = addDays(start, -((weekday + 6) % 7));
  const span = Math.max(1, Math.min(52, Math.round(weeks)));
  return {
    from: monday,
    to: addDays(monday, span * 7),
    weeks: Array.from({ length: span }, (_, i) => addDays(monday, i * 7)),
    days: span * 7,
  };
}

export type Bar = {
  id: string;
  reference: string;
  name: string;
  status: string;
  channels: readonly string[];
  /** Where the bar starts and ends as a share of the window, 0–1, clamped. */
  offset: number;
  length: number;
  /** The campaign's real dates, so the screen never re-derives them. */
  startOn: string;
  endOn: string;
  /** It began before the window opened, or runs past its end — drawn as cut. */
  cutStart: boolean;
  cutEnd: boolean;
  /** No end date: a campaign that was started and never closed. */
  openEnded: boolean;
};

/**
 * EVERY CAMPAIGN THAT TOUCHES THE WINDOW, as bars.
 *
 * A CAMPAIGN WITH NO START DATE IS NOT ON THE CALENDAR AT ALL, and it is
 * returned separately rather than dropped: a studio with nine unscheduled
 * campaigns has a planning problem, and a calendar that silently omitted them
 * would hide exactly that. One with a start and no end is drawn from its start
 * to the end of the window and marked open-ended — guessing a length would put
 * a date on screen that nobody typed.
 *
 * CANCELLED CAMPAIGNS ARE LEFT OUT. They are not running, and a calendar is a
 * picture of what is happening; the register is where the record lives.
 */
export function bars(campaigns: readonly Scheduled[], from: string, to: string) {
  const span = Math.max(1, between(from, to));
  const shown: Bar[] = [];
  const unscheduled: Scheduled[] = [];

  for (const c of Array.isArray(campaigns) ? campaigns : []) {
    if (String(c.status || "") === "Cancelled") continue;
    const start = day(c.startOn);
    const end = day(c.endOn);
    if (!start) { unscheduled.push(c); continue; }
    const finish = end || to;
    // Outside the window entirely: not this calendar's business.
    if (finish < from || start >= to) continue;
    const clampedStart = start < from ? from : start;
    const clampedEnd = finish > to ? to : finish;
    shown.push({
      id: c.id,
      reference: String(c.reference || ""),
      name: String(c.name || ""),
      status: String(c.status || ""),
      channels: Array.isArray(c.channels) ? c.channels : [],
      offset: between(from, clampedStart) / span,
      // A ONE-DAY CAMPAIGN STILL HAS TO BE VISIBLE: a bar of zero width draws
      // nothing, so the shortest is one day wide.
      length: Math.max(1, between(clampedStart, clampedEnd) + 1) / span,
      startOn: start,
      endOn: end,
      cutStart: start < from,
      cutEnd: Boolean(end) && end > to,
      openEnded: !end,
    });
  }
  shown.sort((a, b) => a.startOn.localeCompare(b.startOn) || a.name.localeCompare(b.name));
  return { bars: shown, unscheduled };
}

/**
 * HOW BUSY EACH WEEK IS, PER CHANNEL — the question the register cannot answer
 * and the reason this screen exists. A campaign counts in every week it touches
 * and on every channel it names, because somebody receiving email counts four
 * email campaigns whatever their start dates were.
 */
export function load(shown: readonly Bar[], weeks: readonly string[]) {
  return weeks.map((weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    const running = shown.filter((b) => b.startOn <= weekEnd && (b.endOn || weekEnd) >= weekStart);
    const byChannel: Record<string, number> = {};
    for (const b of running) for (const channel of b.channels) byChannel[channel] = (byChannel[channel] || 0) + 1;
    return {
      weekStart,
      running: running.length,
      byChannel,
      /** The channel carrying the most at once this week, and how many. */
      busiest: Object.entries(byChannel).sort((a, b) => b[1] - a[1])[0] || null,
    };
  });
}

/** Only what an event must expose to be placed on the grid. */
export type Dated = {
  id?: string;
  name?: string;
  kind?: string;
  /** An ISO stamp: an event starts at a time, unlike a campaign. */
  startsAt?: string;
};

export type Marker = {
  id: string;
  name: string;
  kind: string;
  /** The day it falls on. */
  on: string;
  /** The Monday of the week it belongs to, so a screen can group by column. */
  week: string;
};

/**
 * EVENTS PLACED ON THE SAME WEEKS THE BARS RUN ACROSS (22/09/2026).
 *
 * A MARKER, NOT A BAR, and that is the answer this file's own "not built" note
 * was waiting for. A campaign OCCUPIES weeks — it is a span, and drawing it as
 * one is what makes overlap visible. An event is a point: the webinar is on the
 * fifteenth at six. Drawing it as a bar a day wide would be a sliver nobody can
 * read, and drawing it as a week-long bar would claim a week of the calendar
 * for an hour of somebody's time.
 *
 * SORTED BY WHEN, because a week's markers are read as a running order.
 *
 * AN EVENT WITH NO START IS NOT ON THE CALENDAR AT ALL, the same rule the bars
 * follow: `eventProblem` requires a start, so this only drops rows written
 * before that rule or through some other door.
 */
export function markers(events: unknown, from: string, to: string): Marker[] {
  const out: Marker[] = [];
  // COERCED RATHER THAN TRUSTED, the rule every function in this file follows:
  // `bars` does the same and has an assertion saying so. The type says this is
  // an array and the type is an ASSERTION about whatever the store handed back
  // — `t.dependencies is not iterable` white-screened the whole planner for
  // exactly this reason, and one bad row must not take a calendar with it.
  for (const e of (Array.isArray(events) ? events : []) as readonly Dated[]) {
    const on = day(String(e.startsAt || "").slice(0, 10));
    if (!on || on < from || on >= to) continue;
    const weekday = new Date(ms(on)).getUTCDay();
    out.push({
      id: String(e.id || ""),
      name: String(e.name || ""),
      kind: String(e.kind || ""),
      on,
      // The Monday of its week — the same arithmetic `window` uses, so a marker
      // and a column can never disagree about which week a day is in.
      week: addDays(on, -((weekday + 6) % 7)),
    });
  }
  return out.sort((a, b) => a.on.localeCompare(b.on) || a.name.localeCompare(b.name));
}

/**
 * WHAT A PERSON SHOULD LOOK AT THIS WEEK: campaigns starting, campaigns ending,
 * and channels carrying more than one campaign at once. `crowded` is the
 * warning — not an error, because two campaigns on one channel is sometimes
 * exactly the plan, and a calendar that refused it would be wrong more often
 * than it was right.
 */
export function thisWeek(shown: readonly Bar[], asOf: string, crowdedAt = 2, events: readonly Marker[] = []) {
  const start = day(asOf);
  const end = addDays(start, 6);
  const weeks = load(shown, [start]);
  return {
    starting: shown.filter((b) => b.startOn >= start && b.startOn <= end),
    ending: shown.filter((b) => b.endOn && b.endOn >= start && b.endOn <= end),
    crowded: Object.entries(weeks[0].byChannel).filter(([, n]) => n >= crowdedAt).map(([channel, n]) => ({ channel, n })),
    // WHAT IS ON THIS WEEK, beside what is running. An event does not enter
    // `crowded`: that warning counts campaigns competing for one CHANNEL's
    // attention, and a webinar in a room competes with none of them.
    events: events.filter((e) => e.on >= start && e.on <= end),
  };
}
