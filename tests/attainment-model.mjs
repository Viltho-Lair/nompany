// A TARGET MEASURED AGAINST WHAT ACTUALLY HAPPENED.
//
// THE DEFECT THIS WHOLE FILE GUARDS: a campaign has carried three targets since
// Marketing shipped and a plan two since this morning, and NOTHING compared any
// of them to a result. The register printed the targets on one line and the
// actuals on the next.
//
// THE PARTICULAR TRAPS, each of which renders as a real answer:
//   * "no target" shown as 0%, which reads as total failure rather than as
//     nobody having set one;
//   * a target of NOUGHT dividing into Infinity% on a card;
//   * a negative shortfall — "minus three leads short" is not a sentence;
//   * and a plan's leads double-counted the way its BUDGET would be, which is
//     why plan attainment and planRollup are deliberately different functions.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const T = await import("@/modules/marketing/attainment");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== one target against one actual");
const half = T.attainment(20, 10);
ok("the share is actual over target", half.share === 0.5, String(half.share));
ok("...and it is not met", half.met === false);
ok("...and the shortfall is the difference", half.short === 10);
const beat = T.attainment(20, 25);
ok("passing the target is met", beat.met === true && beat.share === 1.25);
// A NEGATIVE SHORTFALL IS NOT A SENTENCE. The overshoot is already in `share`.
ok("...and the shortfall floors at nought, never negative", beat.short === 0);
ok("exactly on target is met", T.attainment(20, 20).met === true && T.attainment(20, 20).short === 0);

console.log("\n== null rather than zero");
const none = T.attainment(null, 7);
ok("NO target means no share — not 0%", none.share === null);
ok("...and no shortfall, because nothing can be behind nothing", none.short === null);
ok("...and the target stays null", none.target === null);
ok("...but what happened is still counted", none.actual === 7);
ok("undefined behaves as unset", T.attainment(undefined, 3).share === null);
// A TARGET OF NOUGHT WOULD DIVIDE INTO INFINITY.
const zero = T.attainment(0, 5);
ok("a target of nought gives no share rather than Infinity", zero.share === null, String(zero.share));
ok("...and is met, because nought was asked for", zero.met === true);
ok("nought against nought is met with no share", T.attainment(0, 0).met === true && T.attainment(0, 0).share === null);
// A REAL NOUGHT IS A REAL ANSWER.
ok("a target with nothing achieved is a real 0 share", T.attainment(20, 0).share === 0);
ok("...and the whole target is the shortfall", T.attainment(20, 0).short === 20);
ok("rubbish counts as nothing achieved", T.attainment(10, NaN).actual === 0);

console.log("\n== a campaign against its three targets");
const c = { id: "c1", expectedLeads: 20, expectedCustomers: 5, expectedRevenue: 10000 };
const got = { leads: 12, won: 6, wonValue: 4000 };
const a = T.campaignAttainment(c, got);
ok("leads are judged against the leads target", a.leads.actual === 12 && a.leads.target === 20);
// CUSTOMERS IS `won` — the deals its leads became, counted since leads shipped
// and never once compared to the target beside it.
ok("customers is the deals won", a.customers.actual === 6 && a.customers.met === true);
ok("revenue is the won value", a.revenue.actual === 4000 && a.revenue.share === 0.4);
ok("a campaign with targets says so", a.hasTargets === true);
const bare = T.campaignAttainment({ id: "c2" });
ok("a campaign with no targets says so, so a screen can stay quiet", bare.hasTargets === false);
ok("...and nothing it reports is a nought share", bare.leads.share === null && bare.revenue.share === null);
ok("no results at all counts as nothing, not as missing", T.campaignAttainment(c).leads.actual === 0);

console.log("\n== a plan against its campaigns");
const members = [{ id: "c1" }, { id: "c2" }, { id: "c3" }];
const results = new Map([
  ["c1", { leads: 10, won: 2, wonValue: 3000 }],
  ["c2", { leads: 5, won: 1, wonValue: 1500 }],
  // c3 brought in nothing, and is still a member.
]);
const p = T.planAttainment({ expectedLeads: 20, expectedRevenue: 6000 }, members, results);
ok("the plan's leads are its campaigns' leads", p.leads.actual === 15, String(p.leads.actual));
ok("...against the plan's own target", p.leads.target === 20 && p.leads.share === 0.75);
ok("revenue sums the won value", p.revenue.actual === 4500 && p.revenue.met === false);
ok("customers are counted even with no target for them", p.customers === 3);
ok("a member that brought nothing does not break the sum", p.leads.actual === 15);
// A TICKET NAMES EXACTLY ONE CAMPAIGN, so adding members' leads adds each
// ticket once — unlike a BUDGET, where a sub-campaign sits inside its parent.
const nested = T.planAttainment({ expectedLeads: null, expectedRevenue: null },
  [{ id: "parent" }, { id: "child" }],
  new Map([["parent", { leads: 4, won: 0, wonValue: 0 }], ["child", { leads: 3, won: 0, wonValue: 0 }]]));
ok("a sub-campaign's leads are added, not contained", nested.leads.actual === 7);
ok("...and with no plan target there is still no share", nested.leads.share === null);
const empty = T.planAttainment({ expectedLeads: 10, expectedRevenue: 100 }, [], new Map());
ok("a plan with no campaigns has a real 0 against its target", empty.leads.actual === 0 && empty.leads.share === 0);
ok("...and owes the whole target", empty.leads.short === 10);

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);

// `process.exitCode` RATHER THAN `process.exit()`, which every other test file
// in this folder still calls — and the difference is not style.
//
// MEASURED 22/09/2026: this file exited **127** on roughly half of the runs
// where stdout was redirected (`node tests/attainment-model.mjs >/dev/null`),
// and 0 the rest of the time. `process.exit()` tears the process down while
// buffered stdout writes are still in flight, and to a pipe or a device those
// writes are asynchronous — so a PURE test with no I/O of its own failed
// intermittently, at a different line each time, for a reason that had nothing
// to do with what it asserts. Setting the code and letting Node drain fixes it:
// 0/6 failures after, and it still exits 1 on a real failure (verified by
// breaking an assertion on purpose).
//
// THE SAME RACE CAN BITE ANY FILE HERE. It is left alone in the others rather
// than swept in this commit, because a forced exit also masks a hanging handle
// and changing 130 files blind would trade a visible flake for a silent hang.
process.exitCode = fails ? 1 : 0;
