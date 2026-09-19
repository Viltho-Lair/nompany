// A CAMPAIGN'S RULES — the ladder, its shape, its tracked link and its money.
//
// THE DEFECTS THESE GUARD: a sub-campaign's budget counted twice (once in its
// own right, once inside its parent's); a finished campaign reopened and its
// results moved under it; a sub-campaign given sub-campaigns of its own; a
// tagged `javascript:` link offered for a colleague to click; and a figure
// judged by a clock this file does not hand in.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const M = await import("@/modules/marketing/model");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the ladder");
ok("a draft is planned", M.moveProblem("Draft", "Planned") === "");
ok("a plan goes back to draft", M.moveProblem("Planned", "Draft") === "");
ok("a running campaign pauses", M.moveProblem("Active", "Paused") === "");
ok("...and does not go back to planned", M.moveProblem("Active", "Planned") === "wrong-state");
ok("a completed campaign moves nowhere", M.CAMPAIGN_STATUSES.every((s) => M.moveProblem("Completed", s) !== ""));
ok("a cancelled campaign moves nowhere", M.CAMPAIGN_STATUSES.every((s) => M.moveProblem("Cancelled", s) !== ""));
ok("an unknown status is refused as such", M.moveProblem("Draft", "Live") === "status");
ok("a move to where it is already is refused", M.moveProblem("Draft", "Draft") === "same");
ok("a finished campaign is not edited", !M.campaignEditable("Completed") && !M.campaignEditable("Cancelled"));

console.log("\n== what deletes");
ok("a draft deletes", M.campaignDeletable("Draft", false) === "");
ok("a cancelled one deletes", M.campaignDeletable("Cancelled", false) === "");
ok("one that ran does not", ["Active", "Paused", "Completed"].every((s) => M.campaignDeletable(s, false) === "campaign-ran"));
ok("a parent does not, before its sub-campaigns", M.campaignDeletable("Draft", true) === "has-sub-campaigns");

console.log("\n== its shape");
const rows = [{ id: "a", parentId: "" }, { id: "b", parentId: "a" }, { id: "c", parentId: "" }];
ok("it ends on or after it starts", M.campaignProblem({ startOn: "2026-10-02", endOn: "2026-10-01" }, rows) === "dates");
ok("...a one-day campaign is fine", M.campaignProblem({ startOn: "2026-10-01", endOn: "2026-10-01" }, rows) === "");
ok("a parent must exist", M.campaignProblem({ parentId: "zz" }, rows) === "parent");
ok("a campaign is not its own parent", M.campaignProblem({ id: "c", parentId: "c" }, rows) === "parent-self");
ok("a sub-campaign cannot be a parent", M.campaignProblem({ parentId: "b" }, rows) === "parent-depth");
ok("a parent cannot become a sub-campaign", M.campaignProblem({ id: "a", parentId: "c" }, rows) === "parent-depth");
ok("a top-level campaign takes a sub-campaign", M.campaignProblem({ id: "c", parentId: "a" }, rows) === "");

console.log("\n== the tracked link");
const link = M.taggedLink("https://example.com/offer?ref=x&utm_source=old", { source: "newsletter", medium: "email", campaign: "spring-sale" });
ok("the UTM set is added", link.includes("utm_source=newsletter") && link.includes("utm_medium=email") && link.includes("utm_campaign=spring-sale"));
ok("...replacing an old utm value", !link.includes("utm_source=old"));
ok("...keeping everything else", link.includes("ref=x"));
ok("a blank tag is left off", !link.includes("utm_term"));
ok("a javascript: address builds nothing", M.taggedLink("javascript:alert(1)", { source: "x" }) === "");
ok("...and is refused as a landing page", M.landingUrlProblem("javascript:alert(1)") === "landing-url");
ok("no address is not a problem", M.landingUrlProblem("") === "");
ok("a name becomes a utm value", M.utmSlug("Spring Sale — Riyadh 2026!") === "spring-sale-riyadh-2026");
ok("...accents dropped", M.utmSlug("Café Été") === "cafe-ete");
ok("an Arabic name becomes nothing, for the caller to fall back", M.utmSlug("حملة الربيع") === "");

console.log("\n== money counted once");
const money = [
  { id: "p", parentId: "", status: "Active", budget: 1000 },
  { id: "k1", parentId: "p", status: "Active", budget: 300 },
  { id: "k2", parentId: "p", status: "Cancelled", budget: 500 },
  { id: "q", parentId: "", status: "Planned", budget: null },
  { id: "k3", parentId: "q", status: "Draft", budget: 200 },
];
const split = M.budgetSplit(money[0], money);
ok("a parent hands out only to live sub-campaigns", split.allocated === 300 && split.left === 700, JSON.stringify(split));
ok("a parent with no budget has nothing left, not nought", M.budgetSplit(money[3], money).left === null);
ok("the total counts a sub-campaign inside its parent, not twice", M.budgetTotal(money) === 1200, String(M.budgetTotal(money)));

console.log("\n== what needs somebody, by the day handed in");
const today = "2026-09-19";
ok("a plan whose start passed is late", M.attention({ status: "Planned", startOn: "2026-09-18" }, today) === "late-start");
ok("running past its end", M.attention({ status: "Active", endOn: "2026-09-18" }, today) === "past-end");
ok("starting within a week", M.attention({ status: "Planned", startOn: "2026-09-26" }, today) === "starting");
ok("...not eight days out", M.attention({ status: "Planned", startOn: "2026-09-27" }, today) === "");
ok("a finished campaign needs nobody", M.attention({ status: "Completed", endOn: "2026-01-01" }, today) === "");
ok("adding days crosses a month", M.addDays("2026-09-28", 7) === "2026-10-05");

console.log("\n== the dashboard's figures");
const f = M.campaignFigures([
  ...money.map((c) => ({ ...c, channels: ["email"], expectedRevenue: null, expectedLeads: null })),
  { id: "done", parentId: "", status: "Completed", budget: 9000, channels: ["print"], expectedRevenue: 5000 },
  { id: "r", parentId: "", status: "Active", budget: null, channels: ["email", "social"], expectedRevenue: 800, expectedLeads: 40, startOn: "2026-09-01", endOn: "2026-09-10" },
], today);
ok("running counts Active", f.running === 3);
ok("open leaves finished campaigns out", f.open === 5);
ok("open budget leaves finished and cancelled out, and counts once", f.openBudget === 1200, String(f.openBudget));
ok("expected revenue is from open campaigns", f.expectedRevenue === 800);
ok("channels are counted per open campaign", f.byChannel[0].channel === "email" && f.byChannel[0].open === 5
  && !f.byChannel.some((c) => c.channel === "print"));
ok("an overrun counts as needing attention", f.needsAttention >= 1);

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
