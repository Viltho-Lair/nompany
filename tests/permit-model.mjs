// ONE PERMIT REGISTER, PURELY (tier 5) — where a permit stands, and what it may do.
//
// THE DEFECTS THESE GUARD: the engine permit said "cancelled, never deleted" in a
// comment and was hard-deleted anyway; and Field Operations' permits had no
// workflow at all, so a request nobody had issued read exactly like an issued
// permit — and was warned about when it lapsed.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/modules/operations/permitModel");
const T = await import("@/modules/main/timeNotices");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== where a permit stands");

ok("a permit written before the workflow reads as issued", M.permitStatusOf({}) === "Issued");
ok("...and so does one carrying nonsense", M.permitStatusOf({ status: "Maybe" }) === "Issued");
ok("a request is issued or cancelled", M.permitMoves({ status: "Requested" }).join() === "Issued,Cancelled");
ok("an issued permit is closed or cancelled", M.permitMoves({ status: "Issued" }).join() === "Closed,Cancelled");
ok("closed goes nowhere", M.permitMoves({ status: "Closed" }).length === 0);
ok("a request cannot jump to closed", M.permitMoveProblem({ status: "Requested" }, "Closed") === "transition");
ok("a cancelled permit cannot be issued", M.permitMoveProblem({ status: "Cancelled" }, "Issued") === "transition");
ok("an unknown status is refused by name", M.permitMoveProblem({ status: "Issued" }, "Done") === "status");
ok("a legal move passes", M.permitMoveProblem({ status: "Issued" }, "Closed") === null);

console.log("\n== cancelled, never deleted");

ok("a request nobody issued may be removed, as a mistake", M.permitDeletable({ status: "Requested" }));
ok("an issued permit may not", !M.permitDeletable({ status: "Issued" }));
ok("nor a legacy one — it was an issued permit", !M.permitDeletable({}));
ok("nor a closed one", !M.permitDeletable({ status: "Closed" }));

console.log("\n== whose expiry is news");

const today = "2026-09-11";
const in7 = "2026-09-18";
const notices = T.expiringPermitNotices([
  { id: "a", title: "Roof hot work", type: "Hot work", status: "Issued", validTo: in7 },
  { id: "b", title: "Basement entry", type: "Confined space", status: "Requested", validTo: in7 },
  { id: "c", title: "Old", type: "Hot work", status: "Cancelled", validTo: in7 },
  { id: "d", title: "Legacy", type: "Electrical", validTo: in7 },
], today);
const ids = notices.map((n) => n.recordId).join();
ok("only an issued permit is warned about — a legacy one counts as issued", ids === "a,d", ids);
ok("the notice names the permit, not its type", notices[0]?.name === "Roof hot work", notices[0]?.name);

console.log(fails ? `\npermit model: ${fails} FAILURES\n` : "\npermit model: all passed\n");
process.exit(fails ? 1 : 0);
