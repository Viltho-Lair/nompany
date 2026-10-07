// A STOCK COUNT — what is on the shelves, beside what the books say.
//
// THE STOCKTAKE REGISTER COULD NOT DO THIS, and said so. It is an engine
// register (platform/engine/builtins, `stocktake`): a reference, a location, a
// free-text note of "variances found", and a status that reaches `Adjusted`
// without moving a unit, because a register has no per-item lines to adjust
// from. A count here is per item: the number somebody found on the shelf, the
// number the ledger holds when it is posted, and the difference written as an
// ordinary stock adjustment — so it goes through the adjustment approval like
// any other correction above the studio's limit.
//
// BLANK IS NOT NOUGHT. A line nobody counted is left alone; a line counted at
// 0 means the shelf is empty and writes the whole balance off. The difference
// between "did not look" and "looked and found nothing" is the whole of a
// count's honesty, so `counted` is a number or "" and never coerced.
//
// THE BOOK FIGURE IS TAKEN WHEN THE COUNT IS POSTED, not when it was started.
// Stock keeps moving while people walk the racks, and freezing the figure at
// the start would post every sale made during the count a second time. The
// screen shows the live figure beside each line for the same reason.
//
// PURE. No store and no clock — asserted by tests/stock-count-model.mjs.

export const COUNT_STATUSES = ["Counting", "Posting", "Posted", "Cancelled"] as const;
export type CountStatus = (typeof COUNT_STATUSES)[number];

export type CountLine = { itemId: string; counted: number | "" };

/** What one posted line did — `applied`, `pending` an approval, or `refused` and why. */
export type CountResult = {
  itemId: string;
  counted: number;
  onHand: number;
  difference: number;
  outcome: "applied" | "pending" | "refused";
  detail?: string;
};

export type StockCount = {
  id: string;
  reference: string;
  note: string;
  status: CountStatus;
  lines: CountLine[];
  results?: CountResult[];
  createdByCollaboratorId: string;
  createdAt: string;
  postedByCollaboratorId?: string;
  postedAt?: string;
};

const round = (n: number) => Math.round(n * 1000) / 1000;

/** A counted figure, or "" for a line nobody counted. Negative counts are not counts. */
export function countedValue(v: unknown): number | "" {
  if (v === "" || v === null || v === undefined) return "";
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? round(n) : "";
}

/**
 * THE LINES AS STORED: known items only, one line per item, the count kept as
 * typed or blank. An item deleted since the count began drops out here rather
 * than posting an adjustment against nothing.
 */
export function cleanCountLines(list: unknown, knownItemIds: ReadonlySet<string>): CountLine[] {
  const seen = new Set<string>();
  const out: CountLine[] = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const itemId = String((raw as { itemId?: unknown })?.itemId ?? "").trim().slice(0, 60);
    if (!knownItemIds.has(itemId) || seen.has(itemId)) continue;
    seen.add(itemId);
    out.push({ itemId, counted: countedValue((raw as { counted?: unknown })?.counted) });
  }
  return out;
}

/**
 * WHAT POSTING WOULD WRITE: each COUNTED line whose figure differs from the
 * books, as the signed quantity to adjust by. A line that matches writes
 * nothing — an adjustment of nought would be a movement recording nothing.
 */
export function countDifferences(lines: readonly CountLine[], onHand: Readonly<Record<string, number>>) {
  const out: { itemId: string; counted: number; onHand: number; difference: number }[] = [];
  for (const l of lines) {
    if (l.counted === "") continue;
    const have = round(Number(onHand[l.itemId]) || 0);
    const difference = round(l.counted - have);
    if (difference !== 0) out.push({ itemId: l.itemId, counted: l.counted, onHand: have, difference });
  }
  return out;
}

/** How many lines have been counted — the screen's progress, and posting's floor. */
export const countedLines = (lines: readonly CountLine[]) => lines.filter((l) => l.counted !== "").length;

/** Why this count cannot be posted, or "". */
export function postProblem(count: Pick<StockCount, "status" | "lines">): "" | "not-counting" | "nothing-counted" {
  if (count.status !== "Counting") return "not-counting";
  if (!countedLines(count.lines)) return "nothing-counted";
  return "";
}
