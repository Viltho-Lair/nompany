// A LEAD'S CLOCK AND WHO HAS IT — purely. No store, no routes, no imports.
//
// The owner's flow, 19/09/2026: a campaign sends a lead to Sales; it arrives as
// a ticket at Lead with NOBODY on it; a Sales manager (whoever holds
// `crmSales.tickets.assign`) hands it to a sales executive by hand; the
// executive cannot turn it down, only the manager can move it to someone else.
// The deadline is the CAMPAIGN's: each campaign says how many hours its leads
// may wait, and the lead carries that number from the moment it is raised.
//
// TWO FIELDS, TWO MEANINGS. `createdByCollaboratorId` is who raised the ticket
// and never changes. `assignedToCollaboratorId` is who is working it, set by a
// manager, and "" while nobody is. A ticket Sales raises for itself is assigned
// to its raiser, exactly as every existing ticket already is.
//
// The screen and the server both read this file, so "overdue" means one thing.
// tests/leads-model.mjs asserts it.

/** How long a campaign may give its leads, in hours. A week at most, an hour at least. */
export const MAX_LEAD_HOURS = 24 * 7;

/** A deadline typed on a campaign: a whole number of hours, or null for none. */
export function leadHours(v: unknown): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(n, MAX_LEAD_HOURS);
}

type LeadRow = {
  status?: string;
  assignedToCollaboratorId?: string;
  createdAt?: string;
  assignedAt?: string;
  firstActionAt?: string;
  leadDeadlineHours?: number | null;
};

const plusHours = (iso: string | undefined, hours: number): string => {
  const t = Date.parse(String(iso || ""));
  return Number.isFinite(t) ? new Date(t + hours * 3600000).toISOString() : "";
};

/**
 * WHERE A LEAD STANDS, as a token the screen puts into words:
 *
 * - `unassigned`: nobody is on it yet, and its deadline (if any) has not passed;
 * - `late-assign`: nobody is on it and the campaign's hours have run out;
 * - `late-action`: somebody was given it and has done nothing with it within
 *   the same number of hours from being given it;
 * - "" for everything else — a lead somebody is working, a ticket that is not a
 *   lead, or one whose campaign set no deadline and which has an assignee.
 *
 * Only a ticket still at the Lead stage is judged: moving it on IS acting on it.
 * `now` is handed in; this file reads no clock.
 */
export function leadState(t: LeadRow, now: string): string {
  if ((t.status || "Lead") !== "Lead") return "";
  const hours = t.leadDeadlineHours ?? null;
  if (!t.assignedToCollaboratorId) {
    if (hours === null) return "unassigned";
    const due = plusHours(t.createdAt, hours);
    return due && due < now ? "late-assign" : "unassigned";
  }
  if (hours === null || t.firstActionAt) return "";
  const due = plusHours(t.assignedAt || t.createdAt, hours);
  return due && due < now ? "late-action" : "";
}

/** When the current clock on a lead runs out, or "" when it has none. */
export function leadDueAt(t: LeadRow): string {
  const hours = t.leadDeadlineHours ?? null;
  if (hours === null || (t.status || "Lead") !== "Lead") return "";
  if (!t.assignedToCollaboratorId) return plusHours(t.createdAt, hours);
  if (t.firstActionAt) return "";
  return plusHours(t.assignedAt || t.createdAt, hours);
}

/**
 * MAY THIS READER SEE THIS TICKET AT ALL? An unassigned lead is the manager's
 * queue — the owner, 19/09/2026: "the user with full access on sales will see
 * unassigned leads" — so it is hidden from everybody who cannot assign it. Once
 * somebody is on it, it is an ordinary ticket again.
 */
export const ticketVisible = (t: { assignedToCollaboratorId?: string }, canAssign: boolean): boolean =>
  canAssign || Boolean(t.assignedToCollaboratorId);

/** One step in who has had a lead. Appended, never rewritten. */
export type AssignmentStep = { to: string; by: string; at: string };

/**
 * WHAT ASSIGNING WRITES, judged against the row being written (invariant 8).
 * "" as the target is refused: the owner decided an executive cannot put a lead
 * back, and a manager clearing an assignee would be the same act by another door.
 */
export function assignProblem(row: { assignedToCollaboratorId?: string } | null, to: string): string {
  if (!row) return "notfound";
  if (!to) return "assignee";
  if (row.assignedToCollaboratorId === to) return "same";
  return "";
}

export function assignPatch(row: { assignmentHistory?: unknown }, to: string, by: string, at: string) {
  const history = Array.isArray(row.assignmentHistory) ? (row.assignmentHistory as AssignmentStep[]) : [];
  return {
    assignedToCollaboratorId: to,
    assignedAt: at,
    assignedByCollaboratorId: by,
    // A NEW ASSIGNEE STARTS A NEW CLOCK: what the last person did not do is not
    // held against the next one.
    firstActionAt: "",
    assignmentHistory: [...history, { to, by, at }].slice(-50),
    updatedAt: at,
  };
}

/** Whole days between an instant and a date, for the daily notices' milestones. */
export function daysLate(dueISO: string, todayISO: string): number | null {
  const a = Date.parse(String(dueISO || "").slice(0, 10) + "T00:00:00Z");
  const b = Date.parse(`${todayISO}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}
