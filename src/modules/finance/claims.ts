// EXPENSE CLAIMS AND STAFF ADVANCES — money a person spent for the studio, and
// money the studio handed a person to spend.
//
// PURE. The store half is ./claimsService; asserted in tests/expense-claims-model.mjs.
//
// A CLAIM IS NOT AN EXPENSE. An expense is money the STUDIO spent, recorded by
// whoever keeps the books; a claim is a PERSON asking to be paid back, which
// the studio owes only once somebody else has agreed it. So a claim walks its
// own ladder — Draft, Submitted, Approved (or Rejected), Paid — and the
// approver is never the claimant (invariant 7's shape: asking and agreeing are
// two people). It posts on approval, when the studio accepts the debt:
//   Dr the expense accounts (by category, as an expense does)
//   Cr Staff Advances (1250) for what the person still holds of an advance
//   Cr Staff Claims Payable (2210) for the rest
// and paying it moves the payable part out of a money account.
//
// AN ADVANCE is money handed over before it is spent: Dr 1250, Cr the money
// account. It is cleared by the claims that follow — each takes what it can
// from the person's open advance — or by the person handing back what is left.

export const CLAIM_STATUSES = ["Draft", "Submitted", "Approved", "Rejected", "Paid"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export type ClaimLine = { date: string; category: string; description: string; amount: number };
export type Claim = {
  id: string;
  reference?: string;
  claimantCollaboratorId: string;
  status: ClaimStatus;
  lines: ClaimLine[];
  /** Frozen at approval: how much of the total cleared an open advance. */
  fromAdvance?: number;
  approvedByCollaboratorId?: string;
  paidOn?: string;
};
export type Advance = {
  id: string;
  collaboratorId: string;
  amount: number;
  /** Handed back. An advance's open part is amount − returned − what claims took. */
  returned?: number;
  status?: "Paid" | "Cancelled";
};

const text = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const isDay = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(text(v, 10));
const round = (n: number) => Math.round(n * 1000) / 1000;

/** The lines as stored, or the problems with them. Every line needs a positive amount. */
export function cleanClaimLines(raw: unknown): { lines: ClaimLine[] } | { problems: string[] } {
  const problems: string[] = [];
  const lines: ClaimLine[] = [];
  const rows = Array.isArray(raw) ? raw.slice(0, 50) : [];
  rows.forEach((r, i) => {
    const row = (r || {}) as Record<string, unknown>;
    const amount = Number(row.amount);
    if (!(amount > 0)) { problems.push(`line ${i + 1} needs an amount above nought`); return; }
    lines.push({
      date: isDay(row.date) ? text(row.date, 10) : "",
      category: text(row.category, 80),
      description: text(row.description, 300),
      amount: round(amount),
    });
  });
  if (!lines.length && !problems.length) problems.push("a claim needs at least one line");
  return problems.length ? { problems } : { lines };
}

export const claimTotal = (claim: Pick<Claim, "lines">): number =>
  round((claim.lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0));

/** What the studio still owes the claimant in cash once the advance has taken its part. */
export const claimPayable = (claim: Pick<Claim, "lines" | "fromAdvance">): number =>
  round(Math.max(0, claimTotal(claim) - (Number(claim.fromAdvance) || 0)));

/**
 * MAY `actor` MOVE THIS CLAIM TO `to`? A reason, or null.
 * `Paid` is not a move: it is what paying does. Nor are `Approved` and
 * `Rejected` since 19/09/2026: they are the answers to its approval, given on
 * the Approvals page, where the claimant is never asked about their own claim
 * (the Admin excepted).
 */
export function claimMoveProblem(claim: Pick<Claim, "status" | "claimantCollaboratorId">, to: string, actor: string): string | null {
  const own = claim.claimantCollaboratorId === actor;
  const from = claim.status;
  if (to === "Submitted") return from === "Draft" ? (own ? null : "not-yours") : "status";
  if (to === "Draft") return (from === "Submitted" || from === "Rejected") ? (own ? null : "not-yours") : "status";
  return "status";
}

/** What a person still holds of the advances paid to them. */
export function openAdvance(advances: Advance[], claims: Claim[], collaboratorId: string): number {
  const given = advances
    .filter((a) => a.collaboratorId === collaboratorId && a.status !== "Cancelled")
    .reduce((s, a) => s + (Number(a.amount) || 0) - (Number(a.returned) || 0), 0);
  const taken = claims
    .filter((c) => c.claimantCollaboratorId === collaboratorId && (c.status === "Approved" || c.status === "Paid"))
    .reduce((s, c) => s + (Number(c.fromAdvance) || 0), 0);
  return round(Math.max(0, given - taken));
}

/** How much of a claim an open advance clears, decided once, at approval. */
export const advanceTakes = (total: number, open: number): number => round(Math.max(0, Math.min(total, open)));
