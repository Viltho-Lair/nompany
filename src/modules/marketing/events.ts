// AN EVENT, AND WHO ACTUALLY CAME — pure, so the screen and the server reach
// the same answer from the same function (22/09/2026).
//
// AN EVENT DOES NOT STORE ITS REGISTRATIONS. A registration is a form answer,
// and the form tool has done registration since it shipped: a public page, the
// consent tick, the lead it raises, the CSV. Giving an event its own list of
// who signed up would be a second register of the same people, free to disagree
// with the first the moment somebody answered the form again — the rule that
// keeps spend in Finance and the calendar's bars on the campaigns. So the event
// NAMES a form and counts its replies.
//
// WHAT AN EVENT DOES OWN IS ATTENDANCE, because nothing else in the product
// knows it. Registering and turning up are different facts, and the gap between
// them is the only number an event exists to produce.

/** A talk in a room, or a talk down a wire. The difference is where people go. */
export const EVENT_KINDS = ["event", "webinar"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export type EventShape = {
  name?: string;
  kind?: string;
  startsAt?: string;
  endsAt?: string;
  capacity?: number | null;
};

const stamp = (v: unknown) => String(v ?? "").trim();
const isStamp = (v: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);

/**
 * WHAT REFUSES AN EVENT. It needs a name and a start, because an event with
 * neither is a note; the end is optional, since plenty of events run "from 6pm"
 * and nobody decides when the room empties.
 */
export function eventProblem(e: EventShape): string {
  if (!String(e.name || "").trim()) return "name";
  if (!(EVENT_KINDS as readonly string[]).includes(String(e.kind || ""))) return "kind";
  const from = stamp(e.startsAt);
  if (!isStamp(from)) return "starts";
  const to = stamp(e.endsAt);
  if (to && (!isStamp(to) || to < from)) return "ends";
  // A capacity of nought is a room nobody may enter, which is not a capacity —
  // "no limit" is what a blank means, and the two are stored apart.
  if (e.capacity !== null && e.capacity !== undefined && !(Number(e.capacity) > 0)) return "capacity";
  return "";
}

/**
 * WHERE AN EVENT IS IN TIME, judged by a clock HANDED IN. The server's own,
 * always: a screen asking its own browser would call an event past for somebody
 * in one time zone and running for somebody in another, looking at one row.
 */
export function eventState(e: { startsAt?: string; endsAt?: string }, now: string): "upcoming" | "running" | "past" {
  const from = stamp(e.startsAt);
  const to = stamp(e.endsAt) || from;
  if (!isStamp(from)) return "upcoming";
  if (now < from) return "upcoming";
  return now > to ? "past" : "running";
}

/**
 * HOW MANY SEATS ARE LEFT — NULL when there is no limit, and that is the whole
 * point of the field. Nought and "as many as turn up" are opposite facts, and a
 * screen that rendered both as "0 left" would tell a studio its open webinar
 * was full.
 *
 * NEGATIVE WHEN OVERSUBSCRIBED rather than clamped: a capacity of 50 with 58
 * registrations is eight people who need a bigger room, and clamping to nought
 * hides exactly the number somebody has to act on. Nothing refuses a
 * registration — the form does not know about the event, and a public page that
 * started rejecting people because a figure in Marketing moved would be a
 * silent outage.
 */
export function seatsLeft(capacity: number | null | undefined, registrations: number): number | null {
  return capacity === null || capacity === undefined ? null : capacity - registrations;
}

export type Turnout = {
  registered: number;
  attended: number;
  /** Attended over registered, 0–1. NULL when nobody registered — nothing to be a share OF. */
  rate: number | null;
  /** Registered and did not come. Never negative: see `noShows`. */
  noShows: number;
};

/**
 * WHO TURNED UP, AGAINST WHO SAID THEY WOULD.
 *
 * `attended` MAY EXCEED `registered` and the arithmetic says so honestly: people
 * walk in, and a studio that marks a walk-in as attended has one more attendee
 * than it has registrations. `noShows` floors at nought because "minus three
 * people failed to turn up" is not a sentence, but the rate is left alone — a
 * turnout over 100% is a real and interesting result.
 */
export function turnout(registered: number, attended: number): Turnout {
  return {
    registered,
    attended,
    rate: registered > 0 ? attended / registered : null,
    noShows: Math.max(0, registered - attended),
  };
}

/**
 * DELETING. An event that has already run is kept, the register's own rule for
 * a campaign that ran: it is the record of what happened, and its turnout is
 * the only place that number exists.
 */
export function eventDeletable(state: string, attended: number): string {
  if (state === "past") return "event-ran";
  if (attended > 0) return "event-attended";
  return "";
}

/** Only what a registration must expose for an event to count it. */
export type RegistrationLike = { id: string; createdAt?: string };

/**
 * THE ATTENDANCE LIST, CLEANED AGAINST THE REGISTRATIONS THAT EXIST.
 *
 * AN ID FOR A REPLY SOMEBODY HAS SINCE DELETED IS DROPPED HERE, at the point of
 * reading, rather than being prevented at the write. The containment is in the
 * reader for the reason `projectBilling` gives: a write-time check cannot cover
 * deletion, which happens afterwards and elsewhere. So the stored list is
 * allowed to go stale and the count never is.
 */
export function attendedAmong(
  attendance: readonly string[] | null | undefined,
  registrations: readonly RegistrationLike[],
): string[] {
  const live = new Set(registrations.map((r) => r.id));
  return [...new Set(attendance || [])].filter((id) => live.has(id));
}
