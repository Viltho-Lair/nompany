// THE TENDER PACK, PURELY. No store, no routes, no fixtures.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS IS ONE MISTAKE: bidding against
// paperwork that has since changed. An addendum lands on Tuesday, the bill was
// priced on Monday, and nothing in the bill can notice — a BOQ line has no idea
// a document was reissued. So `changesSincePricing` is asserted from both
// sides: that it fires when something arrived after pricing, and that it stays
// quiet when nothing did. A warning that cries wolf is ignored, which is the
// same bug as one that never fires.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const D = await import("@/modules/tendering/documents");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const doc = (id, over = {}) => ({
  id, tenderId: "t1", kind: "received", title: id, revision: "",
  supersededById: "", createdAt: "2026-01-01T00:00:00.000Z", ...over,
});

console.log("\n== what counts as current");

const A = doc("A", { supersededById: "B" });
const B = doc("B");
ok("a document nothing replaced is current", !D.isSuperseded(B));
ok("a replaced one is not", D.isSuperseded(A));
ok("the current list drops the replaced", D.currentDocuments([A, B]).map((d) => d.id).join() === "B");
// SUPERSEDED IS NOT DELETED. "What did we price against" has to stay
// answerable, so the old revision is kept and reachable.
ok("...and the replaced one is still there to be read",
  D.supersededDocuments([A, B]).map((d) => d.id).join() === "A");
ok("nonsense is an empty register", D.currentDocuments(null).length === 0 && D.documentSummary("x").total === 0);

console.log("\n== the revision chain");

const C = doc("C");
const chain = [doc("A", { supersededById: "B" }), doc("B", { supersededById: "C" }), C];
ok("a document knows everything it replaced, newest first",
  D.chainFor(chain, "C").map((d) => d.id).join() === "B,A",
  D.chainFor(chain, "C").map((d) => d.id).join());
ok("the oldest replaced nothing", D.chainFor(chain, "A").length === 0);

// A LOOP MUST NOT HANG A RENDER. supersedeProblem refuses the moves that make
// one, but this function is handed whatever the store holds.
const loop = [doc("A", { supersededById: "B" }), doc("B", { supersededById: "A" })];
ok("a corrupt loop terminates instead of hanging", D.chainFor(loop, "A").length <= 2);

console.log("\n== what may replace what");

ok("a current document may replace another", D.supersedeProblem([B, C], "B", "C") === null);
ok("nothing may replace itself", D.supersedeProblem([B, C], "B", "B") === "self");
ok("an already-replaced document is not replaced twice",
  D.supersedeProblem(chain, "A", "C") === "already-superseded");
// THE RULE THAT MAKES A CHAIN A CHAIN. Allowing a superseded document to be
// the replacement is what closes A←B←C←A into a loop nobody can read; refusing
// it means no cycle is ever written, rather than detected afterwards.
ok("...and a replaced document may not be the replacement",
  D.supersedeProblem(chain, "C", "A") === "superseded-replacement");
ok("a document on another tender may not replace this one",
  D.supersedeProblem([B, doc("Z", { tenderId: "t2" })], "B", "Z") === "other-tender");
ok("an unknown document is missing, not permitted",
  D.supersedeProblem([B], "B", "nope") === "missing");

console.log("\n== what may be deleted");

// EITHER END OF A CHAIN IS HISTORY. Deleting the replaced one destroys what was
// priced against; deleting its replacement leaves the older reading as replaced
// by nothing.
ok("a replaced document may not be deleted", D.deleteProblem(chain, "A") === "in-chain");
ok("...nor the one that replaced it", D.deleteProblem(chain, "B") === "in-chain");
ok("a loose document may be", D.deleteProblem([B, doc("Q")], "Q") === null);
ok("an unknown one is missing", D.deleteProblem([B], "nope") === "missing");

console.log("\n== clarifications");

const asked = { id: "c1", question: "Which spec applies?", answeredAt: "" };
const answered = { id: "c2", question: "Is scaffolding ours?", answeredAt: "2026-02-01T00:00:00.000Z" };
ok("a question with no answer is open", !D.isAnswered(asked));
ok("one with an answer is not", D.isAnswered(answered));
ok("the open list is what a submission warning counts",
  D.openClarifications([asked, answered]).map((c) => c.id).join() === "c1");
ok("...and the answered list is the other half",
  D.answeredClarifications([asked, answered]).map((c) => c.id).join() === "c2");

console.log("\n== the bill against the paperwork");

const line = (rate, updatedAt) => ({ rate, updatedAt });
const priced = [line(45, "2026-03-10T00:00:00.000Z"), line(20, "2026-03-05T00:00:00.000Z")];

// A BILL WITH NOTHING PRICED IS NOT BEHIND ANYTHING — it has not begun, which
// is what boqTotals().complete already says. Reporting it as stale would put a
// second warning on a screen that is already warning correctly.
const unpriced = D.changesSincePricing({ lines: [line(0, "2026-03-10T00:00:00.000Z")], documents: [doc("X")] });
ok("an unpriced bill is not stale", unpriced.stale === false && unpriced.pricedAt === null);
ok("nonsense is not stale either", D.changesSincePricing({}).stale === false);

// THE CLOCK IS THE NEWEST PRICED LINE, so working further down the bill clears
// the warning by doing the work that answers it.
const quiet = D.changesSincePricing({
  lines: priced,
  documents: [doc("old", { createdAt: "2026-03-01T00:00:00.000Z" })],
});
ok("a document that arrived before pricing is not behind", quiet.stale === false);
ok("...and the clock is the newest priced line", quiet.pricedAt === "2026-03-10T00:00:00.000Z", quiet.pricedAt);

// THE ASSERTION THIS FILE EXISTS FOR.
const late = D.changesSincePricing({
  lines: priced,
  documents: [doc("addm", { kind: "addendum", title: "Addendum 1", revision: "B", createdAt: "2026-03-12T00:00:00.000Z" })],
});
ok("an addendum that arrived after pricing IS behind", late.stale === true && late.behind.length === 1);
ok("...named so the screen can say which", late.behind[0].label === "Addendum 1 B", late.behind[0].label);

// AN UNPRICED LINE MUST NOT MOVE THE CLOCK. Otherwise typing in scope — the one
// kind of work that does not answer the warning — would clear it.
const scopeOnly = D.changesSincePricing({
  lines: [...priced, line(0, "2026-03-20T00:00:00.000Z")],
  documents: [doc("addm", { createdAt: "2026-03-12T00:00:00.000Z" })],
});
ok("adding an unpriced line does not clear the warning", scopeOnly.stale === true);

// WHAT WE SENT CANNOT CHANGE WHAT WE ARE PRICING.
const ours = D.changesSincePricing({
  lines: priced,
  documents: [doc("bid", { kind: "submitted", createdAt: "2026-03-12T00:00:00.000Z" })],
});
ok("our own submission is never behind", ours.stale === false);

// A SUPERSEDED DOCUMENT IS NOT BEHIND EITHER — its replacement is, and reporting
// both would count one change twice.
const replaced = D.changesSincePricing({
  lines: priced,
  documents: [
    doc("r1", { supersededById: "r2", createdAt: "2026-03-11T00:00:00.000Z" }),
    doc("r2", { createdAt: "2026-03-12T00:00:00.000Z" }),
  ],
});
ok("a replaced document is not counted beside its replacement",
  replaced.behind.length === 1 && replaced.behind[0].id === "r2");

// AN ANSWER IS A CHANGE. It is frequently the change — an answer to somebody
// else's question moves a price without a single document being reissued.
const answerLate = D.changesSincePricing({
  lines: priced,
  clarifications: [{ id: "c9", question: "Rock excavation?", answeredAt: "2026-03-15T00:00:00.000Z" }],
});
ok("an answer received after pricing is behind", answerLate.stale === true);
ok("...and is labelled a clarification, not a document",
  answerLate.behind[0].kind === "clarification");

const both = D.changesSincePricing({
  lines: priced,
  documents: [doc("d", { createdAt: "2026-03-12T00:00:00.000Z" })],
  clarifications: [{ id: "c", question: "q", answeredAt: "2026-03-15T00:00:00.000Z" }],
});
ok("everything behind is listed newest first",
  both.behind.map((c) => c.id).join() === "c,d", both.behind.map((c) => c.id).join());

console.log("\n== the summary a header shows");

const summary = D.documentSummary([
  doc("a", { supersededById: "b" }), doc("b", { kind: "addendum" }), doc("c", { kind: "submitted" }),
]);
ok("current, replaced and totals agree",
  summary.total === 3 && summary.current === 2 && summary.superseded === 1, JSON.stringify(summary));
ok("...and the addenda counted are the current ones", summary.addenda === 1 && summary.submitted === 1);

console.log("\n== the file stays pure");

const { readFileSync } = await import("node:fs");
const src = readFileSync(new URL("../src/modules/tendering/documents.ts", import.meta.url), "utf8");
ok("modules/tendering/documents imports nothing",
  [...src.matchAll(/from\s+"([^"]+)"/g)].length === 0);

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
