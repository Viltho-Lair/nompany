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
// PURE. No store, no clock. Its one import is shared/money, the rounding rule, which is itself pure.

import { roundMoney, roundSum } from "@/shared/money";

export type StatementLine = {
  id: string;
  date: string;
  description: string;
  /** Signed: positive is money in, negative is money out. */
  amount: number;
  matchedEntryId?: string;
  /** The money account this statement is for. Absent is 1010 Bank — every line before 18/09/2026. */
  accountId?: string;
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
// Stored amounts compared and summed: only float noise to remove. A line TYPED
// IN is rounded to the studio's currency (`cleanStatementLine`).
const money = (n: number) => roundSum(n);

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

export function cleanStatementLine(input: Record<string, unknown>, currency?: unknown): Omit<StatementLine, "id"> {
  return {
    date: str(input.date, 10),
    description: str(input.description, 200),
    amount: roundMoney(num(input.amount), currency),
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

// ── IMPORTING A STATEMENT ──────────────────────────────────────────────────
//
// A BANK EXPORTS CSV, and no two banks agree on its columns. So the header is
// READ rather than assumed: a date column, a description column, and either one
// signed amount or a debit/credit pair. The order of day and month is the
// studio's to say (dd/mm by default), because 03/04 is a different day in each
// reading and guessing would move money a month.
//
// A LINE ALREADY ON THE STATEMENT IS SKIPPED — same account, same day, same
// amount, same description — so importing a month twice, or an export that
// overlaps the last one, adds nothing. Two genuinely identical lines on one
// day (two coffees) are kept as two: the count is compared, not the presence.

export type DateOrder = "dmy" | "mdy" | "ymd";
export type ParsedLine = { date: string; description: string; amount: number };

const HEAD = {
  date: /^(date|transaction date|posting date|value date|booking date|تاريخ|التاريخ)$/i,
  description: /^(description|details|narrative|narration|memo|reference|particulars|البيان|الوصف|التفاصيل)$/i,
  amount: /^(amount|value|المبلغ)$/i,
  debit: /^(debit|withdrawal|withdrawals|paid out|money out|مدين|سحب)$/i,
  credit: /^(credit|deposit|deposits|paid in|money in|دائن|ايداع|إيداع)$/i,
};

/** Split one CSV row, honouring quotes ("a, b" is one field; "" is a quote). */
export function csvRow(row: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (quoted) {
      if (ch === "\"" && row[i + 1] === "\"") { cur += "\""; i++; }
      else if (ch === "\"") quoted = false;
      else cur += ch;
    } else if (ch === "\"") quoted = true;
    else if (ch === "," || ch === ";" || ch === "\t") { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** A bank's date as `YYYY-MM-DD`, or "" when it is not one. */
export function bankDate(raw: string, order: DateOrder = "dmy"): string {
  const s = String(raw || "").trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  const parts = iso ? [iso[1], iso[2], iso[3]] : (/^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})$/.exec(s) || []).slice(1);
  if (parts.length !== 3) return "";
  let [y, m, d] = ["", "", ""];
  if (iso || order === "ymd") [y, m, d] = parts;
  else if (order === "mdy") [m, d, y] = parts;
  else [d, m, y] = parts;
  if (y.length === 2) y = `20${y}`;
  const out = `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const t = Date.parse(`${out}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === out ? out : "";
}

/** A bank's number: thousands separators, a trailing minus, brackets for negative. */
export function bankAmount(raw: string): number | null {
  let s = String(raw || "").replace(/[\s ]/g, "").replace(/[^\d.,()+-]/g, "");
  if (!s) return null;
  let sign = 1;
  if (/^\(.*\)$/.test(s)) { sign = -1; s = s.slice(1, -1); }
  if (s.endsWith("-")) { sign = -sign; s = s.slice(0, -1); }
  // A COMMA AS THE ONLY SEPARATOR, one to three digits from the end, is a
  // decimal comma; anywhere else commas are thousands.
  if (!s.includes(".") && /,\d{1,3}$/.test(s) && (s.match(/,/g) || []).length === 1 && !/,\d{3}$/.test(s)) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? sign * n : null;
}

export function parseStatementCsv(
  text: string,
  { dateOrder = "dmy" as DateOrder } = {},
): { lines: ParsedLine[]; problems: { row: number; detail: string }[]; columns: string | null } {
  const rows = String(text || "").split(/\r?\n/).filter((r) => r.trim());
  const problems: { row: number; detail: string }[] = [];
  if (!rows.length) return { lines: [], problems: [{ row: 0, detail: "the file is empty" }], columns: null };
  const head = csvRow(rows[0]).map((h) => h.replace(/^﻿/, "").trim());
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const at = {
    date: col(HEAD.date), description: col(HEAD.description), amount: col(HEAD.amount),
    debit: col(HEAD.debit), credit: col(HEAD.credit),
  };
  if (at.date < 0 || at.description < 0 || (at.amount < 0 && at.debit < 0 && at.credit < 0)) {
    return {
      lines: [],
      problems: [{ row: 1, detail: "the first row must name a date, a description and an amount (or debit and credit) column" }],
      columns: null,
    };
  }
  const lines: ParsedLine[] = [];
  rows.slice(1).forEach((r, i) => {
    const cells = csvRow(r);
    const date = bankDate(cells[at.date] || "", dateOrder);
    const description = String(cells[at.description] || "").slice(0, 200);
    let amount: number | null;
    if (at.amount >= 0) amount = bankAmount(cells[at.amount] || "");
    else {
      const out = at.debit >= 0 ? bankAmount(cells[at.debit] || "") : null;
      const inn = at.credit >= 0 ? bankAmount(cells[at.credit] || "") : null;
      amount = (inn ? Math.abs(inn) : 0) - (out ? Math.abs(out) : 0);
    }
    if (!date) { problems.push({ row: i + 2, detail: "no date this reads as a day" }); return; }
    if (!amount) { problems.push({ row: i + 2, detail: "no amount" }); return; }
    lines.push({ date, description: description || "—", amount: Math.round(amount * 1000) / 1000 });
  });
  return { lines, problems, columns: head.join(", ") };
}

/** The identity a line is de-duplicated by. */
export const statementKey = (l: { date: string; description: string; amount: number }) =>
  `${l.date}|${money(l.amount)}|${String(l.description || "").trim().toLowerCase()}`;

/**
 * THE LINES OF AN IMPORT NOT ALREADY ON THE STATEMENT. Counted, so a file with
 * two identical coffees against a statement holding one adds exactly one.
 */
export function newLines(
  incoming: ParsedLine[],
  existing: { date: string; description: string; amount: number }[],
): ParsedLine[] {
  const have = new Map<string, number>();
  for (const l of existing) have.set(statementKey(l), (have.get(statementKey(l)) || 0) + 1);
  const out: ParsedLine[] = [];
  for (const l of incoming) {
    const k = statementKey(l);
    const n = have.get(k) || 0;
    if (n > 0) { have.set(k, n - 1); continue; }
    out.push(l);
  }
  return out;
}

// ── MATCH RULES ────────────────────────────────────────────────────────────
//
// THE LINES NOBODY POSTED ARE MOSTLY THE SAME EVERY MONTH — the bank's charge,
// its interest, a standing order. A rule says "a line whose description
// contains X is posted to account Y", so those stop being keyed by hand. A RULE
// PROPOSES; a person applies it, and applying it POSTS the entry and pairs it
// in one act. It never touches a line the books already answer and never fires
// by itself — the posture the suggestions above take, for their reason.

export type BankRule = { id: string; contains: string; accountId: string; direction: "in" | "out" | "any"; memo?: string };

export function cleanRule(body: Record<string, unknown>): { rule: Omit<BankRule, "id"> } | { problems: string[] } {
  const contains = str(body?.contains, 80);
  const accountId = str(body?.accountId, 60);
  const asked = String(body?.direction ?? "");
  const direction: BankRule["direction"] = asked === "in" || asked === "out" ? asked : "any";
  const problems: string[] = [];
  // THREE CHARACTERS AT LEAST: a rule matching "a" would claim half the statement.
  if (contains.length < 3) problems.push("a rule needs at least three characters to look for");
  if (!accountId) problems.push("a rule needs an account to post to");
  return problems.length ? { problems } : { rule: { contains, accountId, direction, memo: str(body?.memo, 120) } };
}

/** The first rule a line answers to, or null. First written wins, so the order is the studio's. */
export function ruleFor(line: Pick<StatementLine, "description" | "amount">, rules: BankRule[]): BankRule | null {
  const text = String(line.description || "").toLowerCase();
  for (const r of rules) {
    if (!r.contains || !text.includes(r.contains.toLowerCase())) continue;
    if (r.direction === "in" && !(line.amount > 0)) continue;
    if (r.direction === "out" && !(line.amount < 0)) continue;
    return r;
  }
  return null;
}

/** The entry a rule posts for a line: money in debits the money account, money out credits it. */
export function ruleEntryLines(line: Pick<StatementLine, "amount">, rule: Pick<BankRule, "accountId">, moneyAccountId: string) {
  const amount = money(Math.abs(num(line.amount)));
  return line.amount > 0
    ? [{ accountId: moneyAccountId, debit: amount }, { accountId: rule.accountId, credit: amount }]
    : [{ accountId: rule.accountId, debit: amount }, { accountId: moneyAccountId, credit: amount }];
}
