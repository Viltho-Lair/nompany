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

console.log(fails ? `\nflow progress: ${fails} FAILED` : "\nflow progress: all passed");
process.exit(fails ? 1 : 0);
