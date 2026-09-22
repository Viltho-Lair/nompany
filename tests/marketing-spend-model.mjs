// BUDGET & SPEND'S ARITHMETIC — modules/marketing/spend, what a campaign was
// allowed against what it cost.
//
// THE DEFECTS THESE GUARD: a sub-campaign's spend counted twice (once on itself
// and once inside its parent's own figure) or not at all; a bill naming a
// campaign somebody has since deleted vanishing from the total; a budget of
// nought reading as "fully spent" rather than "no budget"; a cancelled
// campaign's spend disappearing, which would let a studio spend less by
// cancelling things; and a cost per lead of 0.00 where the honest answer is
// "nothing spent yet".

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const S = await import("@/modules/marketing/spend");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const campaigns = [
  { id: "parent", status: "Active", budget: 10000 },
  { id: "child", parentId: "parent", status: "Active", budget: 4000 },
  { id: "solo", status: "Active", budget: 1000 },
  { id: "unbudgeted", status: "Active", budget: null },
  { id: "zero", status: "Active", budget: 0 },
  { id: "cancelled", status: "Cancelled", budget: 500 },
];
const spend = [
  { campaignId: "parent", amount: 3000, kind: "bill" },
  { campaignId: "child", amount: 2500, kind: "bill" },
  { campaignId: "child", amount: 500, kind: "expense" },
  { campaignId: "solo", amount: 1200, kind: "bill" },
  { campaignId: "unbudgeted", amount: 700, kind: "expense" },
  { campaignId: "cancelled", amount: 300, kind: "bill" },
  { campaignId: "gone", amount: 900, kind: "bill" },   // its campaign was deleted
  { campaignId: "", amount: 5000, kind: "bill" },      // not marketing's at all
];
const report = S.campaignSpend(campaigns, spend, 12000);
const row = (id) => report.campaigns.get(id);

console.log("\n== a sub-campaign spends its parent's money");
ok("the parent's own spend is its own", row("parent").own === 3000);
ok("...and its total carries the child's", row("parent").total === 6000, String(row("parent").total));
ok("the child keeps its own figure", row("child").own === 3000 && row("child").total === 3000);
ok("the parent's remaining counts both", row("parent").remaining === 4000);
ok("the studio's spend counts each cost once", report.spent === 9100, String(report.spent));

console.log("\n== what the total cannot lose");
ok("a cost naming a deleted campaign is counted and named", report.unattributed === 900);
ok("...and is still inside the studio's spend", report.spent > row("parent").total + row("solo").total);
ok("a cost naming no campaign is nobody's", !String(JSON.stringify([...report.campaigns.values()])).includes("5000"));
ok("a cancelled campaign's spend still counts", row("cancelled").own === 300);

console.log("\n== budgets that are not numbers");
ok("no budget means no share and no warning", row("unbudgeted").used === null && !row("unbudgeted").over);
ok("a budget of nought is not 'fully spent'", row("zero").used === null && !row("zero").over);
ok("over is over", row("solo").over === true && row("solo").remaining === -200);
ok("eight tenths in is nearly", S.campaignSpend([{ id: "a", status: "Active", budget: 1000 }],
  [{ campaignId: "a", amount: 800, kind: "bill" }]).campaigns.get("a").nearly === true);
ok("...and past the whole of it is over, not nearly", row("solo").nearly === false);
ok("the register's own remaining", report.budget === 12000 && report.remaining === 2900);
ok("a register nobody has budgeted has no remaining", S.campaignSpend(campaigns, spend, null).remaining === null);

console.log("\n== bills and expenses are counted apart");
ok("two bills and one expense", row("child").bills === 1 && row("child").expenses === 1);

console.log("\n== what the spend bought");
const paid = S.campaignReturn(2000, { leads: 8, won: 2, wonValue: 5000 });
ok("cost per lead", paid.costPerLead === 250);
ok("cost per won deal", paid.costPerWon === 1000);
ok("return on spend", paid.returnOnSpend === 2.5);
ok("net", paid.net === 3000);
const nothing = S.campaignReturn(0, { leads: 8, won: 0, wonValue: 0 });
ok("nothing spent is not a cost per lead of nought", nothing.costPerLead === null && nothing.returnOnSpend === null);
const noLeads = S.campaignReturn(2000, { leads: 0, won: 0, wonValue: 0 });
ok("no leads is not a cost per lead of nought", noLeads.costPerLead === null && noLeads.costPerWon === null);
ok("...but the money is still gone, and the net says so", noLeads.net === -2000);
ok("no results at all survives", S.campaignReturn(100, null).costPerLead === null);

console.log("\n== survivable inputs");
ok("no campaigns, no rows", S.campaignSpend([], []).spent === 0);
ok("a non-array is empty", S.campaignSpend(null, null).campaigns.size === 0);
ok("a nonsense amount is nought, not NaN", S.campaignSpend(
  [{ id: "a", status: "Active", budget: 10 }], [{ campaignId: "a", amount: "x", kind: "bill" }],
).campaigns.get("a").total === 0);

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
