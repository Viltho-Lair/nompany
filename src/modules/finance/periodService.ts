// THE STORE HALF OF `./periods`.
//
// `finance.ledger.close` IS NOT `finance.ledger.post`. Posting is the daily
// act; closing says a month is finished with and nothing else may land in it,
// which is a decision about what the company has REPORTED — and the person who
// makes it is usually not the person keying the entries.
//
// THE LOCK ITSELF IS NOT HERE. It is in `postEntry`, the one door every entry
// passes through, because a check in each of the seven posting functions is
// seven chances to add an eighth without it.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import {
  closeProblems, closePreview, periodList, cleanClose, isClosed, periodOf, PERIOD_RE,
} from "./periods";
import type { Period } from "./periods";
import { invoiceWithheldToClear, postYearEnd, reverseDocument, ledgerAccounts, lastDayOf } from "./ledger";
import { closingLines } from "./statements";
import { roundMoney } from "@/shared/money";
import type { FinanceContext, Invoice } from "./types";
import type { JournalEntry } from "./types";

const Periods = repo<Period>("accountingPeriods");
const Entries = repo<JournalEntry>("journalEntries");
const Invoices = repo<Invoice>("invoices");
const Bills = repo<{ id: string; billDate?: string; status?: string }>("bills");
const Assets = repo<{ id: string; acquiredOn?: string }>("fixedAssets");

const scope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.ledgerSection });
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * DOCUMENTS DATED IN A PERIOD THAT ARE NOT IN THE BOOKS.
 *
 * ASKED OF THE JOURNAL rather than of a flag on the document, exactly as
 * `alreadyPosted` is: a flag could drift from whether an entry actually exists,
 * and the entry is the thing that matters.
 */
async function unpostedIn(ctx: FinanceContext, entries: JournalEntry[]) {
  const posted = new Set(entries.map((e) => `${e.source?.kind}:${e.source?.id}`));
  const [invoices, bills, assets] = await Promise.all([
    Invoices.find({ studio: ctx.studio, section: ctx.cashSection }),
    Bills.find({ studio: ctx.studio, section: ctx.payablesSection }),
    Assets.find({ studio: ctx.studio, section: ctx.assetsSection }),
  ]);

  const out: { document: { id: string }; date: string; kind: string }[] = [];
  for (const inv of invoices) {
    // A DRAFT OR CANCELLED DOCUMENT IS NOT MISSING FROM THE BOOKS — it was
    // never meant to be in them, and listing it would make every close look
    // incomplete for reasons nobody can act on.
    if (inv.status === "Draft" || inv.status === "Cancelled") continue;
    if (!posted.has(`invoice:${inv.id}`)) {
      out.push({ document: { id: inv.id }, date: String(inv.issueDate || ""), kind: "invoice" });
    }
    // THE TAX A CLIENT WITHHELD, on an invoice settled before 18/09/2026 — the
    // day it started leaving Accounts Receivable on the settling payment. Those
    // invoices are paid and will take no further payment, so nothing would ever
    // move their withheld tax; a close lists them instead, on the day of the
    // last payment, for somebody to post from the ledger.
    if (!posted.has(`withholding:${inv.id}`)
      && invoiceWithheldToClear(inv, ctx.withholdingRules || [], inv.currency || ctx.studio.currency) > 0) {
      const paidOn = (inv.payments || []).map((p) => String(p.date || "")).filter(Boolean).sort();
      out.push({ document: { id: inv.id }, date: paidOn[paidOn.length - 1] || "", kind: "withholding" });
    }
  }
  for (const bill of bills) {
    if (bill.status === "Draft" || bill.status === "Cancelled") continue;
    if (!posted.has(`bill:${bill.id}`)) {
      out.push({ document: { id: bill.id }, date: String(bill.billDate || ""), kind: "bill" });
    }
  }
  // A FIXED ASSET THE STUDIO OWNED IN THE MONTH AND THE BOOK DOES NOT HOLD —
  // one nobody has said how it was paid for, or whose acquisition was refused.
  // Its cost is missing from Fixed Assets and so is every month of its
  // depreciation, which is the kind of thing a close exists to catch.
  for (const asset of assets) {
    if (!posted.has(`asset:${asset.id}`)) {
      out.push({ document: { id: asset.id }, date: String(asset.acquiredOn || ""), kind: "asset" });
    }
  }
  return out;
}

/** The months, their state, and what a close of the chosen one would lock. */
export async function periods(ctx: FinanceContext, period: string) {
  const denied = requirePermission(ctx.access, "finance.ledger.view");
  if (denied) return denied;

  const [rows, entries, people] = await Promise.all([
    Periods.find(scope(ctx)),
    Entries.find(scope(ctx)),
    listCollaborators(ctx.studio.id),
  ]);
  const alias = Object.fromEntries(people.map((c) => [String(c.id), String(c.alias || "")]));
  const today = new Date().toISOString().slice(0, 10);

  return {
    today,
    periods: periodList(entries, rows, today).map((p) => {
      const row = rows.find((r) => r.period === p.period);
      return {
        ...p,
        closedByAlias: row ? alias[row.closedByCollaboratorId] || "" : "",
        closedAt: row?.closedAt || "",
        reopenedByAlias: row?.reopenedByCollaboratorId ? alias[row.reopenedByCollaboratorId] || "" : "",
        reason: row?.reason || "",
      };
    }),
    // THE PREVIEW IS THE POINT OF THE SCREEN: a close that only counted entries
    // would be a button, and one that names what is dated in the month and not
    // yet posted is a decision.
    preview: PERIOD_RE.test(period)
      ? closePreview(entries, await unpostedIn(ctx, entries), period)
      : null,
    canClose: !requirePermission(ctx.access, "finance.ledger.close"),
    years: await yearEnds(ctx, entries),
  };
}

/**
 * CLOSE A MONTH. It does not require everything to be posted first — a studio
 * that cannot close until everything is perfect never closes, and a lock that
 * is never applied protects nothing.
 */
export async function closePeriod(ctx: FinanceContext, period: string) {
  const denied = requirePermission(ctx.access, "finance.ledger.close");
  if (denied) return denied;

  const rows = await Periods.find(scope(ctx));
  const problems = closeProblems(rows, period);
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  // A FUTURE MONTH CANNOT BE CLOSED. Closing one would lock a month whose
  // entries have not been made, which is not a close — it is a way to stop
  // people working, and it would be discovered by somebody unable to post
  // today's invoice.
  const now = periodOf(new Date().toISOString().slice(0, 10));
  if (period > now) return { error: "future" };

  const existing = rows.find((r) => r.period === period);
  const at = new Date().toISOString();
  // A MONTH REOPENED AND CLOSED AGAIN REUSES ITS ROW, clearing the reopening —
  // the alternative is two rows for one month, and `isClosed` would then depend
  // on which it read first.
  if (existing) {
    const updated = await Periods.update(scope(ctx), existing.id, {
      closedByCollaboratorId: ctx.collaborator.id, closedAt: at,
      reopenedByCollaboratorId: "", reopenedAt: "", reason: "",
    });
    return updated ? { period: updated } : { error: "notfound" };
  }
  return {
    period: await Periods.create(scope(ctx), cleanClose(period, {
      collaboratorId: ctx.collaborator.id, at,
    })),
  };
}

/**
 * REOPEN ONE. Allowed, and RECORDED with a reason — a period that can never be
 * reopened turns one honest mistake into a permanent wrong number, and every
 * system that pretends otherwise grows a "period 13" to put the corrections in.
 * What matters is that reopening is a decision with a name on it.
 */
export async function reopenPeriod(ctx: FinanceContext, period: string, reason: unknown) {
  const denied = requirePermission(ctx.access, "finance.ledger.close");
  if (denied) return denied;

  const rows = await Periods.find(scope(ctx));
  if (!isClosed(rows, period)) return { error: "not-closed" };

  const why = str(reason, 300);
  // A REOPENING WITHOUT A REASON IS THE ONE THING THIS REFUSES. The act is
  // legitimate; doing it silently is not, because the reason is the whole
  // audit value of allowing it at all.
  if (!why) return { error: "reason" };

  const row = rows.find((r) => r.period === period && !r.reopenedAt);
  const updated = await Periods.update(scope(ctx), String(row?.id), {
    reopenedByCollaboratorId: ctx.collaborator.id,
    reopenedAt: new Date().toISOString(),
    reason: why,
  });
  return updated ? { period: updated } : { error: "notfound" };
}

// ── THE YEAR-END ───────────────────────────────────────────────────────────
//
// A YEAR IS NAMED BY ITS LAST MONTH. There is no fiscal-year setting and this
// does not need one: a studio whose year ends in June closes "2026-06", and the
// twelve months ending there are the year. The closing entry is posted FIRST,
// into a month that must still be open, and the year's months are locked
// after — so the one thing the lock exists to stop, a late entry changing a
// reported year, cannot happen between the two.

/** The twelve `YYYY-MM` months ending at `endMonth`, oldest first. */
export function monthsOfYear(endMonth: string): string[] {
  if (!PERIOD_RE.test(endMonth)) return [];
  const [y, m] = endMonth.split("-").map(Number);
  const out: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

/** The closed years, newest first, and what closing the latest open one would move. */
async function yearEnds(ctx: FinanceContext, entries: JournalEntry[]) {
  const accounts = await ledgerAccounts(ctx);
  const retainedId = accounts.find((a) => a.code === "3900")?.id || "";
  const live = entries.filter((e) => e.source?.kind === "year-end" && !e.reversedByEntryId);
  const closed = live.map((e) => {
    // THE YEAR'S RESULT IS WHAT WENT INTO RETAINED EARNINGS — read off the
    // closing entry itself, not recomputed, so it is what was actually closed.
    const r = (e.lines || []).find((l) => l.accountId === retainedId);
    const profit = r ? roundMoney((Number(r.credit) || 0) - (Number(r.debit) || 0), ctx.studio.currency) : 0;
    return { endMonth: String(e.source?.id || ""), entryId: e.id, reference: e.reference, date: e.date, profit };
  }).sort((a, b) => b.endMonth.localeCompare(a.endMonth));
  // THE SUGGESTION: the December before this one, unless it is closed already.
  const thisYear = Number(new Date().toISOString().slice(0, 4));
  const suggest = `${thisYear - 1}-12`;
  const preview = (endMonth: string) => {
    const { lines, profit } = closingLines(entries, accounts, lastDayOf(endMonth), retainedId, ctx.studio.currency);
    return { endMonth, profit, accounts: lines.filter((l) => l.accountId !== retainedId).length };
  };
  return { closed, suggest, preview: closed.some((c) => c.endMonth === suggest) ? null : preview(suggest) };
}

/** A preview for any year-end month the screen asks about. */
export async function yearEndPreview(ctx: FinanceContext, endMonth: string) {
  const denied = requirePermission(ctx.access, "finance.ledger.view");
  if (denied) return denied;
  if (!PERIOD_RE.test(endMonth)) return { error: "period" };
  const entries = await Entries.find(scope(ctx));
  const accounts = await ledgerAccounts(ctx);
  const retainedId = accounts.find((a) => a.code === "3900")?.id || "";
  const { lines, profit } = closingLines(entries, accounts, lastDayOf(endMonth), retainedId, ctx.studio.currency);
  return { preview: { endMonth, profit, accounts: lines.filter((l) => l.accountId !== retainedId).length } };
}

/** Lock each of these months, reusing a reopened month's row as `closePeriod` does. */
async function lockMonths(ctx: FinanceContext, months: string[]) {
  const rows = await Periods.find(scope(ctx));
  const at = new Date().toISOString();
  for (const period of months) {
    if (isClosed(rows, period)) continue;
    const existing = rows.find((r) => r.period === period);
    if (existing) {
      await Periods.update(scope(ctx), existing.id, () => ({
        closedByCollaboratorId: ctx.collaborator.id, closedAt: at,
        reopenedByCollaboratorId: "", reopenedAt: "", reason: "",
      }));
    } else {
      await Periods.create(scope(ctx), cleanClose(period, { collaboratorId: ctx.collaborator.id, at }));
    }
  }
}

/**
 * CLOSE A YEAR. The year must be over, and its last month open (the closing
 * entry is dated in it). Posts the closing entry, then locks all twelve months.
 */
export async function closeYear(ctx: FinanceContext, endMonth: string) {
  const denied = requirePermission(ctx.access, "finance.ledger.close");
  if (denied) return denied;
  if (!PERIOD_RE.test(endMonth)) return { error: "period" };
  const now = periodOf(new Date().toISOString().slice(0, 10));
  // A YEAR STILL RUNNING CANNOT BE CLOSED: its result is not known yet.
  if (endMonth >= now) return { error: "future" };
  const posted = await postYearEnd(ctx, endMonth, { system: true });
  if ("error" in posted && posted.error) return posted;
  await lockMonths(ctx, monthsOfYear(endMonth));
  return { closed: endMonth, entry: (posted as { entry?: unknown }).entry };
}

/**
 * REOPEN A CLOSED YEAR — with a reason, like a month. Its last month is
 * reopened and the closing entry reversed ON THE YEAR'S LAST DAY, so the
 * result goes back to the year it belongs to. The other eleven months stay
 * locked: reopening a year is to correct it, and a correction goes in the
 * month somebody reopens for it.
 */
export async function reopenYear(ctx: FinanceContext, endMonth: string, reason: unknown) {
  const denied = requirePermission(ctx.access, "finance.ledger.close");
  if (denied) return denied;
  const why = str(reason, 300);
  if (!why) return { error: "reason" };
  const entries = await Entries.find(scope(ctx));
  if (!entries.some((e) => e.source?.kind === "year-end" && e.source?.id === endMonth && !e.reversedByEntryId)) {
    return { error: "not-closed" };
  }
  const rows = await Periods.find(scope(ctx));
  if (isClosed(rows, endMonth)) {
    const reopened = await reopenPeriod(ctx, endMonth, why);
    if ("error" in reopened && reopened.error) return reopened;
  }
  const reversed = await reverseDocument(ctx, "year-end", endMonth, `Year reopened: ${why}`, lastDayOf(endMonth));
  if ("error" in reversed && reversed.error) return reversed;
  return { reopened: endMonth };
}
