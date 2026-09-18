import { route } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { financeContext } from "@/modules/finance/finance";
import { ledgerAccounts, isMoneyAccount } from "@/modules/finance/ledger";
import { setupFor } from "@/modules/finance/setup";
import { repo } from "@/platform/db/repo";
import {
  profitAndLoss, balanceSheet, byDimension, cashFlow, DIMENSIONS,
} from "@/modules/finance/statements";
import type { Dimension } from "@/modules/finance/statements";
import type { JournalEntry } from "@/modules/finance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE STATEMENTS — Finance → Reports since the split (18/09/2026), on a right
// of their own (`finance.reports.view`). They were tabs of the Ledger screen and
// answered to `finance.ledger.view`, so reading the P&L meant being able to open
// every journal line; a manager who needs the profit does not need the book.
// Every role that could read the ledger gained this by catching up.
//
// ONE READ OF THE CHART AND ONE OF THE JOURNAL, and every statement computed
// from those — the reason the ledger route gave for serving them together.
const Entries = repo<JournalEntry>("journalEntries");

export const GET = route({ auth: "studio", context: financeContext, name: "finance-reports" }, async (f) => {
  const denied = requirePermission(f.access, "finance.reports.view");
  if (denied) return denied;

  const url = new URL(f.request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  // THE CUT, TAKEN FROM THE URL AND CHECKED AGAINST THE CLOSED SET. A dimension
  // is a property name the reader indexes lines by, so accepting whatever
  // arrived would let a caller read an arbitrary field off every posting.
  const asked = String(url.searchParams.get("dimension") || "");
  const dimension = (DIMENSIONS as readonly string[]).includes(asked) ? (asked as Dimension) : undefined;
  const value = url.searchParams.get("value") || undefined;
  // THE BALANCE SHEET'S DATE IS THE PERIOD'S END, not a third parameter: a sheet
  // as at a date the P&L does not reach would be two statements about different
  // worlds shown side by side.
  const asOf = to;

  // THE CHART ONCE — `ledgerAccounts` seeds, and a second call in one request
  // seeds again (see the ledger route).
  const chart = await ledgerAccounts(f);
  const entries = await Entries.find({ studio: f.studio, section: f.ledgerSection });
  const currency = f.studio.currency;

  return {
    ok: true,
    ...setupFor(f),
    // THE P&L IS CUT WHEN A DIMENSION WAS ASKED FOR, and is the whole book otherwise.
    profitAndLoss: profitAndLoss(entries, chart, { from, to, dimension, value, currency }),
    // THE BALANCE SHEET IS NEVER CUT: it is a statement about the whole entity,
    // and filtered to one deal it would report itself unbalanced and be right to.
    balanceSheet: balanceSheet(entries, chart, asOf, currency),
    // What each value of the asked dimension earned; absent when none was asked.
    breakdown: dimension ? byDimension(entries, chart, dimension, { from, to, currency }) : null,
    // THE CASH FLOW over the same window, read off the entries that touched a
    // money account — the accounts `isMoneyAccount` names, the same test the
    // Cash & Bank screen uses, so the two cannot disagree about what cash is.
    cashFlow: cashFlow(entries, chart, (a) => isMoneyAccount(a as Parameters<typeof isMoneyAccount>[0]), { from, to, currency }),
  };
});
