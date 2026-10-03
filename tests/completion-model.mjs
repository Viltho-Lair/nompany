// WHEN A DEAL'S STAGE IS DONE, purely (platform/engagement/completion).
//
// The agreed order's step 4 (04/10/2026): a stage is done when its records say
// the work is finished, not the moment one exists. Every rule is read off the
// record's own lifecycle; these assertions hold the ones a deal page leans on,
// and that a status a module adds and the rule does not know cannot pass as done.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const C = await import("@/platform/engagement/completion");
const { STAGE_REGISTRY } = await import("@/platform/engagement/registry");
const { JOB_STATUSES } = await import("@/modules/operations/jobSchema");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};
const state = (type, rows, ctx) => C.stageCompletion(type, rows, ctx)?.state;

console.log("\n== a stage is done when its records say so");

ok("no records is no stage at all — null, not 'started'", C.stageCompletion("quotation", []) === null);
ok("a DRAFT quotation is under way, not done", state("quotation", [{ status: "Draft" }]) === "started");
ok("an approved one is done", state("quotation", [{ status: "Sent" }], { approved: () => true }) === "done");
ok("...by its approval record, not only a stored status", state("quotation", [{ status: "Sent" }], { approved: () => false }) === "started");
ok("a rejected quotation beside an approved one does not hold the stage open",
  state("quotation", [{ id: "a", status: "Rejected" }, { id: "b", status: "Sent" }], { approved: (r) => r.id === "b" }) === "done");
ok("every quotation rejected is VOID — called off, not under way", state("quotation", [{ status: "Rejected" }]) === "void");
ok("a project is done when it is CLOSED, not when its stage says Completed",
  state("project", [{ stage: "Completed" }]) === "started" && state("project", [{ stage: "x", closedAt: "2031-01-01" }]) === "done");
ok("a contract is done once signed", state("contract", [{ signedDate: "" }]) === "started" && state("contract", [{ signedDate: "2031-01-01" }]) === "done");
ok("an inspection that FAILED is not done — the work goes round again", state("inspection", [{ result: "fail" }]) === "started");
ok("...and one passed with comments is", state("inspection", [{ result: "pass-with-comments" }]) === "done");
ok("a reversed payment is void", state("payment", [{ reversedByPaymentId: "p2" }]) === "void");
ok("a shipment is done when its tracking says delivered", state("shipment", [{ movements: [{ code: "DEP" }, { code: "DLV" }] }]) === "done");

console.log("\n== money is done when it is paid, and weighed by money");

const money = (r) => ({ total: r.total, paid: r.paid });
ok("an invoice sent and unpaid is under way", state("invoice", [{ status: "Sent", total: 100, paid: 0 }], { money }) === "started");
ok("paid in full is done", state("invoice", [{ status: "Sent", total: 100, paid: 100 }], { money }) === "done");
ok("a draft is under way however it adds up", state("invoice", [{ status: "Draft", total: 100, paid: 100 }], { money }) === "started");
ok("a cancelled invoice is left out", state("invoice", [{ status: "Cancelled", total: 9, paid: 0 }, { status: "Sent", total: 10, paid: 10 }], { money }) === "done");
const weighed = C.stageCompletion("invoice", [{ status: "Sent", total: 100, paid: 100 }, { status: "Sent", total: 9900, paid: 0 }], { money });
ok("two invoices, the small one paid, are 1% paid — not halfway", weighed.progress === 0.01, JSON.stringify(weighed));
ok("without a money answer an invoice is never claimed paid", state("invoice", [{ status: "Sent" }]) === "started");

console.log("\n== many records, and stages with no lifecycle");

const jobs = C.stageCompletion("job", [{ status: "completed" }, { status: "in-progress" }, { status: "cancelled" }]);
ok("two live jobs, one completed, is under way and halfway", jobs.state === "started" && jobs.progress === 0.5, JSON.stringify(jobs));
ok("an expense is done once it exists — it has no states", state("expense", [{}]) === "done");
ok("a single record under way has no in-between measure — null, not 0", C.stageCompletion("job", [{ status: "scheduled" }]).progress === null);
ok("a job status the rule does not know is never done", state("job", [{ status: "exploded" }]) === "started");
ok("every job status reads as done, void or under way", JOB_STATUSES.every((s) => ["done", "void", "started"].includes(state("job", [{ status: s }]))));
ok("every stage with a rule is a real stage", [...C.STAGES_WITH_A_RULE].every((t) => STAGE_REGISTRY[t]));

console.log(fails ? `\ncompletion: ${fails} FAILED` : "\ncompletion: all passed");
process.exit(fails ? 1 : 0);
