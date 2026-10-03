// KPIs ON KINDS OF WORK, purely (modules/main/workKpis). No store, no routes.
//
// What a piece of work is for measuring (built from the dates its own record
// keeps), one item judged against a per-item KPI, a period scored against a
// period KPI, and a declaration that could not be measured refused in words.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const K = await import("@/modules/main/workKpis");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const d = (s) => `${s}T09:00:00.000Z`;

console.log("\n== what a piece of work is, read off its own record");

const wo = K.factsFromWorkOrder({
  id: "w1", status: "Closed", createdAt: d("2031-03-01"), startedAt: d("2031-03-02"),
  completedAt: d("2031-03-04"), closedAt: d("2031-03-05"), dueOn: "2031-03-03",
  history: [{ status: "Completed", at: d("2031-03-03") }, { status: "In progress", at: d("2031-03-03") }],
});
ok("a work order opens when it was created", wo.openedAt === d("2031-03-01"));
ok("the FIRST completion counts, from the history, not a later stamp", wo.reached.Completed === d("2031-03-03"), wo.reached.Completed);
ok("a closed order is done, finished at its first completion", wo.state === "done" && wo.doneAt === d("2031-03-03"));
const job = K.factsFromJob({ id: "j1", status: "scheduled", createdAt: d("2031-03-01"), scheduledEnd: "2031-03-10", completedAt: "" });
ok("a job is due at its scheduled end", job.dueOn === "2031-03-10" && job.state === "open");
ok("a job records no start, so 'in progress' is not invented", !("in-progress" in job.reached));
const sale = K.factsFromReceipt({ id: "r1", at: d("2031-03-02"), total: 115 });
ok("a receipt is done the moment it is written, carrying its total", sale.state === "done" && sale.value === 115);
const deal = K.factsFromDeal("e1", { ticket: d("2031-03-01"), quotation: d("2031-03-06") }, ["ticket", "rfq", "quotation"]);
ok("a deal opens with its first record", deal.openedAt === d("2031-03-01"));
ok("...and is not done while its flow has a stage it lacks", deal.state === "open" && deal.doneAt === "");

console.log("\n== one piece of work, judged");

const quoteIn5 = { id: "q5", label: "Quoted within 5 days", workType: "deal", kind: "reach", step: "quotation", days: 5 };
ok("a step reached after its days is MISSED, even though it happened", K.judgeItem({ ...quoteIn5, days: 4 }, deal, d("2031-04-01")).outcome === "missed");
ok("...and on the last day counts as within", K.judgeItem(quoteIn5, deal, d("2031-04-01")).outcome === "met");
ok("...and within them is met", K.judgeItem({ ...quoteIn5, days: 7 }, deal, d("2031-04-01")).outcome === "met");
const fresh = K.factsFromDeal("e2", { ticket: d("2031-03-01") }, ["ticket", "quotation"]);
ok("not reached and still inside its days is in progress", K.judgeItem(quoteIn5, fresh, d("2031-03-03")).outcome === "in-progress");
ok("not reached and past its days is missed", K.judgeItem(quoteIn5, fresh, d("2031-03-09")).outcome === "missed");

const onTime = { id: "wo-on-time", label: "Work orders on time", workType: "workOrder", kind: "onTime" };
ok("finished on its due date is on time", K.judgeItem(onTime, wo, d("2031-04-01")).outcome === "met");
const lateWo = K.factsFromWorkOrder({ id: "w2", status: "Completed", createdAt: d("2031-03-01"), completedAt: d("2031-03-08"), dueOn: "2031-03-05" });
ok("finished after it is late", K.judgeItem(onTime, lateWo, d("2031-04-01")).outcome === "missed");
const noDue = K.factsFromWorkOrder({ id: "w3", status: "Open", createdAt: d("2031-03-01"), dueOn: "" });
ok("no due date is UNKNOWN, never late", K.judgeItem(onTime, noDue, d("2031-04-01")).outcome === "unknown");
ok("cancelled work is not judged at all", K.judgeItem(onTime, K.factsFromWorkOrder({ id: "w4", status: "Cancelled", createdAt: d("2031-03-01"), dueOn: "2031-03-02" }), d("2031-04-01")) === null);
ok("a job done without a stamp for the step asked is unknown, not late",
  K.judgeItem({ id: "j", label: "x", workType: "job", kind: "reach", step: "in-progress", days: 2 },
    K.factsFromJob({ id: "j2", status: "completed", createdAt: d("2031-03-01"), completedAt: d("2031-03-09") }), d("2031-04-01")).outcome === "unknown");

console.log("\n== the company over a period");

const MARCH = ["2031-03-01T00:00:00.000Z", "2031-04-01T00:00:00.000Z"];
const orders = [wo, lateWo, noDue, K.factsFromWorkOrder({ id: "w5", status: "Completed", createdAt: d("2031-02-20"), completedAt: d("2031-03-02"), dueOn: "2031-03-03" })];
const share = { id: "share", label: "90% on time", workType: "workOrder", kind: "share", of: "wo-on-time", target: 0.9 };
const s = K.scorePeriod(share, orders, ...MARCH, d("2031-04-02"), { "wo-on-time": onTime });
ok("the share counts what FINISHED in the period and could be judged", s.n === 3 && Math.abs(s.value - 2 / 3) < 1e-3, JSON.stringify(s));
ok("...short of 90% is missed", s.outcome === "missed");
const avg = K.scorePeriod({ id: "a", label: "avg", workType: "workOrder", kind: "avgDays", target: 3 }, orders, ...MARCH, d("2031-04-02"));
ok("average days counts open to done, of what finished", avg.n === 3 && avg.value === 6.3, JSON.stringify(avg));
ok("...and an average is a CEILING: above it is missed", avg.outcome === "missed");
ok("a period with nothing finished has no average — null, not 0",
  K.scorePeriod({ id: "a", label: "avg", workType: "workOrder", kind: "avgDays", target: 3 }, [noDue], ...MARCH, d("2031-04-02")).value === null);

const sales = [sale, K.factsFromReceipt({ id: "r2", at: d("2031-03-20"), total: 85 }), K.factsFromReceipt({ id: "r3", at: d("2031-04-02"), total: 999 })];
const value = K.scorePeriod({ id: "v", label: "SAR 500 a month", workType: "counterSale", kind: "value", target: 500 }, sales, ...MARCH, d("2031-03-21"));
ok("value adds up what was sold IN the period only", value.value === 200 && value.n === 2, JSON.stringify(value));
ok("...and short of target while the month runs is in progress, not missed", value.outcome === "in-progress");
ok("...but missed once the month is over",
  K.scorePeriod({ id: "v", label: "x", workType: "counterSale", kind: "value", target: 500 }, sales, ...MARCH, d("2031-04-05")).outcome === "missed");
ok("count meets its target the moment it is reached",
  K.scorePeriod({ id: "c", label: "x", workType: "counterSale", kind: "count", target: 2 }, sales, ...MARCH, d("2031-03-21")).outcome === "met");

console.log("\n== a KPI that could not be measured is refused at the door");

const STAGES = ["ticket", "rfq", "quotation"];
const why = (defs) => K.workKpiProblems(defs, STAGES).join(" | ");
ok("a sound set has nothing wrong", why([quoteIn5, onTime, share]) === "", why([quoteIn5, onTime, share]));
ok("a step the kind of work does not have is named",
  /is not a step of a job/.test(why([{ id: "x", label: "x", workType: "job", kind: "reach", step: "Open", days: 2 }])));
ok("a deal cannot be on time — it has no due date", /no due date/.test(why([{ id: "x", label: "x", workType: "deal", kind: "onTime" }])));
ok("a share's target is a fraction", /a fraction/.test(why([onTime, { ...share, target: 90 }])));
ok("a share of a KPI that is not there is refused", /nothing to take a share of/.test(why([{ ...share, of: "nope" }])));
ok("a share of another kind of work is refused", /different kind of work/.test(why([quoteIn5, { ...share, of: "q5" }])));
ok("only counter sales add up money", /only a counter sale/.test(why([{ id: "x", label: "x", workType: "job", kind: "value", target: 5 }])));
ok("a kind of work that does not exist is refused", /is not a kind of work/.test(why([{ id: "x", label: "x", workType: "case", kind: "count", target: 1 }])));

console.log("\n== timed FROM a step: first delivery within 30 days of the project");

const delivery = { id: "dlv", label: "x", workType: "deal", kind: "reach", step: "delivery", from: "project", days: 30 };
const noProject = K.factsFromDeal("e3", { ticket: d("2031-01-01") }, ["ticket", "project", "delivery"]);
ok("before the project exists the clock has not started — WAITING, not late",
  K.judgeItem(delivery, noProject, d("2031-06-01")).outcome === "waiting");
const projected = K.factsFromDeal("e4", { ticket: d("2031-01-01"), project: d("2031-05-01") }, ["ticket", "project", "delivery"]);
ok("the clock starts at the project, not at the enquiry", K.judgeItem(delivery, projected, d("2031-05-20")).outcome === "in-progress");
ok("...and runs out 30 days after it", K.judgeItem(delivery, projected, d("2031-06-02")).outcome === "missed");
const delivered = K.factsFromDeal("e5", { ticket: d("2031-01-01"), project: d("2031-05-01"), delivery: d("2031-05-25") }, ["ticket", "project", "delivery"]);
ok("a delivery inside the 30 days is met, however old the enquiry", K.judgeItem(delivery, delivered, d("2031-07-01")).outcome === "met");
const FLOW = ["ticket", "rfq", "quotation", "project", "delivery"];
const whyFlow = (defs) => K.workKpiProblems(defs, FLOW).join(" | ");
ok("a sound timed-from KPI has nothing wrong", whyFlow([delivery]) === "", whyFlow([delivery]));
ok("a from-step that does not exist is refused", /clock could never start/.test(whyFlow([{ ...delivery, from: "nope" }])));
ok("a step timed from itself is refused", /from itself/.test(whyFlow([{ ...delivery, from: "delivery" }])));
ok("a work order timed from a LATER step is refused",
  /comes after/.test(why([{ id: "x", label: "x", workType: "workOrder", kind: "reach", step: "In progress", from: "Completed", days: 2 }])));

console.log("\n== the list of measures, and a studio's targets");

ok("every built-in measure is sound", K.measureProblems(K.BUILTIN_MEASURES, ["ticket", "rfq", "quotation", "contract", "project", "delivery", "invoice"]).length === 0,
  K.measureProblems(K.BUILTIN_MEASURES, ["ticket", "rfq", "quotation", "contract", "project", "delivery", "invoice"]).join(" | "));
ok("a built-in measure carries no number", K.BUILTIN_MEASURES.every((m) => !("days" in m) && !("target" in m)));
const reworded = K.mergeMeasures([{ ...K.BUILTIN_MEASURES[0], name: { en: "Quoted fast", ar: "عرض سريع" } }, { id: "mine", name: { en: "Mine", ar: "خاص" }, workType: "job", kind: "onTime", active: true }]);
ok("the console's row replaces its built-in by id, and an added one follows",
  reworded[0].name.en === "Quoted fast" && reworded.length === K.BUILTIN_MEASURES.length + 1);

const M = K.BUILTIN_MEASURES.find((m) => m.id === "deal-delivery");
let v = K.nextVersions(undefined, { value: 30 }, d("2031-01-01"), "col_1");
v = K.nextVersions(v, { flowId: "B", value: 7 }, d("2031-02-01"), "col_1");
v = K.nextVersions(v, { value: 21 }, d("2031-06-01"), "col_1");
ok("work that opened before any target was set is not measured", K.targetIn(v, "A", d("2030-12-01")) === null);
ok("the studio-wide number applies to a flow with no override", K.targetIn(v, "A", d("2031-03-01")) === 30);
ok("a flow's override wins over it", K.targetIn(v, "B", d("2031-03-01")) === 7);
ok("A CHANGED TARGET DOES NOT RE-JUDGE THE PAST: March work keeps 30", K.targetIn(v, "A", d("2031-03-01")) === 30 && K.targetIn(v, "A", d("2031-07-01")) === 21);
ok("...and the override survives the studio-wide change", K.targetIn(v, "B", d("2031-07-01")) === 7);
const cleared = K.nextVersions(v, { flowId: "B", value: undefined }, d("2031-08-01"), "col_1");
ok("removing an override hands the flow back to the studio-wide number", K.targetIn(cleared, "B", d("2031-09-01")) === 21);
ok("a flow can be switched OFF a measure the studio keeps", K.targetIn(K.nextVersions(v, { flowId: "B", value: null }, d("2031-08-01"), "c"), "B", d("2031-09-01")) === null);
ok("setting the same number again adds no version", K.nextVersions(v, { value: 21 }, d("2031-09-01"), "c").length === v.length);
ok("versions are only ever appended", cleared.length === v.length + 1 && cleared[0].value === 30);

const inForce = K.kpisInForce(K.BUILTIN_MEASURES, { "deal-delivery": v }, "deal", "B", d("2031-03-01"));
ok("a deal on flow B is measured on its override, as days", inForce.length === 1 && inForce[0].days === 7 && inForce[0].from === "project");
ok("a measure the console switched off is not in force",
  K.kpisInForce([{ ...M, active: false }], { "deal-delivery": v }, "deal", "A", d("2031-03-01")).length === 0);

ok("a number is checked against what the measure asks", K.targetProblem(M, 1.5) === "days" && K.targetProblem(M, 30) === "");
ok("a share is a fraction", K.targetProblem(K.BUILTIN_MEASURES.find((m) => m.kind === "share"), 90) === "share");
ok("on-time is on or off", K.targetProblem(K.BUILTIN_MEASURES.find((m) => m.kind === "onTime"), 1) === "");

const month = K.periodBounds("month", "2031-03-17", "Asia/Riyadh");
ok("a month is midnight to midnight on the studio's clock", month.from === "2031-02-28T21:00:00.000Z" && month.to === "2031-03-31T21:00:00.000Z", JSON.stringify(month));
const week = K.periodBounds("week", "2031-03-19", "UTC");
ok("a week starts on Monday", week.from === "2031-03-17T00:00:00.000Z" && week.to === "2031-03-24T00:00:00.000Z", JSON.stringify(week));

console.log(fails ? `\nwork kpis: ${fails} FAILED` : "\nwork kpis: all passed");
process.exit(fails ? 1 : 0);
