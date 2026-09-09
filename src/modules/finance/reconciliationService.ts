// THE STORE HALF OF `./reconciliation`.
//
// NO PERMISSION KEY OF ITS OWN. Reading is `finance.ledger.view` and matching
// is `finance.ledger.post` — because confirming a pair is a statement about
// what the books mean, and the person who may not put an entry in them has no
// business declaring one settled.
//
// THE BOOK SIDE IS DERIVED FROM THE JOURNAL, never stored separately. Every
// posting that touched the bank account is a line here, computed on every read,
// so a reconciliation cannot drift from the ledger it is reconciling.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { ledgerAccounts } from "./ledger";
import {
  statementProblems, cleanStatementLine, suggestMatches, reconcile, matchProblem,
} from "./reconciliation";
import type { StatementLine, BookLine } from "./reconciliation";
import type { FinanceContext, JournalEntry } from "./types";

const Statement = repo<StatementLine>("bankStatementLines");
const Entries = repo<JournalEntry>("journalEntries");

const scope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.ledgerSection });
const BANK = "1010";

/**
 * EVERY POSTING THAT TOUCHED THE BANK, as a signed line.
 *
 * A DEBIT TO THE BANK IS MONEY IN, which is the ledger's convention and the
 * statement's read the same way — so the two sides are directly comparable and
 * nothing has to flip a sign at the point of matching, which is where a sign
 * error would silently pair a receipt with a payment.
 *
 * AN ENTRY WITH TWO BANK LINES IS SUMMED, not split. A transfer between two of
 * a studio's own accounts would produce one net movement; splitting it would
 * offer a matcher two halves of something the bank shows as one line — and this
 * product has ONE bank account in its chart, so the case is a contrived one
 * that must still not produce nonsense.
 */
function bankLines(entries: JournalEntry[], bankAccountId: string): BookLine[] {
  const out: BookLine[] = [];
  for (const entry of entries) {
    const amount = (entry.lines || [])
      .filter((l) => l.accountId === bankAccountId)
      .reduce((sum, l) => sum + (Number(l.debit) || 0) - (Number(l.credit) || 0), 0);
    if (!amount) continue;
    out.push({
      entryId: entry.id,
      date: String(entry.date || ""),
      memo: String(entry.memo || entry.reference || ""),
      amount: Math.round(amount * 100) / 100,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

async function sides(ctx: FinanceContext) {
  const [lines, entries, accounts] = await Promise.all([
    Statement.find(scope(ctx)),
    Entries.find(scope(ctx)),
    ledgerAccounts(ctx),
  ]);
  const bank = accounts.find((a) => a.code === BANK);
  return { lines, book: bank ? bankLines(entries, bank.id) : [], hasBank: Boolean(bank) };
}

/** Both sides, where they stand, and what probably pairs with what. */
export async function reconciliation(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.ledger.view");
  if (denied) return denied;

  const { lines, book, hasBank } = await sides(ctx);
  return {
    // A STUDIO WITH NO BANK ACCOUNT IN ITS CHART has nothing to reconcile
    // AGAINST, which is a truthful answer rather than an empty one: the chart
    // self-seeds, so this only happens where somebody removed the account.
    hasBank,
    ...reconcile(lines, book),
    book,
    suggestions: suggestMatches(lines, book),
    canMatch: !requirePermission(ctx.access, "finance.ledger.post"),
  };
}

/**
 * ADD STATEMENT LINES. A list, because a statement is pasted or typed in one
 * sitting — the same reason attendance is marked in a sweep.
 */
export async function addStatementLines(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.ledger.post");
  if (denied) return denied;

  const rows = Array.isArray(body?.lines) ? body.lines : [];
  if (!rows.length) return { error: "nothing" };
  if (rows.length > 500) return { error: "too-many" };

  const saved: StatementLine[] = [];
  const refused: { index: number; detail: string }[] = [];
  for (const [i, raw] of rows.entries()) {
    const problems = statementProblems(raw as Record<string, unknown>);
    if (problems.length) { refused.push({ index: i, detail: problems.join("; ") }); continue; }
    saved.push(await Statement.create(scope(ctx), cleanStatementLine(raw as Record<string, unknown>)));
  }
  // PARTIAL IS REPORTED, NOT ROLLED BACK — a pasted statement with one bad row
  // records the rest and says which, rather than making somebody paste again.
  return { saved: saved.length, refused };
}

/**
 * CONFIRM OR UNDO ONE PAIRING.
 *
 * UNDOING IS ALWAYS ALLOWED and needs no reason: a mismatched pair is an
 * ordinary mistake made while working through a list, not a decision about the
 * books — unlike reopening a closed period, which is.
 */
export async function matchLine(ctx: FinanceContext, lineId: string, entryId: string) {
  const denied = requirePermission(ctx.access, "finance.ledger.post");
  if (denied) return denied;

  const { lines, book } = await sides(ctx);
  const line = lines.find((l) => l.id === lineId);

  if (!entryId) {
    if (!line) return { error: "line" };
    const cleared = await Statement.update(scope(ctx), lineId, { matchedEntryId: "" });
    return cleared ? { line: cleared } : { error: "notfound" };
  }

  const problem = matchProblem(line, book.find((b) => b.entryId === entryId));
  if (problem) return { error: problem };

  // AN ENTRY MATCHED TO ANOTHER LINE IS REFUSED HERE rather than in the pure
  // model, because it is a question about the whole statement rather than about
  // the pair — and one ledger entry answering two statement lines would be two
  // real discrepancies cancelling each other out.
  if (lines.some((l) => l.id !== lineId && l.matchedEntryId === entryId)) {
    return { error: "entry-taken" };
  }

  const updated = await Statement.update(scope(ctx), lineId, { matchedEntryId: entryId });
  return updated ? { line: updated } : { error: "notfound" };
}

/** Remove a statement line. Its pairing goes with it and nothing else changes. */
export async function removeStatementLine(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.ledger.post");
  if (denied) return denied;
  const lines = await Statement.find(scope(ctx));
  if (!lines.some((l) => l.id === id)) return { error: "notfound" };
  await Statement.remove(scope(ctx), id);
  return { ok: true };
}
