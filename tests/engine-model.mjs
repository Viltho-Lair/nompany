// THE RECORD ENGINE'S DECLARATION RULES, PURELY. No store, no routes.
//
// THE DEFECT THESE GUARD is a tenant-authored shape reaching the store
// unchecked. `tsc` cannot see a type declared in a row, so this file and the
// runtime schema built from it are the ONLY guard — which is why the field
// kinds are a closed set rather than free-form.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/platform/engine/types");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const field = (over) => ({ key: "title", label: "Title", kind: "text", ...over });
const decl = (over) => ({
  key: "transmittal", label: "Transmittals", parentSectionKey: "engineering-docs",
  fields: [field({})], columns: ["title"], statuses: ["Draft", "Issued"],
  transitions: [{ from: "Draft", to: "Issued" }], version: 1, ...over,
});

console.log("\n== a field declaration ==\n");

ok("a known kind is allowed", M.fieldProblem(field({})) === null);
ok("an unknown kind is refused", M.fieldProblem(field({ kind: "geo" })) === "kind");
ok("a field with no key is refused", M.fieldProblem(field({ key: "" })) === "key");
// The key becomes a property name on a stored row and a column on a list.
ok("a key that is not an identifier is refused",
  M.fieldProblem(field({ key: "my field" })) === "key");
ok("a field with no label is refused", M.fieldProblem(field({ label: " " })) === "label");
// A SELECT WITH NO OPTIONS IS A FIELD NOBODY CAN FILL IN.
ok("a select with no options is refused",
  M.fieldProblem(field({ kind: "select", options: [] })) === "options");
ok("...and with options is allowed",
  M.fieldProblem(field({ kind: "select", options: ["A", "B"] })) === null);
// A REFERENCE MUST SAY WHAT IT REFERS TO.
ok("a reference with no target is refused",
  M.fieldProblem(field({ kind: "reference" })) === "reference-target");
ok("...and with one is allowed",
  M.fieldProblem(field({ kind: "reference", refType: "drawing" })) === null);

console.log("\n== a type declaration ==\n");

ok("a complete declaration is allowed", M.typeProblem(decl({}), []) === null);
ok("no key is refused", M.typeProblem(decl({ key: "" }), []) === "key");
// The key lands in a URL segment AND in a permission key, so it is constrained
// to what both accept.
ok("an upper-case key is refused", M.typeProblem(decl({ key: "Transmittal" }), []) === "key");
ok("a dotted key is refused", M.typeProblem(decl({ key: "a.b" }), []) === "key");
ok("a duplicate key is refused",
  M.typeProblem(decl({}), [decl({})]) === "duplicate");
ok("...but editing that same type is not",
  M.typeProblem(decl({}), [decl({})], "transmittal") === null);
ok("no fields is refused", M.typeProblem(decl({ fields: [] }), []) === "fields");
ok("a duplicate field key is refused",
  M.typeProblem(decl({ fields: [field({}), field({})] }), []) === "duplicate-field");
ok("a bad field is reported by its own token",
  M.typeProblem(decl({ fields: [field({ kind: "geo" })] }), []) === "kind");
// A COLUMN THAT NAMES NO FIELD would render an empty list column for ever.
ok("a column naming no field is refused",
  M.typeProblem(decl({ columns: ["nope"] }), []) === "column");
ok("a parent section is required", M.typeProblem(decl({ parentSectionKey: "" }), []) === "parent");
// A TRANSITION TO A STATUS THAT DOES NOT EXIST is unreachable by construction.
ok("a transition naming an unknown status is refused",
  M.typeProblem(decl({ transitions: [{ from: "Draft", to: "Gone" }] }), []) === "transition");

console.log("\n== transitions ==\n");

ok("a declared move is allowed", M.transitionProblem(decl({}), "Draft", "Issued") === null);
// TWO REFUSALS, TWO STATUSES, and the names are the whole of the difference:
// `not-allowed` is 400 by default (no refresh makes Issued → Draft legal) while
// `wrong-state` is 409 in the status table (the declaration is a row, so a
// status it no longer holds is most likely a stale screen). `status` is NOT
// used here — eight modules already spell "you sent a value we do not
// recognise" that way, and it is 400 there.
ok("an undeclared move is refused",
  M.transitionProblem(decl({}), "Issued", "Draft") === "not-allowed");
ok("a move to a status the type does not declare is refused as wrong-state",
  M.transitionProblem(decl({}), "Draft", "Gone") === "wrong-state");

console.log("\n== coercion, which is how a version change stays harmless ==\n");

const d = decl({
  fields: [field({}), field({ key: "count", label: "Count", kind: "number" }),
    field({ key: "done", label: "Done", kind: "boolean" })],
});
const got = M.coerceRecord(d, { title: 7, count: "12", done: "yes", gone: "old value" });
ok("a text field coerces to text", got.title === "7", JSON.stringify(got.title));
ok("a number field coerces to a number", got.count === 12, JSON.stringify(got.count));
ok("a boolean field coerces to a boolean", got.done === true);
// A FIELD REMOVED FROM A TYPE IS NOT DELETED FROM THE ROW. Deleting it would
// destroy the only record of what the row said when somebody signed it.
ok("A REMOVED FIELD IS NOT RENDERED", !("gone" in got));

// NULL-SAFE: a field never filled in reads as its kind's empty value, not as
// undefined, so a list column never renders "undefined".
const empty = M.coerceRecord(d, {});
ok("an unfilled text field is an empty string", empty.title === "");
ok("an unfilled number field is null, not nought",
  empty.count === null, JSON.stringify(empty.count));
ok("an unfilled boolean is false", empty.done === false);

console.log("\n== the section a type plants ==\n");

// IT LIVES IN THE CATALOGUE, not in `platform/engine/sections`, and the move is
// the point: `sectionViewable` has to recognise an engine section to render it
// in the nav, and `platform/access` may not import the engine. One definition,
// on the side both halves can reach.
const S = await import("@/platform/access");
// A SUB-SECTION FALLS BACK TO ITS ROOT WHEN ABSENT, so a record written before
// its section is planted lands under the parent where nothing reads it. The
// tender register paid for that once. The key is derived, never typed.
ok("a type's section key is derived from its own key",
  S.engineSectionKey("transmittal") === "engine-transmittal",
  S.engineSectionKey("transmittal"));
ok("...and is stable", S.engineSectionKey("transmittal") === S.engineSectionKey("transmittal"));

// AND THE WAY BACK, which is what the nav asks. `engineering-docs` is the trap:
// six shared letters, a real section with real areas, and a `startsWith`
// instead of the hyphen would have handed it to the engine — where the answer
// would be `engine.ering-docs.view`, a right nobody holds, and the section
// would vanish from every sidebar in the product.
ok("...and the inverse returns the type key", S.engineTypeKeyOf("engine-transmittal") === "transmittal");
ok("...and empty for a declared section", S.engineTypeKeyOf("engineering-docs") === "");
ok("...and empty for the bare prefix", S.engineTypeKeyOf("engine-") === "");
ok("...and empty for nothing at all", S.engineTypeKeyOf(undefined) === "");

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
