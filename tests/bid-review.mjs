// BID REVIEW, PURELY — what a bid is worth, and whose chain routes it.
//
// THE DEFECT THIS FILE GUARDS is a signature given against the wrong number. A
// tender carries a typed `estimatedValue` from the day somebody heard about it
// AND a bill that was actually costed; they are the same digits on screen and
// mean completely different things, and until this slice nothing chose between
// them — `valueFromBoq` was written, tested, and called by nothing. Signing the
// guess when a bill exists authorises a price nobody worked out.
//
// The walk itself (who may sign, in what order, never twice) is asserted
// against real routes in Gate A, because it is a store operation.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const B = await import("@/modules/tendering/bid");
const S = await import("@/platform/approval/store");
const C = await import("@/platform/approval/chains");
const { ALL_PERMISSIONS } = await import("@/platform/access/catalogue");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const line = (qty, rate) => ({ qty, rate });
const tender = (over = {}) => ({ id: "t1", estimatedValue: 480000, currency: "", ...over });

console.log("\n== what the studio is about to promise");

// NO BILL: the typed estimate is all there is, and that is a legitimate bid —
// plenty of tenders are priced outside this product.
const guess = B.bidValue(tender(), []);
ok("with no bill, the typed estimate is the value", guess.amount === 480000 && guess.basis === "estimate");
// COMPLETE, because there is no part-priced bill to be wrong about — not
// because anything was checked. A false here would block every studio that
// does not use the grid.
ok("...and it is not treated as an unfinished bill", guess.complete === true);

// A BILL SUPERSEDES THE GUESS. The estimate is what somebody thought on day
// one; the bill is what the work was costed at.
const priced = B.bidValue(tender(), [line(2, 100), line(1, 50)]);
ok("a bill supersedes the typed estimate", priced.amount === 250 && priced.basis === "boq",
  JSON.stringify(priced));
ok("...and says how many lines it read", priced.lines === 2);

// THE ASSERTION THIS FILE EXISTS FOR, from the other side: a part-priced bill
// still HAS a total, and the value carries the fact that it is not the bid.
const part = B.bidValue(tender(), [line(2, 100), line(4, 0)]);
ok("a part-priced bill still totals", part.amount === 200 && part.basis === "boq");
ok("...and is NOT complete", part.complete === false);

// A bill priced at nothing is still a bill — zero is a decision, and it must
// not fall back to a guess that was never revisited.
const nil = B.bidValue(tender(), [line(1, 0.0000001)]);
ok("a bill exists even when it totals nothing", nil.basis === "boq");
ok("nonsense does not crash the value", B.bidValue(tender({ estimatedValue: "x" }), null).amount === 0);

console.log("\n== whose chain routes it");

// SEEDED, so a studio that has configured nothing is still governed. A tender
// chain resolving to nothing would mean every bid needing no signature at all.
ok("a tender chain is seeded", (C.SEEDED_CHAINS.tender?.steps || []).length === 2);
ok("...and its first step is always-on",
  C.SEEDED_CHAINS.tender.steps[0].from === 0, String(C.SEEDED_CHAINS.tender.steps[0].from));
// A CHAIN NAMING A RIGHT THE PRODUCT DOES NOT HAVE blocks every record reaching
// it, silently and forever. The seeds are the one chain nobody validates on
// write, so they are validated here instead.
for (const [type, chain] of Object.entries(C.SEEDED_CHAINS)) {
  ok(`the seeded ${type} chain is one a studio could have saved`,
    C.chainProblems(chain, ALL_PERMISSIONS).length === 0,
    C.chainProblems(chain, ALL_PERMISSIONS).join("; "));
}

// A CHAIN THAT SIGNS NOTHING AT THE BOTTOM IS STILL REFUSED unless it says it
// meant to. The stock adjustment chain deliberately starts at 1000 — a shelf
// corrected by one is not a write-off — and until `noApprovalBelowFirstStep`
// existed the product shipped a seed its own editor would have rejected. The
// pair below is what stops that flag becoming a blanket excuse: without it the
// same chain is still a hole.
const holed = { type: "bill", steps: [{ permission: "finance.payables.approve", from: 500, label: "Finance" }] };
ok("a chain with nothing at the bottom is refused",
  C.chainProblems(holed, ALL_PERMISSIONS).some((p) => /no approval at all/.test(p)));
ok("...and accepted once it says that is the policy",
  C.chainProblems({ ...holed, noApprovalBelowFirstStep: true }, ALL_PERMISSIONS).length === 0,
  C.chainProblems({ ...holed, noApprovalBelowFirstStep: true }, ALL_PERMISSIONS).join("; "));
// THE FLAG EXCUSES ONE THING ONLY. It must not wave through a chain that names
// a right the product does not have, which is the refusal most worth keeping.
ok("...but it excuses nothing else",
  C.chainProblems({ type: "bill", noApprovalBelowFirstStep: true,
    steps: [{ permission: "finance.madeup.approve", from: 500, label: "X" }] }, ALL_PERMISSIONS)
    .some((p) => /not a permission this product has/.test(p)));

console.log("\n== where a studio's chains come from");

const seedFirst = S.approvalChainsFor(null);
ok("no studio at all still gets the built-ins",
  Boolean(seedFirst.bill && seedFirst.tender));

const legacy = { bill: { type: "bill", steps: [{ permission: "finance.payables.approve", from: 0, label: "Old" }] } };
// FINANCE'S OLD BLOB IS READ RATHER THAN MIGRATED, because a manual backfill
// gets forgotten. A studio that configured a bill chain before the store moved
// keeps it with nobody running anything.
ok("what Finance stored before the move still governs",
  S.approvalChainsFor(null, legacy).bill.steps[0].label === "Old");

const own = { bill: { type: "bill", steps: [{ permission: "finance.payables.approve", from: 0, label: "New" }] } };
// AND THE STUDIO'S OWN WINS, so the first edit in Studio settings becomes the
// answer and stays it. Layered rather than either-or: reading is deterministic
// even while two places can hold something.
ok("the studio's own overrides the legacy blob",
  S.approvalChainsFor({ approvalChains: own }, legacy).bill.steps[0].label === "New");
ok("...and an untouched type still falls through to its seed",
  S.approvalChainsFor({ approvalChains: own }, legacy).tender.steps.length === 2);

// A STORED CHAIN WITH NO STEPS IS A BROKEN ROW, not an override. Honouring it
// would leave the studio approving nothing — the exact hole chainProblems
// refuses on write.
ok("an empty stored chain does not blank the seed",
  S.approvalChainsFor({ approvalChains: { tender: { type: "tender", steps: [] } } }).tender.steps.length === 2);
ok("nonsense on the studio is ignored",
  S.approvalChainsFor({ approvalChains: "x" }).tender.steps.length === 2);

console.log("\n== what studio settings may write");

const edited = { tender: { type: "tender", steps: [{ permission: "tendering.tenders.approve", from: 0, label: "Me" }] } };
const saved = S.approvalChainOverrides(edited);
ok("a tender chain may be saved there", saved.chains?.tender?.steps.length === 1);

// ONE DOOR PER TYPE — and since tier 5 it is Studio settings for all four. The
// bill chain's "Finance screen" never existed; its only writer was an API that
// also took every other type. Moved here in the commit that made Finance refuse.
const billHere = S.approvalChainOverrides({ bill: { type: "bill", steps: [{ permission: "finance.payables.approve", from: 0, label: "Me" }] } });
ok("a bill chain is saved in Studio settings now", billHere.chains?.bill?.steps.length === 1, JSON.stringify(billHere));
const adjustmentHere = S.approvalChainOverrides({ adjustment: { ...C.SEEDED_CHAINS.adjustment, steps: [C.SEEDED_CHAINS.adjustment.steps[0]] } });
ok("...and so is the stock adjustment chain, whose only writer was Finance's API",
  adjustmentHere.chains?.adjustment?.steps.length === 1, JSON.stringify(adjustmentHere));
const nonsense = S.approvalChainOverrides({ payroll: C.SEEDED_CHAINS.bill });
ok("a type nothing approves is refused rather than dropped, so nobody saves a screen governing nothing",
  typeof nonsense.error === "string" && !("chains" in nonsense), JSON.stringify(nonsense));

// SETTING A CHAIN BACK TO ITS SEED OVER FINANCE'S OLD BLOB MUST BE STORED — the
// legacy layer sits beneath the studio's, so dropping it would keep enforcing
// the old chain behind a screen that says the built-in is in force.
const legacyBill = { bill: { type: "bill", steps: [{ permission: "finance.payables.approve", from: 0, label: "Old" }] } };
const reset = S.approvalChainOverrides({ bill: C.SEEDED_CHAINS.bill }, undefined, legacyBill);
ok("a reset to the seed over a legacy chain is kept", reset.chains?.bill?.steps.length === 2, JSON.stringify(reset));
ok("...and wins when read", S.approvalChainsFor({ approvalChains: reset.chains }, legacyBill).bill.steps.length === 2);

// SAVING WITHOUT CHANGING ANYTHING MUST NOT FORK THE BUILT-IN, or merely
// looking at the editor would stop a studio ever receiving a correction to it.
const untouched = S.approvalChainOverrides({ tender: C.SEEDED_CHAINS.tender });
ok("a chain identical to its seed is not stored at all",
  Object.keys(untouched.chains || {}).length === 0, JSON.stringify(untouched.chains));

console.log("\n== the refusal a bid adds to the ladder");

const stages = await import("@/modules/tendering/stages");

// THE GAP THIS SLICE CLOSES. Submitting used to need only `tenders.edit` — the
// same right that types a rate into the bill.
ok("an unapproved bid cannot be submitted",
  stages.tenderProblem({ from: "Preparing", to: "Submitted", approved: false }) === "not-approved");
ok("an approved one can", stages.tenderProblem({ from: "Preparing", to: "Submitted", approved: true }) === null);

// UNDEFINED MEANS "NOT ASKED", NOT "NO". Screens call this with no way to
// resolve a plan; defaulting a missing answer to a refusal would grey out every
// Submit button for a reason the screen could not explain.
ok("not asking is not the same as answering no",
  stages.tenderProblem({ from: "Preparing", to: "Submitted" }) === null);

// DECIDING NOT TO BID NEEDS NO SIGNATURE — it is the one exit that commits the
// company to nothing, and requiring approval for it would be absurd.
ok("a No Bid needs no approval",
  stages.tenderProblem({ from: "Preparing", to: "No Bid", reason: "Too far", approved: false }) === null);
// Won and Lost are behind this by construction: both already require having
// been submitted, and submission is what the signature gates.
ok("winning still requires having submitted",
  stages.tenderProblem({ from: "Preparing", to: "Won", approved: true }) === "not-submitted");


console.log("\n== the handover opens at the same number the signature was given for");

// A SOURCE-LEVEL ASSERTION, and it guards one specific temptation.
// `tenderSource` (modules/projects) must value a handed-over project with
// `valueFromBoq` -- the SAME precedence `bidValue` routes the approval by.
// A project opened at the typed `estimatedValue` would be opened at a figure
// nobody signed, while the screen went on saying the bid was approved. It is
// asserted here rather than only in Gate A because the wrong version still
// passes every runtime test on a tender whose two numbers happen to agree.
const { readFileSync } = await import("node:fs");
const projectsSrc = readFileSync(new URL("../src/modules/projects/projects.ts", import.meta.url), "utf8");
const head = projectsSrc.slice(
  projectsSrc.indexOf("async function tenderSource"),
  projectsSrc.indexOf("// THE QUOTATION HEAD"));
ok("the handover head exists to read at all", head.length > 200, String(head.length));
ok("the handover values a project from the bill", head.includes("valueFromBoq("));
ok("...and falls back to the typed estimate only when there is no bill",
  head.includes("fromBoq === null"));
// AND ONE PROJECT PER TENDER, derived rather than stored -- a flag written
// back onto the tender would be a second answer to the same question.
ok("...and refuses a second project on one tender",
  head.includes("p.tenderId === tenderId"));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
