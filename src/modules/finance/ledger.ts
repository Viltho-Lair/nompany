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
import { postingProblem, periodOf } from "./periods";
import type { Period } from "./periods";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { invoiceTotals } from "./finance";
import { splitGross } from "@/shared/vat";
import { withheldToClear } from "./withholding";
import { isForeign, rateFor, inBase, settlePayment } from "./fx";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import {
  acquisitionLines, depreciationDue, depreciationLines, disposalLines, fundingCode, isFunding, ASSET_CODES,
} from "./depreciation";
import type { CodeLine } from "./depreciation";
import type { WithholdingRule } from "./withholding";
import { roundMoney, toMinor, fromMinor } from "@/shared/money";
import { closingLines } from "./statements";
import {
  DEFERRED_REVENUE, PREPAID_EXPENSES, deferralLines, recognitionLines, monthsFrom, evenShares,
} from "./schedules";
import type { Schedule } from "./schedules";
import type { Account, JournalEntry, JournalLine, Invoice, Expense, FinanceContext, FixedAsset } from "./types";
import type { Row } from "@/platform/db/store";

const ACCOUNTS = "accounts";
const ENTRIES = "journalEntries";

const Accounts = repo<Account>(ACCOUNTS);
const CreditNotes = repo("creditNotes");
const Entries = repo<JournalEntry>(ENTRIES);
// CLOSED MONTHS. Read on every posting — a lock nobody consults is a lock
// that does not exist.
const Periods = repo<Period>("accountingPeriods");
// The cash documents this ledger posts FROM — invoices and expenses live in the
// finance-cash section, not the ledger's own.
const Invoices = repo<Invoice>("invoices");
const Expenses = repo<Expense>("expenses");

const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");
// Money in WHOLE MINOR UNITS of the studio's currency — cents, fils, baisa. A
// ledger that carries floating-point crumbs stops balancing after enough
// postings, so every amount is rounded ON THE WAY IN and the balance check
// compares integers, never floats.
//
// THE UNIT IS THE STUDIO'S, NOT A HUNDRED. This was fixed at cents, so a
// Jordanian studio's book dropped the third decimal of every dinar posted to
// it. The book is kept in the studio's own currency, so that currency decides.
// An entry written at two places is still exact at three, so nothing already
// posted needs rewriting.
const cents = (v: unknown, currency: unknown) => toMinor(v, currency);
const money = (c: number, currency: unknown) => fromMinor(c, currency);

export type AccountType = Account["type"];

// THE DEFAULT CHART, small-business shaped and deliberately small — a studio
// grows it, but it has to be able to post the day it opens Finance. Order is
// the conventional one (assets, liabilities, equity, income, expense) because
// that is the order a trial balance and a balance sheet read in.
export const DEFAULT_CHART: { code: string; name: string; type: AccountType }[] = [
  { code: "1000", name: "Cash", type: "asset" },
  { code: "1010", name: "Bank", type: "asset" },
  { code: "1100", name: "Accounts Receivable", type: "asset" },
  { code: "1150", name: "Cheques Receivable", type: "asset" },
  { code: "1200", name: "Inventory", type: "asset" },
  // MONEY HANDED TO STAFF BEFORE THEY SPEND IT (18/09/2026): the studio's
  // until a claim accounts for it or the person hands it back (./claims).
  { code: "1250", name: "Staff Advances", type: "asset" },
  // TAX A CLIENT WITHHELD, 18/09/2026: money the authority holds on the
  // studio's behalf until the certificate is claimed. Without it the withheld
  // part of every invoice stayed in Accounts Receivable for ever, owed by a
  // client who is legally required not to pay it.
  { code: "1300", name: "Withholding Tax Receivable", type: "asset" },
  // INPUT VAT HAS ITS OWN ACCOUNT, 18/09/2026. It sat on 2100 beside output
  // VAT, so the book could say what was owed net and never how much had been
  // charged and how much reclaimed. An asset: it is money the authority owes
  // back. Entries posted before this stay where they were — a posted entry is
  // never edited — so 2100 still nets both for the months before it.
  { code: "1400", name: "VAT Recoverable", type: "asset" },
  // COSTS PAID FOR MONTHS NOT YET HAD (18/09/2026, ./schedules): a year's
  // insurance paid in January is eleven months of asset, not a January cost.
  { code: "1450", name: "Prepaid Expenses", type: "asset" },
  { code: "1500", name: "Fixed Assets", type: "asset" },
  { code: "1510", name: "Accumulated Depreciation", type: "asset" },
  // A LEASED ASSET ON THE BALANCE SHEET (IFRS 16, 18/09/2026, ./leases): the
  // right to use it, and what of that right has been used. 16xx, not 15xx, so
  // the cash flow statement does not read a lease's recognition as a purchase.
  { code: "1600", name: "Right-of-Use Assets", type: "asset" },
  { code: "1610", name: "Accumulated Depreciation — Right-of-Use", type: "asset" },
  { code: "2000", name: "Accounts Payable", type: "liability" },
  // CHEQUES THE STUDIO HAS TAKEN OR WRITTEN AND THE BANK HAS NOT YET MOVED,
  // 18/09/2026. A post-dated cheque settles the debt the day it changes hands
  // and moves money only when it clears; between the two it is neither the
  // receivable it replaced nor money in the bank.
  { code: "2050", name: "Cheques Payable", type: "liability" },
  { code: "2100", name: "VAT Payable", type: "liability" },
  // TAX THE STUDIO WITHHELD FROM A SUPPLIER and owes the authority until it is
  // paid over, 18/09/2026 — the mirror of 1300 on the invoice side.
  { code: "2150", name: "Withholding Tax Payable", type: "liability" },
  // WHAT A FILED VAT RETURN SAID IS OWED (or due back) until it is paid,
  // 18/09/2026: the settlement moves the period's VAT here out of 2100 and 1400.
  { code: "2160", name: "VAT Due", type: "liability" },
  // ZAKAT PROVIDED FOR AND NOT YET PAID, 18/09/2026 — only a studio whose
  // country levies zakat ever posts to it (modules/finance/zakatService).
  { code: "2170", name: "Zakat Payable", type: "liability" },
  // ADDED WITH PAYROLL, and it needs no migration: `ledgerAccounts` seeds any
  // code from this chart that a studio is missing on every read, so an
  // existing studio gains it the next time its ledger is opened.
  { code: "2200", name: "Payroll Payable", type: "liability" },
  // WHAT THE STUDIO OWES STAFF FOR APPROVED EXPENSE CLAIMS (18/09/2026) — its
  // own line, like payroll, not netted with what suppliers are owed.
  { code: "2210", name: "Staff Claims Payable", type: "liability" },
  // REVENUE INVOICED BEFORE IT IS EARNED (IFRS 15, 18/09/2026, ./schedules).
  { code: "2300", name: "Deferred Revenue", type: "liability" },
  // WHAT A LEASE STILL OWES (IFRS 16). 25xx on purpose: the cash flow statement
  // reads 25xx–29xx as financing, which is where a lease's repayments belong.
  { code: "2500", name: "Lease Liabilities", type: "liability" },
  { code: "3000", name: "Owner's Equity", type: "equity" },
  { code: "3900", name: "Retained Earnings", type: "equity" },
  { code: "4000", name: "Revenue", type: "income" },
  // WHAT AN ASSET WAS SOLD FOR BEYOND WHAT IT WAS STILL WORTH, 18/09/2026 — a
  // loss reads as a negative, the contra balance the statements already show.
  { code: "4900", name: "Gain or Loss on Disposal", type: "income" },
  { code: "5000", name: "Cost of Sales", type: "expense" },
  { code: "5100", name: "Salaries", type: "expense" },
  { code: "5200", name: "Rent", type: "expense" },
  { code: "5300", name: "Utilities", type: "expense" },
  // THE WRITE-DOWN OF FIXED ASSETS, posted by the depreciation run, 18/09/2026.
  // The register had computed it all along and nothing put it in the book.
  { code: "5400", name: "Depreciation", type: "expense" },
  { code: "5410", name: "Right-of-Use Depreciation", type: "expense" },
  // WHAT A FOREIGN-CURRENCY BILL COST MORE OR LESS THAN IT WAS BOOKED AT, by
  // the day it was paid, 18/09/2026. An expense account, so a gain reads as a
  // negative expense — the contra balance the statements already show.
  { code: "5800", name: "Exchange Differences", type: "expense" },
  { code: "5810", name: "Lease Interest", type: "expense" },
  { code: "5900", name: "Other Expenses", type: "expense" },
  { code: "5950", name: "Zakat", type: "expense" },
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
// OLDEST FIRST WITHIN A CODE, so a chart that somehow holds one code twice
// always resolves it to the same account — every `find` by code takes the
// first, and postings would otherwise split between two copies depending on
// which the store happened to return first.
const byCode = (rows: Account[]): Account[] =>
  [...rows].sort((x, y) => String(x.code).localeCompare(String(y.code))
    || String(x.createdAt || "").localeCompare(String(y.createdAt || ""))
    || String(x.id).localeCompare(String(y.id)));

/**
 * THE ID A DEFAULT ACCOUNT IS SEEDED UNDER — fixed per code, so two requests
 * seeding the same studio at once cannot both succeed: the table's primary key
 * (tenant, section, collection, id) refuses the second, where a random id let
 * both land and left the chart holding the code twice. Found in the sandbox
 * on 18/09/2026: the Tax screen's parallel reads seeded Zakat (5950) and Zakat
 * Payable (2170) twice, the provision went to one copy and the report read the
 * other. Accounts seeded before this keep their random ids.
 */
const seedId = (code: string) => `acc_std_${code}`;

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
    const row = { id: seedId(a.code), code: a.code, name: a.name, type: a.type, active: true, createdAt: new Date().toISOString() };
    try {
      seeded.push(await Accounts.create({ studio, section: ledgerSection }, row));
    } catch (err) {
      // ANOTHER REQUEST SEEDED IT FIRST — the primary key said so. Its row is
      // this row (same id, same code, same name), so it is used as it stands.
      if (!/duplicate key|unique/i.test(String((err as Error)?.message || err))) throw err;
      seeded.push({ ...row, studioId: studio.id, sectionId: ledgerSection.id } as Account);
    }
  }
  // Newest-first is how addRow prepends; return them in chart order so the
  // caller and the reports read top-down.
  return byCode([...existing, ...seeded]);
}

// ---------------------------------------------------------------------------
// EDITING THE CHART
// ---------------------------------------------------------------------------

/**
 * THE ACCOUNTS THE AUTOMATIC POSTINGS NAME BY CODE. Every one of them is the
 * credit or debit side of something a studio does without thinking about the
 * ledger — issuing an invoice, paying a bill, running depreciation — so retiring
 * one does not tidy the chart, it makes every such act refuse to post
 * (`inactive`), silently from the point of view of whoever raised the document.
 * So they may be renamed and never retired. The whole default chart is on it:
 * a default nothing posts to yet is still a home a later posting may take.
 */
const DEFAULT_CODES = new Set(DEFAULT_CHART.map((a) => a.code));

const ACCOUNT_TYPES: readonly AccountType[] = ["asset", "liability", "equity", "income", "expense"];
// A CODE IS A SHORT KEY, not a sentence: digits, letters, a dot or a dash —
// what every printed chart uses — so it sorts and reads the way the reports do.
const CODE_RE = /^[0-9A-Za-z][0-9A-Za-z.-]{0,11}$/;

/** Net minor units per account, over the whole journal. */
function netByAccount(entries: JournalEntry[], currency: unknown) {
  const net = new Map<string, number>();
  const touched = new Set<string>();
  for (const e of entries) {
    for (const l of e.lines || []) {
      touched.add(l.accountId);
      net.set(l.accountId, (net.get(l.accountId) || 0) + cents(l.debit, currency) - cents(l.credit, currency));
    }
  }
  return { net, touched };
}

/**
 * A PARENT THAT CANNOT HOLD THIS ACCOUNT, or null. Same type — a sub-account
 * rolls up into its parent on the reports, and an expense rolled into an asset
 * would be added to the wrong side — and never the account itself or anything
 * beneath it, or the tree has a loop no report can walk.
 */
function parentProblem(accounts: Account[], id: string | null, parentId: string, type: AccountType): string | null {
  if (!parentId) return null;
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const parent = byId.get(parentId);
  if (!parent) return "parent";
  if (parent.type !== type) return "parent-type";
  for (let at: Account | undefined = parent, hops = 0; at && hops < 50; at = at.parentId ? byId.get(at.parentId) : undefined, hops++) {
    if (id && at.id === id) return "parent-loop";
  }
  return null;
}

/**
 * ADD AN ACCOUNT. `finance.ledger.post` — the right to keep the books by hand —
 * because an account nobody may post to by hand is only ever reached by the
 * automatic postings, which name the default chart and nothing else. A second
 * right for the chart alone would be one more box nobody ticks.
 */
export async function createAccount(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.ledger.post");
  if (denied) return denied;

  const code = str(body?.code, 20);
  if (!CODE_RE.test(code)) return { error: "code" };
  const name = str(body?.name, 120);
  if (!name) return { error: "name" };
  const type = ACCOUNT_TYPES.find((t) => t === body?.type);
  if (!type) return { error: "type" };

  const accounts = await ledgerAccounts(ctx);
  // UNIQUE BY CODE, whatever the case: the postings find an account by its code,
  // and two accounts answering to one would let a report and a posting choose
  // differently.
  if (accounts.some((a) => a.code.toLowerCase() === code.toLowerCase())) return { error: "code-taken" };
  const parentId = str(body?.parentId, 60);
  const wrong = parentProblem(accounts, null, parentId, type);
  if (wrong) return { error: wrong };

  // ONLY AN ASSET HOLDS MONEY. A liability marked as one would offer a loan
  // account as somewhere a customer's payment could land.
  if (body?.cash === true && type !== "asset") return { error: "cash-type" };

  const account = await Accounts.create({ studio: ctx.studio, section: ctx.ledgerSection }, {
    code, name, type, active: true,
    ...(parentId ? { parentId } : {}),
    ...(body?.cash === true ? { cash: true } : {}),
    createdAt: new Date().toISOString(),
    createdByCollaboratorId: ctx.collaborator.id,
  });
  return { account };
}

/**
 * RENAME, RE-PARENT OR RETIRE AN ACCOUNT. Never deleted: its postings are
 * history, and a report reading them needs the account to still say what it was.
 *
 * THE TYPE MOVES ONLY WHILE NOTHING IS POSTED TO IT. An account's type decides
 * which statement its postings land on and which way round they read; changing
 * it afterwards would move last year's figures from the P&L to the balance sheet
 * without a single entry saying so.
 *
 * RETIRING NEEDS A NOUGHT BALANCE. A retired account with money on it still
 * counts in every report, and nobody can post the entry that would clear it.
 */
export async function editAccount(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.ledger.post");
  if (denied) return denied;

  const accounts = await ledgerAccounts(ctx);
  const current = accounts.find((a) => a.id === id);
  if (!current) return { error: "notfound" };

  const patch: Record<string, unknown> = {};
  if (body?.name !== undefined) {
    const name = str(body.name, 120);
    if (!name) return { error: "name" };
    patch.name = name;
  }

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  const { net, touched } = netByAccount(entries, ctx.studio.currency);

  let type = current.type;
  if (body?.type !== undefined && body.type !== current.type) {
    const next = ACCOUNT_TYPES.find((t) => t === body.type);
    if (!next) return { error: "type" };
    if (touched.has(id)) return { error: "type-posted" };
    // A DEFAULT ACCOUNT KEEPS ITS TYPE: the postings rely on Revenue being
    // income and Accounts Payable a liability as much as on their codes.
    if (DEFAULT_CODES.has(current.code)) return { error: "type-default" };
    type = next;
    patch.type = next;
  }
  if (body?.cash !== undefined) {
    if (body.cash === true && type !== "asset") return { error: "cash-type" };
    // THE DEFAULT PAIR STAYS MONEY: every posting before today moved money
    // through 1010, and unmarking it would hide the bank from its own screens.
    if (body.cash !== true && DEFAULT_MONEY_CODES.includes(current.code)) return { error: "used-by-postings" };
    patch.cash = body.cash === true;
  }
  if (body?.parentId !== undefined) {
    const parentId = str(body.parentId, 60);
    const wrong = parentProblem(accounts, id, parentId, type);
    if (wrong) return { error: wrong };
    patch.parentId = parentId;
  }
  if (body?.active !== undefined) {
    const active = body.active !== false;
    if (!active && current.active !== false) {
      if (DEFAULT_CODES.has(current.code)) return { error: "used-by-postings" };
      if (net.get(id)) return { error: "has-balance", balance: money(Math.abs(net.get(id) || 0), ctx.studio.currency) };
      // A PARENT OF A LIVE ACCOUNT stays live, or the tree hangs a live account
      // off a retired one and the reports roll it into nothing.
      if (accounts.some((a) => a.parentId === id && a.active !== false)) return { error: "has-children" };
    }
    patch.active = active;
  }

  const account = await Accounts.update({ studio: ctx.studio, section: ctx.ledgerSection }, id, patch);
  return account ? { account } : { error: "notfound" };
}

// ---------------------------------------------------------------------------
// MONEY ACCOUNTS — where money actually sits
// ---------------------------------------------------------------------------

/**
 * THE TWO DEFAULT MONEY ACCOUNTS. The chart shipped with a Cash and a Bank and
 * every posting that moved money named 1010; a studio with two banks, a till
 * and a petty-cash box had one account for all four. Marking an asset `cash`
 * adds it; these two are money accounts without the mark, so nothing stored
 * needs rewriting.
 */
const DEFAULT_MONEY_CODES = ["1000", "1010"];

export const isMoneyAccount = (a: Pick<Account, "type" | "code" | "active"> & { cash?: boolean }): boolean =>
  a.active !== false && a.type === "asset" && (a.cash === true || DEFAULT_MONEY_CODES.includes(a.code));

/**
 * THE STUDIO'S MONEY ACCOUNTS, in chart order, READ WITHOUT SEEDING. The
 * screens ask for this list beside other reads, and `ledgerAccounts` seeds —
 * two first reads of a new studio each seeding is the duplicate-chart race.
 * A studio with no chart yet gets an empty list, and its postings fall to 1010,
 * which `ledgerAccounts` will seed the moment one is made.
 */
export async function storedMoneyAccounts(ctx: FinanceContext): Promise<Account[]> {
  return byCode(await Accounts.find({ studio: ctx.studio, section: ctx.ledgerSection })).filter(isMoneyAccount);
}

/** Null when `id` is empty (the default bank) or names a live money account. */
export async function moneyAccountProblem(ctx: FinanceContext, id: unknown): Promise<string | null> {
  const wanted = str(id, 60);
  if (!wanted) return null;
  return (await storedMoneyAccounts(ctx)).some((a) => a.id === wanted) ? null : "bank-account";
}

/**
 * THE ACCOUNT A POSTING MOVES MONEY THROUGH: the one the document names, or
 * 1010 Bank when it names none — which is every document recorded before
 * 18/09/2026, so none of them changes meaning. A named account that is no
 * longer a money account (retired since) refuses by name rather than silently
 * moving the money to the bank.
 */
async function moneyAccountFor(ctx: FinanceContext, requested: unknown): Promise<{ id: string } | { error: string }> {
  const accounts = await ledgerAccounts(ctx);
  const wanted = str(requested, 60);
  if (wanted) {
    const a = accounts.find((x) => x.id === wanted);
    return a && isMoneyAccount(a) ? { id: a.id } : { error: "bank-account" };
  }
  const bank = accounts.find((a) => a.code === BANK);
  return bank ? { id: bank.id } : { error: "chart" };
}

async function chequesAccount(ctx: FinanceContext, code: string): Promise<{ id: string } | { error: string }> {
  const { byCode, missing } = await codesToIds(ctx, [code]);
  return missing.length ? { error: "chart" } : { id: String(byCode.get(code)) };
}

/**
 * A LINKED CHEQUE CLEARS: the money finally moves. Incoming — Dr the account it
 * cleared into, Cr Cheques Receivable; outgoing — Dr Cheques Payable, Cr the
 * account it left. Dated the day it cleared, because that is the bank's date.
 */
export async function postCheque(ctx: FinanceContext, chequeId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const cheque = (await repo<Row>("cheques").find({ studio: ctx.studio, section: ctx.cashSection }))
    .find((c) => c.id === chequeId) as (Row & {
      direction?: string; status?: string; amount?: number; number?: string; party?: string;
      invoiceId?: string; billId?: string; accountId?: string; clearedOn?: string;
    }) | undefined;
  if (!cheque) return { error: "notfound" };
  if (cheque.status !== "cleared") return { error: "not-postable", status: cheque.status };
  if (!cheque.invoiceId && !cheque.billId) return { error: "not-linked" };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "cheque", chequeId)) return { error: "already-posted" };

  const incoming = cheque.direction === "in";
  const holding = await chequesAccount(ctx, incoming ? CHEQUES_RECEIVABLE : CHEQUES_PAYABLE);
  if ("error" in holding) return holding;
  const money = await moneyAccountFor(ctx, cheque.accountId);
  if ("error" in money) return money;
  const amount = roundMoney(Number(cheque.amount) || 0, ctx.studio.currency);

  return postEntry(ctx, {
    date: cheque.clearedOn,
    memo: `Cheque ${cheque.number} cleared — ${cheque.party || ""}`.trim(),
    source: { kind: "cheque", id: chequeId },
    lines: incoming
      ? [{ accountId: money.id, debit: amount }, { accountId: holding.id, credit: amount }]
      : [{ accountId: holding.id, debit: amount }, { accountId: money.id, credit: amount }],
  }, options);
}

/**
 * MOVE MONEY BETWEEN TWO OF THE STUDIO'S OWN ACCOUNTS — the bank to the petty
 * cash box, one bank to another. Dr the account it arrives in, Cr the one it
 * left. It is not income and not spending, so it is its own act rather than an
 * expense somebody has to remember to cancel out.
 *
 * `finance.cash.edit`, the right that records the money moving in and out, and
 * posted under the studio's authority like every other document's entry. The
 * ENTRY IS THE RECORD: there is no transfers collection to drift from it, and
 * undoing one is reversing it in the ledger.
 */
export async function transferFunds(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.cash.edit");
  if (denied) return denied;

  const from = str(body?.fromAccountId, 60);
  const to = str(body?.toAccountId, 60);
  if (!from || !to) return { error: "bank-account" };
  if (from === to) return { error: "same-account" };
  const held = await storedMoneyAccounts(ctx);
  const source = held.find((a) => a.id === from);
  const target = held.find((a) => a.id === to);
  if (!source || !target) return { error: "bank-account" };
  const amount = roundMoney(Number(body?.amount) || 0, ctx.studio.currency);
  if (!(amount > 0)) return { error: "amount" };

  const memo = str(body?.memo, 300);
  return postEntry(ctx, {
    date: body?.date,
    memo: memo || `Transfer — ${source.name} to ${target.name}`,
    source: { kind: "transfer", id: `trf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` },
    lines: [
      { accountId: target.id, debit: amount },
      { accountId: source.id, credit: amount },
    ],
  }, { system: true });
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
  currency: unknown,
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
    const d = cents((r as Row)?.debit, currency);
    const c = cents((r as Row)?.credit, currency);
    // EXACTLY ONE SIDE. A line that is both a debit and a credit, or neither, is
    // not a posting — it is a mistake that would still let the entry "balance"
    // while meaning nothing.
    if ((d > 0) === (c > 0)) return { error: "one-side", accountId } as { error: string };
    debit += d;
    credit += c;
    const line: JournalLine = { accountId, debit: money(d, currency), credit: money(c, currency) };
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
  "invoice", "expense", "bill", "bill-payment", "payment", "credit-note", "payroll", "withholding",
  "asset", "depreciation", "asset-disposal", "transfer", "cheque", "bill-withholding",
  "tax-return", "tax-payment", "zakat-provision", "zakat-payment", "year-end",
  "claim", "claim-payment", "advance", "advance-return",
  "deferral", "recognition", "lease", "lease-month", "allocation", "manual",
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

  const cleaned = cleanLines(body?.lines, byId, studio.currency);
  if ("error" in cleaned) return cleaned;
  // THE BALANCE RULE, in whole cents so no float ever makes a balanced entry
  // look off by a hundredth.
  if (cleaned.debit !== cleaned.credit) {
    return { error: "unbalanced", debit: money(cleaned.debit, studio.currency), credit: money(cleaned.credit, studio.currency) };
  }

  // THE PERIOD LOCK, and it sits HERE rather than in each of the seven posting
  // functions for the reason the balance check does: this is the one door every
  // entry passes through, and a check in seven callers is seven chances to add
  // an eighth without it.
  //
  // THE DATE IS RESOLVED FIRST, because an unparseable one becomes today and
  // the lock must judge the date that will actually be STORED — asking about
  // the raw value would let `date: "whenever"` past a closed current month.
  const entryDate = day(body?.date) || new Date().toISOString().slice(0, 10);
  const closedPeriods = await Periods.find({ studio, section: ledgerSection });
  const locked = postingProblem(closedPeriods, entryDate);
  if (locked) return { error: locked, period: periodOf(entryDate) };

  const kind = ENTRY_SOURCE_KINDS.find((k) => k === body?.source?.kind) || "manual";

  const entries = await Entries.find({ studio, section: ledgerSection });
  const reference = await nextReference(studio.id, { rows: entries as Row[], field: "reference", ...seriesSetting("journal", studio.numbering) });

  const entry = await Entries.create({ studio, section: ledgerSection }, {
    reference,
    date: entryDate,
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

  const { studio, ledgerSection } = ctx;
  const entries = await Entries.find({ studio, section: ledgerSection });
  const original = entries.find((e) => e.id === id);
  if (!original) return { error: "notfound" };
  if (original.reversedByEntryId) return { error: "already-reversed", by: original.reversedByEntryId };
  if (original.reversalOfEntryId) return { error: "is-a-reversal" };

  return { reversal: await mirrorEntry(ctx, original, entries, str(reason, 500)) };
}

/**
 * POST THE MIRROR OF AN ENTRY and stamp the original reversed — the write both
 * `reverseEntry` (a person, by hand) and `reverseDocument` (a document's own
 * correction) make. No permission of its own: each caller answers that.
 *
 * EVERY DIMENSION IS CARRIED, not only the project. The hand-written mirror
 * kept `projectId` and `memo` and dropped `dealId`, `costCodeId` and
 * `departmentId`, so a reversal netted to zero on the trial balance and left
 * the deal, cost-code and department views off by the whole amount.
 */
async function mirrorEntry(ctx: FinanceContext, original: JournalEntry, entries: JournalEntry[], reason: string, on?: string) {
  const { studio, ledgerSection, collaborator } = ctx;
  const reference = await nextReference(studio.id, { rows: entries as Row[], field: "reference", ...seriesSetting("journal", studio.numbering) });
  const mirrored: JournalLine[] = (original.lines || []).map((l) => ({ ...l, debit: l.credit, credit: l.debit }));

  const reversal = await Entries.create({ studio, section: ledgerSection }, {
    reference,
    date: on || new Date().toISOString().slice(0, 10),
    memo: reason || `Reversal of ${original.reference}`,
    lines: mirrored,
    source: { kind: "reversal", id: original.id },
    postedByCollaboratorId: collaborator.id,
    postedAt: new Date().toISOString(),
    reversalOfEntryId: original.id,
  });

  // Stamp the original so it cannot be reversed again. A function patch, so
  // "mark this reversed" stays a flip under contention (invariant 8).
  await Entries.update({ studio, section: ledgerSection }, original.id, () => ({ reversedByEntryId: reversal.id }));
  entries.push(reversal as JournalEntry);
  return reversal;
}

/**
 * UNDO WHAT A DOCUMENT POSTED, because the document changed.
 *
 * THE BOOKS DRIFTED FROM THE DOCUMENTS. Cancelling an issued invoice, editing
 * or deleting an expense, cancelling or re-pricing a received bill — each
 * changed the document and left its entry standing, so revenue stayed booked on
 * a cancelled invoice and an expense corrected from 500 to 50 stayed at 500 in
 * the ledger, and nothing said so.
 *
 * THE STUDIO'S AUTHORITY, like `autoPost`: the person cancelling the invoice was
 * authorised to cancel it, and reversing its entry is the consequence rather
 * than a separate act of bookkeeping.
 *
 * DATED TODAY AND HELD TO THE PERIOD LOCK. A reversal is a new entry, so it
 * lands in the month it is made — the original's month stays as it was closed —
 * and a closed CURRENT month refuses it by name, for the caller to say.
 */
export async function reverseDocument(ctx: FinanceContext, kind: EntrySourceKind, id: string, reason: string, on?: string) {
  const { studio, ledgerSection } = ctx;
  const entries = await Entries.find({ studio, section: ledgerSection });
  const live = entries.filter((e) => e.source?.kind === kind && e.source?.id === id
    && !e.reversedByEntryId && !e.reversalOfEntryId);
  if (!live.length) return { reversed: [] as JournalEntry[] };

  // A YEAR-END'S REVERSAL IS DATED ON THE YEAR'S LAST DAY (`on`), not today:
  // reopening 2025 must put 2025's result back into 2025's accounts, and a
  // mirror dated in 2026 would hand it to the wrong year's balance sheet.
  const date = day(on) || new Date().toISOString().slice(0, 10);
  const locked = postingProblem(await Periods.find({ studio, section: ledgerSection }), date);
  if (locked) return { error: locked, period: periodOf(date) };

  const reversed: JournalEntry[] = [];
  for (const e of live) reversed.push(await mirrorEntry(ctx, e, entries, str(reason, 500), day(on) || undefined) as JournalEntry);
  return { reversed };
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
export function trialBalanceFrom(accounts: Account[], entries: JournalEntry[], currency: unknown) {
  // Net cents per account, so the running arithmetic never touches a float.
  const net = new Map<string, number>();
  for (const e of entries) {
    for (const l of e.lines || []) {
      net.set(l.accountId, (net.get(l.accountId) || 0) + cents(l.debit, currency) - cents(l.credit, currency));
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
      debit: money(debit, currency), credit: money(credit, currency),
      normalSide: DEBIT_NORMAL[a.type] ? "debit" : "credit",
    };
  });

  return {
    rows,
    totalDebit: money(totalDebit, currency),
    totalCredit: money(totalCredit, currency),
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
    ctx.studio.currency,
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
const VAT_RECOVERABLE = "1400";
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
// PAYROLL SITS ON ITS OWN LIABILITY, not on Accounts Payable. What a company
// owes its staff and what it owes its suppliers are different lines on a
// balance sheet, and netting them makes both wrong.
const PAYROLL_PAYABLE = "2200";
const SALARIES = "5100";
const COST_OF_SALES = "5000";  // where an uncategorised vendor bill lands

// Resolve chart CODES to the account ids a posting line needs, seeding the chart
// if it has to. Returns a lookup, or the codes it could not find (which would
// mean the chart was edited to remove a default the postings rely on).
async function codesToIds(ctx: FinanceContext, codes: string[]) {
  const accounts = await ledgerAccounts(ctx);
  // THE FIRST OF A CODE, which `ledgerAccounts` orders oldest-first — a Map
  // built naively keeps the LAST, and would disagree with every `find`.
  const byCode = new Map<string, string>();
  for (const a of accounts) if (!byCode.has(a.code)) byCode.set(a.code, a.id);
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
export const paymentSource = (parentId: string, paymentId: string) => `${parentId}:${paymentId}`;
const CHEQUES_RECEIVABLE = "1150";
const CHEQUES_PAYABLE = "2050";

// A REVERSED ENTRY IS NOT "POSTED". Cancelling, correcting or deleting a
// document reverses what it posted (`reverseDocument`), and a corrected
// document must then be able to post as it now stands — which this refused
// while it counted the reversed entry, so a correction could undo the books and
// never redo them.
function alreadyPosted(entries: JournalEntry[], kind: string, id: string) {
  return entries.some((e) => e.source?.kind === kind && e.source?.id === id && !e.reversedByEntryId);
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

  const totals = invoiceTotals(invoice, ctx.studio.currency);
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
  const { byCode, missing } = await codesToIds(ctx, [expenseCode]);
  if (missing.length) return { error: "chart", missing };
  const paidFrom = await moneyAccountFor(ctx, (expense as { accountId?: unknown }).accountId);
  if ("error" in paidFrom) return paidFrom;

  return postEntry(ctx, {
    date: expense.date,
    memo: `Expense ${expense.reference}${expense.category ? ` — ${expense.category}` : ""}`,
    source: { kind: "expense", id: expenseId },
    lines: [
      { accountId: byCode.get(expenseCode), debit: expense.amount },
      { accountId: paidFrom.id, credit: expense.amount },
    ],
  }, options);
}

// ---------------------------------------------------------------------------
// TAX WITHHELD BY THE CLIENT
// ---------------------------------------------------------------------------

const WHT_RECEIVABLE = "1300";

/**
 * WHAT OF THIS INVOICE'S RECEIVABLE IS TAX THE CLIENT WITHHELD — the pure rule
 * (`withheldToClear` in ./withholding) asked of one stored invoice. A draft or
 * a cancelled invoice has no receivable to move.
 */
export function invoiceWithheldToClear(
  invoice: Invoice,
  rules: readonly WithholdingRule[],
  currency: unknown,
): number {
  if (invoice.status === "Draft" || invoice.status === "Cancelled") return 0;
  const rule = rules.find((r) => r.label === String(invoice.withholdingLabel || "")) || null;
  return withheldToClear(invoiceTotals(invoice, currency), rule, currency);
}

/** What the live entries of one document put on the books: the sum of their debits. */
export async function postedAmount(ctx: FinanceContext, kind: EntrySourceKind, id: string): Promise<number> {
  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  let total = 0;
  for (const e of entries) {
    if (e.source?.kind !== kind || e.source?.id !== id || e.reversedByEntryId || e.reversalOfEntryId) continue;
    for (const l of e.lines || []) total += cents(l.debit, ctx.studio.currency);
  }
  return money(total, ctx.studio.currency);
}

/**
 * POST WHAT THE CLIENT WITHHELD: debit Withholding Tax Receivable, credit
 * Accounts Receivable. Dated on the payment that settled the invoice, because
 * that is the day the client handed over less and the tax became the
 * authority's to return rather than the client's to pay.
 */
export async function postWithholding(ctx: FinanceContext, invoiceId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }

  const invoice = (await Invoices.find({ studio: ctx.studio, section: ctx.cashSection }))
    .find((i) => i.id === invoiceId);
  if (!invoice) return { error: "notfound" };
  const currency = invoice.currency || ctx.studio.currency;
  const amount = invoiceWithheldToClear(invoice, ctx.withholdingRules || [], currency);
  if (!amount) return { error: "nothing-withheld" };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "withholding", invoiceId)) return { error: "already-posted" };

  const { byCode, missing } = await codesToIds(ctx, [WHT_RECEIVABLE, AR]);
  if (missing.length) return { error: "chart", missing };

  const dates = (invoice.payments || []).map((p) => String(p.date || "")).filter(Boolean).sort();
  return postEntry(ctx, {
    date: dates[dates.length - 1],
    memo: `Tax withheld on ${invoice.reference}${invoice.withholdingLabel ? ` — ${invoice.withholdingLabel}` : ""}`,
    source: { kind: "withholding", id: invoiceId },
    lines: [
      { accountId: byCode.get(WHT_RECEIVABLE), debit: amount },
      { accountId: byCode.get(AR), credit: amount },
    ],
  }, options);
}

const AP = "2000";       // Accounts Payable
const WHT_PAYABLE = "2150";

/** What of a bill's payable is tax the studio withheld — the invoice rule, asked of a bill. */
export function billWithheldToClear(
  bill: { status?: string; withholdingLabel?: string; lines?: unknown; vatRate?: unknown; payments?: unknown; currency?: unknown },
  rules: readonly WithholdingRule[],
  currency: unknown,
): number {
  if (bill.status === "Draft" || bill.status === "Cancelled") return 0;
  const rule = rules.find((r) => r.label === String(bill.withholdingLabel || "")) || null;
  return withheldToClear(invoiceTotals(bill, currency), rule, currency);
}

/**
 * POST WHAT THE STUDIO WITHHELD FROM A SUPPLIER: debit Accounts Payable for
 * the part it did not pay them, credit Withholding Tax Payable — the debt moves
 * from the supplier to the authority. Dated on the payment that settled the
 * bill. In the studio's own currency only: `editBill` refuses a rule on a
 * foreign bill.
 */
export async function postBillWithholding(ctx: FinanceContext, billId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const bill = (await repo<Row>("bills").find({ studio: ctx.studio, section: ctx.payablesSection }))
    .find((b) => b.id === billId) as (Row & { status?: string; withholdingLabel?: string; currency?: string; reference?: string; payments?: { date?: string }[] }) | undefined;
  if (!bill) return { error: "notfound" };
  if (isForeign(bill.currency, ctx.studio.currency)) return { error: "foreign" };
  const amount = billWithheldToClear(bill, ctx.withholdingRules || [], ctx.studio.currency);
  if (!amount) return { error: "nothing-withheld" };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "bill-withholding", billId)) return { error: "already-posted" };
  const { byCode, missing } = await codesToIds(ctx, [AP, WHT_PAYABLE]);
  if (missing.length) return { error: "chart", missing };

  const dates = (bill.payments || []).map((p) => String(p.date || "")).filter(Boolean).sort();
  return postEntry(ctx, {
    date: dates[dates.length - 1],
    memo: `Tax withheld on ${bill.reference}${bill.withholdingLabel ? ` — ${bill.withholdingLabel}` : ""}`,
    source: { kind: "bill-withholding", id: billId },
    lines: [
      { accountId: byCode.get(AP), debit: amount },
      { accountId: byCode.get(WHT_PAYABLE), credit: amount },
    ],
  }, options);
}

// ---------------------------------------------------------------------------
// THE VAT RETURN IN THE BOOK
// ---------------------------------------------------------------------------

const VAT_DUE = "2160";
const TaxReturns = repo<Row>("taxReturns");

/**
 * THE PERIOD'S VAT, AS THE LEDGER MOVED IT: what VAT Payable (2100) was
 * credited net and VAT Recoverable (1400) debited net by entries dated in the
 * period — leaving out the settlements themselves, or a second filing would
 * count the first one's clearing. `due` is the first less the second.
 */
export async function vatMovement(ctx: FinanceContext, from: string, to: string) {
  const [entries, accounts] = await Promise.all([
    Entries.find({ studio: ctx.studio, section: ctx.ledgerSection }),
    Accounts.find({ studio: ctx.studio, section: ctx.ledgerSection }),
  ]);
  const idOf = (code: string) => accounts.find((a) => a.code === code)?.id;
  const payable = idOf(VAT_PAYABLE);
  const recoverable = idOf(VAT_RECOVERABLE);
  let owed = 0;
  let back = 0;
  for (const e of entries) {
    const d = String(e.date || "");
    if (!d || d < from || d > to) continue;
    if (e.source?.kind === "tax-return" || e.source?.kind === "tax-payment") continue;
    for (const l of e.lines || []) {
      if (l.accountId === payable) owed += cents(l.credit, ctx.studio.currency) - cents(l.debit, ctx.studio.currency);
      if (l.accountId === recoverable) back += cents(l.debit, ctx.studio.currency) - cents(l.credit, ctx.studio.currency);
    }
  }
  const c = ctx.studio.currency;
  return { payable: money(owed, c), recoverable: money(back, c), due: money(owed - back, c) };
}

/**
 * SETTLE A FILED RETURN: clear the period's movement on VAT Payable and VAT
 * Recoverable into VAT Due. Dated on the period's last day, because it is that
 * period's VAT being settled — and held to the lock like any entry.
 */
export async function postTaxReturn(ctx: FinanceContext, returnId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const r = (await TaxReturns.find({ studio: ctx.studio, section: ctx.taxSection })).find((x) => x.id === returnId) as (Row & { from?: string; to?: string }) | undefined;
  if (!r) return { error: "notfound" };
  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "tax-return", returnId)) return { error: "already-posted" };

  const m = await vatMovement(ctx, String(r.from), String(r.to));
  const { byCode, missing } = await codesToIds(ctx, [VAT_PAYABLE, VAT_RECOVERABLE, VAT_DUE]);
  if (missing.length) return { error: "chart", missing };
  const lines: { accountId: string | undefined; debit?: number; credit?: number }[] = [];
  const side = (code: string, amount: number, debitWhenPositive: boolean) => {
    if (!amount) return;
    const debit = (amount > 0) === debitWhenPositive;
    lines.push({ accountId: byCode.get(code), ...(debit ? { debit: Math.abs(amount) } : { credit: Math.abs(amount) }) });
  };
  side(VAT_PAYABLE, m.payable, true);        // clear what 2100 was credited
  side(VAT_RECOVERABLE, m.recoverable, false); // clear what 1400 was debited
  side(VAT_DUE, m.due, false);               // what is owed lands here
  if (lines.length < 2) return { error: "nothing-due" };

  return postEntry(ctx, {
    date: r.to,
    memo: `VAT return ${r.from} to ${r.to}`,
    source: { kind: "tax-return", id: returnId },
    lines,
  }, options);
}

/** PAY A FILED RETURN (or take its refund): VAT Due against a money account. */
export async function postTaxPayment(ctx: FinanceContext, returnId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const r = (await TaxReturns.find({ studio: ctx.studio, section: ctx.taxSection })).find((x) => x.id === returnId) as (Row & { from?: string; to?: string; due?: number; paidOn?: string; accountId?: string; status?: string }) | undefined;
  if (!r) return { error: "notfound" };
  if (r.status !== "paid") return { error: "not-postable", status: r.status };
  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "tax-payment", returnId)) return { error: "already-posted" };
  const due = roundMoney(Number(r.due) || 0, ctx.studio.currency);
  if (!due) return { error: "nothing-due" };
  const { byCode, missing } = await codesToIds(ctx, [VAT_DUE]);
  if (missing.length) return { error: "chart", missing };
  const bank = await moneyAccountFor(ctx, r.accountId);
  if ("error" in bank) return bank;
  const owed = due > 0;
  return postEntry(ctx, {
    date: r.paidOn,
    memo: `VAT ${owed ? "paid" : "refunded"} — return ${r.from} to ${r.to}`,
    source: { kind: "tax-payment", id: returnId },
    lines: owed
      ? [{ accountId: byCode.get(VAT_DUE), debit: due }, { accountId: bank.id, credit: due }]
      : [{ accountId: bank.id, debit: -due }, { accountId: byCode.get(VAT_DUE), credit: -due }],
  }, options);
}

// ---------------------------------------------------------------------------
// ZAKAT IN THE BOOK
// ---------------------------------------------------------------------------

const ZAKAT_EXPENSE = "5950";
const ZAKAT_PAYABLE = "2170";
const ZakatSheets = repo<Row>("zakatWorksheets");

type ZakatSheetRow = Row & { from?: string; to?: string; status?: string; provisioned?: { zakat?: number }; paidOn?: string; accountId?: string };
async function zakatSheet(ctx: FinanceContext, id: string) {
  return (await ZakatSheets.find({ studio: ctx.studio, section: ctx.taxSection })).find((s) => s.id === id) as ZakatSheetRow | undefined;
}

/** PROVIDE FOR A YEAR'S ZAKAT: Dr Zakat, Cr Zakat Payable, on the year's last day. */
export async function postZakatProvision(ctx: FinanceContext, sheetId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const sheet = await zakatSheet(ctx, sheetId);
  if (!sheet) return { error: "notfound" };
  if (sheet.status === "draft") return { error: "not-postable", status: sheet.status };
  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "zakat-provision", sheetId)) return { error: "already-posted" };
  const amount = roundMoney(Number(sheet.provisioned?.zakat) || 0, ctx.studio.currency);
  if (!(amount > 0)) return { error: "nothing-due" };
  const { byCode, missing } = await codesToIds(ctx, [ZAKAT_EXPENSE, ZAKAT_PAYABLE]);
  if (missing.length) return { error: "chart", missing };
  return postEntry(ctx, {
    date: sheet.to,
    memo: `Zakat ${sheet.from} to ${sheet.to}`,
    source: { kind: "zakat-provision", id: sheetId },
    lines: [{ accountId: byCode.get(ZAKAT_EXPENSE), debit: amount }, { accountId: byCode.get(ZAKAT_PAYABLE), credit: amount }],
  }, options);
}

/** PAY A PROVIDED YEAR: Dr Zakat Payable, Cr the money account. */
export async function postZakatPayment(ctx: FinanceContext, sheetId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const sheet = await zakatSheet(ctx, sheetId);
  if (!sheet) return { error: "notfound" };
  if (sheet.status !== "paid") return { error: "not-postable", status: sheet.status };
  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "zakat-payment", sheetId)) return { error: "already-posted" };
  const amount = roundMoney(Number(sheet.provisioned?.zakat) || 0, ctx.studio.currency);
  if (!(amount > 0)) return { error: "nothing-due" };
  const { byCode, missing } = await codesToIds(ctx, [ZAKAT_PAYABLE]);
  if (missing.length) return { error: "chart", missing };
  const bank = await moneyAccountFor(ctx, sheet.accountId);
  if ("error" in bank) return bank;
  return postEntry(ctx, {
    date: sheet.paidOn,
    memo: `Zakat paid — ${sheet.from} to ${sheet.to}`,
    source: { kind: "zakat-payment", id: sheetId },
    lines: [{ accountId: byCode.get(ZAKAT_PAYABLE), debit: amount }, { accountId: bank.id, credit: amount }],
  }, options);
}

// AP is the mirror of AR: the accounts an invoice credits, a bill debits.

const Bills = repo<Row>("bills");
const FX_DIFFERENCES = "5800";

/**
 * THE RATE A BILL IS BOOKED AT, and it is decided ONCE.
 *
 * A bill in the studio's own currency is at 1 and nothing is read. A foreign
 * one uses the rate somebody typed on it, or else the day's market table — and
 * the market rate is WRITTEN ONTO THE BILL the first time it is used, so a later
 * correction that re-posts the bill books it at the same rate instead of
 * whatever the table says that day. Only the absent case writes, as a function
 * patch (invariant 8), so two posts racing cannot freeze two rates.
 *
 * No rate at all refuses by name. A bill booked at a guessed rate is a wrong
 * liability that reads exactly like a right one.
 */
async function bookRate(
  ctx: FinanceContext,
  bill: Row & { currency?: string; exchangeRate?: unknown },
): Promise<{ rate: number } | { error: string; currency?: string }> {
  if (!isForeign(bill.currency, ctx.studio.currency)) return { rate: 1 };
  const typed = rateFor(bill.exchangeRate, null, bill.currency, ctx.studio.currency);
  if (typed) return { rate: typed };
  const snapshot = await getExchangeSnapshot();
  const rate = rateFor(null, snapshot.rates, bill.currency, ctx.studio.currency);
  if (!rate) return { error: "no-rate", currency: String(bill.currency || "") };
  const frozenAt = new Date().toISOString();
  const stored = await Bills.update({ studio: ctx.studio, section: ctx.payablesSection }, String(bill.id), (row) => (
    (row as { exchangeRate?: unknown }).exchangeRate ? {} : { exchangeRate: rate, exchangeRateSource: "market", exchangeRateAt: frozenAt }
  ));
  const won = rateFor((stored as { exchangeRate?: unknown } | null)?.exchangeRate, null, bill.currency, ctx.studio.currency);
  return { rate: won || rate };
}

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

  const totals = invoiceTotals(bill as { lines?: unknown; vatRate?: unknown; payments?: unknown; currency?: unknown }, ctx.studio.currency);
  // IN THE BOOK'S CURRENCY. A bill in dollars posted its dollars into a book in
  // dinars until 18/09/2026; it is converted now, at the rate frozen on the bill.
  const booked = await bookRate(ctx, bill);
  if ("error" in booked) return booked;
  const base = inBase(totals, booked.rate, ctx.studio.currency);
  const expenseCode = CATEGORY_ACCOUNT[bill.category || ""] || COST_OF_SALES;
  const { byCode, missing } = await codesToIds(ctx, [expenseCode, VAT_RECOVERABLE, AP]);
  if (missing.length) return { error: "chart", missing };

  const lines: { accountId: string | undefined; debit?: number; credit?: number }[] = [
    { accountId: byCode.get(expenseCode), debit: base.net },
    { accountId: byCode.get(AP), credit: base.total },
  ];
  // INPUT VAT IS RECLAIMABLE, and it is debited to its OWN account rather than
  // netted on VAT Payable. Netting it there made the balance right and the
  // return unanswerable from the book: "how much did we charge, how much do we
  // reclaim" is the whole of a VAT return, and one account holding both could
  // only say the difference.
  if (base.vat > 0) lines.push({ accountId: byCode.get(VAT_RECOVERABLE), debit: base.vat });

  return postEntry(ctx, {
    date: bill.billDate,
    memo: `Bill ${bill.reference}${bill.vendorName ? ` — ${bill.vendorName}` : ""}${booked.rate !== 1 ? ` (${bill.currency} at ${booked.rate})` : ""}`,
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
  // the invoice's currency, net by subtraction so the entry balances —
  // `splitGross`, the one copy the tax return also uses, so the two give back
  // the same tax.
  const noteCurrency = (invoice as { currency?: unknown }).currency || ctx.studio.currency;
  const gross = roundMoney(note.amount, noteCurrency);
  const { net, vat } = splitGross(gross, (invoice as { vatRate?: unknown }).vatRate, noteCurrency);

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
    .find((b) => b.id === billId) as (Row & { payments?: { id: string; amount: number; date?: string; rate?: unknown }[]; reference?: string; currency?: string; exchangeRate?: unknown }) | undefined;
  if (!bill) return { error: "notfound" };
  const payment = (bill.payments || []).find((p) => p.id === paymentId);
  if (!payment) return { error: "notfound-payment" };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "bill-payment", paymentSource(billId, paymentId))) {
    return { error: "already-posted" };
  }

  // A FOREIGN BILL IS PAID AT TWO RATES: the payable leaves at the one it was
  // booked at, the bank pays at the one on the day, and the gap is a realised
  // exchange difference. Paying it at one rate either left crumbs on the payable
  // for ever or hid the gain or loss inside it.
  if (isForeign(bill.currency, ctx.studio.currency)) {
    const booked = await bookRate(ctx, bill);
    if ("error" in booked) return booked;
    const totals = invoiceTotals(bill as { lines?: unknown; vatRate?: unknown; payments?: unknown; currency?: unknown }, ctx.studio.currency);
    const settled = settlePayment(
      { total: totals.total, payments: bill.payments || [] }, paymentId,
      inBase(totals, booked.rate, ctx.studio.currency).total, booked.rate, ctx.studio.currency,
    );
    if (!settled) return { error: "no-rate", currency: String(bill.currency || "") };
    const { byCode, missing } = await codesToIds(ctx, [AP, FX_DIFFERENCES]);
    if (missing.length) return { error: "chart", missing };
    const paidFrom = await moneyAccountFor(ctx, (payment as { accountId?: unknown }).accountId);
    if ("error" in paidFrom) return paidFrom;
    const lines: { accountId: string | undefined; debit?: number; credit?: number }[] = [
      { accountId: byCode.get(AP), debit: settled.payable },
      { accountId: paidFrom.id, credit: settled.bank },
    ];
    if (settled.difference > 0) lines.push({ accountId: byCode.get(FX_DIFFERENCES), debit: settled.difference });
    if (settled.difference < 0) lines.push({ accountId: byCode.get(FX_DIFFERENCES), credit: -settled.difference });
    return postEntry(ctx, {
      date: payment.date,
      memo: `Payment on ${bill.reference} (${payment.amount} ${bill.currency})`,
      source: { kind: "bill-payment", id: paymentSource(billId, paymentId) },
      lines,
    }, options);
  }

  const { byCode, missing } = await codesToIds(ctx, [AP]);
  if (missing.length) return { error: "chart", missing };
  // PAID BY OUR OWN CHEQUE: the debt moves to Cheques Payable until it clears.
  const paidFrom = (payment as { chequeId?: string }).chequeId
    ? await chequesAccount(ctx, CHEQUES_PAYABLE)
    : await moneyAccountFor(ctx, (payment as { accountId?: unknown }).accountId);
  if ("error" in paidFrom) return paidFrom;

  return postEntry(ctx, {
    date: payment.date,
    memo: `Payment on ${bill.reference}`,
    source: { kind: "bill-payment", id: paymentSource(billId, paymentId) },
    lines: [
      { accountId: byCode.get(AP), debit: payment.amount },
      { accountId: paidFrom.id, credit: payment.amount },
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

  const { byCode, missing } = await codesToIds(ctx, [AR]);
  if (missing.length) return { error: "chart", missing };
  // PAID BY CHEQUE: the debt is settled and the money has not moved, so it lands
  // on Cheques Receivable and the cheque's clearing moves it to the bank.
  const viaCheque = (payment as { chequeId?: string }).chequeId;
  const paidInto = viaCheque
    ? await chequesAccount(ctx, CHEQUES_RECEIVABLE)
    : await moneyAccountFor(ctx, (payment as { accountId?: unknown }).accountId);
  if ("error" in paidInto) return paidInto;

  return postEntry(ctx, {
    date: payment.date,
    memo: `Payment on ${invoice.reference}`,
    source: { kind: "payment", id: paymentSource(invoiceId, paymentId) },
    lines: [
      { accountId: paidInto.id, debit: payment.amount },
      { accountId: byCode.get(AR), credit: payment.amount },
    ],
  }, options);
}

/**
 * POST A PAYROLL RUN: debit Salaries for the GROSS, credit Payroll Payable for
 * the net, and credit it again for the deductions.
 *
 * THE GROSS IS THE COST AND THE NET IS NOT. What the company spent on people is
 * everything it promised them; what it will hand over in cash is that less what
 * it withheld. Posting the net as the expense understates the wage bill by
 * exactly the deductions, which is the mistake that makes a payroll cost look
 * like it fell in a month somebody took a loan.
 *
 * DEDUCTIONS GO TO THE SAME LIABILITY as the net rather than to income. This
 * product does not know what a deduction IS — a loan repayment, a social
 * security contribution, a fine — and putting it anywhere more specific would be
 * guessing on the studio's behalf. It is money withheld and not yet passed on,
 * which is what a payable is, and a studio that wants it split re-posts by hand.
 *
 * READ FROM HR'S SECTION, and refused when the studio has none: Finance posts,
 * HR records, and the ledger is the one place that knows what a balanced entry
 * looks like.
 */
export async function postPayroll(ctx: FinanceContext, runId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  if (!ctx.hrEmployeesSection) return { error: "no-hr" };

  const run = (await repo<Row>("payrollRuns")
    .find({ studio: ctx.studio, section: ctx.hrEmployeesSection }))
    .find((r) => r.id === runId) as (Row & {
      status?: string; period?: string; totals?: { gross?: number; net?: number; deductions?: number; ssEmployer?: number };
    }) | undefined;
  if (!run) return { error: "notfound" };
  // A DRAFT RUN IS NOT A COST YET. Its amounts are still being edited, and
  // posting one would put a figure in the books that the next save changes.
  if (run.status === "Draft") return { error: "not-postable", status: run.status };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "payroll", runId)) return { error: "already-posted" };

  // NOT `money()`. IN THIS FILE `money` MEANS MINOR UNITS -> MONEY,
  // and a run's totals are already money — so calling it here divided the wage
  // bill by a hundred and produced an entry of 35 against 33.02 that
  // `postEntry` refused as unbalanced. Caught by tests/crud.mjs on its first
  // run, which is the argument for the end-to-end case existing at all: the
  // arithmetic was right in the pure model and wrong at the seam.
  const round2 = (n: number) => roundMoney(n, ctx.studio.currency);
  const gross = round2(Number(run.totals?.gross) || 0);
  const net = round2(Number(run.totals?.net) || 0);
  const withheld = round2(gross - net);
  // THE EMPLOYER'S SOCIAL SECURITY IS A COST ON TOP OF GROSS (tier 6): what the
  // company owes the scheme for its staff, which no payslip shows as pay. It is
  // debited with the wage bill and owed on the same liability as the withheld
  // share, since both are paid over to the scheme together.
  const employer = round2(Number(run.totals?.ssEmployer) || 0);

  const { byCode, missing } = await codesToIds(ctx, [SALARIES, PAYROLL_PAYABLE]);
  if (missing.length) return { error: "chart", missing };

  const lines: { accountId: string | undefined; debit?: number; credit?: number }[] = [
    { accountId: byCode.get(SALARIES), debit: round2(gross + employer) },
    { accountId: byCode.get(PAYROLL_PAYABLE), credit: net },
  ];
  // Only when there is something withheld: a line of nought is noise in a
  // journal, and `cleanLines` would keep it.
  if (withheld > 0) lines.push({ accountId: byCode.get(PAYROLL_PAYABLE), credit: withheld });
  if (employer > 0) lines.push({ accountId: byCode.get(PAYROLL_PAYABLE), credit: employer });

  return postEntry(ctx, {
    // THE PERIOD'S LAST DAY, not today. A run for September posted in October is
    // September's cost, and dating it by the clock would move a month's wage
    // bill into the month somebody got round to posting it.
    date: lastDayOf(String(run.period || "")),
    memo: `Payroll ${run.period}`,
    source: { kind: "payroll", id: runId },
    lines,
  }, options);
}

// ============================================================================
// FIXED ASSETS. The register computed cost, depreciation and book value from
// the day it was built and none of it reached the book: Fixed Assets and
// Accumulated Depreciation sat in the chart at nought on every studio.
// ============================================================================

const FixedAssets = repo<FixedAsset>("fixedAssets");

/** Code lines to account-id lines, or the codes the chart is missing. */
type ResolvedLines =
  | { error: "chart"; missing: string[] }
  | { lines: { accountId: string | undefined; debit?: number; credit?: number; projectId?: string }[] };

async function resolveLines(ctx: FinanceContext, lines: CodeLine[], dims: { projectId?: string } = {}): Promise<ResolvedLines> {
  const { byCode, missing } = await codesToIds(ctx, [...new Set(lines.map((l) => l.code))]);
  if (missing.length) return { error: "chart" as const, missing };
  return {
    lines: lines.map((l) => ({
      accountId: byCode.get(l.code),
      ...(l.debit ? { debit: l.debit } : { credit: l.credit }),
      // THE PROJECT RIDES ON THE EXPENSE AND GAIN LINES, so a project's P&L
      // carries the write-down of the plant it used. The balance-sheet lines
      // do not need it; the statements never cut the balance sheet.
      ...(dims.projectId && (l.code === ASSET_CODES.charge || l.code === ASSET_CODES.disposal) ? { projectId: dims.projectId } : {}),
    })),
  };
}

/**
 * WHERE EACH ASSET STANDS IN THE BOOK: whether its acquisition is posted, how
 * much depreciation the book holds for it, and whether its disposal is posted.
 * Read from the journal, never a flag on the asset — the same rule as
 * `alreadyPosted`: the entry is the thing that matters.
 */
export async function assetBookState(ctx: FinanceContext) {
  // THE CHART AS STORED, NOT `ledgerAccounts`: that one SEEDS, and this is
  // read by the asset register's GET beside the ledger's own — two first reads
  // of a brand-new studio each seeding is the duplicate-chart race the ledger
  // route orders itself around. A studio with no 1510 yet has no depreciation
  // posted against it either.
  const [entries, accounts] = await Promise.all([
    Entries.find({ studio: ctx.studio, section: ctx.ledgerSection }),
    Accounts.find({ studio: ctx.studio, section: ctx.ledgerSection }),
  ]);
  const accumulatedId = accounts.find((a) => a.code === ASSET_CODES.accumulated)?.id;
  const state = new Map<string, { booked: boolean; depreciated: number; disposed: boolean }>();
  const of = (id: string) => {
    let row = state.get(id);
    if (!row) { row = { booked: false, depreciated: 0, disposed: false }; state.set(id, row); }
    return row;
  };
  const minor = new Map<string, number>();
  for (const e of entries) {
    if (e.reversedByEntryId || e.reversalOfEntryId) continue;
    const kind = e.source?.kind;
    const id = String(e.source?.id || "");
    if (kind === "asset") of(id).booked = true;
    if (kind === "asset-disposal") of(id).disposed = true;
    if (kind === "depreciation") {
      const assetId = id.split(":")[0];
      of(assetId);
      for (const l of e.lines || []) {
        if (l.accountId !== accumulatedId) continue;
        minor.set(assetId, (minor.get(assetId) || 0) + cents(l.credit, ctx.studio.currency) - cents(l.debit, ctx.studio.currency));
      }
    }
  }
  for (const [id, m] of minor) of(id).depreciated = money(m, ctx.studio.currency);
  return state;
}

async function findAsset(ctx: FinanceContext, id: string) {
  return (await FixedAssets.find({ studio: ctx.studio, section: ctx.assetsSection })).find((a) => a.id === id);
}

/**
 * PUT AN ASSET ON THE BOOKS: Dr Fixed Assets, Cr wherever it was paid from —
 * which is asked, never assumed (see FUNDING_SOURCES). Dated the day it was
 * acquired, because that is when the studio came to own it.
 */
export async function postAsset(ctx: FinanceContext, assetId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const asset = await findAsset(ctx, assetId);
  if (!asset) return { error: "notfound" };
  if (!isFunding(asset.fundedBy)) return { error: "not-funded" };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "asset", assetId)) return { error: "already-posted" };

  // BOUGHT ON A BILL: the cost is already in the book as that bill's expense,
  // so it is MOVED from the account the bill was booked to — the same choice
  // `postBill` makes — and never taken from the bank a second time.
  let billCode: string | undefined;
  if (asset.fundedBy === "bill") {
    const bill = (await repo<Row>("bills").find({ studio: ctx.studio, section: ctx.payablesSection }))
      .find((b) => b.id === asset.fundedByBillId) as (Row & { category?: string }) | undefined;
    if (!bill) return { error: "no-bill" };
    billCode = CATEGORY_ACCOUNT[bill.category || ""] || COST_OF_SALES;
  }
  const credit = fundingCode(asset.fundedBy, billCode);
  if (!credit) return { error: "no-bill" };
  const resolved = await resolveLines(ctx, acquisitionLines(asset.cost, credit, ctx.studio.currency));
  if ("error" in resolved) return resolved;

  return postEntry(ctx, {
    date: asset.acquiredOn,
    memo: `Asset ${asset.reference} — ${asset.name}`,
    source: { kind: "asset", id: assetId },
    lines: resolved.lines,
  }, options);
}

/**
 * DEPRECIATE ONE ASSET TO THE END OF A MONTH. The source id is
 * `<assetId>:<YYYY-MM>`, so a month posts once per asset, and what it posts is
 * the DIFFERENCE between the schedule and the book (`depreciationDue`) — which
 * is what lets a late run, a corrected life or an asset bought years ago all
 * come right in one entry.
 */
export async function postDepreciation(ctx: FinanceContext, sourceId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const [assetId, period] = sourceId.split(":");
  if (!assetId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period || "")) return { error: "period" };
  const asset = await findAsset(ctx, assetId);
  if (!asset) return { error: "notfound" };
  // A DISPOSED ASSET IS DEPRECIATED BY ITS DISPOSAL ENTRY, which charges
  // whatever the runs had not reached by the day it went.
  if (asset.disposedOn) return { error: "disposed" };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "depreciation", sourceId)) return { error: "already-posted" };
  const book = (await assetBookState(ctx)).get(assetId);
  // NOT ON THE BOOKS, NOT DEPRECIATED. Writing down a cost the book never held
  // would put Accumulated Depreciation against nothing.
  if (!book?.booked) return { error: "not-on-the-books" };

  const asOf = lastDayOf(period);
  const due = depreciationDue(asset, book.depreciated, asOf, ctx.studio.currency);
  const resolved = await resolveLines(ctx, depreciationLines(due), { projectId: asset.projectId });
  if ("error" in resolved) return resolved;
  if (!resolved.lines.length) return { error: "nothing-due" };

  return postEntry(ctx, {
    date: asOf,
    memo: `Depreciation ${period} — ${asset.reference} ${asset.name}`,
    source: { kind: "depreciation", id: sourceId },
    lines: resolved.lines,
  }, options);
}

/**
 * TAKE A DISPOSED ASSET OFF THE BOOKS — cost out, depreciation cleared,
 * proceeds in, and the gain or loss where it balances (`disposalLines`).
 * Dated the day it went.
 */
export async function postAssetDisposal(ctx: FinanceContext, assetId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const asset = await findAsset(ctx, assetId);
  if (!asset) return { error: "notfound" };
  if (!asset.disposedOn) return { error: "not-disposed" };

  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "asset-disposal", assetId)) return { error: "already-posted" };
  const book = (await assetBookState(ctx)).get(assetId);
  if (!book?.booked) return { error: "not-on-the-books" };

  const resolved = await resolveLines(ctx, disposalLines(asset, book.depreciated, ctx.studio.currency), { projectId: asset.projectId });
  if ("error" in resolved) return resolved;

  return postEntry(ctx, {
    date: asset.disposedOn,
    memo: `Disposal of ${asset.reference} — ${asset.name}`,
    source: { kind: "asset-disposal", id: assetId },
    lines: resolved.lines,
  }, options);
}

/** The last day of a `YYYY-MM` period, or today when it is not one. */
export function lastDayOf(period: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return new Date().toISOString().slice(0, 10);
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

const RETAINED_EARNINGS = "3900";

/**
 * CLOSE A YEAR INTO RETAINED EARNINGS: every income and expense account back to
 * nought on the year's last day, the result into 3900. `endMonth` (`YYYY-MM`)
 * is the year's LAST month, which is how a studio whose year ends in June
 * closes without a fiscal-year setting nobody has had to set. Held to the
 * period lock like every entry — the service closing the year posts this first
 * and locks the months after.
 */
export async function postYearEnd(ctx: FinanceContext, endMonth: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.close");
    if (denied) return denied;
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(endMonth)) return { error: "period" };
  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "year-end", endMonth)) return { error: "already-posted" };
  const { byCode, missing } = await codesToIds(ctx, [RETAINED_EARNINGS]);
  if (missing.length) return { error: "chart", missing };
  const asOf = lastDayOf(endMonth);
  const { lines } = closingLines(entries, await ledgerAccounts(ctx), asOf, String(byCode.get(RETAINED_EARNINGS)), ctx.studio.currency);
  if (!lines.length) return { error: "nothing-to-close" };
  return postEntry(ctx, {
    date: asOf,
    memo: `Year-end close to ${asOf}`,
    source: { kind: "year-end", id: endMonth },
    lines,
  }, options);
}

// ---------------------------------------------------------------------------
// EXPENSE CLAIMS AND STAFF ADVANCES (./claims)
// ---------------------------------------------------------------------------

const STAFF_ADVANCES = "1250";
const STAFF_CLAIMS_PAYABLE = "2210";
const Claims = repo<Row>("expenseClaims");
const Advances = repo<Row>("staffAdvances");

type ClaimRow = Row & {
  reference?: string; status?: string; approvedOn?: string; paidOn?: string; accountId?: string; fromAdvance?: number;
  lines?: { date?: string; category?: string; description?: string; amount?: number }[]; projectId?: string;
};
type AdvanceRow = Row & {
  reference?: string; status?: string; paidOn?: string; accountId?: string; amount?: number;
  returns?: { id: string; amount: number; date: string; accountId?: string }[];
};

async function claimRow(ctx: FinanceContext, id: string) {
  return (await Claims.find({ studio: ctx.studio, section: ctx.payablesSection })).find((c) => c.id === id) as ClaimRow | undefined;
}

/**
 * AN APPROVED CLAIM: Dr each category's expense account, Cr Staff Advances for
 * what the claimant's open advance cleared, Cr Staff Claims Payable for the
 * rest. Dated the day it was approved — the day the studio accepted the debt.
 */
export async function postClaim(ctx: FinanceContext, claimId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const claim = await claimRow(ctx, claimId);
  if (!claim) return { error: "notfound" };
  if (claim.status !== "Approved" && claim.status !== "Paid") return { error: "not-postable", status: claim.status };
  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "claim", claimId)) return { error: "already-posted" };
  const currency = ctx.studio.currency;
  const byAccount = new Map<string, number>();
  for (const l of claim.lines || []) {
    const code = CATEGORY_ACCOUNT[String(l.category || "")] || OTHER_EXPENSE;
    byAccount.set(code, (byAccount.get(code) || 0) + cents(l.amount, currency));
  }
  const total = [...byAccount.values()].reduce((a, b) => a + b, 0);
  if (!total) return { error: "nothing-due" };
  const fromAdvance = Math.min(total, cents(claim.fromAdvance, currency));
  const { byCode, missing } = await codesToIds(ctx, [...byAccount.keys(), STAFF_ADVANCES, STAFF_CLAIMS_PAYABLE]);
  if (missing.length) return { error: "chart", missing };
  const project = str(claim.projectId, 60);
  const lines: Record<string, unknown>[] = [...byAccount.entries()].map(([code, c]) => ({
    accountId: byCode.get(code), debit: money(c, currency), ...(project ? { projectId: project } : {}),
  }));
  if (fromAdvance) lines.push({ accountId: byCode.get(STAFF_ADVANCES), credit: money(fromAdvance, currency) });
  if (total - fromAdvance) lines.push({ accountId: byCode.get(STAFF_CLAIMS_PAYABLE), credit: money(total - fromAdvance, currency) });
  return postEntry(ctx, {
    date: claim.approvedOn,
    memo: `Expense claim ${claim.reference || ""}`.trim(),
    source: { kind: "claim", id: claimId },
    lines,
  }, options);
}

/** A CLAIM PAID: Dr Staff Claims Payable, Cr the money account, for the payable part. */
export async function postClaimPayment(ctx: FinanceContext, claimId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const claim = await claimRow(ctx, claimId);
  if (!claim) return { error: "notfound" };
  if (claim.status !== "Paid") return { error: "not-postable", status: claim.status };
  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "claim-payment", claimId)) return { error: "already-posted" };
  const currency = ctx.studio.currency;
  const total = (claim.lines || []).reduce((s, l) => s + cents(l.amount, currency), 0);
  const payable = total - Math.min(total, cents(claim.fromAdvance, currency));
  if (!(payable > 0)) return { error: "nothing-due" };
  const { byCode, missing } = await codesToIds(ctx, [STAFF_CLAIMS_PAYABLE]);
  if (missing.length) return { error: "chart", missing };
  const bank = await moneyAccountFor(ctx, claim.accountId);
  if ("error" in bank) return bank;
  return postEntry(ctx, {
    date: claim.paidOn,
    memo: `Expense claim ${claim.reference || ""} paid`.trim(),
    source: { kind: "claim-payment", id: claimId },
    lines: [
      { accountId: byCode.get(STAFF_CLAIMS_PAYABLE), debit: money(payable, currency) },
      { accountId: bank.id, credit: money(payable, currency) },
    ],
  }, options);
}

async function advanceRow(ctx: FinanceContext, id: string) {
  return (await Advances.find({ studio: ctx.studio, section: ctx.payablesSection })).find((a) => a.id === id) as AdvanceRow | undefined;
}

/** AN ADVANCE HANDED OVER: Dr Staff Advances, Cr the money account. */
export async function postAdvance(ctx: FinanceContext, advanceId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const adv = await advanceRow(ctx, advanceId);
  if (!adv) return { error: "notfound" };
  if (adv.status !== "Paid") return { error: "not-postable", status: adv.status };
  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "advance", advanceId)) return { error: "already-posted" };
  const amount = roundMoney(Number(adv.amount) || 0, ctx.studio.currency);
  if (!(amount > 0)) return { error: "nothing-due" };
  const { byCode, missing } = await codesToIds(ctx, [STAFF_ADVANCES]);
  if (missing.length) return { error: "chart", missing };
  const bank = await moneyAccountFor(ctx, adv.accountId);
  if ("error" in bank) return bank;
  return postEntry(ctx, {
    date: adv.paidOn,
    memo: `Staff advance ${adv.reference || ""}`.trim(),
    source: { kind: "advance", id: advanceId },
    lines: [{ accountId: byCode.get(STAFF_ADVANCES), debit: amount }, { accountId: bank.id, credit: amount }],
  }, options);
}

/** PART OF AN ADVANCE HANDED BACK (`<advanceId>:<returnId>`): Dr the money account, Cr Staff Advances. */
export async function postAdvanceReturn(ctx: FinanceContext, sourceId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const [advanceId, returnId] = sourceId.split(":");
  const adv = await advanceRow(ctx, advanceId);
  const ret = (adv?.returns || []).find((r) => r.id === returnId);
  if (!adv || !ret) return { error: "notfound" };
  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "advance-return", sourceId)) return { error: "already-posted" };
  const amount = roundMoney(Number(ret.amount) || 0, ctx.studio.currency);
  if (!(amount > 0)) return { error: "nothing-due" };
  const { byCode, missing } = await codesToIds(ctx, [STAFF_ADVANCES]);
  if (missing.length) return { error: "chart", missing };
  const bank = await moneyAccountFor(ctx, ret.accountId);
  if ("error" in bank) return bank;
  return postEntry(ctx, {
    date: ret.date,
    memo: `Staff advance ${adv.reference || ""} returned`.trim(),
    source: { kind: "advance-return", id: sourceId },
    lines: [{ accountId: bank.id, debit: amount }, { accountId: byCode.get(STAFF_ADVANCES), credit: amount }],
  }, options);
}

// ---------------------------------------------------------------------------
// DEFERRAL SCHEDULES (./schedules) — IFRS 15 revenue over time, and prepayments
// ---------------------------------------------------------------------------

const Schedules = repo<Row>("deferralSchedules");

async function scheduleRow(ctx: FinanceContext, id: string) {
  return (await Schedules.find({ studio: ctx.studio, section: ctx.ledgerSection })).find((s) => s.id === id) as
    (Row & Schedule & { status?: string }) | undefined;
}

const holdingCode = (s: Schedule) => (s.kind === "revenue" ? DEFERRED_REVENUE : PREPAID_EXPENSES);

/** THE DAY-ONE ENTRY: the whole amount out of the P&L into 2300 or 1450. */
export async function postDeferral(ctx: FinanceContext, scheduleId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const s = await scheduleRow(ctx, scheduleId);
  if (!s) return { error: "notfound" };
  if (s.status === "cancelled") return { error: "not-postable", status: s.status };
  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "deferral", scheduleId)) return { error: "already-posted" };
  const { byCode, missing } = await codesToIds(ctx, [holdingCode(s)]);
  if (missing.length) return { error: "chart", missing };
  return postEntry(ctx, {
    date: s.deferredOn,
    memo: `Deferred: ${s.description || s.reference || ""}`.trim(),
    source: { kind: "deferral", id: scheduleId },
    lines: deferralLines(s, String(byCode.get(holdingCode(s)))),
  }, options);
}

/** ONE MONTH'S SHARE BACK INTO THE P&L (`<scheduleId>:<YYYY-MM>`), on that month's last day. */
export async function postRecognition(ctx: FinanceContext, sourceId: string, options: PostOptions = {}) {
  if (!options.system) {
    const denied = requirePermission(ctx.access, "finance.ledger.post");
    if (denied) return denied;
  }
  const [scheduleId, period] = sourceId.split(":");
  const s = await scheduleRow(ctx, scheduleId);
  if (!s) return { error: "notfound" };
  if (s.status === "cancelled") return { error: "not-postable", status: s.status };
  const entries = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  if (alreadyPosted(entries, "recognition", sourceId)) return { error: "already-posted" };
  // NOT BEFORE THE DEFERRAL: recognising what was never deferred would count
  // the revenue twice — once on the invoice, once here.
  if (!alreadyPosted(entries, "deferral", scheduleId)) return { error: "not-deferred" };
  const months = monthsFrom(s.from, s.months);
  const i = months.indexOf(period);
  if (i < 0) return { error: "period" };
  const share = evenShares(s.amount, s.months, ctx.studio.currency)[i];
  const { byCode, missing } = await codesToIds(ctx, [holdingCode(s)]);
  if (missing.length) return { error: "chart", missing };
  return postEntry(ctx, {
    date: lastDayOf(period),
    memo: `Recognised ${period}: ${s.description || s.reference || ""}`.trim(),
    source: { kind: "recognition", id: sourceId },
    lines: recognitionLines(s, share, String(byCode.get(holdingCode(s)))),
  }, options);
}
