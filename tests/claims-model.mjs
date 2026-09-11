// PROGRESS CLAIMS, PURELY (tier 6).
//
// THE DEFECT THESE GUARD is that there were none: a project billed only fixed
// milestones, so a contractor could not apply for work measured against the
// bill, and a claim the client cut on certification looked like one never made.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const C = await import("@/modules/projects/progressClaims");
const B = await import("@/modules/projects/billing");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== what a claim is measured against");
const boq = C.sourceFromBoq([
  { id: "b2", code: "1.02", description: "Blinding", unit: "m3", qty: 50, rate: 20, sortOrder: 1 },
  { id: "b1", code: "1.01", description: "Excavate", unit: "m3", qty: 100, rate: 10, sortOrder: 0 },
  { id: "b3", code: "", description: "", unit: "", qty: 0, rate: 0, sortOrder: 2 },
]);
ok("the bill in the document's order, blank lines dropped", boq.map((l) => l.key).join(",") === "b1,b2");
ok("a quotation's lines are keyed by position", C.sourceFromQuotation([{ description: "Cable", qty: 3, unitPrice: 5 }])[0].key === "q0");

console.log("\n== numbering");
ok("the first claim is IPC-01", C.nextClaimNumber([]) === "IPC-01");
ok("numbers go up numerically, past 99", C.nextClaimNumber([{ number: "IPC-99" }, { number: "IPC-07" }]) === "IPC-100");

console.log("\n== the first claim");
const c1 = { id: "c1", number: "IPC-01", status: "Draft", lines: C.newClaimLines(boq, new Map()) };
ok("a first claim starts at nought", c1.lines.every((l) => l.claimedQty === 0));
c1.lines = C.withQuantities(c1.lines, [{ key: "b1", qty: 30 }, { key: "b2", qty: 10 }], "claimedQty");
const applied = C.claimValuation(c1, new Map(), 10);
ok("applied to date is quantity × rate", applied.appliedToDate === 500 && applied.appliedThisPeriod === 500);
ok("not certified yet means no certified figure", applied.certifiedToDate === null);
ok("it can be submitted", C.moveProblem(c1, "Submitted", new Map()) === null);
ok("it cannot be certified straight from draft", C.moveProblem(c1, "Certified", new Map()) === "transition");
c1.status = "Submitted";
c1.lines = C.withQuantities(c1.lines, [{ key: "b1", qty: 25 }], "certifiedQty").map((l) => ({ ...l, certifiedQty: l.certifiedQty ?? l.claimedQty }));
c1.status = "Certified";
const v1 = C.claimValuation(c1, new Map(), 10);
ok("the client's cut is what is certified", v1.certifiedToDate === 450 && v1.certifiedThisPeriod === 450, JSON.stringify(v1));
ok("retention is on this period", v1.retention === 45 && v1.net === 405);
ok("a certificate is final", C.moveProblem(c1, "Draft", new Map()) === "transition");

console.log("\n== the next claim");
const prev = C.certifiedBefore([c1], "IPC-02");
ok("previous is the last certificate's quantities", prev.get("b1") === 25 && prev.get("b2") === 10);
ok("only one claim open at a time", C.openProblem([c1, { status: "Draft" }]) === "open-claim" && C.openProblem([c1]) === null);
const c2 = { id: "c2", number: "IPC-02", status: "Draft", lines: C.newClaimLines(boq, prev) };
ok("a new claim starts at what was certified", c2.lines[0].claimedQty === 25);
ok("an application for nothing new is refused", C.moveProblem(c2, "Submitted", prev) === "nothing-claimed");
const backwards = C.withQuantities(c2.lines, [{ key: "b1", qty: 20 }], "claimedQty");
ok("a quantity cannot go below what was certified", C.editProblem(c2, backwards, prev) === "below-previous");
c2.lines = C.withQuantities(c2.lines, [{ key: "b1", qty: 60 }], "claimedQty");
const v2 = C.claimValuation(c2, prev, 10);
ok("this period is the difference from the last certificate", v2.previous === 450 && v2.appliedThisPeriod === 350, JSON.stringify(v2));
ok("cumulative, never summed across claims", v2.appliedToDate === 800);
c2.lines = C.withQuantities(c2.lines, [{ key: "b1", qty: 120 }], "claimedQty");
ok("measuring past the bill quantity is flagged, not refused",
  C.claimValuation(c2, prev, 0).overMeasured.includes("b1") && C.editProblem(c2, c2.lines, prev) === null);
ok("a submitted claim's quantities are not edited", C.editProblem({ status: "Submitted" }, c2.lines, prev) === "not-draft");

console.log("\n== the billing roll-up");
const roll = B.projectBilling({
  milestones: [], value: 10000, asOf: "2026-09-30",
  invoices: [{ claimId: "c1", status: "Sent", total: 450 }, { status: "Sent", total: 100 }],
});
ok("an invoice for a claim is filed against the claim, not unattributed", roll.claims === 450 && roll.unattributed === 100);
ok("and it is still invoiced", roll.invoiced === 550);

console.log(fails ? `\n${fails} failed` : "\nall passed");
process.exitCode = fails ? 1 : 0;
