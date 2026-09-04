// WHOSE BUSY BLOCKS A COLLEAGUE MAY SEE, INSIDE ONE STUDIO. This is the gate,
// not the calendar reader — busyFor (./calendarFreeBusy) already refuses to
// leak WHAT somebody is doing; this file refuses to answer for somebody who
// never agreed to be asked, or who is not even in the room.
//
// TWO CONDITIONS, BOTH REQUIRED. A person's busy blocks show up only if they
// are a member of THIS studio AND on THIS studio's share list
// (calendarShare.ts). Membership alone is not consent — every collaborator is
// a member, and defaulting to "visible unless opted out" would make silence
// mean exposure. Consent alone is not enough either: calendarShare.ts's own
// header explains why a share-list entry can outlive its person — it is a
// separate key from the collaborator row on purpose, so cascade-deleting a
// studio's people does not touch a share flag that belongs to a different
// studio's key entirely, and cascade-deleting the OTHER direction (removing
// one collaborator) does not sweep this key at all. So a stale CollaboratorID
// on the share list is not a hypothetical; it is the expected shape the day
// after somebody leaves, and it must resolve to nobody rather than to
// whoever the id used to name.
import { listSharers } from "@/platform/auth/calendarShare";
import { listCollaborators } from "@/platform/auth/collaborators";
import { listConnections } from "@/platform/auth/calendarConnections";
import { mergeBusy, type BusyInterval } from "@/shared/calendar";
import { busyFor } from "./calendarFreeBusy";

/**
 * THE PURE INTERSECTION — no store, testable with two plain arrays. Order
 * follows `members`, not `sharers`: the member list is the trustworthy one
 * (it is read fresh from the studio's own collaborator rows), so a caller
 * iterating the result is iterating real, current people, not whatever order
 * a share list happened to accumulate entries in.
 *
 * A SHARE-LIST ENTRY WITH NO MATCHING MEMBER PRODUCES NOTHING. That is the
 * whole point: `sharers` can carry a CollaboratorID for somebody who left the
 * studio (calendarShare.ts is a separate key from the collaborator row, so
 * nothing clears it when that happens), and the only way to stop that stale
 * id from resolving to a real person's data is to never let it leave this
 * function un-intersected with `members`.
 */
export function visibleSharers(sharers: string[], members: { id: string }[]): string[] {
  const shared = new Set(sharers);
  return members.filter((m) => shared.has(m.id)).map((m) => m.id);
}

export type TeamAvailability = {
  collaboratorId: string;
  busy: BusyInterval[];
  /**
   * WHETHER THERE WAS ANYTHING TO ASK. False for somebody who opted in and has
   * connected no calendar at all.
   *
   * THIS FIELD EXISTS BECAUSE `busy: []` IS AMBIGUOUS WITHOUT IT, and the
   * ambiguity resolves in the dangerous direction. An empty array is what a
   * connected, genuinely free person looks like AND what somebody with no
   * connection looks like — and the second of those is not free, it is
   * unknown: nobody knows one thing about their time. A screen that cannot
   * tell them apart draws an unknown calendar as a bookable one, which is the
   * precise failure this whole phase was built to prevent, and it is worse
   * than the absent case (a person who never opted in is missing from this
   * array entirely, and absence at least LOOKS like absence).
   *
   * It was added after the fact: the strip on the planner found the hole by
   * having to render it. The row shape below carried "opted in, nothing
   * connected" and "connected, nothing on" as the same two fields, so the only
   * honest thing a screen could do was guess.
   *
   * FALSE, NOT TRUE, WHEN THE LOOKUP FAILED. `error` already says the row is
   * unknown; claiming a connection we could not read would be asserting
   * something nothing established.
   */
  connected: boolean;
  /**
   * THE PARTIAL-FAILURE DECISION. teamAvailability fans out across several
   * people and, per person, across however many calendars they connected.
   * One provider can fail on its own — a revoked grant, an outage — while
   * everyone else's lookup succeeds, and account/calendar/events/route.ts
   * (Phase 1) already answered the shape question once: collect every
   * outcome independently rather than letting one failure take down the
   * whole response, and surface which one failed rather than silently
   * dropping it.
   *
   * This file stays consistent with that call but attaches the failure to
   * the ROW instead of a second top-level array. A top-level `errors` list
   * needs its own key to join back to a person (the events route can get
   * away with a bare `provider`, because on an account screen there is only
   * ever one person); here every row already carries its collaboratorId, so
   * a second array would just be this one's join key duplicated. Optional
   * and additive — a caller that only reads `collaboratorId`/`busy`, exactly
   * the shape the brief specifies, still works unchanged.
   *
   * WHY THIS MATTERS: `busy: []` is also what a genuinely free, fully-opted-
   * in person with no failures looks like (see the no-connection case
   * below). Without `error`, a failed lookup and an empty calendar are the
   * same value on the wire, and the worse of the two ways to be wrong here
   * is the quiet one — a colleague booking over a calendar that is not
   * actually known to be free. Set only when at least one connected
   * provider failed; `busy` still carries whatever the OTHER providers
   * (Google succeeding while Microsoft is down, say) managed to answer, so
   * one broken connection does not cost a person their working one either.
   */
  error?: string;
}[];

// INJECTED, SAME CONVENTION AS calendarOAuth.ts's freshAccessToken/deps
// PATTERN — every one of these four is a store or network call, and this is
// the only door onto them, so a test proving the isolation below holds needs
// no store: hand it fakes that resolve or reject on cue.
export type TeamAvailabilityDeps = {
  listSharersImpl?: typeof listSharers;
  listCollaboratorsImpl?: typeof listCollaborators;
  listConnectionsImpl?: typeof listConnections;
  busyForImpl?: typeof busyFor;
};

/**
 * One studio's visible availability over a window.
 *
 * ADDRESSED BY COLLABORATORID THROUGHOUT (invariant 6). Each visible
 * sharer's UserID is looked up here only long enough to reach
 * listConnections and busyFor — it never appears on the returned row.
 *
 * A VISIBLE SHARER WITH NO CONNECTION STILL GETS A ROW, with `busy: []` AND
 * `connected: false`. They opted in; they simply have nothing hooked up yet.
 * Omitting the row would read the same on a strip as "not on the share list at
 * all", which collapses two different facts (unknown vs. genuinely nothing to
 * show) into one blank space — and `busy: []` ALONE would have been worse
 * still, because it reads as "free all week" about a person nothing was ever
 * asked about. `connected` is what keeps those three apart; see its own note
 * on the type above. A person who did NOT opt in, by contrast, is absent from
 * this array entirely — visibleSharers already filtered them out — because
 * for them absence is the only honest answer: an empty array would claim
 * "free all day" about a calendar this feature was never allowed to look at.
 */
export async function teamAvailability(
  { studioId, from, to }: { studioId: string; from: string; to: string },
  deps: TeamAvailabilityDeps = {},
): Promise<TeamAvailability> {
  const listSharersFn = deps.listSharersImpl ?? listSharers;
  const listCollaboratorsFn = deps.listCollaboratorsImpl ?? listCollaborators;
  const listConnectionsFn = deps.listConnectionsImpl ?? listConnections;
  const busyForFn = deps.busyForImpl ?? busyFor;

  const [sharers, rawMembers] = await Promise.all([
    listSharersFn(studioId),
    listCollaboratorsFn(studioId),
  ]);
  // listCollaborators reads a generic Row (Record<string, unknown>) — most of
  // its many callers only ever compare or re-stringify `.id`/`.userId`
  // (String(c.userId), the pattern hr.ts/tasks.ts/etc. all use) rather than
  // widening the shared repository's return type for one caller. Normalising
  // the two fields this file actually needs, once, here, keeps that
  // convention instead of typing collaborators.ts's export more narrowly for
  // a shape nobody else asked for.
  const members = rawMembers.map((m) => ({ id: String(m.id), userId: String(m.userId) }));
  const visible = visibleSharers(sharers, members);
  const byId = new Map(members.map((m) => [m.id, m]));

  return Promise.all(visible.map(async (collaboratorId): Promise<TeamAvailability[number]> => {
    const member = byId.get(collaboratorId);
    // visibleSharers only ever returns ids it found in `members`, so this is
    // always set — the guard exists so a future change to that intersection
    // fails as "no busy shown" rather than as a crash reading .userId off
    // undefined.
    if (!member) return { collaboratorId, busy: [], connected: false };

    // THE WHOLE PER-PERSON LOOKUP IS WRAPPED, NOT JUST THE busyFor FAN-OUT
    // BELOW. listConnections is a store read like any other, and this
    // callback runs inside Promise.all(visible.map(...)) — a rejection
    // escaping here (a transient database fault, exactly the failure mode
    // this machine is in right now with the Cloud SQL proxy down) would
    // propagate through Promise.all and fail teamAvailability() entirely,
    // discarding every OTHER person's row along with it. try/catch is what
    // actually keeps a failure local to this one callback; the allSettled
    // fan-out one level down only ever protected the busyFor calls it
    // wraps, never the read that has to succeed before it can start.
    try {
      const connections = await listConnectionsFn(member.userId);
      if (!connections.length) return { collaboratorId, busy: [], connected: false };

      // EACH CONNECTION SUCCEEDS OR FAILS ON ITS OWN. allSettled, not
      // Promise.all — a rejected Microsoft lookup must not throw away a
      // Google lookup that already came back for the same person.
      const outcomes = await Promise.allSettled(
        connections.map((c) => busyForFn({ userId: member.userId, provider: c.provider, from, to })),
      );

      const intervals: BusyInterval[] = [];
      const failures: string[] = [];
      for (const outcome of outcomes) {
        if (outcome.status === "fulfilled") intervals.push(...outcome.value);
        // busyFor's rejections carry the provider's own words (CalendarApiError,
        // ./calendarFreeBusy) or a plain Error's — never a token, which is what
        // makes surfacing the message here safe, exactly as the events route
        // already relies on.
        else failures.push(outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason));
      }

      const row: TeamAvailability[number] = { collaboratorId, busy: mergeBusy(intervals), connected: true };
      if (failures.length) row.error = failures.join("; ");
      return row;
    } catch (e) {
      // listConnections failed outright for this one person. Same shape as a
      // failed provider above — an error row, not a thrown exception — so
      // this person's failure costs exactly their own row and nothing else.
      return { collaboratorId, busy: [], connected: false, error: e instanceof Error ? e.message : String(e) };
    }
  }));
}
