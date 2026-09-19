// EXPENSE CLAIMS AND STAFF ADVANCES, asserted without a database
// (modules/finance/claims).
//
// THE DEFECT: there were none. Money a person spent for the studio could only
// be recorded as an EXPENSE — the studio's own spend, keyed by whoever keeps
// the books — so nothing said who was owed it, nobody agreed it, and an advance
// handed to a site engineer was a bank withdrawal with no one accountable.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const C = await import("../src/modules/finance/claims.ts");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const cleaned = C.cleanClaimLines([{ date: "2026-09-01", category: "Travel", description: "Taxi", amount: 45.5 }, { amount: 10 }]);
ok("A CLAIM'S LINES ARE KEPT with their amounts", "lines" in cleaned && cleaned.lines.length === 2);
ok("a line with no amount is refused by number", "problems" in C.cleanClaimLines([{ amount: 5 }, { amount: 0 }])
  && C.cleanClaimLines([{ amount: 5 }, { amount: 0 }]).problems[0].includes("line 2"));
ok("an empty claim is refused", "problems" in C.cleanClaimLines([]));
ok("the total is the lines'", C.claimTotal({ lines: [{ amount: 45.5 }, { amount: 10 }] }) === 55.5);

const draft = { status: "Draft", claimantCollaboratorId: "ann" };
ok("the claimant submits their own draft", C.claimMoveProblem(draft, "Submitted", "ann") === null);
ok("nobody else submits it", C.claimMoveProblem(draft, "Submitted", "bob") === "not-yours");
const submitted = { ...draft, status: "Submitted" };
// APPROVING AND REJECTING ARE NOT MOVES since 19/09/2026 — they are the answers
// to the claim's approval, on the Approvals page (tests/approvals-model.mjs holds
// who may give them). Refused here for everybody, the claimant included.
ok("APPROVED IS NOT A MOVE — it is what its approval does", C.claimMoveProblem(submitted, "Approved", "bob") === "status");
ok("...nor is Rejected", C.claimMoveProblem(submitted, "Rejected", "bob") === "status");
ok("the claimant withdraws a submitted claim to draft", C.claimMoveProblem(submitted, "Draft", "ann") === null);
ok("PAID IS NOT A MOVE — it is what paying does", C.claimMoveProblem({ ...draft, status: "Approved" }, "Paid", "bob") === "status");

const advances = [
  { id: "a1", collaboratorId: "ann", amount: 500, returned: 50 },
  { id: "a2", collaboratorId: "ann", amount: 100, status: "Cancelled" },
  { id: "a3", collaboratorId: "bob", amount: 80 },
];
const claims = [
  { id: "c1", claimantCollaboratorId: "ann", status: "Approved", lines: [{ amount: 120 }], fromAdvance: 120 },
  { id: "c2", claimantCollaboratorId: "ann", status: "Submitted", lines: [{ amount: 999 }], fromAdvance: 999 },
];
ok("WHAT A PERSON STILL HOLDS: advanced, less handed back, less what approved claims took",
  C.openAdvance(advances, claims, "ann") === 330, String(C.openAdvance(advances, claims, "ann")));
ok("a cancelled advance and an unapproved claim count for nothing", C.openAdvance(advances, [], "ann") === 450);
ok("one person's advance is not another's", C.openAdvance(advances, claims, "bob") === 80);
ok("AN ADVANCE CLEARS A CLAIM UP TO WHAT IS HELD", C.advanceTakes(200, 330) === 200 && C.advanceTakes(400, 330) === 330);
ok("the rest is paid in cash", C.claimPayable({ lines: [{ amount: 400 }], fromAdvance: 330 }) === 70);
ok("a claim the advance covers leaves nothing to pay", C.claimPayable({ lines: [{ amount: 100 }], fromAdvance: 100 }) === 0);

console.log(fails ? `\nexpense claims model: ${fails} FAILURES\n` : "\nexpense claims model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
