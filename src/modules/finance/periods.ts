// A MONTH THAT IS FINISHED WITH.
//
// EVERY ENTRY IN THIS LEDGER HAS ALWAYS BEEN POSTABLE INTO ANY MONTH. A studio
// could report September, send the figures to its accountant, and then post a
// bill dated the 3rd of September in November — and the September it had
// already reported would quietly stop being the September in the system.
// Nothing said it had changed, because nothing was watching.
//
// A CLOSE IS A LOCK ON A DATE RANGE, not a checklist. It does not require every
// document to be posted first, and it deliberately does not: a studio that
// cannot close until everything is perfect never closes, and a lock that is
// never applied protects nothing. What it DOES do is say what is still
// unposted, so the decision is made with the list in front of somebody.
//
// REOPENING IS ALLOWED AND RECORDED. A period that can never be reopened turns
// one honest mistake into a permanent wrong number, and every accounting system
// that pretends otherwise grows a "period 13" to put the corrections in. What
// matters is that reopening is a decision somebody made, with a name on it.
//
// PURE. No imports, no store, no clock.

export const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type Period = {
  id: string;
  /** `YYYY-MM`. */
  period: string;
  closedByCollaboratorId: string;
  closedAt: string;
  /** Set when a closed period was reopened; the row stays either way. */
  reopenedByCollaboratorId?: string;
  reopenedAt?: string;
  reason?: string;
};

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** The period a date falls in, or "" when it is not a date. */
export const periodOf = (day: unknown): string => {
  const d = str(day, 10);
  return DAY_RE.test(d) ? d.slice(0, 7) : "";
};

/**
 * IS THIS PERIOD CLOSED? The row's presence is not the answer — a reopened
 * period keeps its row, because deleting it would erase the fact that it was
 * ever closed and reopened, which is precisely the fact an auditor wants.
 */
export const isClosed = (rows: Period[], period: string): boolean =>
  rows.some((r) => r.period === period && !r.reopenedAt);

/**
 * MAY AN ENTRY DATED HERE BE POSTED? A reason, or null.
 *
 * IT REFUSES THE POSTING, NOT THE DOCUMENT. An invoice raised late still
 * exists; what it cannot do is land in a month somebody has already reported.
 * The alternative — silently posting it into the next open period — would put
 * September's revenue in November and give two people two different answers to
 * "what did we do in September", which is worse than a refusal somebody has to
 * think about.
 */
export function postingProblem(rows: Period[], date: unknown): string | null {
  const period = periodOf(date);
  // A DATE THAT IS NOT A DATE IS NOT THIS FUNCTION'S PROBLEM. `postEntry`
  // defaults an unparseable date to today, and answering "closed" here for a
  // value that will become today would refuse a posting for a month nobody
  // named.
  if (!period) return null;
  return isClosed(rows, period) ? "period-closed" : null;
}

/** What is wrong with closing this period, or an empty array. */
export function closeProblems(rows: Period[], period: string): string[] {
  const problems: string[] = [];
  if (!PERIOD_RE.test(period)) problems.push("pick a month");
  else if (isClosed(rows, period)) problems.push("that month is already closed");
  return problems;
}

/**
 * WHAT A CLOSE WOULD LOCK — everything already posted into the period, and
 * everything dated in it that is NOT yet posted.
 *
 * THE SECOND LIST IS THE POINT. A close that only said "12 entries" would be a
 * button somebody presses; a close that says "12 entries, and 3 bills dated in
 * this month are not in the books" is a decision. It does not block the close —
 * see the header for why a lock that is never applied protects nothing.
 */
export function closePreview<E extends { date?: string }, D extends { id: string }>(
  entries: E[],
  unpostedByDate: { document: D; date: string; kind: string }[],
  period: string,
): { entries: number; unposted: { id: string; kind: string; date: string }[] } {
  return {
    entries: entries.filter((e) => periodOf(e.date) === period).length,
    unposted: unpostedByDate
      .filter((u) => periodOf(u.date) === period)
      .map((u) => ({ id: u.document.id, kind: u.kind, date: u.date }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/**
 * THE MONTHS A STUDIO HAS, NEWEST FIRST, with their state.
 *
 * DERIVED FROM THE ENTRIES rather than from a calendar: a studio's first month
 * is the month of its first posting, and listing every month since the epoch
 * would be a screen of empty rows nobody closes. The current month is included
 * even with nothing in it, because it is the one somebody is working in.
 */
export function periodList<E extends { date?: string }>(
  entries: E[],
  rows: Period[],
  today: string,
): { period: string; entries: number; closed: boolean; reopened: boolean }[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const p = periodOf(e.date);
    if (p) counts.set(p, (counts.get(p) || 0) + 1);
  }
  const now = periodOf(today);
  if (now) counts.set(now, counts.get(now) || 0);
  // A CLOSED MONTH WITH NO ENTRIES IS STILL A ROW: closing an empty month is a
  // legitimate act — it says "nothing happened and nothing may" — and hiding it
  // would make the lock invisible.
  for (const r of rows) counts.set(r.period, counts.get(r.period) || 0);

  return [...counts.entries()]
    .map(([period, count]) => ({
      period,
      entries: count,
      closed: isClosed(rows, period),
      reopened: rows.some((r) => r.period === period && Boolean(r.reopenedAt)),
    }))
    .sort((a, b) => b.period.localeCompare(a.period));
}

/** The stored shape of a close. */
export function cleanClose(
  period: string,
  { collaboratorId, at }: { collaboratorId: string; at: string },
): Omit<Period, "id"> {
  return { period: str(period, 7), closedByCollaboratorId: collaboratorId, closedAt: at };
}
