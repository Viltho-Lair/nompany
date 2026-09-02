// THE DEAL CONTAINER, AGAINST THE REAL DATABASE.
//
// tests/engagement-model.mjs proves the RULES — pure functions over the
// registry, the templates and the industry map, with no store in sight. This
// file proves the part that only a database can answer: that a derived id
// resolves through an alias to a real root, that a contribution actually
// persists, and that two of them arriving at once do not discard each other.
//
// The distinction matters because the first bug this file caught was invisible
// to the pure tests: contributeContext computed its changes correctly, reported
// them to the caller, and wrote nothing — editJSON treats an outcome with no
// `next` as a read, so it succeeded and persisted nothing.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

const SESSION = process.env.NOMPANY_TEST_SESSION ? `${process.env.NOMPANY_TEST_SESSION}_` : "";
process.env.NOMPANY_KEY_PREFIX = process.env.NOMPANY_KEY_PREFIX || `test_${SESSION}deal_`;

const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  register(new URL("./loader.mjs", import.meta.url),
    { data: { root: pathToFileURL(`${process.cwd()}/`).href } });
}

try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI supplies the environment directly */ }

// SKIPS LOUDLY, the same shape pg-parity.mjs uses. A run without a database is
// a run where these paths are NOT verified, and saying so is the difference
// between a skip and a silent pass.
if (!process.env.DATABASE_URL) {
  console.warn("\nDATABASE_URL is not set — SKIPPING every deal-store test in this file.");
  console.log("  ok   skipped — the deal store needs a live Postgres\n");
  process.exit(0);
}

const E = await import("@/platform/db/engagement");
const { delPrefix } = await import("@/platform/db/store");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? `  — ${extra}` : ""}`);
};

const S = `std_dealstore_${Math.random().toString(36).slice(2, 8)}`;

try {
  console.log("== a derived id resolves to the deal, and never re-roots it");
  const deal = await E.createEngagement(S, { ref: "D-1" });
  ok("a deal opens with a permanent id", Boolean(deal.id), deal.id);

  await E.setDealAlias(S, "eng_derived", deal.id);
  ok("a derived id resolves to the real deal",
    (await E.resolveDealId(S, "eng_derived")) === deal.id);
  ok("an id with no alias resolves to itself",
    (await E.resolveDealId(S, "eng_unknown")) === "eng_unknown");

  // REPOINTING IS A MERGE, NOT AN ALIAS EDIT. An alias silently changing target
  // means every record that resolved through it yesterday belongs to a
  // different deal today, with nothing recording that it moved.
  let threw = "";
  try { await E.setDealAlias(S, "eng_derived", "eng_somewhere_else"); }
  catch (e) { threw = e.message; }
  ok("repointing an alias at a different deal is refused",
    threw.includes("cannot be repointed"), threw.slice(0, 60));

  console.log("== a contribution reaches the root, through the alias");
  const first = await E.contributeContext(S, "eng_derived",
    { site: "Plant 4", contact: "Sara" }, { kind: "stage", objectClass: "execution" });
  ok("a stage contributes the facts it knows", first?.changes.length === 2, String(first?.changes.length));
  ok("...and they persist on the deal the alias pointed at",
    (await E.readEngagement(S, deal.id))?.context.site === "Plant 4",
    String((await E.readEngagement(S, deal.id))?.context.site));

  console.log("== precedence survives the round trip");
  const beaten = await E.contributeContext(S, deal.id, { site: "Plant 9" },
    { kind: "stage", objectClass: "commitment" });
  ok("a commitment cannot overwrite what execution established",
    beaten?.refused.length === 1 && beaten?.changes.length === 0);
  ok("...and the stored value did not move",
    (await E.readEngagement(S, deal.id))?.context.site === "Plant 4");

  const edited = await E.contributeContext(S, deal.id, { site: "Plant 9" }, { kind: "edit" });
  ok("an explicit edit outranks it and is flagged as an overwrite",
    Boolean(edited?.changes.some((c) => c.fact === "site" && c.overwrite)));
  ok("...and that one persisted",
    (await E.readEngagement(S, deal.id))?.context.site === "Plant 9");
  ok("provenance is stored beside the facts, not inside them",
    Boolean((await E.readEngagement(S, deal.id))?.provenance?.site));

  console.log("== two stages contributing at once do not discard each other");
  // THE REASON contributeContext USES A COMPARE-AND-SET. A read-modify-write
  // of the whole root loses whichever contribution lost the race, silently —
  // and the symptom is a deal that is simply missing a fact somebody watched
  // a record supply.
  const facts = ["title", "urgency", "deadline", "contact"];
  await Promise.all(facts.map((f, i) =>
    E.contributeContext(S, deal.id, { [f]: `v${i}` }, { kind: "stage", objectClass: "intent" })));
  const final = await E.readEngagement(S, deal.id);
  const landed = facts.filter((f) => final?.context[f]);
  ok("every concurrent contribution lands", landed.length === facts.length,
    `${landed.length}/${facts.length}`);

  console.log("== the template narrows cardinality, and attach enforces it");
  // TEMPLATE F: a logistics job file IS one shipment. `shipment` is `many` in
  // the registry and in every other flow, so this is the case that proves the
  // template is consulted at all — before this, attachRecord read the registry
  // alone and a job file would take a second shipment without complaint.
  const jobFile = await E.createEngagement(S, { ref: "F-1" });
  await E.setDealTemplate(S, jobFile.id, "F");
  await E.attachRecord(S, jobFile.id, "shipment", "shp_1");
  ok("the first shipment attaches to a job file", true);

  let refused = "";
  try { await E.attachRecord(S, jobFile.id, "shipment", "shp_2"); }
  catch (e) { refused = e.message; }
  ok("a second shipment on a job file is refused", refused.includes("attach-refused"), refused.slice(0, 70));
  ok("...and the refusal says why, in words somebody could act on",
    refused.includes("already has a shipment"), refused.slice(0, 90));
  ok("...and the second one did not land",
    (await E.listMembers(S, jobFile.id, "shipment")).length === 1);

  // The same type, on a template that does not narrow it.
  const project = await E.createEngagement(S, { ref: "A-1" });
  await E.setDealTemplate(S, project.id, "A");
  await E.attachRecord(S, project.id, "shipment", "shp_3");
  await E.attachRecord(S, project.id, "shipment", "shp_4");
  ok("two shipments attach to a contracting deal, where the flow allows many",
    (await E.listMembers(S, project.id, "shipment")).length === 2);

  console.log("== attaching through an alias lands on the real deal");
  await E.setDealAlias(S, "eng_derived_for_attach", project.id);
  await E.attachRecord(S, "eng_derived_for_attach", "invoice", "inv_1");
  ok("a record attached by a derived id is a member of the real deal",
    (await E.listMembers(S, project.id, "invoice")).includes("inv_1"));
  ok("...and its reverse pointer names the real deal, not the alias",
    (await E.engagementOf(S, "invoice", "inv_1")) === project.id,
    String(await E.engagementOf(S, "invoice", "inv_1")));

  console.log("== Law 7 holds at the door: a cost attaches to any deal");
  await E.attachRecord(S, jobFile.id, "expense", "exp_1");
  ok("an expense attaches to a job file whose template never lists it",
    (await E.listMembers(S, jobFile.id, "expense")).includes("exp_1"));

  let unknown = "";
  try { await E.attachRecord(S, jobFile.id, "nonsense", "x_1"); }
  catch (e) { unknown = e.message; }
  ok("an unregistered type is the one thing refused outright",
    unknown.includes("unknown-stage"), unknown);


  console.log("== Law 7: the pen holds what has no deal yet, visibly");
  await E.parkUnassigned(S, "expense", "exp_loose");
  ok("a cost with no deal is parked rather than lost",
    (await E.listUnassigned(S, "expense")).includes("exp_loose"));
  ok("...and answers that it belongs to the pen, not to nothing",
    (await E.engagementOf(S, "expense", "exp_loose")) === "__unassigned",
    String(await E.engagementOf(S, "expense", "exp_loose")));

  let parkRefused = "";
  try { await E.parkUnassigned(S, "contract", "con_loose"); }
  catch (e) { parkRefused = e.message; }
  ok("a contract cannot be parked — it would be a contract to nothing",
    parkRefused.includes("park-refused"), parkRefused.slice(0, 70));

  console.log("== promotion moves membership and never rewrites the record");
  await E.promote(S, "expense", "exp_loose", project.id);
  ok("the promoted cost is a member of the deal",
    (await E.listMembers(S, project.id, "expense")).includes("exp_loose"));
  ok("...and is gone from the pen",
    !(await E.listUnassigned(S, "expense")).includes("exp_loose"));
  ok("...and its reverse pointer moved with it",
    (await E.engagementOf(S, "expense", "exp_loose")) === project.id);

  // PROMOTION RESPECTS THE DESTINATION'S SHAPE. Before this, promote validated
  // nothing, so a side entrance could create the exact state attachRecord
  // refuses at the front door.
  await E.parkUnassigned(S, "task", "task_loose");
  await E.promote(S, "task", "task_loose", "eng_derived_for_attach");
  ok("promoting through an alias lands on the real deal",
    (await E.listMembers(S, project.id, "task")).includes("task_loose"));

  // A TYPE THAT WAS NEVER PARKABLE CANNOT BE PROMOTED, and this is the refusal
  // that actually fires. I first asserted the destination-cardinality case here
  // — promoting a second shipment into a job file — and it refused for a
  // different and better reason: a shipment cannot sit in the pen at all, so it
  // was never there to promote.
  //
  // Which makes the cardinality check in promote() DEFENSIVE rather than
  // reachable today: the four parkable types are all `many` in the registry and
  // no built-in template narrows any of them. It stays because a tenant flow
  // editor can narrow one, and the day it does, a promotion must not be the
  // side entrance that creates the state attachRecord refuses at the front.
  let promoteRefused = "";
  try { await E.promote(S, "shipment", "shp_5", jobFile.id); }
  catch (e) { promoteRefused = e.message; }
  ok("promoting a type that could never have been in the pen is refused",
    promoteRefused.includes("promote-refused") && promoteRefused.includes("never in the pen"),
    promoteRefused.slice(0, 85));


  console.log("== a deal minted from a descriptor OWNS the facts it opened with");
  {
    // THE BUG THIS GUARDS, seen live before it was fixed: a ticket opens a deal
    // through applyDescriptor (the path createTicket, the internal-quotation
    // mint and the backfill all share), and applyDescriptor wrote `context`
    // with NO `provenance` beside it. Every fact therefore sat at rank 0, so
    // the first later record of ANY class won every argument — a lump-sum
    // contract (commitment, 20) replaced the title and the deadline that the
    // ticket (intent, 40) had opened the deal with. Law 4 could not stop it,
    // because the ranks it compares against had never been recorded.
    const engId = "eng_descr_own";
    await E.applyDescriptor(S, {
      engId, ref: "OWN-1",
      context: { title: "Cold store extension", deadline: "2026-11-15", urgency: "Normal" },
      singletons: { ticket: "sal_own_1", approvedQuotation: null, project: null },
      members: {},
    });

    const seeded = await E.readEngagement(S, engId);
    ok("the opening facts are owned at the head record's class, not left at zero",
      seeded?.provenance?.title === 40 && seeded?.provenance?.deadline === 40,
      JSON.stringify(seeded?.provenance));

    const beaten = await E.contributeContext(S, engId,
      { title: "Contract title", deadline: "2027-06-30" },
      { kind: "stage", objectClass: "commitment" });
    ok("a commitment cannot overwrite what an intent record opened the deal with",
      beaten?.refused.length === 2 && beaten?.changes.length === 0,
      JSON.stringify({ refused: beaten?.refused.length, changes: beaten?.changes.length }));
    const after = await E.readEngagement(S, engId);
    ok("...and the deal still reads the ticket's title and deadline",
      after?.context.title === "Cold store extension" && after?.context.deadline === "2026-11-15",
      JSON.stringify({ title: after?.context.title, deadline: after?.context.deadline }));

    // RE-APPLYING MUST NOT DESTROY WHAT IT DOES NOT OWN. The write was a blind
    // whole-root setJSON whose object has no templateId and no provenance
    // field, so re-running the reconciler over a deal that had since been
    // given a template, or contributed to, erased both — silently, and the
    // deal went back to walking Template A with unowned facts.
    await E.setDealTemplate(S, engId, "B");
    await E.contributeContext(S, engId, { site: "Yard 2" }, { kind: "edit" });
    await E.applyDescriptor(S, {
      engId, ref: "OWN-1",
      context: { title: "Cold store extension", deadline: "2026-11-15", urgency: "Normal" },
      singletons: { ticket: "sal_own_1", approvedQuotation: null, project: null },
      members: {},
    });
    const reapplied = await E.readEngagement(S, engId);
    ok("a re-apply keeps the template the deal was given",
      reapplied?.templateId === "B", String(reapplied?.templateId));
    ok("...and keeps a person's explicit edit, which outranks any reconciler",
      reapplied?.context.site === "Yard 2" && reapplied?.provenance?.site === 100,
      JSON.stringify({ site: reapplied?.context.site, rank: reapplied?.provenance?.site }));
  }

  console.log("== Law 4's other half: every overwrite leaves a trace");
  {
    const audit = await import("@/platform/http/audit");
    const auditDeal = await E.createEngagement(S, { ref: "AUD-1" });

    const cursor = await audit.latestId(S);

    // FILLING A BLANK IS NOT AUDITED. It happens constantly as work reveals
    // what it knows, and recording it would bury the overwrites — the rare,
    // arguable events this trail exists to hold — under thousands of routine ones.
    await E.contributeContext(S, auditDeal.id, { site: "Plant 4", contact: "Sara" },
      { kind: "stage", objectClass: "execution" }, { actor: "col_1", actorType: "collaborator" });
    ok("filling two blanks writes no audit entries",
      (await audit.since(S, cursor, 100)).length === 0,
      String((await audit.since(S, cursor, 100)).length));

    // A refused overwrite is a disagreement, not an act — the caller is told,
    // the trail is not.
    await E.contributeContext(S, auditDeal.id, { site: "Plant 9" },
      { kind: "stage", objectClass: "commitment" }, { actor: "col_1", actorType: "collaborator" });
    ok("a REFUSED overwrite writes nothing either",
      (await audit.since(S, cursor, 100)).length === 0);

    // The act that Law 4 calls explicit and audited.
    await E.contributeContext(S, auditDeal.id, { site: "Plant 9", contact: "Omar" },
      { kind: "edit" }, { actor: "col_7", actorType: "collaborator", requestId: "req_abc" });
    const entries = await audit.since(S, cursor, 100);
    ok("two overwrites write two entries — one per fact, not one per contribution",
      entries.length === 2, String(entries.length));
    ok("...naming the deal and the fact that changed",
      entries.every((e) => e.subject.startsWith(`${auditDeal.id}:`)) &&
      entries.map((e) => e.subject.split(":").pop()).sort().join(",") === "contact,site",
      entries.map((e) => e.subject.split(":").pop()).join(","));
    ok("...the actor who did it", entries.every((e) => e.actor === "col_7"), entries[0]?.actor);
    ok("...and tied to the request it arrived on", entries[0]?.requestId === "req_abc");
    ok("an explicit edit is named as one, not as a stage overwrite",
      entries.every((e) => e.action === "EDIT deal-context"), entries[0]?.action);

    // NO VALUES IN THE ENTRY. The trail refuses request bodies because they
    // carry PII, and a deal's contact and site are exactly that.
    ok("the entry carries no values — a site and a contact are PII",
      !JSON.stringify(entries).includes("Plant 9") && !JSON.stringify(entries).includes("Omar"));
  }


  console.log("== Law 2: a studio owns its flows, and edits are overrides");
  {
    const F = await import("@/platform/db/flows");

    ok("a fresh studio sees the seven built-ins",
      (await F.listFlowTemplates(S)).length === 7, String((await F.listFlowTemplates(S)).length));
    ok("...and the twenty-five industries",
      (await F.listIndustries(S)).length === 25, String((await F.listIndustries(S)).length));

    // A CLONE IS A NEW ID; AN EDIT REUSES ONE. Same storage, and the difference
    // is only whether a seed exists underneath.
    await F.saveFlowTemplate(S, {
      id: "A", name: "Contracting (ours)",
      stages: ["ticket", "quotation", "project", "invoice"],
      heads: ["ticket"], statusChain: ["project", "quotation", "ticket"],
      billingTrigger: "progress", costDrivers: ["expense"], cardinalityOverrides: {},
    });
    ok("editing a built-in does not add a template", (await F.listFlowTemplates(S)).length === 7);
    ok("...and the edit is what the studio now reads",
      (await F.getFlowTemplate(S, "A"))?.name === "Contracting (ours)",
      (await F.getFlowTemplate(S, "A"))?.name);
    ok("...while the other six are untouched built-ins",
      (await F.getFlowTemplate(S, "G"))?.name === "Recurring Contract");

    // THE POINT OF STORING OVERRIDES RATHER THAN A FULL COPY: another studio is
    // unaffected, and still gets the built-in.
    const OTHER = `${S}_other`;
    ok("another studio still sees the original", (await F.getFlowTemplate(OTHER, "A"))?.name === "Contracting / Project");

    await F.saveFlowTemplate(S, {
      id: "H", name: "Our own flow",
      stages: ["ticket", "job", "invoice"], heads: ["ticket"],
      statusChain: ["job", "ticket"], billingTrigger: "signoff",
      costDrivers: ["timesheet"], cardinalityOverrides: {},
    });
    ok("a clone appends an eighth", (await F.listFlowTemplates(S)).length === 8);

    // REFUSED ON WRITE, because every one of these is invisible at runtime.
    const bad = [
      [{ id: "X", name: "x", stages: ["ticket", "nonsense"], heads: ["ticket"], statusChain: ["ticket"], billingTrigger: "progress", costDrivers: [], cardinalityOverrides: {} }, "not a registry type"],
      [{ id: "X", name: "x", stages: ["ticket"], heads: ["job"], statusChain: ["ticket"], billingTrigger: "progress", costDrivers: [], cardinalityOverrides: {} }, "not one of its own stages"],
      [{ id: "X", name: "x", stages: ["ticket"], heads: ["ticket"], statusChain: ["project"], billingTrigger: "progress", costDrivers: [], cardinalityOverrides: {} }, "which it does not use"],
    ];
    for (const [tpl, expected] of bad) {
      let msg = "";
      try { await F.saveFlowTemplate(S, tpl); } catch (e) { msg = e.message; }
      ok(`a template with a ${expected.split(" ").slice(0, 3).join(" ")} problem is refused`,
        msg.includes("flow-template-refused") && msg.includes(expected), msg.slice(0, 80));
    }

    // AN INDUSTRY IS CHECKED AGAINST THIS STUDIO'S TEMPLATES, not the built-ins.
    await F.saveIndustry(S, { key: "pearl-diving", name: "Pearl Diving", primary: "H", secondary: "", note: "ours" });
    ok("an industry may point at a template this studio invented",
      await F.defaultTemplateForStudio(S, "pearl-diving") === "H");
    ok("...and the seeded twenty-five are still there", (await F.listIndustries(S)).length === 26);

    let indMsg = "";
    try { await F.saveIndustry(S, { key: "x", name: "X", primary: "ZZ", secondary: "", note: "" }); }
    catch (e) { indMsg = e.message; }
    ok("an industry pointing at a template that does not exist is refused",
      indMsg.includes("industry-refused"), indMsg.slice(0, 70));

    // DELETING AN OVERRIDE REVERTS TO THE SEED; deleting a clone removes it.
    ok("dropping an edit reverts to the built-in",
      (await F.deleteFlowTemplate(S, "A")) &&
      (await F.getFlowTemplate(S, "A"))?.name === "Contracting / Project");
    // WHICH FLOW A DEAL WALKS — the precedence, asserted in one place because it
    // now has two callers. The deal screen resolves one deal and pays for the
    // industry lookup only when it must; the settings usage scan resolves
    // hundreds and reads every industry once. They agree only because they share
    // pickTemplate: two copies of this order would mean the screen showing one
    // flow while the warning counted deals against another.
    const all = await F.listFlowTemplates(S);
    ok("a deal that names its own template gets it",
      F.pickTemplate(all, "G", "B")?.id === "G");
    ok("...one that does not falls to its industry's default",
      F.pickTemplate(all, "", "B")?.id === "B");
    ok("...and one with neither falls to A, never to nothing",
      F.pickTemplate(all, "", "")?.id === "A");
    ok("a templateId naming a flow this studio deleted does not win",
      F.pickTemplate(all, "ZZ", "B")?.id === "B");

    // BOTH SPELLINGS OF THE INDUSTRY FACT. The backfill writes `industry`; the
    // later context layer writes `industryRef`. Reading only the newer name made
    // the industry branch dead code on every deal it exists to serve.
    ok("the industry is read under the name the backfill wrote",
      F.industryKeyOf({ industry: "manufacturing" }) === "manufacturing");
    ok("...and under the name the context layer writes",
      F.industryKeyOf({ industryRef: "mining-and-quarrying" }) === "mining-and-quarrying");
    ok("...with the newer name winning when a deal carries both",
      F.industryKeyOf({ industry: "old", industryRef: "new" }) === "new");

    ok("dropping a clone removes it entirely",
      (await F.deleteFlowTemplate(S, "H")) && (await F.getFlowTemplate(S, "H")) === null);
  }

} finally {
  const swept = await delPrefix(process.env.NOMPANY_KEY_PREFIX);
  console.log(`\nswept ${swept} rows from "${process.env.NOMPANY_KEY_PREFIX}"`);
}

console.log(fails ? `\n${fails} FAILURES\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
