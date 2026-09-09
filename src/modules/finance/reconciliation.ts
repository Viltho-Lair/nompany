// WHAT THE BANK SAYS, AGAINST WHAT THE BOOKS SAY.
//
// THE LEDGER HAS ALWAYS BEEN ABLE TO REPORT A BANK BALANCE AND NEVER TO CHECK
// IT. Every posting that touched the bank account was somebody's word for it,
// and the one document that could contradict them — the statement — had nowhere
// to go. So a studio could be confident in a figure that was wrong by a payment
// that never cleared, a charge nobody booked, or a cheque paid in twice.
//
// A RECONCILIATION IS A PAIRING, NOT A CALCULATION. What matters is which
// statement line answers which ledger line, and the three states that come out
// of it are three different problems:
//
//  - MATCHED. Both sides agree; nothing to do.
//  - ON THE STATEMENT AND NOT IN THE BOOKS. Money moved and nobody recorded
//    it — a bank charge, a direct debit, interest, a payment received. The fix
//    is a posting.
//  - IN THE BOOKS AND NOT ON THE STATEMENT. Recorded and not yet cleared — a
//    cheque written and not presented. The fix is usually TIME, and calling it
//    an error would send somebody chasing a cheque that is simply in the post.
//
// NOTHING IS MATCHED AUTOMATICALLY. Two payments of 500 in one week are
// indistinguishable by amount, and an automatic pairing would silently reconcile
// the wrong two and leave two real discrepancies cancelling each other out. So
// this SUGGESTS and a person confirms — the same posture FEFO takes on the shop
// floor and for the same reason.
//
// PURE. No imports, no store, no clock.

export type StatementLine = {
  id: string;
  date: string;
  description: string;
  /** Signed: positive is money in, negative is money out. */
  amount: number;
  matchedEntryId?: string;
};

export type BookLine = {
  entryId: string;
  date: string;
  memo: string;
  /** Signed the same way: a debit to the bank is money in. */
  amount: number;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (n: number) => Math.round(n * 100) / 100;

/** What is wrong with this statement line, or an empty array. */
export function statementProblems(input: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (!DAY_RE.test(str(input.date, 10))) problems.push("a statement line needs a date");
  // AN AMOUNT OF NOUGHT IS NOT A MOVEMENT. A bank does not print one, and one
  // typed here would sit unmatchable for ever against a book line that also
  // does not exist.
  if (!num(input.amount)) problems.push("a statement line needs an amount");
  if (!str(input.description, 200)) problems.push("a statement line needs a description");
  return problems;
}

export function cleanStatementLine(input: Record<string, unknown>): Omit<StatementLine, "id"> {
  return {
    date: str(input.date, 10),
    description: str(input.description, 200),
    amount: money(num(input.amount)),
  };
}

const daysApart = (a: string, b: string): number => {
  const [x, y] = [Date.parse(`${a}T00:00:00Z`), Date.parse(`${b}T00:00:00Z`)];
  return Number.isFinite(x) && Number.isFinite(y) ? Math.abs(x - y) / 86400000 : Infinity;
};

export type Suggestion = { lineId: string; entryId: string; daysApart: number };

/**
 * WHAT PROBABLY PAIRS WITH WHAT — the same amount, closest in date first.
 *
 * THE AMOUNT MUST MATCH EXACTLY. A tolerance would pair a 500 with a 499.50 and
 * hide a bank charge of fifty pence, which is precisely the kind of thing a
 * reconciliation exists to surface. Dates are allowed to differ, because a
 * payment made on Friday clears on Monday and always has.
 *
 * ONE SUGGESTION PER LINE AND PER ENTRY. Two identical amounts produce two
 * suggestions in the first pass and the confirmed one takes its entry out of
 * play, so a person resolving them one at a time never sees a pairing that has
 * already been used.
 *
 * GREEDY PER LINE, NOT GLOBALLY OPTIMAL, and that is a choice rather than an
 * oversight. Two statement lines and two book entries of the same amount can be
 * paired two ways; this takes the closest for the first line and leaves the
 * other to the second, which can total more days apart than the alternative
 * pairing would. Solving it properly is an assignment problem, and it would buy
 * nothing: NOTHING IS MATCHED AUTOMATICALLY. A person confirms every pair, and
 * for two payments of the same amount in one week the dates are not what tells
 * them apart — the bank's own description is, and only a human reads that.
 */
export function suggestMatches(
  lines: StatementLine[],
  book: BookLine[],
  { withinDays = 7 }: { withinDays?: number } = {},
): Suggestion[] {
  const takenEntries = new Set(lines.map((l) => l.matchedEntryId).filter(Boolean) as string[]);
  const out: Suggestion[] = [];
  const used = new Set<string>();

  for (const line of lines) {
    if (line.matchedEntryId) continue;
    const candidates = book
      .filter((b) => !takenEntries.has(b.entryId) && !used.has(b.entryId))
      .filter((b) => money(b.amount) === money(line.amount))
      .map((b) => ({ entryId: b.entryId, gap: daysApart(line.date, b.date) }))
      .filter((c) => c.gap <= withinDays)
      .sort((a, b) => a.gap - b.gap);

    const best = candidates[0];
    if (!best) continue;
    used.add(best.entryId);
    out.push({ lineId: line.id, entryId: best.entryId, daysApart: best.gap });
  }
  return out;
}

export type Reconciliation = {
  /** What the books say the bank account holds. */
  bookBalance: number;
  /** What the statement lines add up to. */
  statementBalance: number;
  difference: number;
  matched: number;
  /** Money moved and nobody recorded it. The fix is a posting. */
  onStatementOnly: StatementLine[];
  /** Recorded and not yet cleared. The fix is usually time. */
  inBooksOnly: BookLine[];
};

/**
 * WHERE THE TWO SIDES STAND.
 *
 * THE DIFFERENCE IS NOT AN ERROR FIGURE. It is the sum of everything not yet
 * paired, and a healthy reconciliation has one: uncleared cheques are supposed
 * to be there. What makes it wrong is the difference not being EXPLAINED by the
 * two lists, which is why both are returned rather than a single number.
 *
 * `bookBalance` IS EVERY BOOK LINE, matched or not — it is what the ledger
 * says, and subtracting the unmatched ones would produce a figure that is
 * neither the ledger's nor the bank's.
 */
export function reconcile(lines: StatementLine[], book: BookLine[]): Reconciliation {
  const matchedEntries = new Set(lines.map((l) => l.matchedEntryId).filter(Boolean) as string[]);
  const bookBalance = money(book.reduce((sum, b) => sum + num(b.amount), 0));
  const statementBalance = money(lines.reduce((sum, l) => sum + num(l.amount), 0));

  return {
    bookBalance,
    statementBalance,
    difference: money(bookBalance - statementBalance),
    matched: lines.filter((l) => l.matchedEntryId).length,
    onStatementOnly: lines.filter((l) => !l.matchedEntryId),
    inBooksOnly: book.filter((b) => !matchedEntries.has(b.entryId)),
  };
}

/**
 * MAY THIS PAIR BE CONFIRMED? A reason, or null.
 *
 * THE AMOUNTS MUST AGREE. A person can confirm a pairing this never suggested —
 * a bank that describes a payment unrecognisably, a date months apart — but not
 * one where the money differs, because that is not a match, it is two events.
 */
export function matchProblem(line: StatementLine | undefined, entry: BookLine | undefined): string | null {
  if (!line) return "line";
  if (!entry) return "entry";
  if (line.matchedEntryId) return "already-matched";
  if (money(line.amount) !== money(entry.amount)) return "amount";
  return null;
}
