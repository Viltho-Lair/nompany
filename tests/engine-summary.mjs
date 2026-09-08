// THE ARITHMETIC BEHIND EVERY ENGINE DASHBOARD.
//
// Pure, so it needs no database and runs in milliseconds — the same shape as
// tests/earned-value.mjs and tests/planner-schedule.mjs. Five sections'
// dashboards are drawn from this one function, so a mistake here is a mistake
// in five places at once, which is exactly the trade a shared summary makes.

import { summariseSection, openOf } from "../src/platform/engine/summary.ts";

let fails = 0;
const ok = (msg, cond, detail = "") => {
  if (!cond) { fails += 1; console.log(` FAIL  ${msg}${detail ? `  — ${detail}` : ""}`); }
  else console.log(`  ok   ${msg}`);
};

const TODAY = "2026-09-08";

const ncr = {
  key: "ncr", label: "NCRs and CAPAs",
  statuses: ["Open", "Investigating", "Action agreed", "Verified", "Closed"],
  transitions: [
    { from: "Open", to: "Investigating" }, { from: "Investigating", to: "Action agreed" },
    { from: "Action agreed", to: "Verified" }, { from: "Verified", to: "Closed" },
    { from: "Investigating", to: "Closed" },
  ],
  fields: [
    { key: "title", label: "Title", kind: "text" },
    { key: "dueBy", label: "Action due", kind: "date" },
  ],
};
const permit = {
  key: "permit", label: "Permits to work",
  statuses: ["Requested", "Issued", "Closed", "Cancelled"],
  transitions: [
    { from: "Requested", to: "Issued" }, { from: "Issued", to: "Closed" },
    { from: "Requested", to: "Cancelled" }, { from: "Issued", to: "Cancelled" },
  ],
  fields: [
    { key: "validFrom", label: "Valid from", kind: "date" },
    { key: "validTo", label: "Valid to", kind: "date" },
  ],
};

const row = (id, typeKey, status, values = {}) =>
  ({ id, typeKey, reference: id.toUpperCase(), status, values });

console.log("\n== an ending is a status with no way out, read off the transitions");

const openNcr = (x) => openOf(ncr.statuses, x, ncr.transitions);
const openPermit = (x) => openOf(permit.statuses, x, permit.transitions);

ok("a status with moves out of it is open", openNcr("Open") && openNcr("Action agreed"));
// VERIFIED IS STILL OPEN, and that is right rather than a near miss: the fix has
// been proven and the NCR has not been closed, so somebody still has to.
ok("...including the one just before the end", openNcr("Verified"));
ok("a leaf is an ending", !openNcr("Closed"));

// THE CASE THAT KILLED THE POSITIONAL RULE this replaced. Permits declare four
// statuses, so "the last third" was three, so Closed counted as OPEN and every
// closed permit was chased forever. Pinned by name so the rule cannot go back.
ok("a four-status ladder ends where it says it ends, not two thirds along",
  !openPermit("Closed") && !openPermit("Cancelled")
  && openPermit("Requested") && openPermit("Issued"));

// A REGISTER THAT LOOPS reads correctly too: an expired calibration goes back to
// Valid, so it is a LIVE problem, while Withdrawn has no way out.
const calibration = {
  statuses: ["Valid", "Due", "Expired", "Withdrawn"],
  transitions: [
    { from: "Valid", to: "Due" }, { from: "Due", to: "Valid" },
    { from: "Due", to: "Expired" }, { from: "Expired", to: "Valid" },
    { from: "Valid", to: "Withdrawn" },
  ],
};
ok("an expired instrument that can be recalibrated is still open",
  openOf(calibration.statuses, "Expired", calibration.transitions));
ok("...while the one that was withdrawn is not",
  !openOf(calibration.statuses, "Withdrawn", calibration.transitions));

// A ROW IN A STATUS THE TYPE NO LONGER DECLARES IS STILL SOMEBODY'S PROBLEM.
// Treating it as closed would make a register get quietly shorter every time a
// studio retired a status.
ok("a status the type no longer declares counts as open", openNcr("Escalated"));
ok("a type with no statuses at all leaves everything open", openOf([], "anything"));
// NO TRANSITIONS MEANS NO ENDINGS, which over-reports work rather than silently
// stopping the chase on rows that are still somebody's.
ok("a type that declares no moves leaves everything open",
  openOf(ncr.statuses, "Closed", []));

console.log("\n== every declared status is reported, including the empty ones");

const s1 = summariseSection([ncr], [
  row("r1", "ncr", "Open", { dueBy: "2026-12-01" }),
  row("r2", "ncr", "Open", { dueBy: "2026-12-02" }),
  row("r3", "ncr", "Closed", {}),
], TODAY);

const reg = s1.registers[0];
ok("the register is summarised", reg?.typeKey === "ncr" && reg.total === 3, JSON.stringify(reg?.total));
ok("...with every declared status present, in the type's order",
  reg.byStatus.map((b) => b.status).join(",") === ncr.statuses.join(","),
  reg.byStatus.map((b) => b.status).join(","));
// A FUNNEL THAT DROPS ITS EMPTY RUNGS cannot tell a studio that nothing has
// reached Verified — which is the one thing a status breakdown is read for.
ok("...and an empty rung reports zero rather than vanishing",
  reg.byStatus.find((b) => b.status === "Verified")?.count === 0);
ok("...and the counts are right",
  reg.byStatus.find((b) => b.status === "Open")?.count === 2
  && reg.byStatus.find((b) => b.status === "Closed")?.count === 1);
ok("open counts the live rows only", reg.open === 2, String(reg.open));

const s2 = summariseSection([ncr], [row("r9", "ncr", "Escalated", {})], TODAY);
ok("a row in a retired status is appended rather than dropped",
  s2.registers[0].byStatus.some((b) => b.status === "Escalated" && b.count === 1),
  JSON.stringify(s2.registers[0].byStatus));

console.log("\n== overdue reads the type's own date fields");

const s3 = summariseSection([ncr, permit], [
  row("a1", "ncr", "Open", { dueBy: "2026-09-01" }),        // 7 days late
  row("a2", "ncr", "Open", { dueBy: "2026-08-29" }),        // 10 days late
  row("a3", "ncr", "Open", { dueBy: "2027-01-01" }),        // not yet
  row("a4", "ncr", "Closed", { dueBy: "2026-01-01" }),      // ended; not chased
  row("p1", "permit", "Issued", { validFrom: "2026-08-01", validTo: "2026-09-05" }),
], TODAY);

ok("overdue counts only the open rows", s3.registers[0].overdue === 2,
  String(s3.registers[0].overdue));
// A CLOSED ROW WITH A PAST DATE IS NOT A PROBLEM. Chasing it is how a
// dashboard trains people to ignore it.
ok("...so a finished row with a past date is not chased",
  !s3.attention.some((a) => a.id === "a4"));
ok("a future date is not overdue", !s3.attention.some((a) => a.id === "a3"));

// A START DATE IS NOT A DEADLINE. `validFrom` on an issued permit is the day the
// work was allowed to BEGIN and is in the past on every live permit; the first
// version of this chased it and reported the whole register overdue. Only
// `validTo` counts, and the row appears once.
ok("a permit past its validTo is overdue on that and not on validFrom",
  s3.registers[1].overdue === 1
  && s3.attention.filter((a) => a.id === "p1").length === 1
  && s3.attention.find((a) => a.id === "p1")?.field === "validTo",
  JSON.stringify(s3.attention.find((a) => a.id === "p1")));

ok("the attention list is worst-first",
  s3.attention[0]?.id === "a2" && s3.attention[0]?.daysLate === 10,
  JSON.stringify(s3.attention[0]));
ok("...and names which date is past, by its label",
  s3.attention[0]?.field === "dueBy" && s3.attention[0]?.label === "Action due",
  JSON.stringify(s3.attention[0]));

ok("the section totals do not need a second pass",
  s3.total === 5 && s3.totalOverdue === 3, JSON.stringify({ t: s3.total, o: s3.totalOverdue }));

console.log("\n== the empty and the malformed");

const empty = summariseSection([ncr], [], TODAY);
ok("a register with no rows still reports its ladder",
  empty.registers[0].total === 0 && empty.registers[0].byStatus.length === 5);
ok("...and nothing needs attention", empty.attention.length === 0 && empty.totalOverdue === 0);

ok("no types at all is an empty summary, not a throw",
  summariseSection([], [row("x", "ncr", "Open")], TODAY).registers.length === 0);

// A DATE THAT IS NOT A DATE IS NOT OVERDUE. The engine stores whatever a field
// was given and validates a `date` kind loosely, so the summary must not
// mistake "soon" or "" for a day in the past.
const junk = summariseSection([ncr], [
  row("j1", "ncr", "Open", { dueBy: "soon" }),
  row("j2", "ncr", "Open", { dueBy: "" }),
  row("j3", "ncr", "Open", {}),
], TODAY);
ok("an unparseable date is not overdue", junk.totalOverdue === 0, String(junk.totalOverdue));

// AND NO CLOCK IS READ IN HERE. `asOf` is the caller's, which is what lets the
// screen and the server agree and what stops this file failing on a calendar.
const later = summariseSection([ncr], [row("k", "ncr", "Open", { dueBy: "2026-09-07" })], "2026-09-08");
const earlier = summariseSection([ncr], [row("k", "ncr", "Open", { dueBy: "2026-09-07" })], "2026-09-01");
ok("overdue is measured against asOf and nothing else",
  later.totalOverdue === 1 && earlier.totalOverdue === 0);

ok("a limit of zero returns no attention rows",
  summariseSection([ncr], [row("z", "ncr", "Open", { dueBy: "2020-01-01" })], TODAY, 0).attention.length === 0);

console.log(fails ? `\nengine summary: ${fails} FAILURES\n` : "\nengine summary: all passed\n");
process.exit(fails ? 1 : 0);
