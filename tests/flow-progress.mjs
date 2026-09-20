// WHERE A DEAL HAS GOT TO. Pure — no database, no routes.
//
// The template's stage ORDER has existed since it was written and the only
// thing that ever read it was a display sort. This is the arithmetic that turns
// it into a sequence, and every assertion below is about the one property that
// matters most: IT GUIDES AND NEVER BLOCKS. A deal that skipped a stage is told
// so and is otherwise left alone.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(process.cwd() + "/").href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { flowProgress, nextActionFor } = await import("@/platform/engagement/progress");
const { FLOW_TEMPLATES } = await import("@/platform/engagement/templates");
const { STAGE_REGISTRY } = await import("@/platform/engagement/registry");

let fails = 0;
const ok = (label, cond, detail = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  " + detail : ""}`);
};
const eq = (label, a, b) =>
  ok(label, a === b, a === b ? "" : `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const REG = {
  ticket: { label: "Sales ticket", sectionKey: "crm-sales-tickets", permission: "crmSales.tickets.view" },
  rfq: { label: "RFQ", sectionKey: "engineering-docs-rfq", permission: "engineeringDocs.rfq.view" },
  quotation: { label: "Quotation", sectionKey: "crm-sales-quotations", permission: "crmSales.quotations.view" },
  project: { label: "Project", sectionKey: "projects-list", permission: "projects.list.view" },
};
const STAGES = ["ticket", "rfq", "quotation", "project"];

console.log("\n== the sequence the owner described: ticket > RFQ > quotation");
const fresh = flowProgress(STAGES, ["ticket"], REG);
eq("a deal with only a ticket is next asked for the RFQ", fresh.next.type, "rfq");
eq("...and the RFQ names where the work is done", fresh.next.sectionKey, "engineering-docs-rfq");
eq("...and nothing was skipped", fresh.behind.length, 0);
eq("...and it is a quarter done", fresh.completion, 0.25);

const two = flowProgress(STAGES, ["ticket", "rfq"], REG);
eq("with the RFQ in, the quotation is next", two.next.type, "quotation");
eq("...and two remain", two.remaining.length, 2);

console.log("\n== a finished deal has no next step, and that is a real answer");
const all = flowProgress(STAGES, STAGES, REG);
eq("nothing outstanding", all.next, null);
eq("...and it says so as 1, not as null", all.completion, 1);
// A screen must be able to tell "done" from "no flow at all" — hence null
// completion below rather than 0.
eq("a template with no stages reports null completion", flowProgress([], [], REG).completion, null);

console.log("\n== it GUIDES: a skipped stage is named, never refused");
// THE CASE THE OWNER CALLED OUT: "even if one missing link in a specific flow is
// not there it will not stop the run of the company."
const skipped = flowProgress(STAGES, ["ticket", "quotation"], REG);
eq("a quotation with no RFQ behind it is still a good quotation", skipped.behind.length, 1);
eq("...and the missing link is named", skipped.behind[0].type, "rfq");
eq("...and the deal is not refused anything", typeof skipped.next, "object");
// The next step is the EARLIEST thing missing, not the next thing unreached:
// the honest answer to "what now" for a deal that stepped over the RFQ is the
// RFQ.
eq("...and the RFQ is what it is asked for next", skipped.next.type, "rfq");

console.log("\n== nothing is 'behind' when nothing has been stepped over");
const early = flowProgress(STAGES, ["ticket"], REG);
eq("stages simply not reached yet are ahead, not behind", early.behind.length, 0);
eq("a deal with nothing at all is behind on nothing", flowProgress(STAGES, [], REG).behind.length, 0);
eq("...and is asked for the first stage", flowProgress(STAGES, [], REG).next.type, "ticket");

console.log("\n== the right to DO it is derived from the right to SEE it");
eq("view becomes create", flowProgress(STAGES, ["ticket"], REG).next.createPermission,
  "engineeringDocs.rfq.create");
// A step nobody may take is not a call to action — the flow says what the DEAL
// needs, it does not send a person at a door that will refuse them.
const act = nextActionFor(two, (k) => k === "crmSales.quotations.create");
eq("somebody who may raise it is offered it", act.actionable, true);
const cannot = nextActionFor(two, () => false);
eq("somebody who may not is told what is needed, not offered a button", cannot.actionable, false);
eq("...and still learns which stage it is", cannot.step.type, "quotation");
eq("a finished deal offers no action", nextActionFor(all, () => true), null);

console.log("\n== an unknown stage is dropped rather than guessed at");
const withJunk = flowProgress(["ticket", "nonsense", "rfq"], ["ticket"], REG);
eq("a stage the registry does not know contributes nothing", withJunk.next.type, "rfq");
eq("...and is not counted against completion", withJunk.completion, 0.5);

console.log("\n== against every template the product actually ships");
// A function validated only against a hand-written fixture is validated against
// nothing that ships. Every real template, walked from empty to complete.
for (const tpl of FLOW_TEMPLATES) {
  const stages = [...tpl.stages];
  const empty = flowProgress(stages, [], STAGE_REGISTRY);
  ok(`${tpl.id} (${tpl.name}): opens by asking for ${empty.next?.type}`,
    Boolean(empty.next) && stages.includes(empty.next.type));
  ok(`${tpl.id}: every stage resolves`, empty.remaining.length === stages.length,
    `${empty.remaining.length} of ${stages.length}`);
  const full = flowProgress(stages, stages, STAGE_REGISTRY);
  ok(`${tpl.id}: complete when it holds them all`, full.next === null && full.completion === 1);
  // Walking one stage at a time must never report anything behind: adding
  // stages in the flow's own order is, by definition, not skipping any.
  let behindEver = 0;
  for (let i = 1; i <= stages.length; i += 1) {
    behindEver += flowProgress(stages, stages.slice(0, i), STAGE_REGISTRY).behind.length;
  }
  ok(`${tpl.id}: walking it in order is never "behind"`, behindEver === 0, String(behindEver));
}

console.log("\n== a flow is walked over the departments this studio runs");

// THE LAST CORNER OF THE OWNER'S RULE (20/09/2026). The cards already went with
// their sections; the SEQUENCE did not, so a studio with Quotations switched
// off was told its next step was to raise a quotation — a step nobody there can
// take, for a stage the same screen had stopped drawing.
const { stagesRunning } = await import("@/platform/engagement/progress");
const A = FLOW_TEMPLATES.find((t) => t.id === "A");
const quotationsOff = (key) => key !== "quotations-register" && key !== "quotations-rfq";

const walked = stagesRunning(A.stages, [], STAGE_REGISTRY, quotationsOff);
ok("a switched-off part's stage leaves the walk", !walked.includes("quotation"), walked.join(","));
ok("…and the rest of the flow keeps its order",
  walked.join(",") === A.stages.filter((s) => walked.includes(s)).join(","));
const nextOff = flowProgress(walked, [], STAGE_REGISTRY).next;
ok("so the next step is never one nobody can take", nextOff?.type !== "quotation", String(nextOff?.type));

// A STAGE THE DEAL HOLDS STAYS, whatever the switches say: dropping it would
// report the deal as further back than it is and invite a step it has taken.
const held = stagesRunning(A.stages, ["quotation"], STAGE_REGISTRY, quotationsOff);
ok("a stage the deal already holds is still walked", held.includes("quotation"));
ok("nothing changes when every part is on",
  stagesRunning(A.stages, [], STAGE_REGISTRY, () => true).join(",") === A.stages.join(","));
ok("a stage the registry does not know is left for flowProgress to drop",
  stagesRunning(["not-a-stage"], [], STAGE_REGISTRY, () => false).join(",") === "not-a-stage");

console.log("\n== a studio is shown its own trades and flows, not the catalogue");

// THE OWNER, 20/09/2026: "the user should not see every single industry and
// Deal flow he doesn't need". Every studio's Settings listed all twenty-five
// trades and all seven flows, so the product's catalogue read as that studio's
// own configuration. The master list is the console's now (/super → ERP
// settings); this is what a studio keeps.
const { narrow } = await import("@/modules/studioFlows");
const { INDUSTRIES } = await import("@/platform/engagement/industries");
const contractor = INDUSTRIES.find((i) => i.key === "construction-and-contracting");

const mine = narrow(INDUSTRIES, FLOW_TEMPLATES, contractor.field, null);
ok("only the studio's own trade is listed",
  mine.industries.length === 1 && mine.industries[0].key === contractor.key,
  mine.industries.map((i) => i.key).join(","));
ok("…with the flows that trade starts on and also runs, and no others",
  mine.templates.every((t) => t.id === contractor.primary || t.id === contractor.secondary),
  mine.templates.map((t) => t.id).join(","));

// A FLOW SOMEBODY IS ALREADY WALKING IS NEVER HIDDEN — hiding the flow four
// live deals are on would hide the thing the screen exists to explain.
const walking = narrow(INDUSTRIES, FLOW_TEMPLATES, contractor.field, { deals: { C: 4 } });
ok("a flow live deals walk stays listed", walking.templates.some((t) => t.id === "C"));
ok("…and so does the trade that starts on it", walking.industries.some((i) => i.primary === "C"));

// A row THIS studio wrote is always its own business; one added in the console
// is not, or every studio would see it the day it was added.
const own = narrow(INDUSTRIES, FLOW_TEMPLATES, contractor.field, null, new Set(["manufacturing"]));
ok("a trade this studio edited is listed", own.industries.some((i) => i.key === "manufacturing"));
const added = [...INDUSTRIES, { key: "space-mining", name: "Space mining", primary: "B", secondary: "", note: "", field: "" }];
ok("a trade added for the product at large is not",
  !narrow(added, FLOW_TEMPLATES, contractor.field, null).industries.some((i) => i.key === "space-mining"));

// A STUDIO THAT HAS NOT SAID WHAT IT DOES SEES EVERYTHING, which is the honest
// answer rather than an empty screen.
const unsaid = narrow(INDUSTRIES, FLOW_TEMPLATES, "", null);
ok("no trade set means nothing is hidden",
  unsaid.industries.length === INDUSTRIES.length && unsaid.templates.length === FLOW_TEMPLATES.length);

console.log("\n== which flow a deal walks is decided once, when it opens");

// The precedence never moves: the deal's own template, then its industry's, then
// A. What changed on 20/09/2026 is that the deal now HAS one — `freezeTemplate`
// writes it at the single place a deal is minted, so editing an industry's
// default stops re-routing live deals that were opened under the old answer.
const { readFileSync } = await import("node:fs");
const engagementStore = readFileSync("src/platform/db/engagement.ts", "utf8");
ok("a minted deal is given its flow", /await freezeTemplate\(studioId, dealId\)/.test(engagementStore));
ok("…once, and never over an answer it already has",
  /if \(!current \|\| current\.templateId\) return \{ result: undefined \}/.test(engagementStore));
ok("…best-effort, so it cannot fail the record that opened the deal",
  /catch \{ \/\* the deal stands/.test(engagementStore));

console.log(fails ? `\nflow progress: ${fails} FAILED` : "\nflow progress: all passed");
process.exit(fails ? 1 : 0);
