// THE SALES DASHBOARD'S ARITHMETIC, purely. No store, no routes, no fixtures.
//
// THE DEFECT THIS FILE MOSTLY GUARDS IS DUPLICATION. modules/sales/salesAnalytics
// kept its OWN list of which statuses are closed, its OWN copy of the stage
// climb, and its OWN weighted-value arithmetic — three answers to questions
// modules/sales/pipeline already owned. They agreed on the day they were
// written, which is the only day duplication ever looks harmless: a stage added
// to TICKET_STATUSES and not to the hand-written arrays does not throw, it just
// stops being counted, and every number on the dashboard quietly excludes it.
//
// So most of what is asserted here is that the two agree BY CONSTRUCTION.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const A = await import("@/modules/sales/salesAnalytics");
const P = await import("@/modules/sales/pipeline");
const { TICKET_STATUSES } = await import("@/modules/sales/tickets");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const t = (over = {}) => ({ id: "t", status: "Lead", value: 0, probability: 0, ...over });

console.log("\n== one vocabulary, not two");

// EVERY status, checked both ways. This is the assertion that would have caught
// the old hand-written CLOSED_STATUSES drifting from the registry.
const disagree = TICKET_STATUSES.filter((s) => A.isClosed(t({ status: s })) !== P.isClosed(s));
ok("the analytics and the stage registry agree on every status",
  disagree.length === 0, JSON.stringify(disagree));

ok("...including that a held deal is not closed", A.isClosed(t({ status: "On-Hold" })) === false);
ok("...and that an unknown status is not closed either",
  A.isClosed(t({ status: "Nonsense" })) === false);
ok("a missing ticket is not closed", A.isClosed(null) === false && A.isClosed(undefined) === false);

console.log("\n== the funnel");

const funnel = A.salesFunnel([
  t({ status: "Lead" }),
  t({ status: "Opportunity", rfqCount: 1 }),
  t({ status: "Commit", rfqCount: 1, rfq: { quotationId: "q1" } }),
  t({ status: "Closed Won", rfqCount: 1, rfq: { quotationId: "q2" } }),
  t({ status: "Closed Lost" }),
]);

// TOKENS, NOT WORDS. It used to return `label: "Lead"` and the screen drew that
// string, so an Arabic studio read an English funnel.
ok("the funnel returns tokens for the screen to translate",
  funnel.every((r) => typeof r.key === "string" && (r.kind === "status" || r.kind === "milestone")),
  JSON.stringify(funnel.map((r) => [r.key, r.kind])));

// DERIVED, NOT LISTED. The first rung is the registry's first open stage and the
// last is whichever stage is flagged won — not two strings typed here.
ok("its first rung is the registry's first open stage", funnel[0].key === P.OPEN_STAGES[0], funnel[0].key);
ok("...and its last is the stage the registry calls won", funnel[4].key === P.WON_STAGE, funnel[4].key);
ok("...which is the one stage isWon agrees with", P.isWon(funnel[4].key));

// A funnel that does not descend is a funnel with a counting bug: every rung
// counts the tickets that reached AT LEAST that far.
ok("the bars descend", funnel.every((r, i) => i === 0 || r.value <= funnel[i - 1].value),
  JSON.stringify(funnel.map((r) => r.value)));
ok("a lost deal reached no rung it did not climb", funnel[0].value === 4, String(funnel[0].value));

console.log("\n== the forecast");

const buckets = A.probabilityBuckets([
  t({ status: "Lead", value: 1000, probability: 40 }),
  t({ status: "Commit", value: 999, probability: 33 }),
  t({ status: "Closed Won", value: 500000, probability: 100 }),
  t({ status: "On-Hold", value: 200, probability: 10 }),
]);
const total = (k) => buckets.reduce((a, b) => a + b[k], 0);

// A CLOSED DEAL IS NOT A FORECAST. The won half-million must not appear.
ok("closed deals are excluded from the forecast", total("value") === 2199, String(total("value")));
// A HELD DEAL IS STILL OPEN, so it is still forecast here — the BOARD excludes
// it from its own headline, and that difference is deliberate rather than drift:
// this widget forecasts everything not yet decided.
ok("...and a held deal is not, since nothing about it is decided",
  buckets.some((b) => b.count > 0 && b.label === "0–25%"));

// THE SAME ARITHMETIC THE BOARD USES. It was written out here as
// `value * probability / 100`, which rounds differently from weightedValue —
// so two screens a person can hold side by side disagreed by fractions.
const expected = P.weightedValue(1000, 40) + P.weightedValue(999, 33) + P.weightedValue(200, 10);
ok("weighted matches the pipeline's own arithmetic exactly",
  total("weighted") === expected, `${total("weighted")} vs ${expected}`);

console.log("\n== why deals are lost");

const lost = A.lostReasons([
  t({ status: "Closed Lost", lostReason: "price", value: 100 }),
  t({ status: "Closed Lost", lostReason: "price", value: 50 }),
  t({ status: "Dropped", lostReason: "went quiet", value: 900 }),
  t({ status: "Closed Won" }),
  t({ status: "Lead", lostReason: "   " }),
]);

ok("reasons are grouped", lost.length === 2, JSON.stringify(lost));
// COMMONEST FIRST, because the question is "what do we lose to most", not "what
// did we lose most money to" — the value is the tie-break and the context.
ok("...commonest first", lost[0].reason === "price" && lost[0].count === 2, JSON.stringify(lost[0]));
ok("...carrying the value behind them", lost[0].value === 150, String(lost[0].value));
ok("a deal with no reason is not a reason of its own",
  lost.every((r) => r.reason.trim().length > 0));

// The one reason the system writes is a token, so the screen can translate it
// rather than showing an Arabic studio an English sentence from the database.
ok("the chain's own reason is recognised", A.isChainLostReason(P.CHAIN_LOST_REASON));
ok("...and a typed one is not", A.isChainLostReason("price") === false);

console.log("\n== deals that stopped moving");

const now = Date.parse("2026-09-05T00:00:00.000Z");
const ago = (days) => new Date(now - days * 86400000).toISOString();

const stalled = A.stalledDeals([
  t({ id: "old", status: "Lead", updatedAt: ago(90) }),
  t({ id: "middling", status: "Opportunity", updatedAt: ago(45) }),
  t({ id: "fresh", status: "Lead", updatedAt: ago(2) }),
  // CLOSED AND ANCIENT: not stalled, because nobody is waiting on it.
  t({ id: "done", status: "Closed Won", updatedAt: ago(200) }),
], 30, now);

ok("only open deals stall", stalled.every((r) => !A.isClosed(r.ticket)));
ok("...past the threshold", stalled.length === 2, JSON.stringify(stalled.map((r) => r.ticket.id)));
// LONGEST FIRST. A list in any other order buries the ninety-day deal, which is
// the one the widget exists to surface.
ok("...longest first", stalled[0].ticket.id === "old" && stalled[0].days === 90,
  JSON.stringify(stalled.map((r) => [r.ticket.id, r.days])));

// THE DAY-ONE CASE. Every ticket written before stageHistory existed has none,
// and a widget that could only read history would show nothing at all for the
// deals a live studio already has.
const noHistory = A.stalledDeals([t({ id: "legacy", status: "Lead", createdAt: ago(60) })], 30, now);
ok("a deal older than the stage history still stalls",
  noHistory.length === 1 && noHistory[0].days === 60, JSON.stringify(noHistory.map((r) => r.days)));

// And the history WINS when it exists: a deal that moved yesterday is not stuck,
// however old the record is.
const moved = A.stalledDeals([t({
  id: "moved", status: "Opportunity", createdAt: ago(200), updatedAt: ago(200),
  stageHistory: [{ status: "Opportunity", at: ago(1), byCollaboratorId: "" }],
})], 30, now);
ok("...but a deal that moved yesterday is not stuck", moved.length === 0, JSON.stringify(moved));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
