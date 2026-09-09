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
import type { FinanceContext } from "./types";
import type { JournalEntry } from "./types";

const Periods = repo<Period>("accountingPeriods");
const Entries = repo<JournalEntry>("journalEntries");
const Invoices = repo<{ id: string; issueDate?: string; status?: string }>("invoices");
const Bills = repo<{ id: string; billDate?: string; status?: string }>("bills");

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
  const [invoices, bills] = await Promise.all([
    Invoices.find({ studio: ctx.studio, section: ctx.cashSection }),
    Bills.find({ studio: ctx.studio, section: ctx.payablesSection }),
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
  }
  for (const bill of bills) {
    if (bill.status === "Draft" || bill.status === "Cancelled") continue;
    if (!posted.has(`bill:${bill.id}`)) {
      out.push({ document: { id: bill.id }, date: String(bill.billDate || ""), kind: "bill" });
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
