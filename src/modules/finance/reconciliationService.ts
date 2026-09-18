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
import { ledgerAccounts, isMoneyAccount, postEntry } from "./ledger";
import {
  statementProblems, cleanStatementLine, suggestMatches, reconcile, matchProblem,
  parseStatementCsv, newLines, cleanRule, ruleFor, ruleEntryLines,
} from "./reconciliation";
import type { StatementLine, BookLine, BankRule, DateOrder } from "./reconciliation";
import type { FinanceContext, JournalEntry } from "./types";
import { roundSum } from "@/shared/money";

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
 * offer a matcher two halves of something the bank shows as one line. Each
 * money account is reconciled on its own, so a transfer between two of them is
 * one line on each side — out of one, into the other.
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
      amount: roundSum(amount),
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * ONE MONEY ACCOUNT'S TWO SIDES. The account asked for, or 1010 Bank — and a
 * statement line naming no account is the bank's, because every line entered
 * before a studio could have two was typed against the one it had.
 */
async function sides(ctx: FinanceContext, requested?: unknown) {
  const [all, entries, accounts] = await Promise.all([
    Statement.find(scope(ctx)),
    Entries.find(scope(ctx)),
    ledgerAccounts(ctx),
  ]);
  const bank = accounts.find((a) => a.code === BANK);
  const wanted = String(requested ?? "").trim();
  const account = wanted ? accounts.find((a) => a.id === wanted && isMoneyAccount(a)) : bank;
  const lines = account ? all.filter((l) => (l.accountId || bank?.id) === account.id) : [];
  return {
    lines,
    book: account ? bankLines(entries, account.id) : [],
    hasBank: Boolean(account),
    account,
    accounts: accounts.filter(isMoneyAccount).map((a) => ({ id: a.id, code: a.code, name: a.name })),
    chart: accounts,
  };
}

/** Both sides, where they stand, and what probably pairs with what. */
export async function reconciliation(ctx: FinanceContext, accountId?: unknown) {
  const denied = requirePermission(ctx.access, "finance.ledger.view");
  if (denied) return denied;

  // THE CHART ONCE: `sides` already read it, and two first reads seed twice.
  const [{ lines, book, hasBank, account, accounts, chart }, rules] = await Promise.all([
    sides(ctx, accountId), bankRules(ctx),
  ]);
  if (String(accountId ?? "").trim() && !account) return { error: "bank-account" };
  return {
    accountId: account?.id || "",
    accounts,
    // A STUDIO WITH NO BANK ACCOUNT IN ITS CHART has nothing to reconcile
    // AGAINST, which is a truthful answer rather than an empty one: the chart
    // self-seeds, so this only happens where somebody removed the account.
    hasBank,
    ...reconcile(lines, book),
    book,
    suggestions: suggestMatches(lines, book),
    // WHAT A RULE WOULD POST each unmatched line to — proposed, never applied.
    rules,
    ruleHits: Object.fromEntries(lines.filter((l) => !l.matchedEntryId)
      .map((l) => [l.id, ruleFor(l, rules)?.id || ""]).filter(([, r]) => r)),
    ruleAccounts: chart.filter((a) => a.active !== false && !isMoneyAccount(a))
      .map((a) => ({ id: a.id, code: a.code, name: a.name })),
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

  // THE STATEMENT IS ONE ACCOUNT'S, named once for the whole paste.
  const { account } = await sides(ctx, body?.accountId);
  if (!account) return { error: "bank-account" };

  const saved: StatementLine[] = [];
  const refused: { index: number; detail: string }[] = [];
  for (const [i, raw] of rows.entries()) {
    const problems = statementProblems(raw as Record<string, unknown>);
    if (problems.length) { refused.push({ index: i, detail: problems.join("; ") }); continue; }
    saved.push(await Statement.create(scope(ctx), {
      ...cleanStatementLine(raw as Record<string, unknown>, ctx.studio.currency),
      ...(account.code === BANK ? {} : { accountId: account.id }),
    }));
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

  // THE LINE DECIDES WHICH ACCOUNT'S BOOK IT PAIRS AGAINST — a bank line is
  // never matched to a movement on the petty cash.
  const owner = (await Statement.find(scope(ctx))).find((l) => l.id === lineId);
  const { lines, book } = await sides(ctx, owner?.accountId);
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

// ── IMPORT AND RULES ───────────────────────────────────────────────────────

const Rules = repo<BankRule>("bankRules");

/** The studio's rules, oldest first — first written wins (./reconciliation). */
export async function bankRules(ctx: FinanceContext): Promise<BankRule[]> {
  return (await Rules.find(scope(ctx))).sort((a, b) =>
    String((a as { createdAt?: string }).createdAt || "").localeCompare(String((b as { createdAt?: string }).createdAt || "")));
}

/**
 * IMPORT A BANK'S CSV into one money account's statement. Lines already there
 * are skipped by count (`newLines`), rows that do not read are reported by
 * number, and nothing is matched — the suggestions and rules do that, with a
 * person confirming.
 */
export async function importStatement(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.ledger.post");
  if (denied) return denied;
  const text = String(body?.csv ?? "");
  if (text.length > 2_000_000) return { error: "too-large" };
  const order = ["dmy", "mdy", "ymd"].includes(String(body?.dateOrder)) ? String(body.dateOrder) as DateOrder : "dmy";
  const parsed = parseStatementCsv(text, { dateOrder: order });
  if (!parsed.columns) return { error: "refused" as const, detail: parsed.problems.map((p) => p.detail).join("; ") };
  if (parsed.lines.length > 2000) return { error: "too-many" };

  const { account, lines } = await sides(ctx, body?.accountId);
  if (!account) return { error: "bank-account" };
  const fresh = newLines(parsed.lines, lines);
  for (const l of fresh) {
    await Statement.create(scope(ctx), {
      ...cleanStatementLine(l, ctx.studio.currency),
      ...(account.code === BANK ? {} : { accountId: account.id }),
    });
  }
  return {
    imported: fresh.length,
    skipped: parsed.lines.length - fresh.length,
    refused: parsed.problems,
    columns: parsed.columns,
  };
}

/** Add a rule. The account it posts to must be a live account that is not money. */
export async function saveRule(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.ledger.post");
  if (denied) return denied;
  const cleaned = cleanRule(body);
  if ("problems" in cleaned) return { error: "refused" as const, detail: cleaned.problems.join("; ") };
  const target = (await ledgerAccounts(ctx)).find((a) => a.id === cleaned.rule.accountId);
  // A RULE POSTING TO A MONEY ACCOUNT would be a transfer dressed as a charge.
  if (!target || target.active === false || isMoneyAccount(target)) return { error: "rule-account" };
  return { rule: await Rules.create(scope(ctx), { ...cleaned.rule, createdAt: new Date().toISOString() } as Omit<BankRule, "id">) };
}

export async function removeRule(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.ledger.post");
  if (denied) return denied;
  return (await Rules.remove(scope(ctx), id)) ? { removed: id } : { error: "notfound" };
}

/**
 * APPLY THE RULES TO THESE LINES: for each unmatched line a rule answers, post
 * the entry the rule describes, dated the bank's day, and pair the line with it.
 * A line the books may already answer (a suggestion exists) is left alone —
 * posting it again would count the money twice.
 */
export async function postByRules(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.ledger.post");
  if (denied) return denied;
  const wanted = new Set((Array.isArray(body?.lineIds) ? body.lineIds : []).map((v) => String(v)));
  if (!wanted.size) return { error: "missing" };
  const [{ lines, book, account }, rules] = await Promise.all([sides(ctx, body?.accountId), bankRules(ctx)]);
  if (!account) return { error: "bank-account" };
  const suggested = new Set(suggestMatches(lines, book).map((s) => s.lineId));

  const done: { lineId: string; entryId?: string; error?: string }[] = [];
  for (const line of lines) {
    if (!wanted.has(line.id) || line.matchedEntryId) continue;
    if (suggested.has(line.id)) { done.push({ lineId: line.id, error: "books-may-have-it" }); continue; }
    const rule = ruleFor(line, rules);
    if (!rule) { done.push({ lineId: line.id, error: "no-rule" }); continue; }
    const posted = await postEntry(ctx, {
      date: line.date,
      memo: rule.memo || line.description,
      lines: ruleEntryLines(line, rule, account.id),
    }) as { entry?: { id: string }; error?: string };
    if (!posted.entry) { done.push({ lineId: line.id, error: String(posted.error || "failed") }); continue; }
    await Statement.update(scope(ctx), line.id, () => ({ matchedEntryId: posted.entry!.id }));
    done.push({ lineId: line.id, entryId: posted.entry.id });
  }
  return { done };
}
