// THE APPROVAL ENGINE, PURELY. No store, no server, no fixtures: a chain is a
// list of values and resolving one is arithmetic, so this runs in milliseconds
// beside tests/access.test.mjs rather than inside the seven-minute suite.
//
// Spec: docs/superpowers/specs/2026-09-03-approval-workflow-engine-design.md
//
// The loader preamble is access.test.mjs's, and it is what lets a .mjs test
// import a .ts module — the alternative was string-loading the source, which
// asserted against a mangled copy rather than the module the app imports.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { SEEDED_CHAINS, chainProblems } = await import("@/platform/approval/chains");
const { ALL_PERMISSIONS } = await import("@/platform/access");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== a chain's shape");

// THE SEED MUST BE VALID BY ITS OWN RULES. A seeded chain its own validator
// refuses is the one failure no studio can catch, because no studio writes it.
ok("the seeded bill chain passes its own validator",
  chainProblems(SEEDED_CHAINS.bill, ALL_PERMISSIONS).length === 0,
  JSON.stringify(chainProblems(SEEDED_CHAINS.bill, ALL_PERMISSIONS)));

ok("the seeded bill chain has two steps", SEEDED_CHAINS.bill.steps.length === 2);
ok("...the first of which always applies", SEEDED_CHAINS.bill.steps[0].from === 0);

const problem = (steps) => chainProblems({ type: "bill", steps }, ALL_PERMISSIONS);

ok("an empty chain is refused", problem([]).length === 1, JSON.stringify(problem([])));

ok("a step naming an unknown permission is refused",
  problem([{ permission: "finance.payables.nuke", from: 0, label: "x" }])
    .some((p) => p.includes("finance.payables.nuke")));

ok("thresholds that do not ascend are refused",
  problem([
    { permission: "finance.payables.approve", from: 500, label: "a" },
    { permission: "finance.payables.pay", from: 100, label: "b" },
  ]).some((p) => p.includes("ascend")));

ok("a chain with no always-on step is refused",
  problem([{ permission: "finance.payables.approve", from: 100, label: "a" }])
    .some((p) => p.includes("from: 0")));

ok("the same permission twice is refused",
  problem([
    { permission: "finance.payables.approve", from: 0, label: "a" },
    { permission: "finance.payables.approve", from: 100, label: "b" },
  ]).some((p) => p.includes("twice")));

// A REFUSAL IS A SENTENCE SOMEBODY READS. Asserted because the whole reason
// chainProblems returns strings rather than a boolean is that a studio is shown
// them, and a message naming nothing actionable is a boolean with extra steps.
ok("every refusal names what is wrong, not that something is",
  problem([{ permission: "nope.nope.nope", from: 5, label: "a" }])
    .every((p) => p.length > 20 && /[a-z]/.test(p)));

const { resolveApprovalPlan, firstUnsignedStep } = await import("@/platform/approval/resolve");

console.log("\n== resolving a plan");

const CHAIN = SEEDED_CHAINS.bill;
// A rate table in the shape shared/currencies expects: every code against USD.
const RATES = { USD: 1, SAR: 3.75, EUR: 0.92 };
const base = (amount, currency = "SAR") => resolveApprovalPlan({
  chain: CHAIN, amount, currency, studioCurrency: "SAR",
  rates: RATES, updatedAt: 1756800000000, stale: false,
});

ok("an amount under the threshold needs one step", base(10000).ok && base(10000).steps.length === 1);
ok("an amount over it needs two", base(200000).steps.length === 2);
// THE BOUNDARY IS INCLUSIVE, asserted because "over 50000" and "at 50000" are
// the two readings of one sentence and only one of them is the code.
ok("exactly the threshold needs two — `from` is at-or-above", base(50000).steps.length === 2);
ok("one unit under it needs one", base(49999).steps.length === 1);

ok("the studio's own currency needs no rate at all", base(10000).rate === null);

const foreign = resolveApprovalPlan({
  chain: CHAIN, amount: 20000, currency: "EUR", studioCurrency: "SAR",
  rates: RATES, updatedAt: 1756800000000, stale: false,
});
// 20000 EUR at 3.75/0.92 is about 81522 SAR — over the threshold though the
// raw number is under it. This is the whole reason conversion exists.
ok("a foreign amount is judged converted, not raw", foreign.ok && foreign.steps.length === 2,
  String(foreign.amountInBase));
ok("...and the rate that decided it is carried on the plan", foreign.rate !== null);

console.log("\n== the four refusals");

const refusal = (over) => resolveApprovalPlan({
  chain: CHAIN, amount: 20000, currency: "EUR", studioCurrency: "SAR",
  rates: RATES, updatedAt: 1756800000000, stale: false, ...over,
});

ok("no studio currency refuses by that name",
  refusal({ studioCurrency: "" }).reason === "no-studio-currency");
// AND NAMES THE FIX. "your studio has no currency" is fixed in Settings and an
// unquoted pair is not; the two send whoever hits them to different places, so
// the detail has to distinguish them.
ok("...and its detail names the setting",
  /settings/i.test(refusal({ studioCurrency: "" }).detail));

ok("an unquoted pair refuses by that name",
  refusal({ rates: { USD: 1, SAR: 3.75 } }).reason === "unquoted");
ok("...and its detail names the pair",
  refusal({ rates: { USD: 1, SAR: 3.75 } }).detail.includes("EUR"));

ok("no chain refuses by that name",
  resolveApprovalPlan({ chain: null, amount: 10, currency: "SAR", studioCurrency: "SAR",
    rates: RATES, updatedAt: 0, stale: false }).reason === "no-chain");

// A STALE SNAPSHOT WITH A REAL RATE STILL ROUTES. Yesterday's rate with an
// honest stamp beats blocking every foreign bill because one fetch failed —
// only a MISSING rate refuses.
const stale = refusal({ stale: true });
ok("a stale but real rate routes, flagged", stale.ok === true && stale.stale === true);

console.log("\n== walking a plan");

const plan = base(200000);
const sig = (permission) => ({ permission, byCollaboratorId: "col_1", byAlias: "A", at: "2026-09-03T00:00:00.000Z" });

ok("nothing signed yet gives the first step",
  firstUnsignedStep(plan, []).permission === "finance.payables.approve");
ok("the first signed gives the second step",
  firstUnsignedStep(plan, [sig("finance.payables.approve")]).permission === "finance.payables.approveHigh");
ok("both signed gives nothing left",
  firstUnsignedStep(plan, [sig("finance.payables.approve"), sig("finance.payables.approveHigh")]) === null);
// A SIGNATURE FOR A STEP THIS PLAN NO LONGER HAS is not a signature for the
// step that IS next. A bill re-planned across the threshold must not credit an
// old signature to a step it was never given for.
ok("a signature naming a step this plan does not have counts for nothing",
  firstUnsignedStep(base(10000), [sig("finance.payables.approveHigh")]).permission
    === "finance.payables.approve");

console.log(fails ? `\n${fails} FAILED\n` : "\napproval model: all passed\n");
process.exit(fails ? 1 : 0);
