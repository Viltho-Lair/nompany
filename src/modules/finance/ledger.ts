// THE GENERAL LEDGER — a real double-entry book, not a summary.
//
// Rows live beside the cash section, under the studio's finance-ledger section:
//   s:<StudioID>:sec:<SectionID>:c:accounts
//   s:<StudioID>:sec:<SectionID>:c:journalEntries
//
// TWO RULES THE SCHEMA CANNOT STATE AND THIS FILE ENFORCES, both at the
// transition rather than in the type — the same class of rule as invariant 7:
//
//   1. AN ENTRY BALANCES. Every posting's debits equal its credits, to the
//      cent. This is the whole of what makes double entry mean anything: the
//      trial balance is guaranteed to balance because no unbalanced entry was
//      ever allowed in.
//   2. A POSTED ENTRY IS NEVER EDITED, only REVERSED by a mirror entry. There
//      is deliberately no update path and no "draft" state — a journal is a
//      record of what happened, and you correct a record by adding to it, not
//      by rewriting it. The reversal is itself an ordinary entry.
//
// The chart of accounts has to exist before the first posting, so it seeds
// itself on first read the way the studio's sections reconcile themselves —
// idempotently, by code, so a second read adds nothing.

import { requirePermission } from "@/platform/access";
import { seriesSetting } from "@/modules/administration/numbering";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { invoiceTotals } from "./finance";
import type { Account, JournalEntry, JournalLine, Invoice, Expense, FinanceContext } from "./types";
import type { Row } from "@/platform/db/store";

const ACCOUNTS = "accounts";
const ENTRIES = "journalEntries";

const Accounts = repo<Account>(ACCOUNTS);
const CreditNotes = repo("creditNotes");
const Entries = repo<JournalEntry>(ENTRIES);
// The cash documents this ledger posts FROM — invoices and expenses live in the
// finance-cash section, not the ledger's own.
const Invoices = repo<Invoice>("invoices");
const Expenses = repo<Expense>("expenses");

const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");
// Money to the cent, non-negative. A ledger that carries floating-point crumbs
// stops balancing after enough postings, so every amount is rounded ON THE WAY
// IN and the balance check compares whole cents, never floats.
const cents = (v: unknown) => Math.round((Number(v) || 0) * 100);
const money = (c: number) => Math.round(c) / 100;

export type AccountType = Account["type"];

// THE DEFAULT CHART, KSA small-business shaped and deliberately small — a studio
// grows it, but it has to be able to post the day it opens Finance. Order is
// the conventional one (assets, liabilities, equity, income, expense) because
// that is the order a trial balance and a balance sheet read in.
export const DEFAULT_CHART: { code: string; name: string; type: AccountType }[] = [
  { code: "1000", name: "Cash", type: "asset" },
  { code: "1010", name: "Bank", type: "asset" },
  { code: "1100", name: "Accounts Receivable", type: "asset" },
  { code: "1200", name: "Inventory", type: "asset" },
  { code: "1500", name: "Fixed Assets", type: "asset" },
  { code: "1510", name: "Accumulated Depreciation", type: "asset" },
  { code: "2000", name: "Accounts Payable", type: "liability" },
  { code: "2100", name: "VAT Payable", type: "liability" },
  { code: "3000", name: "Owner's Equity", type: "equity" },
  { code: "3900", name: "Retained Earnings", type: "equity" },
  { code: "4000", name: "Revenue", type: "income" },
  { code: "5000", name: "Cost of Sales", type: "expense" },
  { code: "5100", name: "Salaries", type: "expense" },
  { code: "5200", name: "Rent", type: "expense" },
  { code: "5300", name: "Utilities", type: "expense" },
  { code: "5900", name: "Other Expenses", type: "expense" },
];

// The natural side a type increases on. An asset or expense grows with a debit;
// a liability, equity or income grows with a credit. This is what turns a pile
// of debits and credits into a signed balance a report can read.
const DEBIT_NORMAL: Record<AccountType, boolean> = {
  asset: true, expense: true, liability: false, equity: false, income: false,
};

/**
 * The chart, seeding the default set the first time it is read. Idempotent by
 * code: a studio that has added or removed accounts keeps them, and a re-read
 * never duplicates a default. Written on read the way sections reconcile — the
 * ledger cannot function without a chart, so "there is no chart yet" is never a
 * state a caller should have to handle.
 */
/**
 * THE ORDER A CHART OF ACCOUNTS IS READ IN — assets, liabilities, equity,
 * income, expense, which is what the code ranges encode. Written once because
 * `ledgerAccounts` returns from two places and sorting in only one of them is
 * the defect this replaces.
 */
const byCode = (rows: Account[]): Account[] =>
  [...rows].sort((x, y) => String(x.code).localeCompare(String(y.code)));

export async function ledgerAccounts(ctx: FinanceContext): Promise<Account[]> {
  const { studio, ledgerSection } = ctx;
  const existing = await Accounts.find({ studio, section: ledgerSection });
  const have = new Set(existing.map((a) => a.code));
  const missing = DEFAULT_CHART.filter((a) => !have.has(a.code));
  // IN CHART ORDER ON BOTH PATHS, and it was on only one. This early return
  // handed back whatever order the store produced, so a studio whose chart was
  // already seeded — which is every studio after its first read — got an
  // unordered chart, while the run that seeded it got a sorted one. A read
  // without an ORDER BY is unordered, and two runs of one Gate A fixture
  // returned the five expense accounts in different positions; on screen it
  // would have been a chart of accounts that reshuffled itself between visits.
  // `trialBalance` maps this array directly, so the reports inherited it.
  if (!missing.length) return byCode(existing);

  const seeded: Account[] = [];
  for (const a of missing) {
    seeded.push(await Accounts.create({ studio, section: ledgerSection }, {
      code: a.code, name: a.name, type: a.type, active: true,
      createdAt: new Date().toISOString(),
    }));
  }
  // Newest-first is how addRow prepends; return them in chart order so the
  // caller and the reports read top-down.
  return byCode([...existing, ...seeded]);
}

export async function listAccounts(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.ledger.view");
  if (denied) return denied;
  // Ordered by `ledgerAccounts` itself, so every reader of the chart — this, the
  // trial balance and both statements — gets the same sequence. Sorting here
  // instead would have fixed one caller and left the reports unordered.
  return { accounts: await ledgerAccounts(ctx) };
}

// Validate a set of posting lines into clean cents, or say why not. Pulled out
// because posting AND reversing both need exactly this check — and a reversal
// that did not re-validate could reintroduce the very imbalance reversing is
// meant to unwind.
function cleanLines(
  raw: unknown,
  accountsById: Map<string, Account>,
): { lines: JournalLine[]; debit: number; credit: number } | { error: string } {
  if (!Array.isArray(raw) || raw.length < 2) return { error: "lines" };
  const lines: JournalLine[] = [];
  let debit = 0;
  let credit = 0;
  for (const r of raw) {
    const accountId = str((r as Row)?.accountId, 60);
    const account = accountsById.get(accountId);
    if (!account) return { error: "account", accountId } as { error: string };
    if (account.active === false) return { error: "inactive", accountId } as { error: string };
    const d = cents((r as Row)?.debit);
    const c = cents((r as Row)?.credit);
    // EXACTLY ONE SIDE. A line that is both a debit and a credit, or neither, is
    // not a posting — it is a mistake that would still let the entry "balance"
    // while meaning nothing.
    if ((d > 0) === (c > 0)) return { error: "one-side", accountId } as { error: string };
    debit += d;
    credit += c;
    const line: JournalLine = { accountId, debit: money(d), credit: money(c) };
    // THE DIMENSIONS, CARRIED AND NOT VALIDATED — deliberately, and it is the
    // same decision `milestoneId` on an invoice and `costCodeId` on a bill
    // already make. An id is checked by the READER that groups on it, which is
    // the only place that can also cope with the thing being DELETED later. A
    // write-time check would refuse a foreign id and still be silent about a
    // dimension that disappeared afterwards, so it would buy nothing and cost a
    // read per posting.
    //
    // Absent rather than empty: a line that names no deal must not carry
    // `dealId: ""`, or every reader has to know that "" means "none" instead of
    // the key simply not being there.
    for (const dim of ["projectId", "dealId", "costCodeId", "departmentId"] as const) {
      const value = str((r as Row)?.[dim], 60);
      if (value) line[dim] = value;
    }
    const memo = str((r as Row)?.memo, 300);
    if (memo) line.memo = memo;
    lines.push(line);
  }
  return { lines, debit, credit };
}

/**
 * POST A BALANCED ENTRY. The one write that creates ledger history, and the
 * only place the balance rule is enforced — so nothing downstream (a report, a
 * trial balance) ever has to cope with an entry that does not balance, because
 * one was never stored.
 *
 * `source` lets an automated posting (an invoice, a bill) name what it came
 * from; a hand-posted adjustment is `{ kind: "manual" }`.
 */
/**
 * WHO IS ALLOWED TO PUT A LINE IN THE BOOKS, and the one case where the answer
 * is "the studio" rather than "this person".
 *
 * `finance.ledger.post` is the right to keep the books BY HAND — to decide that
 * a number belongs in an account and type it in. Almost nobody holds it, and
 * that is correct.
 *
 * AN AUTOMATIC POSTING IS NOT THAT ACT. When somebody issues an invoice, the
 * ledger entry is a CONSEQUENCE of a decision they were already authorised to
 * make: the right to issue the document is the authority, and the accounts the
 * entry touches were chosen by `postInvoice`, not by them. Asking for
 * `finance.ledger.post` there would mean the books are complete only for studios
 * whose invoice clerks also hold ledger rights — which is to say, silently
 * incomplete for exactly the studios least likely to notice.
 *
 * SO `system: true` SKIPS THE PERMISSION AND NOTHING ELSE. Every other check
 * still runs: the entry must balance, the accounts must exist and be active, the
 * document must be in a postable state, and it must not already be posted. It is
 * a deliberate bypass in ONE named place, greppable, and it is never reachable
 * from a request body — only from the document paths in `./posting`.
 */
export type PostOptions = { system?: boolean };

/**
 * WHAT A JOURNAL ENTRY CAN BE THE CONSEQUENCE OF. A closed set, because
 * `alreadyPosted` matches on it — an unrecognised kind is not a cosmetic
 * problem.
 *
 * THIS LIST WAS INLINE IN `postEntry` AND CREDIT NOTES WERE NOT ON IT. The
 * effect was silent and expensive: `postCreditNote` passed `credit-note`,
 * `postEntry` did not recognise it, fell back to `"manual"`, and stored an
 * entry whose source said manual. So `alreadyPosted(entries, "credit-note", id)`
 * could never match — the SAME credit note would post again on every attempt,
 * reducing the receivable once more each time, and nothing would refuse it. The
 * document looked posted, the books were wrong, and the only symptom was a
 * journal full of "manual" entries nobody had keyed.
 *
 * `manual` IS LAST AND IS NOT POSTABLE. It is what a person keying an
 * adjustment by hand produces, which is the one source with no document behind
 * it — `POSTABLE` in ./posting derives itself from this list by dropping it, so
 * a new kind is added HERE, once, and both halves learn about it.
 */
export const ENTRY_SOURCE_KINDS = [
  "invoice", "expense", "bill", "bill-payment", "payment", "credit-note", "manual",
] as const;

export type EntrySourceKind = (typeof ENTRY_SOURCE_KINDS)[number];

export async function postEntry(
  ctx: FinanceContext,
  body: { date?: unknown; memo?: unknown; lines?: unknown; source?: { kind?: string; id?: string } },
  options: PostOptions = {},
) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }

  const { studio, ledgerSection, collaborator } = ctx;
  const accounts = await ledgerAccounts(ctx);
  const byId = new Map(accounts.map((a) => [a.id, a]));

  const cleaned = cleanLines(body?.lines, byId);
  if ("error" in cleaned) return cleaned;
  // THE BALANCE RULE, in whole cents so no float ever makes a balanced entry
  // look off by a hundredth.
  if (cleaned.debit !== cleaned.credit) {
    return { error: "unbalanced", debit: money(cleaned.debit), credit: money(cleaned.credit) };
  }

  const kind = ENTRY_SOURCE_KINDS.find((k) => k === body?.source?.kind) || "manual";

  const entries = await Entries.find({ studio, section: ledgerSection });
  const reference = await nextReference(studio.id, { rows: entries as Row[], field: "reference", ...seriesSetting("journal", studio.numbering) });

  const entry = await Entries.create({ studio, section: ledgerSection }, {
    reference,
    date: day(body?.date) || new Date().toISOString().slice(0, 10),
    memo: str(body?.memo, 500),
    lines: cleaned.lines,
    source: { kind, ...(body?.source?.id ? { id: str(body.source.id, 60) } : {}) },
    postedByCollaboratorId: collaborator.id,
    postedAt: new Date().toISOString(),
  });
  return { entry };
}

/**
 * REVERSE A POSTED ENTRY by posting its mirror — every debit becomes a credit
 * and back. Not an edit and not a delete: the original stays, the reversal
 * stands beside it, and the two net to zero on every report. Refused if the
 * entry is already reversed (or is itself a reversal), so a correction cannot
 * be applied twice.
 */
export async function reverseEntry(ctx: FinanceContext, id: string, reason?: unknown) {
  const denied = requirePermission(ctx.access, "finance.ledger.reverse");
  if (denied) return denied;

  const { studio, ledgerSection, collaborator } = ctx;
  const entries = await Entries.find({ studio, section: ledgerSection });
  const original = entries.find((e) => e.id === id);
  if (!original) return { error: "notfound" };
  if (original.reversedByEntryId) return { error: "already-reversed", by: original.reversedByEntryId };
  if (original.reversalOfEntryId) return { error: "is-a-reversal" };

  const reference = await nextReference(studio.id, { rows: entries as Row[], field: "reference", ...seriesSetting("journal", studio.numbering) });
  const mirrored: JournalLine[] = (original.lines || []).map((l) => ({
    accountId: l.accountId,
    debit: l.credit,
    credit: l.debit,
    ...(l.projectId ? { projectId: l.projectId } : {}),
    ...(l.memo ? { memo: l.memo } : {}),
  }));

  const reversal = await Entries.create({ studio, section: ledgerSection }, {
    reference,
    date: new Date().toISOString().slice(0, 10),
    memo: str(reason, 500) || `Reversal of ${original.reference}`,
    lines: mirrored,
    source: { kind: "reversal", id: original.id },
    postedByCollaboratorId: collaborator.id,
    postedAt: new Date().toISOString(),
    reversalOfEntryId: original.id,
  });

  // Stamp the original so it cannot be reversed again. A function patch, so
  // "mark this reversed" stays a flip under contention (invariant 8).
  await Entries.update({ studio, section: ledgerSection }, original.id, () => ({ reversedByEntryId: reversal.id }));

  return { reversal };
}

export async function listJournal(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.ledger.view");
  if (denied) return denied;
  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  // Newest first — a journal is read from the most recent posting back.
  entries.sort((a, b) => (b.postedAt || "").localeCompare(a.postedAt || ""));
  return { entries };
}

/**
 * THE TRIAL BALANCE — every account's net debit or credit, and the proof that
 * the two columns are equal. They are ALWAYS equal here, because no unbalanced
 * entry was ever posted; a non-zero difference would mean the invariant had been
 * bypassed, which is exactly what makes this worth computing rather than
 * asserting. Sums ALL posted lines, reversals included — a reversed entry and
 * its mirror net to zero, which is the correct effect.
 */
/**
 * THE ARITHMETIC, OVER ROWS SOMEBODY ELSE HAS ALREADY READ.
 *
 * Split out because a caller that has the chart and the entries in hand must not
 * have to fetch them again to get a trial balance. `ledgerAccounts` SEEDS when a
 * studio has no chart, and `repo.create` does not invalidate the request cache —
 * so a second read inside one request returns the list as it was BEFORE the
 * seed, and seeds it again. Three calls in one request produced three copies of
 * every account, with the postings split between them and the trial balance
 * listing Cash three times.
 *
 * That is why the ledger route reads the chart once and calls this, rather than
 * calling `trialBalance` beside two other functions that each read for
 * themselves. One implementation of the sums, one read of the rows.
 */
export function trialBalanceFrom(accounts: Account[], entries: JournalEntry[]) {
  // Net cents per account, so the running arithmetic never touches a float.
  const net = new Map<string, number>();
  for (const e of entries) {
    for (const l of e.lines || []) {
      net.set(l.accountId, (net.get(l.accountId) || 0) + cents(l.debit) - cents(l.credit));
    }
  }

  let totalDebit = 0;
  let totalCredit = 0;
  const rows = accounts.map((a) => {
    // A positive net sits in the debit column, a negative in the credit — and an
    // account shown on its NATURAL side (a debit balance on a debit-normal
    // account) is the ordinary case; the other side is a contra balance, which
    // is real and worth seeing, not an error.
    const n = net.get(a.id) || 0;
    const debit = n > 0 ? n : 0;
    const credit = n < 0 ? -n : 0;
    totalDebit += debit;
    totalCredit += credit;
    return {
      accountId: a.id, code: a.code, name: a.name, type: a.type,
      debit: money(debit), credit: money(credit),
      normalSide: DEBIT_NORMAL[a.type] ? "debit" : "credit",
    };
  });

  return {
    rows,
    totalDebit: money(totalDebit),
    totalCredit: money(totalCredit),
    // The invariant, surfaced. Not a float compare — whole cents.
    balanced: totalDebit === totalCredit,
  };
}

export async function trialBalance(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.ledger.view");
  if (denied) return denied;
  return trialBalanceFrom(
    await ledgerAccounts(ctx),
    await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection }),
  );
}

// ============================================================================
// POSTING THE DOCUMENTS. What makes the ledger a real book rather than a place
// to hand-key adjustments: an invoice, an expense or a payment becomes a
// balanced entry with the conventional accounts behind it.
//
// A DELIBERATE ACT, NOT AUTOMATIC — and the permission model already said so. A
// separate `post` right is meaningless if the system posts on every write, so
// posting is something a person with that right DOES to a document, once.
// Idempotent by source: a document that is already in the ledger refuses a
// second posting, because two entries for one invoice is the overstatement this
// guards against.
// ============================================================================

// Standard postings against the default chart. Codes, not ids, because the ids
// are per-studio but the chart's codes are the same everywhere.
const AR = "1100";       // Accounts Receivable
const REVENUE = "4000";
const VAT_PAYABLE = "2100";
const BANK = "1010";     // the default cash account a payment lands in / an
                         // expense leaves from. A studio with more than one bank
                         // account will want this configurable — noted for when
                         // the settings screen lands.

// An expense category maps to the expense account it belongs in; anything
// unrecognised falls to Other Expenses rather than being refused, so a new
// category never blocks a posting.
const CATEGORY_ACCOUNT: Record<string, string> = {
  Materials: "5000", Subcontractor: "5000",
  Salaries: "5100", Rent: "5200", Utilities: "5300",
};
const OTHER_EXPENSE = "5900";
const COST_OF_SALES = "5000";  // where an uncategorised vendor bill lands

// Resolve chart CODES to the account ids a posting line needs, seeding the chart
// if it has to. Returns a lookup, or the codes it could not find (which would
// mean the chart was edited to remove a default the postings rely on).
async function codesToIds(ctx: FinanceContext, codes: string[]) {
  const accounts = await ledgerAccounts(ctx);
  const byCode = new Map(accounts.map((a) => [a.code, a.id]));
  const missing = codes.filter((c) => !byCode.has(c));
  return { byCode, missing };
}

// Has this document already been posted? The journal is the record, so ask it
// rather than stamping the document — a flag on the invoice could drift from
// whether an entry actually exists, and the entry is the thing that matters.
// A PAYMENT'S SOURCE ID CARRIES ITS PARENT, and this is not cosmetic.
//
// Payment ids are `pay1`, `pay2`… numbered WITHIN their invoice or bill, so
// every invoice in the studio has a `pay1`. `alreadyPosted` matches on kind and
// id alone, so the SECOND invoice's first payment looked like one already in the
// book: refused `already-posted`, the money never reaching the ledger, and
// nothing anywhere saying so. Found by tests/finance-posting.mjs the day these
// functions got their first callers — it could not fire before, because
// `postPayment` and `postBillPayment` were reached by nothing at all.
//
// NO MIGRATION. For the same reason: nothing has ever posted a payment, so no
// stored entry carries the bare id this replaces.
const paymentSource = (parentId: string, paymentId: string) => `${parentId}:${paymentId}`;

function alreadyPosted(entries: JournalEntry[], kind: string, id: string) {
  return entries.some((e) => e.source?.kind === kind && e.source?.id === id);
}

/**
 * POST AN INVOICE: debit Accounts Receivable for the total the client owes,
 * credit Revenue for the net and VAT Payable for the tax. The three sides
 * balance by construction — AR = Revenue + VAT is just the invoice's own
 * arithmetic — but postEntry checks it anyway, because "by construction" is
 * exactly the assumption that rots.
 */
export async function postInvoice(ctx: FinanceContext, invoiceId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }

  const invoice = (await Invoices.find({ studio: ctx.studio, section: ctx.cashSection }))
    .find((i) => i.id === invoiceId);
  if (!invoice) return { error: "notfound" };
  if (invoice.status === "Draft" || invoice.status === "Cancelled") return { error: "not-postable", status: invoice.status };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "invoice", invoiceId)) return { error: "already-posted" };

  const totals = invoiceTotals(invoice);
  const { byCode, missing } = await codesToIds(ctx, [AR, REVENUE, VAT_PAYABLE]);
  if (missing.length) return { error: "chart", missing };

  const lines = [
    { accountId: byCode.get(AR), debit: totals.total },
    { accountId: byCode.get(REVENUE), credit: totals.subtotal },
  ];
  // Only book VAT when there is some, or a zero-rated invoice carries a
  // pointless zero line that fails the one-side check.
  if (totals.vat > 0) lines.push({ accountId: byCode.get(VAT_PAYABLE), credit: totals.vat });

  return postEntry(ctx, {
    date: invoice.issueDate,
    memo: `Invoice ${invoice.reference}${invoice.clientName ? ` — ${invoice.clientName}` : ""}`,
    source: { kind: "invoice", id: invoiceId },
    lines,
  }, options);
}

/**
 * POST AN EXPENSE: debit the category's expense account, credit the cash it was
 * paid from. Two lines, and they balance because an expense is a single amount
 * moving from one place to another.
 */
export async function postExpense(ctx: FinanceContext, expenseId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }

  const expense = (await Expenses.find({ studio: ctx.studio, section: ctx.cashSection }))
    .find((e) => e.id === expenseId);
  if (!expense) return { error: "notfound" };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "expense", expenseId)) return { error: "already-posted" };

  const expenseCode = CATEGORY_ACCOUNT[expense.category] || OTHER_EXPENSE;
  const { byCode, missing } = await codesToIds(ctx, [expenseCode, BANK]);
  if (missing.length) return { error: "chart", missing };

  return postEntry(ctx, {
    date: expense.date,
    memo: `Expense ${expense.reference}${expense.category ? ` — ${expense.category}` : ""}`,
    source: { kind: "expense", id: expenseId },
    lines: [
      { accountId: byCode.get(expenseCode), debit: expense.amount },
      { accountId: byCode.get(BANK), credit: expense.amount },
    ],
  }, options);
}

// AP is the mirror of AR: the accounts an invoice credits, a bill debits.
const AP = "2000";       // Accounts Payable

/**
 * POST A BILL: the AP mirror of postInvoice. Debit the expense (the net we
 * incurred) and the VAT we can reclaim, credit Accounts Payable for the whole
 * we now owe the vendor. AP = expense + VAT is the bill's own arithmetic, and
 * postEntry checks it anyway. Only an approved (or received) bill posts — a
 * draft is not yet an obligation. The bill's category, if it names one, picks
 * the expense account the same way an expense does; otherwise it is Cost of
 * Sales, the ordinary home for a vendor bill.
 */
export async function postBill(ctx: FinanceContext, billId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }

  const bill = (await repo<Row>("bills").find({ studio: ctx.studio, section: ctx.payablesSection }))
    .find((b) => b.id === billId) as (Row & { status?: string; category?: string; billDate?: string; reference?: string; vendorName?: string }) | undefined;
  if (!bill) return { error: "notfound" };
  if (bill.status === "Draft" || bill.status === "Cancelled") return { error: "not-postable", status: bill.status };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "bill", billId)) return { error: "already-posted" };

  const totals = invoiceTotals(bill as { lines?: unknown; vatRate?: unknown; payments?: unknown });
  const expenseCode = CATEGORY_ACCOUNT[bill.category || ""] || COST_OF_SALES;
  const { byCode, missing } = await codesToIds(ctx, [expenseCode, VAT_PAYABLE, AP]);
  if (missing.length) return { error: "chart", missing };

  const lines: { accountId: string | undefined; debit?: number; credit?: number }[] = [
    { accountId: byCode.get(expenseCode), debit: totals.subtotal },
    { accountId: byCode.get(AP), credit: totals.total },
  ];
  // Input VAT is reclaimable — it sits on the same VAT Payable account, reducing
  // what is owed to the authority, so a bill DEBITS it where an invoice credits.
  if (totals.vat > 0) lines.push({ accountId: byCode.get(VAT_PAYABLE), debit: totals.vat });

  return postEntry(ctx, {
    date: bill.billDate,
    memo: `Bill ${bill.reference}${bill.vendorName ? ` — ${bill.vendorName}` : ""}`,
    source: { kind: "bill", id: billId },
    lines,
  }, options);
}

/**
 * POST A BILL PAYMENT: debit Accounts Payable to clear what we owed the vendor,
 * credit the bank it left from. The mirror of postPayment. The payment lives
 * inside its bill; its own id is the source, so each posts at most once.
 */
/**
 * POST A CREDIT NOTE: the exact reverse of an invoice's entry, for the credited
 * amount — debit Revenue and VAT Payable, credit Accounts Receivable.
 *
 * IT REVERSES PROPORTIONALLY, not "all the VAT then the rest". A note for a
 * quarter of an invoice takes back a quarter of the revenue and a quarter of
 * the tax; splitting it any other way would leave a studio's VAT account wrong
 * by the difference between what it charged and what it gave back, which is the
 * one number a tax return is made of.
 *
 * THE INVOICE'S OWN VAT RATE, not today's. The tax that was charged is what is
 * being given back — a rate change between the invoice and the note must not
 * move the amount reversed.
 */
export async function postCreditNote(
  ctx: FinanceContext,
  noteId: string,
  options: PostOptions = {},
) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }

  const note = (await CreditNotes.find({ studio: ctx.studio, section: ctx.cashSection }))
    .find((n) => n.id === noteId) as (Row & { amount?: number; invoiceId?: string; reference?: string }) | undefined;
  if (!note) return { error: "notfound" };

  const invoice = (await Invoices.find({ studio: ctx.studio, section: ctx.cashSection }))
    .find((i) => i.id === note.invoiceId);
  if (!invoice) return { error: "notfound" };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "credit-note", noteId)) return { error: "already-posted" };

  const { byCode, missing } = await codesToIds(ctx, [AR, REVENUE, VAT_PAYABLE]);
  if (missing.length) return { error: "chart", missing };

  // The gross amount split back into net and tax at the INVOICE's rate, in
  // whole cents. The net is derived by subtraction so the two always add up to
  // the gross — deriving both independently is how a rounded pair ends up a
  // cent short and the entry refuses to balance.
  const gross = Math.round((Number(note.amount) || 0) * 100) / 100;
  const rate = Number((invoice as { vatRate?: unknown }).vatRate) || 0;
  const vat = Math.round(((gross * rate) / (100 + rate)) * 100) / 100;
  const net = Math.round((gross - vat) * 100) / 100;

  return postEntry(ctx, {
    date: new Date().toISOString().slice(0, 10),
    memo: `Credit note ${note.reference || ""} against ${(invoice as { reference?: string }).reference || ""}`.trim(),
    source: { kind: "credit-note", id: noteId },
    lines: [
      { accountId: byCode.get(REVENUE), debit: net },
      ...(vat ? [{ accountId: byCode.get(VAT_PAYABLE), debit: vat }] : []),
      { accountId: byCode.get(AR), credit: gross },
    ],
  }, options);
}

export async function postBillPayment(ctx: FinanceContext, billId: string, paymentId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }

  const bill = (await repo<Row>("bills").find({ studio: ctx.studio, section: ctx.payablesSection }))
    .find((b) => b.id === billId) as (Row & { payments?: { id: string; amount: number; date?: string }[]; reference?: string }) | undefined;
  if (!bill) return { error: "notfound" };
  const payment = (bill.payments || []).find((p) => p.id === paymentId);
  if (!payment) return { error: "notfound-payment" };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "bill-payment", paymentSource(billId, paymentId))) {
    return { error: "already-posted" };
  }

  const { byCode, missing } = await codesToIds(ctx, [AP, BANK]);
  if (missing.length) return { error: "chart", missing };

  return postEntry(ctx, {
    date: payment.date,
    memo: `Payment on ${bill.reference}`,
    source: { kind: "bill-payment", id: paymentSource(billId, paymentId) },
    lines: [
      { accountId: byCode.get(AP), debit: payment.amount },
      { accountId: byCode.get(BANK), credit: payment.amount },
    ],
  }, options);
}

/**
 * POST A PAYMENT recorded against an invoice: debit the bank it arrived in,
 * credit Accounts Receivable to clear what the client owed. The payment lives
 * inside its invoice, so it is addressed by both ids; its own id is the source,
 * so each payment posts at most once even when several land on one invoice.
 */
export async function postPayment(ctx: FinanceContext, invoiceId: string, paymentId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }

  const invoice = (await Invoices.find({ studio: ctx.studio, section: ctx.cashSection }))
    .find((i) => i.id === invoiceId);
  if (!invoice) return { error: "notfound" };
  const payment = (invoice.payments || []).find((p) => p.id === paymentId);
  if (!payment) return { error: "notfound-payment" };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "payment", paymentSource(invoiceId, paymentId))) {
    return { error: "already-posted" };
  }

  const { byCode, missing } = await codesToIds(ctx, [BANK, AR]);
  if (missing.length) return { error: "chart", missing };

  return postEntry(ctx, {
    date: payment.date,
    memo: `Payment on ${invoice.reference}`,
    source: { kind: "payment", id: paymentSource(invoiceId, paymentId) },
    lines: [
      { accountId: byCode.get(BANK), debit: payment.amount },
      { accountId: byCode.get(AR), credit: payment.amount },
    ],
  }, options);
}
