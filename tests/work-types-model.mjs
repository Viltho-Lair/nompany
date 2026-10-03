// KINDS OF WORK, purely (modules/main/workTypes). No store, no routes.
//
// The owner's decision C, 03/10/2026: one kind of work item with types. A work
// item is a READING of a record that already exists — a deal, a field job, a
// maintenance work order, a till receipt — so what these assertions hold is the
// reading: which step, how far along, open or done or cancelled, and which
// kinds of work a studio runs. And that the status names the registry copied
// are still the modules' own, because a status a module adds and the registry
// does not know reads as "unknown" — silently, on every screen that counts it.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const W = await import("@/modules/main/workTypes");
const { JOB_STATUSES } = await import("@/modules/operations/jobSchema");
const { ORDER_STATUSES } = await import("@/modules/maintenance/model");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the copied statuses are still the modules' own");

const covers = (type, list) => {
  const def = W.WORK_TYPES[type];
  const known = new Set([...(def.steps || []).map((s) => s.token), ...def.cancelled, ...Object.keys(def.held)]);
  const missing = list.filter((s) => !known.has(s));
  const extra = [...known].filter((s) => !list.includes(s));
  return { missing, extra };
};
const job = covers("job", JOB_STATUSES);
ok("every job status reads as a step, a hold or a cancellation", !job.missing.length && !job.extra.length, JSON.stringify(job));
const wo = covers("workOrder", ORDER_STATUSES);
ok("every work-order status reads as a step, a hold or a cancellation", !wo.missing.length && !wo.extra.length, JSON.stringify(wo));
ok("every type names itself in both languages",
  W.WORK_TYPE_KEYS.every((k) => W.WORK_TYPES[k].name.en && W.WORK_TYPES[k].name.ar && W.WORK_TYPES[k].plural.ar));

console.log("\n== a status, read as a step");

const scheduled = W.readStatus("job", "scheduled");
ok("a scheduled job is open, at its first step, a third of the way", scheduled.state === "open" && scheduled.step === 0 && Math.abs(scheduled.progress - 1 / 3) < 1e-9);
ok("a completed job is done, all the way", W.readStatus("job", "completed").state === "done" && W.readStatus("job", "completed").progress === 1);
const cancelled = W.readStatus("job", "cancelled");
ok("a cancelled job is cancelled, at no step, with no progress — not 0%", cancelled.state === "cancelled" && cancelled.step === -1 && cancelled.progress === null);
const held = W.readStatus("workOrder", "On hold");
ok("a work order on hold is still IN PROGRESS, flagged held", held.state === "open" && held.token === "In progress" && held.held === true);
ok("a COMPLETED work order is done before it is closed", W.readStatus("workOrder", "Completed").state === "done");
ok("...and a closed one is done too", W.readStatus("workOrder", "Closed").state === "done" && W.readStatus("workOrder", "Closed").progress === 1);
const unknown = W.readStatus("workOrder", "Exploded");
ok("a status the registry does not know has no progress — never drawn as 0%", unknown.progress === null && unknown.step === -1 && unknown.state === "open");
ok("a till receipt is a sale already paid", W.readStatus("counterSale", "Completed").state === "done" && W.readStatus("counterSale", "Completed").label.en === "Paid");

console.log("\n== a deal, read against its flow");

const flow = ["ticket", "rfq", "quotation", "contract", "invoice"];
const d1 = W.readDeal(flow, new Set(["ticket", "rfq"]), { rfq: "RFQ" });
ok("a deal with a ticket and an RFQ is at the RFQ, two of five", d1.step === 1 && d1.token === "rfq" && d1.progress === 0.4 && d1.label.en === "RFQ");
const skipped = W.readDeal(flow, new Set(["ticket", "quotation"]));
ok("a skipped stage puts the deal AT the furthest it reached", skipped.token === "quotation" && skipped.step === 2);
ok("...but counts only what it holds, so the skipped RFQ still shows undone", skipped.progress === 0.4);
ok("a deal holding its whole flow is done", W.readDeal(flow, new Set(flow)).state === "done");
ok("a stage outside the flow moves nothing", W.readDeal(flow, new Set(["ticket", "tender"])).progress === 0.2);
const noFlow = W.readDeal([], new Set(["ticket"]));
ok("a deal on no flow has no progress — null, not 0", noFlow.progress === null && noFlow.label === null);

console.log("\n== which kinds of work a studio runs");

const on = (keys) => (k) => keys.includes(k);
ok("a contractor runs deals", JSON.stringify(W.workTypesRunning(on(["crm-sales", "projects", "tendering"]))) === JSON.stringify(["deal"]));
ok("a shop with only the till runs counter sales", JSON.stringify(W.workTypesRunning(on(["pos"]))) === JSON.stringify(["counterSale"]));
ok("a facilities company runs deals, field jobs and work orders, in the registry's order",
  JSON.stringify(W.workTypesRunning(on(["maintenance", "field-service", "crm-sales"]))) === JSON.stringify(["deal", "job", "workOrder"]));
ok("a studio running none of those runs no kind of work", W.workTypesRunning(on(["finance", "hr"])).length === 0);

console.log(fails ? `\nwork types: ${fails} FAILED` : "\nwork types: all passed");
process.exit(fails ? 1 : 0);
