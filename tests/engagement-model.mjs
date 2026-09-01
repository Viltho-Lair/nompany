// THE DEAL MODEL'S VOCABULARY, CHECKED AGAINST ITSELF.
//
// Three files have to agree and none of them imports the others: the stage
// registry says what a stage IS, the seven templates say which stages a flow
// uses, and the industry map says which template a trade starts on. Each is
// deliberately plain data, which is what makes them editable per tenant — and
// also what means nothing catches a typo at compile time. A template naming a
// stage that does not exist renders as nothing, forever, and looks like a
// missing feature rather than a missing letter.
//
// No database, no fixtures, no namespace: every assertion here is a pure
// function of three data files, so it runs in a second and can be run on every
// change without thinking about it.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  register(new URL("./loader.mjs", import.meta.url),
    { data: { root: pathToFileURL(`${process.cwd()}/`).href } });
}

const { STAGE_REGISTRY } = await import("@/platform/engagement/registry");
const { FLOW_TEMPLATES, templateProblems, templateStageTypes, templateById } =
  await import("@/platform/engagement/templates");
const { INDUSTRIES, industryProblems, defaultTemplateFor, industryByKey } =
  await import("@/platform/engagement/industries");
const { contribute, emptyContext, statusStage } = await import("@/platform/engagement/context");
const { ALL_PERMISSIONS } = await import("@/platform/access");
const { NO_SCREEN_YET } = await import("@/platform/access/resolve");
const { SECTION_DEFS } = await import("@/platform/db/keys");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? `  — ${extra}` : ""}`);
};

const stageTypes = Object.keys(STAGE_REGISTRY);

console.log("== the seven templates are well formed");
{
  const problems = templateProblems(stageTypes);
  ok("every template's stages, heads, statusChain and overrides resolve",
    problems.length === 0, problems.join(" | "));
  ok("there are seven of them", FLOW_TEMPLATES.length === 7, String(FLOW_TEMPLATES.length));
  ok("their ids are A–G",
    FLOW_TEMPLATES.map((t) => t.id).join("") === "ABCDEFG",
    FLOW_TEMPLATES.map((t) => t.id).join(""));

  // THE REASON THE SIX NEW STAGE TYPES EXIST. Before P2 the registry knew
  // fourteen types and the templates named twenty; the six missing ones were
  // exactly contract, change_order, timesheet, job, inspection and payment.
  const missing = templateStageTypes().filter((s) => !stageTypes.includes(s));
  ok("no template names a stage the registry does not have", missing.length === 0, missing.join(","));
}

console.log("== the twenty-five industries resolve to real templates");
{
  const ids = FLOW_TEMPLATES.map((t) => t.id);
  const problems = industryProblems(ids);
  ok("every industry's primary and secondary template exists",
    problems.length === 0, problems.join(" | "));
  ok("there are twenty-five of them", INDUSTRIES.length === 25, String(INDUSTRIES.length));
  ok("keys are unique", new Set(INDUSTRIES.map((i) => i.key)).size === 25);

  // The archetype, spelled out rather than sampled: if this pairing ever moves,
  // it should be because somebody decided to move it.
  ok("construction starts on Template A",
    defaultTemplateFor("construction-and-contracting") === "A",
    defaultTemplateFor("construction-and-contracting"));
  ok("an unknown industry resolves to nothing, not to a guess",
    defaultTemplateFor("nothing-like-this") === "", defaultTemplateFor("nothing-like-this"));
  ok("a secondary may be absent, and reads as empty rather than a dash",
    industryByKey("construction-and-contracting")?.secondary === "",
    JSON.stringify(industryByKey("construction-and-contracting")?.secondary));
}

console.log("== every stage answers to a permission that exists");
{
  // A STAGE WITH AN UNKNOWN PERMISSION IS INVISIBLE, NOT REFUSED. The
  // engagements read layer filters each stage by the right its registry entry
  // declares; a right nobody holds because nobody can hold it filters the stage
  // out of every view, for everyone, silently.
  const known = new Set(ALL_PERMISSIONS);
  const unknown = Object.values(STAGE_REGISTRY)
    .filter((e) => !known.has(e.permission))
    .map((e) => `${e.type}→${e.permission}`);
  ok("no stage declares a permission the catalogue does not contain",
    unknown.length === 0, unknown.join(","));
}

console.log("== no stage is filed under a section that renders nothing");
{
  // INVARIANT 16, APPLIED TO STAGES. The five NO_SCREEN_YET sections hold no
  // rights on purpose — a right nothing can exercise is a bug — so a stage
  // filed under one could never be viewed by anybody. `inspection` is the live
  // case: it belongs to Quality & HSE by subject matter and is filed under
  // Projects until that section has a screen, which its registry entry says.
  const parked = new Set(NO_SCREEN_YET);
  const sectionOfKey = new Map(SECTION_DEFS.map((d) => [d.key, d.parentKey || d.key]));
  const offenders = Object.values(STAGE_REGISTRY)
    .filter((e) => parked.has(sectionOfKey.get(e.sectionKey) || e.sectionKey))
    .map((e) => `${e.type}→${e.sectionKey}`);
  ok("every stage's section has a screen", offenders.length === 0, offenders.join(","));
}

console.log("== the status chain is what makes a deal statusless on purpose");
{
  // LAW 5: there is no status column. Asking a deal for its status walks the
  // template's chain and takes the first stage present, so a chain that names
  // stages the flow does not carry would answer "no status" for every deal in
  // it — which reads as a data problem rather than a template problem.
  const a = templateById("A");
  ok("Template A's chain is project → contract → quotation → ticket",
    a.statusChain.join(">") === "project>contract>quotation>ticket", a.statusChain.join(">"));

  const g = templateById("G");
  ok("Template G has no ticket at all — a recurring contract is not requested",
    !g.stages.includes("ticket") && g.heads.join() === "contract", g.heads.join());

  const f = templateById("F");
  ok("Template F pins shipment to one, because a job file IS one shipment",
    f.cardinalityOverrides.shipment === "one", JSON.stringify(f.cardinalityOverrides));
}

console.log("== Law 4: any stage may fill a blank, overwriting is an argument");
{
  const INTENT = { kind: "stage", objectClass: "intent" };       // a ticket
  const EXEC   = { kind: "stage", objectClass: "execution" };    // a job
  const COMMIT = { kind: "stage", objectClass: "commitment" };   // a contract
  const EDIT   = { kind: "edit" };

  // ENTRY AT ANY POINT IS LOSSLESS, and this is the assertion that says so: a
  // deal opened by a job knows the site; a ticket arriving later teaches it the
  // contact WITHOUT touching the site.
  const opened = contribute(emptyContext(), {}, { site: "Plant 4" }, EXEC);
  ok("a job opens the deal and contributes the site it knows",
    opened.context.site === "Plant 4", opened.context.site);

  const later = contribute(opened.context, opened.provenance, { contact: "Sara" }, INTENT);
  ok("a ticket arriving later fills the contact", later.context.contact === "Sara");
  ok("...and does not disturb the site it knows nothing about",
    later.context.site === "Plant 4", later.context.site);
  ok("filling a blank is not an overwrite",
    later.changes.every((c) => !c.overwrite));

  // PRECEDENCE, INCLUDING THE PART THAT READS BACKWARDS. Execution beats
  // commitment: the site a crew actually went to outranks the one a contract
  // was drafted against.
  const contractSays = contribute(later.context, later.provenance, { site: "Plant 9" }, COMMIT);
  ok("a contract cannot overwrite a site execution established",
    contractSays.context.site === "Plant 4", contractSays.context.site);
  ok("...and the disagreement is reported rather than dropped",
    contractSays.refused.length === 1 && contractSays.refused[0].fact === "site",
    contractSays.refused.map((r) => r.fact + ":" + r.to).join(","));

  const edited = contribute(later.context, later.provenance, { site: "Plant 9" }, EDIT);
  ok("an explicit edit outranks every record", edited.context.site === "Plant 9", edited.context.site);
  ok("...and is marked as an overwrite, which is the audited case",
    edited.changes.some((c) => c.fact === "site" && c.overwrite));

  // EQUAL RANK DOES NOT WIN. Two records of the same class disagreeing cannot
  // be settled by either of them, and letting the later one through would make
  // the answer depend on processing order.
  const tie = contribute(later.context, later.provenance, { contact: "Omar" }, INTENT);
  ok("an equal-ranked record does not overwrite", tie.context.contact === "Sara", tie.context.contact);

  ok("an empty proposal teaches nothing",
    contribute(later.context, later.provenance, { site: "   " }, EDIT).changes.length === 0);
}

console.log("== Law 5: status is walked, never stored");
{
  const A = templateById("A");
  ok("a deal carrying only a ticket reads as a ticket",
    statusStage(A.statusChain, ["ticket"]) === "ticket");
  ok("...and once a project exists, the project speaks for the deal",
    statusStage(A.statusChain, ["ticket", "quotation", "project"]) === "project");
  ok("a deal with nothing on the chain has no status rather than a wrong one",
    statusStage(A.statusChain, ["invoice"]) === "");
}

console.log("== Law 6: money that really happened is detached, not destroyed");
{
  // A payment is a movement that occurred in the world. Deleting the deal it
  // settled must not erase the record of it. The blueprint's vocabulary table
  // says `keep`; this shipped as `cascade` first, which would have destroyed
  // it, and the table is what caught it.
  ok("payment survives its deal", STAGE_REGISTRY.payment.onDelete === "keep",
    STAGE_REGISTRY.payment.onDelete);
  ok("...as do bills and expenses",
    STAGE_REGISTRY.bill.onDelete === "keep" && STAGE_REGISTRY.expense.onDelete === "keep");
  ok("but a contract dies with the deal it bound",
    STAGE_REGISTRY.contract.onDelete === "cascade", STAGE_REGISTRY.contract.onDelete);
}

console.log(fails ? `\n${fails} FAILURES\n` : `\nall passed\n`);
process.exit(fails ? 1 : 0);
