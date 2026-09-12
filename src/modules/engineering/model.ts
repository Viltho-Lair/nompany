// THE ENGINEERING & DOCUMENTS DASHBOARD'S FIGURES — pure, and asserted by
// tests/engineering-dashboard.mjs without a database.
//
// THE DEPARTMENT'S OWN QUESTIONS, not a restatement of its registers. Until
// 13/09/2026 its root opened the presales dashboard (RFQs and quotations, which
// left with the Quotations department) and after that only the generic register
// summary: counts per status, one card per register. What an engineering or
// document-control lead asks first is different — what is waiting on ME, what
// is late, where the ball is on the questions we asked, how the reviews of what
// we submitted came back, and which controlled documents are due a review.
//
// NO RULE IS RESTATED. A document's state is `documentState` and an open
// revision is `isOpen`, both the register's own; everything else is read off the
// statuses the built-in record types declare (platform/engine/builtins.ts), so a
// status renamed there is a status this counts under its new name or not at all
// — never a second vocabulary quietly disagreeing.
//
// NO CLOCK IS READ. `asOf` is handed in, so the screen, the server and the test
// compute the same figures from the same day.
import { documentState, isOpen } from "@/modules/quality/qualityDocuments";

export type DocRow = {
  id: string; code?: string; title?: string;
  obsoletedAt?: string; nextReviewDate?: string;
  reviewerCollaboratorId?: string; approverCollaboratorId?: string;
};
export type RevisionRow = { documentId: string; rev?: number; state: string };
export type RecordRow = {
  id: string; reference?: string; status?: string;
  values?: Record<string, unknown>; createdAt?: string;
};

/** How far ahead a controlled document's review counts as due. */
export const REVIEW_WINDOW_DAYS = 30;
/** How many late items the attention list names. */
export const ATTENTION_ROWS = 8;

export const DOCUMENT_STATES = ["draft", "in-review", "approved", "effective", "obsolete"] as const;
export const SUBMITTAL_OUTCOMES = ["Approved", "Approved as noted", "Revise and resubmit"] as const;
/** A submittal the other side still has in its hands. */
const SUBMITTAL_WITH_REVIEWER = new Set(["Submitted", "Under review"]);
/** The ball-in-court options, in the RFI type's own order; blank is its own row. */
export const BALL_IN_COURT = ["Us", "Client", "Consultant", "Contractor", "Subcontractor"] as const;
export const NOT_SET = "";

const text = (v: unknown) => String(v ?? "").trim();
const dayOf = (v: unknown) => {
  const s = text(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
};
const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

// ---- documents ---------------------------------------------------------------

export function documentFigures(docs: readonly DocRow[], revisions: readonly RevisionRow[], asOf: string, me: string) {
  const byState: Record<string, number> = Object.fromEntries(DOCUMENT_STATES.map((s) => [s, 0]));
  let awaitingMe = 0;
  const reviewDue: { id: string; code: string; title: string; date: string; daysLeft: number }[] = [];
  const horizon = addDays(asOf, REVIEW_WINDOW_DAYS);

  for (const d of docs) {
    const mine = revisions.filter((r) => r.documentId === d.id);
    const state = documentState(d as never, mine as never);
    byState[state] = (byState[state] || 0) + 1;

    // WAITING ON ME is the open revision's own gate, the register's `waitingOn`:
    // a reviewer at review, an approver at approval, nobody otherwise.
    const open = mine.find((r) => isOpen(r.state));
    if (open && me && (
      (open.state === "review" && d.reviewerCollaboratorId === me)
      || (open.state === "approval" && d.approverCollaboratorId === me))) awaitingMe += 1;

    // A REVIEW IS DUE ONLY ON A DOCUMENT PEOPLE WORK TO. A draft has nothing
    // issued to review, and an obsolete one is not worked to any more.
    const next = dayOf(d.nextReviewDate);
    if (state === "effective" && next && next <= horizon) {
      reviewDue.push({ id: d.id, code: text(d.code), title: text(d.title), date: next, daysLeft: daysBetween(asOf, next) });
    }
  }
  reviewDue.sort((a, b) => a.date.localeCompare(b.date));
  return {
    total: docs.length,
    byState: DOCUMENT_STATES.map((state) => ({ state, count: byState[state] || 0 })),
    inReview: (byState["in-review"] || 0) + (byState.approved || 0),
    awaitingMe,
    reviewDue: reviewDue.length,
    reviewOverdue: reviewDue.filter((r) => r.daysLeft < 0).length,
    reviewDueList: reviewDue.slice(0, ATTENTION_ROWS),
  };
}

// ---- RFIs ----------------------------------------------------------------------

export function rfiFigures(rfis: readonly RecordRow[], asOf: string, months: readonly string[]) {
  // OPEN IS THE QUESTION STILL UNANSWERED. Answered is its own count: somebody
  // has replied and the asker has not accepted it (the type's own comment says
  // why closing on the answer would lose that step).
  const open = rfis.filter((r) => r.status === "Open");
  const answered = rfis.filter((r) => r.status === "Answered").length;
  const late = open
    .map((r) => ({ r, due: dayOf(r.values?.neededBy) }))
    .filter((x) => x.due && x.due < asOf)
    .map((x) => ({
      id: x.r.id, reference: text(x.r.reference), title: text(x.r.values?.subject),
      date: x.due, daysLate: daysBetween(x.due, asOf),
    }));

  // WHERE THE BALL IS, over the open ones only — an answered question is not in
  // anybody's court. A blank is counted as not set rather than dropped, so the
  // rows still add up to every open RFI.
  const ballInCourt = [...BALL_IN_COURT, NOT_SET]
    .map((who) => ({ who, count: open.filter((r) => text(r.values?.ballInCourt) === who).length }))
    .filter((row) => row.count > 0 || row.who !== NOT_SET);
  const other = open.filter((r) => {
    const who = text(r.values?.ballInCourt);
    return who !== NOT_SET && !(BALL_IN_COURT as readonly string[]).includes(who);
  }).length;

  // RAISED PER MONTH, by the date the RFI says it was raised, else when it was
  // entered — the register's own two answers to "when".
  const raised = months.map((m) => rfis.filter((r) => (dayOf(r.values?.raisedOn) || dayOf(r.createdAt)).slice(0, 7) === m).length);

  return {
    total: rfis.length,
    open: open.length,
    answered,
    overdue: late.length,
    ballInCourt: other ? [...ballInCourt, { who: "other", count: other }] : ballInCourt,
    raised,
    late,
  };
}

// ---- submittals --------------------------------------------------------------------

export function submittalFigures(submittals: readonly RecordRow[], asOf: string) {
  const withReviewer = submittals.filter((s) => SUBMITTAL_WITH_REVIEWER.has(text(s.status)));
  const late = withReviewer
    .map((s) => ({ s, due: dayOf(s.values?.dueOn) }))
    .filter((x) => x.due && x.due < asOf)
    .map((x) => ({
      id: x.s.id, reference: text(x.s.reference), title: text(x.s.values?.title),
      date: x.due, daysLate: daysBetween(x.due, asOf),
    }));
  // THE OUTCOME AS IT STANDS NOW. A resubmitted one is Submitted again and is
  // counted there, not here — the register has one status per submittal, so the
  // slices are exclusive and a donut is honest.
  const outcomes = SUBMITTAL_OUTCOMES.map((outcome) => ({
    outcome, count: submittals.filter((s) => s.status === outcome).length,
  }));
  return {
    total: submittals.length,
    withReviewer: withReviewer.length,
    overdue: late.length,
    reviseResubmit: outcomes.find((o) => o.outcome === "Revise and resubmit")?.count || 0,
    outcomes,
    late,
  };
}

// ---- transmittals, the engineering BOM and the library ---------------------------------

export function countStatus(rows: readonly RecordRow[], status: string) {
  return rows.filter((r) => r.status === status).length;
}

/** The late RFIs and submittals together, latest-due first cut to a few. */
export function attention(
  rfiLate: ReturnType<typeof rfiFigures>["late"],
  submittalLate: ReturnType<typeof submittalFigures>["late"],
) {
  return [
    ...rfiLate.map((x) => ({ ...x, kind: "rfi" as const })),
    ...submittalLate.map((x) => ({ ...x, kind: "submittal" as const })),
  ].sort((a, b) => b.daysLate - a.daysLate).slice(0, ATTENTION_ROWS);
}
