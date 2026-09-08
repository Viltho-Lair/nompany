import { route, refused } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { financeContext } from "@/modules/finance/finance";
import {
  ledgerAccounts, listJournal, trialBalanceFrom, postEntry, reverseEntry,
} from "@/modules/finance/ledger";
import { postDocument } from "@/modules/finance/posting";
import {
  profitAndLoss, balanceSheet, byDimension, DIMENSIONS,
} from "@/modules/finance/statements";
import type { Dimension } from "@/modules/finance/statements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE LEDGER'S DOOR, AND IT HAD NONE.
//
// `postEntry`, `reverseEntry`, `listJournal`, `trialBalance` and the four
// document-posting functions were all written, typed, guarded and reachable by
// NOTHING: no route imported the module and no caller existed anywhere in `src`.
// A whole double-entry book that the product could not open — the same class as
// a right nothing can exercise (invariant 16), at module scale, and the status
// file called it built.
//
// PERMISSION IS ENFORCED IN THE SERVICE. Every function below asks
// `finance.ledger.*` for itself; this layer decides HTTP shape and nothing else.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance-ledger" };

// ONE READ FOR THE WHOLE LEDGER SCREEN: the chart, the journal, the trial
// balance and the two statements. They all read the SAME entries, so serving
// them separately would be four reads of one collection and four chances for
// the screen to show a profit and a trial balance computed a second apart.
export const GET = route({ ...spec, body: false }, async (f) => {
  const denied = requirePermission(f.access, "finance.ledger.view");
  if (denied) return denied;

  const url = new URL(f.request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  // THE CUT, TAKEN FROM THE URL AND CHECKED AGAINST THE CLOSED SET. A dimension
  // is a property name the reader indexes lines by, so accepting whatever
  // arrived would let a caller read an arbitrary field off every posting. Four
  // names, declared beside the model that uses them.
  const asked = String(url.searchParams.get("dimension") || "");
  const dimension = (DIMENSIONS as readonly string[]).includes(asked)
    ? (asked as Dimension)
    : undefined;
  const value = url.searchParams.get("value") || undefined;
  // THE BALANCE SHEET'S DATE IS THE PERIOD'S END, not a third parameter. A sheet
  // as at a date the P&L does not reach would be two statements about different
  // worlds shown side by side.
  const asOf = to;

  // THE CHART IS READ ONCE, AND EVERYTHING IS COMPUTED FROM THAT ONE READ.
  //
  // `ledgerAccounts` SEEDS the default chart when a studio has none, and
  // `repo.create` does not invalidate the request cache — so a second call
  // inside the same request gets the list as it was BEFORE the seed and seeds it
  // again. This route originally called `listAccounts`, `listJournal` and
  // `trialBalance` together; two of those three read the chart for themselves,
  // so a first request to a fresh studio wrote the whole chart THREE TIMES and
  // the trial balance listed Cash three times with the postings split between
  // the copies. Sequencing the calls did not fix it — the cache, not the
  // concurrency, was the mechanism.
  //
  // So: one read of the chart, one read of the journal, and the sums taken from
  // those. `trialBalanceFrom` is the same arithmetic `trialBalance` runs, split
  // out so this costs no duplication.
  const chart = await ledgerAccounts(f);
  const journal = await listJournal(f);
  if (refused(journal)) return journal;
  const entries = journal.entries;

  return {
    ok: true,
    accounts: chart,
    journal: entries,
    trialBalance: trialBalanceFrom(chart, entries),
    // THE P&L IS CUT WHEN A DIMENSION WAS ASKED FOR, and is the whole book
    // otherwise — one function, so the two answers cannot drift apart.
    profitAndLoss: profitAndLoss(entries, chart, { from, to, dimension, value }),
    // THE BALANCE SHEET IS NEVER CUT, and that is a decision rather than an
    // omission. A balance sheet is a statement about the WHOLE entity: assets
    // equal liabilities plus equity because every posting is in it. Filter it to
    // one deal and the identity breaks — the deal's receivable is there, the
    // bank account that will collect it is not — so it would report itself
    // unbalanced and be right to.
    balanceSheet: balanceSheet(entries, chart, asOf),
    // WHAT EACH VALUE OF THE ASKED DIMENSION EARNED, so a reader can see the
    // deals beside each other rather than querying them one at a time. Absent
    // when no dimension was asked for: a breakdown by nothing is not a shape.
    breakdown: dimension ? byDimension(entries, chart, dimension, { from, to }) : null,
    canPost: !requirePermission(f.access, "finance.ledger.post"),
    canReverse: !requirePermission(f.access, "finance.ledger.reverse"),
  };
});

// POST: EITHER A DOCUMENT OR A HAND-KEYED ENTRY, and the body says which.
//
// A `document` in the body posts an invoice, a bill, an expense or a payment
// through the function that knows its accounts; anything else is a manual
// journal. Both end in `postEntry`, so an unbalanced result is refused by the
// same rule either way — that is the whole point of a double entry and not a
// check this layer may skip or repeat.
//
// THE DOCUMENT PATH IS WHAT MAKES THE LEDGER A BOOK rather than a place to
// hand-key adjustments. The five posting functions have existed complete since
// the ledger was written and NOTHING called them, so raising an invoice never
// touched the books.
export const POST = route(spec, async (f) => {
  const document = f.body?.document as { kind?: unknown; id?: unknown; paymentId?: unknown } | undefined;
  if (document) {
    const posted = await postDocument(f, document.kind, document.id, document.paymentId);
    if (refused(posted)) return posted;
    return { status: 201, body: { ok: true, entry: posted.entry } };
  }

  const result = await postEntry(f, f.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, entry: result.entry } };
});

// REVERSING IS ITS OWN VERB AND ITS OWN RIGHT. A posted entry is never edited
// and never deleted: the correction is another entry that mirrors it, so the
// book keeps showing what was posted and what undid it. That is why there is no
// PUT and no DELETE here at all.
export const PATCH = route(spec, async (f) => {
  if (!f.body.id) return { error: "missing" };
  const result = await reverseEntry(f, String(f.body.id), f.body.reason);
  if (refused(result)) return result;
  return { ok: true, reversal: result.reversal };
});
