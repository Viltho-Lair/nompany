// A LEAD'S CLOCK AND WHO HAS IT — modules/sales/leads, and what a campaign's
// results count.
//
// THE DEFECTS THESE GUARD: an unassigned lead shown to a sales executive who
// cannot assign it (the owner's rule: only the manager sees the queue); an
// executive clearing their own assignee, which is rejecting a lead by another
// door; a new assignee inheriting the last one's lateness; a lead judged late
// after somebody moved it on; the daily nudge firing on every day instead of on
// its milestones; and a campaign's won value counting a lead it did not send.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const L = await import("@/modules/sales/leads");
const T = await import("@/modules/main/timeNotices");
const M = await import("@/modules/marketing/model");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the campaign's deadline");
ok("hours are whole", L.leadHours("24.4") === 24);
ok("blank is no deadline, not nought", L.leadHours("") === null && L.leadHours(null) === null);
ok("under an hour is no deadline", L.leadHours(0) === null);
ok("a week at most", L.leadHours(1000) === L.MAX_LEAD_HOURS);

console.log("\n== where a lead stands");
const raised = "2026-09-19T08:00:00.000Z";
const lead = { status: "Lead", assignedToCollaboratorId: "", createdAt: raised, leadDeadlineHours: 24 };
ok("waiting, inside its hours", L.leadState(lead, "2026-09-19T20:00:00.000Z") === "unassigned");
ok("waiting, past its hours", L.leadState(lead, "2026-09-20T09:00:00.000Z") === "late-assign");
ok("no deadline is never late", L.leadState({ ...lead, leadDeadlineHours: null }, "2027-01-01T00:00:00.000Z") === "unassigned");
const given = { ...lead, assignedToCollaboratorId: "c1", assignedAt: "2026-09-20T08:00:00.000Z" };
ok("assigned: the clock restarts at assignment", L.leadState(given, "2026-09-21T07:00:00.000Z") === "");
ok("assigned and untouched past its hours", L.leadState(given, "2026-09-21T09:00:00.000Z") === "late-action");
ok("acted on, never late", L.leadState({ ...given, firstActionAt: "2026-09-20T10:00:00.000Z" }, "2026-12-01T00:00:00.000Z") === "");
ok("moved past Lead is acted on", L.leadState({ ...lead, status: "Opportunity" }, "2027-01-01T00:00:00.000Z") === "");
ok("a Sales-raised ticket with no deadline is nothing", L.leadState({ status: "Lead", assignedToCollaboratorId: "c1", leadDeadlineHours: null }, "2027-01-01T00:00:00.000Z") === "");
ok("the due time is the raise plus the hours", L.leadDueAt(lead) === "2026-09-20T08:00:00.000Z");
ok("...and the assignment plus the hours once assigned", L.leadDueAt(given) === "2026-09-21T08:00:00.000Z");

console.log("\n== who sees it");
ok("the manager sees an unassigned lead", L.ticketVisible({ assignedToCollaboratorId: "" }, true));
ok("an executive does not", !L.ticketVisible({ assignedToCollaboratorId: "" }, false));
ok("everybody sees one somebody is on", L.ticketVisible({ assignedToCollaboratorId: "c1" }, false));

console.log("\n== assigning");
ok("nobody is not an assignee", L.assignProblem({ assignedToCollaboratorId: "c1" }, "") === "assignee");
ok("giving it to the same person is refused", L.assignProblem({ assignedToCollaboratorId: "c1" }, "c1") === "same");
ok("a missing ticket is refused", L.assignProblem(null, "c1") === "notfound");
const patch = L.assignPatch({ assignmentHistory: [{ to: "c1", by: "m", at: "x" }], firstActionAt: "y" }, "c2", "m", "2026-09-20T00:00:00.000Z");
ok("the new assignee is written", patch.assignedToCollaboratorId === "c2" && patch.assignedByCollaboratorId === "m");
ok("the history is appended, not rewritten", patch.assignmentHistory.length === 2 && patch.assignmentHistory[1].to === "c2");
ok("a new assignee starts a new clock", patch.firstActionAt === "");

console.log("\n== the daily nudge");
const late = { id: "t1", ref: "ACME-001", clientName: "Acme", ...lead };
ok("told the day it passes", T.overdueLeadNotices([late], "2026-09-20T09:00:00.000Z", "2026-09-20").length === 1);
ok("...not on the day after the first milestone gap", T.overdueLeadNotices([late], "2026-09-22T09:00:00.000Z", "2026-09-22").length === 0);
ok("...and again a week on", T.overdueLeadNotices([late], "2026-09-27T09:00:00.000Z", "2026-09-27").length === 1);
ok("a lead in time is not told", T.overdueLeadNotices([late], "2026-09-19T20:00:00.000Z", "2026-09-19").length === 0);

console.log("\n== what a campaign brought in");
const r = M.campaignResults([
  { campaignId: "a", won: false, value: 0 },
  { campaignId: "a", won: true, value: 1500.5 },
  { campaignId: "b", won: true, value: 900 },
  { campaignId: "", won: true, value: 99999 },
]);
ok("its own leads", r.get("a").leads === 2 && r.get("b").leads === 1);
ok("its own wins and their value", r.get("a").won === 1 && r.get("a").wonValue === 1500.5);
ok("a ticket naming no campaign counts for none", ![...r.values()].some((x) => x.wonValue > 99000));

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
