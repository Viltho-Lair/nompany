// PROGRESS CLAIMS, PURELY (tier 6) — an interim payment application measured
// line by line against the bill, certified by the client, then invoiced.
//
// HOW CONTRACTORS IN THE REGION ARE PAID: each month the studio APPLIES for the
// quantity of every bill line done to date, the client's engineer CERTIFIES what
// they accept, and the certificate is what is invoiced. Before this a project
// could bill only fixed milestones, and a claim cut on certification looked
// exactly like a claim never made — billing-milestones.md said so in words.
//
// CUMULATIVE, LIKE A SUBCONTRACT CERTIFICATE (procurement/subcontractModel):
// every claim states the quantity done TO DATE, and this period is the
// difference from the last CERTIFIED claim. Summing periods double-counts the
// moment somebody corrects an earlier month; a cumulative figure is corrected by
// the next claim. So a quantity can never go below what was already certified.
//
// No imports, no store, no clock.

export const CLAIM_STATUSES = ["Draft", "Submitted", "Certified"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

/** One line the claim is measured against — a bill line or a quotation line, frozen onto the claim. */
export type SourceLine = { key: string; code: string; description: string; unit: string; qty: number; rate: number };
export type ClaimLine = SourceLine & { claimedQty: number; certifiedQty: number | null };
export type ClaimLike = { id?: unknown; number?: unknown; status?: unknown; lines?: unknown };

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const quantity = (n: number) => Math.round(n * 10000) / 10000;
const text = (v: unknown) => String(v ?? "");

/** The tender's bill, in the document's own order. A line with no description is not a line. */
export function sourceFromBoq(items: readonly Record<string, unknown>[]): SourceLine[] {
  return [...items]
    .sort((a, b) => num(a.sortOrder) - num(b.sortOrder))
    .filter((i) => text(i.description).trim())
    .map((i) => ({
      key: text(i.id), code: text(i.code), description: text(i.description), unit: text(i.unit),
      qty: num(i.qty), rate: num(i.rate),
    }));
}

/** A quotation's priced lines, keyed by position — a quotation line has no id of its own. */
export function sourceFromQuotation(items: readonly Record<string, unknown>[]): SourceLine[] {
  return items
    .map((i, n) => ({
      key: `q${n}`, code: "", description: text(i.description), unit: "",
      qty: num(i.qty), rate: num(i.unitPrice),
    }))
    .filter((l) => l.description.trim());
}

/** A claim's lines, tolerant of anything stored. */
export function linesOf(claim: ClaimLike | null | undefined): ClaimLine[] {
  return (Array.isArray(claim?.lines) ? claim.lines : []).map((raw) => {
    const l = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    return {
      key: text(l.key), code: text(l.code), description: text(l.description), unit: text(l.unit),
      qty: num(l.qty), rate: num(l.rate), claimedQty: num(l.claimedQty),
      certifiedQty: l.certifiedQty === null || l.certifiedQty === undefined ? null : num(l.certifiedQty),
    };
  });
}

/** A claim's sequence number, read off "IPC-07" — numeric, so IPC-100 follows IPC-99. */
const seq = (c: ClaimLike) => Number(text(c.number).replace(/\D/g, "")) || 0;

/** The next claim's number for a project. Never reused, even after a draft is deleted. */
export function nextClaimNumber(claims: readonly ClaimLike[]): string {
  const next = claims.reduce((m, c) => Math.max(m, seq(c)), 0) + 1;
  return `IPC-${String(next).padStart(2, "0")}`;
}

/**
 * THE QUANTITIES CERTIFIED TO DATE before the claim numbered `number` (every
 * certified claim when none is given): the LAST certified claim's figures,
 * because they are cumulative — never a sum across claims.
 */
export function certifiedBefore(claims: readonly ClaimLike[], number?: string): Map<string, number> {
  const limit = number ? seq({ number }) : Infinity;
  const last = claims
    .filter((c) => text(c.status) === "Certified" && seq(c) < limit)
    .sort((a, b) => seq(a) - seq(b))
    .pop();
  const out = new Map<string, number>();
  for (const l of linesOf(last)) out.set(l.key, l.certifiedQty ?? l.claimedQty);
  return out;
}

/** A new claim starts every line at what is already certified — the work does not un-happen. */
export function newClaimLines(source: readonly SourceLine[], previous: Map<string, number>): ClaimLine[] {
  return source.map((s) => ({ ...s, claimedQty: previous.get(s.key) ?? 0, certifiedQty: null }));
}

/** New quantities for one column, by line key. Keys not on the claim are ignored. */
export function withQuantities(lines: ClaimLine[], patch: unknown, field: "claimedQty" | "certifiedQty"): ClaimLine[] {
  const given = new Map<string, number>();
  for (const raw of Array.isArray(patch) ? patch : []) {
    const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    if (p.qty === "" || p.qty === null || p.qty === undefined) continue;
    given.set(text(p.key), Number(p.qty));
  }
  return lines.map((l) => (given.has(l.key) ? { ...l, [field]: given.get(l.key) } : l));
}

export type ClaimValuation = {
  /** Certified before this claim — what earlier invoices covered. */
  previous: number;
  appliedToDate: number;
  appliedThisPeriod: number;
  /** Null until the client has certified this claim. */
  certifiedToDate: number | null;
  certifiedThisPeriod: number | null;
  /** On this period's figure — certified once there is one, applied until then. */
  retention: number;
  net: number;
  /** Lines measured beyond the bill quantity. Flagged, not refused: remeasurement is real. */
  overMeasured: string[];
};

export function claimValuation(claim: ClaimLike, previous: Map<string, number>, retentionPercent: unknown): ClaimValuation {
  const lines = linesOf(claim);
  let prev = 0;
  let applied = 0;
  let certified = 0;
  const overMeasured: string[] = [];
  for (const l of lines) {
    prev += (previous.get(l.key) || 0) * l.rate;
    applied += l.claimedQty * l.rate;
    certified += (l.certifiedQty ?? l.claimedQty) * l.rate;
    if (l.qty > 0 && l.claimedQty > l.qty) overMeasured.push(l.key);
  }
  const done = text(claim.status) === "Certified";
  const thisPeriod = (done ? certified : applied) - prev;
  const pct = Math.min(100, Math.max(0, num(retentionPercent)));
  const retention = money(thisPeriod * (pct / 100));
  return {
    previous: money(prev),
    appliedToDate: money(applied),
    appliedThisPeriod: money(applied - prev),
    certifiedToDate: done ? money(certified) : null,
    certifiedThisPeriod: done ? money(certified - prev) : null,
    retention,
    net: money(thisPeriod - retention),
    overMeasured,
  };
}

/** ONE CLAIM OPEN AT A TIME: the next cannot know its previous figures until this one is certified. */
export function openProblem(claims: readonly ClaimLike[]): "open-claim" | null {
  return claims.some((c) => text(c.status) !== "Certified") ? "open-claim" : null;
}

/** Why these quantities cannot stand: negative, or below what was already certified. */
export function quantitiesProblem(lines: readonly ClaimLine[], previous: Map<string, number>, field: "claimedQty" | "certifiedQty"): "qty" | "below-previous" | null {
  for (const l of lines) {
    const q = field === "certifiedQty" ? (l.certifiedQty ?? l.claimedQty) : l.claimedQty;
    if (!Number.isFinite(q) || q < 0) return "qty";
    // CUMULATIVE MEANS IT CANNOT GO BACKWARDS — a correction downwards is a
    // credit note against what was invoiced, not a smaller "to date".
    if (quantity(q) < quantity(previous.get(l.key) || 0)) return "below-previous";
  }
  return null;
}

const MOVES: Record<string, ClaimStatus[]> = {
  Draft: ["Submitted"],
  // Back to draft when the client sends an application back for correction.
  Submitted: ["Draft", "Certified"],
  // A CERTIFICATE IS FINAL. What it certified is invoiced; a correction is the next claim.
  Certified: [],
};

/** Why a claim cannot move from where it is to `to`, or null. */
export function moveProblem(claim: ClaimLike, to: string, previous: Map<string, number>): string | null {
  const from = text(claim.status) || "Draft";
  if (!MOVES[from]?.includes(to as ClaimStatus)) return "transition";
  const lines = linesOf(claim);
  if (to === "Submitted") {
    const wrong = quantitiesProblem(lines, previous, "claimedQty");
    if (wrong) return wrong;
    // AN APPLICATION FOR NOTHING is not an application.
    if (claimValuation(claim, previous, 0).appliedThisPeriod <= 0) return "nothing-claimed";
  }
  if (to === "Certified") return quantitiesProblem(lines, previous, "certifiedQty");
  return null;
}

/** QUANTITIES CHANGE ONLY IN DRAFT — a submitted application is what the client is reading. */
export function editProblem(claim: ClaimLike, lines: readonly ClaimLine[], previous: Map<string, number>): string | null {
  if ((text(claim.status) || "Draft") !== "Draft") return "not-draft";
  return quantitiesProblem(lines, previous, "claimedQty");
}
