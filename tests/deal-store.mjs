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

} finally {
  const swept = await delPrefix(process.env.NOMPANY_KEY_PREFIX);
  console.log(`\nswept ${swept} rows from "${process.env.NOMPANY_KEY_PREFIX}"`);
}

console.log(fails ? `\n${fails} FAILURES\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
