// ASKING SUPPLIERS WHAT IT COSTS, AND COMPARING WHAT THEY SAY — pure, so the
// screen compares with the same function the server does.
//
// THE GAP THIS CLOSES, and `requisitions.md` names it: a requisition's
// `vendorId` records who the requester EXPECTS to buy from and binds nobody.
// Nothing in the product ever asked a supplier for a price. So a studio's
// purchasing was one person's estimate followed by one person's order, with no
// step in between where a second supplier could be cheaper — and no record, six
// months later, of who else was asked.
//
// A SUPPLIER RFQ IS NOT THE CUSTOMER RFQ. `engineeringDocs.rfq` is a request
// coming IN from Sales to Technical; this goes OUT to people we buy from. They
// share three letters and nothing else, which is why the reference prefix here
// is SRQ and why this file says so at the top.
//
// NO IMPORTS, deliberately, and asserted by a test.

export type RfqLine = {
  id?: unknown;
  description?: unknown;
  unit?: unknown;
  qty?: unknown;
  itemId?: unknown;
};

/** One supplier's answer to one line. */
export type QuoteLine = {
  rfqLineId?: unknown;
  unitPrice?: unknown;
  /** How long THIS line takes, when a supplier prices delivery per item. */
  leadWeeks?: unknown;
};

export type SupplierQuote = {
  id?: unknown;
  vendorId?: unknown;
  lines?: unknown;
  /** The whole quote's lead time, where the supplier gives one figure. */
  leadWeeks?: unknown;
  validUntil?: unknown;
  status?: unknown;
};

/**
 * THE LADDER. `Sent` is the point of no return for the line list: a supplier
 * quoting against three lines must not find a fourth appearing afterwards, so
 * the lines freeze when the request goes out. `Awarded` is terminal and records
 * a decision; `Cancelled` is the honest exit from any state before it.
 */
export const RFQ_STATUSES = ["Draft", "Sent", "Awarded", "Cancelled"] as const;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const text = (v: unknown) => String(v ?? "");
const blank = (v: unknown) =>
  v === undefined || v === null || text(v).trim() === "";

export const rfqLineIsReal = (l: RfqLine | null | undefined): boolean =>
  Boolean(l) && text(l?.description).trim().length > 0;

export type QuotedLine = {
  rfqLineId: string;
  /** Null when this supplier did not price the line — never 0, which is a price. */
  unitPrice: number | null;
  qty: number;
  /** qty x unitPrice, or null when unpriced. */
  total: number | null;
  leadWeeks: number | null;
};

export type QuoteSummary = {
  id: string;
  vendorId: string;
  lines: QuotedLine[];
  /** The sum of what WAS priced. Not the quote unless `complete`. */
  total: number;
  /**
   * True only when every real RFQ line carries a price. It travels with the
   * total for the reason `boqTotals.complete` does: a part-priced quote's total
   * is a number and it is NOT what that supplier is offering, and comparing it
   * against a complete one ranks it first for the wrong reason.
   */
  complete: boolean;
  /** How many of the RFQ's lines this supplier priced. */
  priced: number;
  /** The longest lead among the lines it priced, or the quote's own. Null when unstated. */
  leadWeeks: number | null;
  /** Past its validity as at `asOf`. A stale price is not an offer. */
  expired: boolean;
};

export type RfqComparison = {
  quotes: QuoteSummary[];
  /**
   * The cheapest COMPLETE, unexpired quote's id, or null. Deliberately not "the
   * cheapest quote": ranking a part-priced or lapsed one first would recommend
   * a supplier who has not offered what was asked for.
   */
  cheapestId: string | null;
  /** The fastest on the same terms. Frequently a different supplier — that is the point. */
  fastestId: string | null;
  /**
   * Per RFQ line, the id of the quote pricing it lowest. A studio that wants to
   * split an award needs this; a studio that does not still reads it as "who is
   * dear on what".
   */
  cheapestByLine: Record<string, string>;
  /** How many quotes are comparable at all. */
  comparable: number;
  /** Why there is no recommendation, or null. */
  blocked: "no-quotes" | "none-comparable" | null;
};

/**
 * WHAT EACH SUPPLIER IS OFFERING, LINE BY LINE, AND WHO IS CHEAPEST.
 *
 * `asOf` decides expiry, and it is passed in rather than read here: the screen
 * and the server must agree about which quotes are live, and two clocks are two
 * answers.
 */
export function compareQuotes(
  rfqLines: unknown,
  quotes: unknown,
  asOf: unknown = "",
): RfqComparison {
  const lines = (Array.isArray(rfqLines) ? rfqLines : []).filter(rfqLineIsReal) as RfqLine[];
  const rows = (Array.isArray(quotes) ? quotes : []) as SupplierQuote[];
  const today = text(asOf).slice(0, 10);

  const summaries: QuoteSummary[] = rows.map((q) => {
    const byLine = new Map<string, QuoteLine>();
    for (const l of (Array.isArray(q.lines) ? q.lines : []) as QuoteLine[]) {
      byLine.set(text(l?.rfqLineId), l);
    }

    let total = 0;
    let priced = 0;
    let maxLead: number | null = null;
    const quoted: QuotedLine[] = lines.map((line) => {
      const id = text(line.id);
      const hit = byLine.get(id);
      const qty = num(line.qty);
      // A BLANK IS NOT NOUGHT. A supplier who did not price a line has not
      // offered it at zero, and treating the two alike would make an
      // incomplete quote look like a generous one.
      const unpriced = !hit || blank(hit.unitPrice);
      const unitPrice = unpriced ? null : money(num(hit?.unitPrice));
      if (unitPrice !== null) {
        priced += 1;
        total = money(total + qty * unitPrice);
      }
      const lead = hit && !blank(hit.leadWeeks) ? num(hit.leadWeeks) : null;
      if (lead !== null) maxLead = maxLead === null ? lead : Math.max(maxLead, lead);
      return { rfqLineId: id, unitPrice, qty, total: unitPrice === null ? null : money(qty * unitPrice), leadWeeks: lead };
    });

    // THE QUOTE'S OWN LEAD TIME STANDS IN where no line carries one — a
    // supplier who says "six weeks for the lot" has answered the question.
    const quoteLead = blank(q.leadWeeks) ? null : num(q.leadWeeks);
    const validUntil = text(q.validUntil).slice(0, 10);
    return {
      id: text(q.id),
      vendorId: text(q.vendorId),
      lines: quoted,
      total,
      complete: lines.length > 0 && priced === lines.length,
      priced,
      leadWeeks: maxLead !== null ? maxLead : quoteLead,
      // Compared as ISO dates, which sort lexically — no parsing, no timezone.
      // A quote with no validity never expires, which is the honest reading of
      // a supplier who did not say.
      expired: Boolean(validUntil) && Boolean(today) && validUntil < today,
    };
  });

  // ONLY COMPLETE, UNEXPIRED QUOTES ARE RANKED. A recommendation drawn from a
  // part-priced quote recommends a supplier who has not offered what was asked
  // for, and one drawn from a lapsed quote recommends a price nobody is holding.
  const usable = summaries.filter((q) => q.complete && !q.expired);

  // Tracked as values rather than by looking the incumbent back up by id: the
  // lookup version read as clever and was one typo away from comparing a quote
  // against itself.
  let cheapestId: string | null = null;
  let cheapestTotal = Infinity;
  let fastestId: string | null = null;
  let fastestLead = Infinity;
  for (const q of usable) {
    if (q.total < cheapestTotal) { cheapestTotal = q.total; cheapestId = q.id; }
    // A SUPPLIER WHO DID NOT STATE A LEAD TIME IS NOT THE FASTEST. Ranking a
    // silence first would recommend the one who answered least.
    if (q.leadWeeks !== null && q.leadWeeks < fastestLead) {
      fastestLead = q.leadWeeks;
      fastestId = q.id;
    }
  }

  // PER LINE, ACROSS EVERY QUOTE THAT PRICED IT — including incomplete ones.
  // A supplier who priced one line keenly is worth seeing even though their
  // quote cannot be ranked as a whole, because that is what a split award is
  // made of.
  const cheapestByLine: Record<string, string> = {};
  for (const line of lines) {
    const id = text(line.id);
    let bestId = "";
    let bestPrice = Infinity;
    for (const q of summaries) {
      if (q.expired) continue;
      const cell = q.lines.find((l) => l.rfqLineId === id);
      if (!cell || cell.total === null) continue;
      if (cell.total < bestPrice) { bestPrice = cell.total; bestId = q.id; }
    }
    if (bestId) cheapestByLine[id] = bestId;
  }

  return {
    quotes: summaries,
    cheapestId,
    fastestId,
    cheapestByLine,
    comparable: usable.length,
    blocked: summaries.length === 0 ? "no-quotes" : usable.length === 0 ? "none-comparable" : null,
  };
}

/**
 * WHY A MOVE IS REFUSED, as a TOKEN rather than a sentence — the studio is
 * bilingual and refusals translate on display.
 */
export function rfqProblem(
  rfq: { status?: unknown; lines?: unknown } | null | undefined,
  next: string,
): string | null {
  if (!rfq) return "notfound";
  const from = text(rfq.status) || "Draft";
  if (!(RFQ_STATUSES as readonly string[]).includes(next)) return "status";
  if (from === next) return "already";
  if (from === "Awarded" || from === "Cancelled") return "decided";

  switch (next) {
    case "Sent": {
      if (from !== "Draft") return "not-draft";
      // NOTHING TO QUOTE IS NOT A REQUEST. Sending an empty RFQ asks a supplier
      // to price nothing and puts their name against it.
      const lines = (Array.isArray(rfq.lines) ? rfq.lines : []).filter(rfqLineIsReal);
      if (!lines.length) return "no-lines";
      return null;
    }
    // AWARDING IS ITS OWN VERB, never a status assignment: it names a quote,
    // and a status edit that could reach `Awarded` would record a decision with
    // nothing decided. `awardRfq` is the only door.
    case "Awarded":
      return "not-awardable";
    case "Cancelled":
      return null;
    case "Draft":
      // Nothing returns to draft: suppliers have the line list, and changing it
      // underneath them would make their quotes answers to a question nobody
      // asked.
      return "no-return";
    default:
      return "status";
  }
}

/** The lines freeze when the request goes out — see the note on RFQ_STATUSES. */
export const rfqEditable = (rfq: { status?: unknown } | null | undefined): boolean =>
  text(rfq?.status || "Draft") === "Draft";

/**
 * MAY A QUOTE BE RECORDED? Only against a request that has actually gone out
 * and has not been decided.
 *
 * A draft RFQ has been sent to nobody, so a quote against it came from nowhere.
 */
export const quotesAccepted = (rfq: { status?: unknown } | null | undefined): boolean =>
  text(rfq?.status || "Draft") === "Sent";
