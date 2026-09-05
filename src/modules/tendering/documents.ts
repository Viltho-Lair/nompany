// THE TENDER PACK AND THE QUESTIONS ASKED ABOUT IT — pure, so the screens
// reason about a bid's paperwork with the same functions the server does.
//
// WHAT THIS FILE EXISTS TO PREVENT: pricing against a superseded document. A
// tender is issued, an addendum changes a quantity, an answer to somebody
// else's question changes what is being asked for — and the bill was priced
// before any of that arrived. Nothing in the bill can notice, because a BOQ
// line has no idea a document was reissued. So the paperwork has to be the
// thing that says so, and `changesSincePricing` is where it does.
//
// NO IMPORTS, deliberately, and asserted by a test. The grid, the register and
// the route all read the same answers.

export type DocKind = "received" | "addendum" | "submitted";

/**
 * WHAT A DOCUMENT IS FOR, NOT WHAT TRADE IT BELONGS TO. "Drawing",
 * "specification" and "bill" are one industry's vocabulary; a studio tendering
 * for cleaning contracts or for software has the same three ROLES and none of
 * those words. `received` is what the issuer gave us, `addendum` is what they
 * changed afterwards, `submitted` is what we sent back. Anything finer is free
 * text the studio types.
 */
export const DOC_KINDS: readonly DocKind[] = ["received", "addendum", "submitted"];

export const isDocKind = (v: unknown): v is DocKind =>
  DOC_KINDS.includes(String(v ?? "") as DocKind);

type Doc = {
  id?: string;
  tenderId?: string;
  kind?: string;
  title?: string;
  revision?: string;
  supersededById?: string;
  createdAt?: string;
};

type Clar = {
  id?: string;
  question?: string;
  answeredAt?: string;
};

const rows = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const text = (v: unknown) => String(v ?? "");

// ---- supersession ----------------------------------------------------------

/** Superseded means something replaced it. It is still here, and still read. */
export const isSuperseded = (doc: Doc | null | undefined): boolean =>
  Boolean(doc && text(doc.supersededById));

export const currentDocuments = <T extends Doc>(docs: unknown): T[] =>
  rows<T>(docs).filter((d) => !isSuperseded(d));

export const supersededDocuments = <T extends Doc>(docs: unknown): T[] =>
  rows<T>(docs).filter((d) => isSuperseded(d));

/**
 * What THIS document replaced, newest first — the revision history read
 * backwards along the chain.
 *
 * Walked with a seen-set rather than trusted to terminate. `supersedeProblem`
 * refuses the moves that would make a loop, but this function is also handed
 * whatever the store holds, and one bad row must not hang a render.
 */
export function chainFor<T extends Doc>(docs: unknown, docId: string): T[] {
  const all = rows<T>(docs);
  const out: T[] = [];
  const seen = new Set<string>([docId]);
  let target = docId;
  for (;;) {
    const prior = all.find((d) => text(d.supersededById) === target && !seen.has(text(d.id)));
    if (!prior) return out;
    out.push(prior);
    seen.add(text(prior.id));
    target = text(prior.id);
  }
}

/**
 * Why one document may not be marked as replaced by another.
 *
 * THE REPLACEMENT MUST ITSELF BE CURRENT. That is the rule that makes a chain a
 * chain: revisions run in one direction, and allowing an already-superseded
 * document to replace something is what lets A←B←C←A close into a loop nobody
 * can read. Refusing it means no cycle can be written in the first place,
 * rather than being detected afterwards by a walk that has to guess.
 */
export function supersedeProblem(
  docs: unknown,
  docId: string,
  replacementId: string,
): "missing" | "self" | "already-superseded" | "superseded-replacement" | "other-tender" | null {
  const all = rows<Doc>(docs);
  const doc = all.find((d) => text(d.id) === docId);
  const rep = all.find((d) => text(d.id) === replacementId);
  if (!doc || !rep) return "missing";
  if (docId === replacementId) return "self";
  if (isSuperseded(doc)) return "already-superseded";
  if (isSuperseded(rep)) return "superseded-replacement";
  if (text(doc.tenderId) !== text(rep.tenderId)) return "other-tender";
  return null;
}

/**
 * Why a document may not be deleted.
 *
 * A DOCUMENT IN A CHAIN IS THE RECORD OF WHAT WAS PRICED AGAINST, at either
 * end: deleting the superseded one destroys the history, and deleting its
 * replacement leaves the older one reading as replaced by nothing. A document
 * nothing links to is an upload somebody got wrong, and that one goes.
 */
export function deleteProblem(docs: unknown, docId: string): "missing" | "in-chain" | null {
  const all = rows<Doc>(docs);
  const doc = all.find((d) => text(d.id) === docId);
  if (!doc) return "missing";
  if (isSuperseded(doc)) return "in-chain";
  if (all.some((d) => text(d.supersededById) === docId)) return "in-chain";
  return null;
}

// ---- clarifications --------------------------------------------------------

export const isAnswered = (c: Clar | null | undefined): boolean =>
  Boolean(c && text(c.answeredAt));

export const openClarifications = <T extends Clar>(list: unknown): T[] =>
  rows<T>(list).filter((c) => !isAnswered(c));

export const answeredClarifications = <T extends Clar>(list: unknown): T[] =>
  rows<T>(list).filter((c) => isAnswered(c));

// ---- the bill against the paperwork ----------------------------------------

export type Change = {
  kind: "document" | "clarification";
  id: string;
  label: string;
  at: string;
};

export type PricingLag = {
  /** When the bill was last priced, or null when nothing on it carries a rate. */
  pricedAt: string | null;
  /** What arrived after that, newest first. */
  behind: Change[];
  stale: boolean;
};

/**
 * WHAT ARRIVED AFTER THE BILL WAS LAST PRICED — the one question the bill
 * cannot ask itself.
 *
 * MEASURED FROM `createdAt`, NOT FROM A "received" DATE, and that is the whole
 * point. The question is not when the issuer dated the addendum; it is whether
 * the estimator had it in front of them. A document dated the 1st and uploaded
 * on the 10th was not available to a bill priced on the 5th, and measuring from
 * the issuer's date would report that bill as current when it never saw the
 * change.
 *
 * PRICED LINES ONLY set the clock. A line typed in with no rate is scope being
 * captured, not a price being decided, and letting it move `pricedAt` forward
 * would clear the warning by doing the one kind of work that does not answer
 * it. A bill with nothing priced is not behind anything — it has not begun,
 * which is what `boqTotals().complete` already says.
 *
 * SUBMITTED DOCUMENTS ARE NEVER BEHIND. What we sent out cannot change what we
 * are pricing; it is the result of the pricing.
 */
export function changesSincePricing(input: {
  lines?: unknown;
  documents?: unknown;
  clarifications?: unknown;
}): PricingLag {
  const lines = rows<{ rate?: unknown; updatedAt?: unknown }>(input?.lines);
  let pricedAt: string | null = null;
  for (const l of lines) {
    const rate = Number(l?.rate);
    if (!Number.isFinite(rate) || rate <= 0) continue;
    const at = text(l?.updatedAt);
    if (at && (pricedAt === null || at > pricedAt)) pricedAt = at;
  }
  if (!pricedAt) return { pricedAt: null, behind: [], stale: false };

  const behind: Change[] = [];
  for (const d of currentDocuments<Doc>(input?.documents)) {
    if (d.kind === "submitted") continue;
    const at = text(d.createdAt);
    if (at && at > pricedAt) {
      behind.push({
        kind: "document",
        id: text(d.id),
        label: [text(d.title), text(d.revision)].filter(Boolean).join(" "),
        at,
      });
    }
  }
  for (const c of answeredClarifications<Clar>(input?.clarifications)) {
    const at = text(c.answeredAt);
    if (at > pricedAt) {
      behind.push({ kind: "clarification", id: text(c.id), label: text(c.question), at });
    }
  }
  behind.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return { pricedAt, behind, stale: behind.length > 0 };
}

/** The counts a header shows, so three screens do not each write their own. */
export function documentSummary(docs: unknown) {
  const all = rows<Doc>(docs);
  const current = currentDocuments<Doc>(all);
  return {
    total: all.length,
    current: current.length,
    superseded: all.length - current.length,
    addenda: current.filter((d) => d.kind === "addendum").length,
    submitted: current.filter((d) => d.kind === "submitted").length,
  };
}
