// ENGINE PERMISSION KEYS, PURELY.
//
// THE DEFECT THIS GUARDS IS SILENT. `cleanPermissions` filters every stored
// permission through `isPermission`, which is `KNOWN.has(key)` over the
// compile-time catalogue — "a permission the product does not recognise cannot
// be stored". So before this change a role granting an engine key had it
// dropped with no error and no log: a right that never arrives.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/platform/access/catalogue");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

ok("an engine key is a permission", M.isPermission("engine.transmittal.view"));
ok("...for every verb",
  ["view", "create", "edit", "delete"].every((v) => M.isPermission(`engine.transmittal.${v}`)));
// THE ASSERTION THIS TASK EXISTS FOR.
ok("AN ENGINE KEY SURVIVES cleanPermissions",
  M.cleanPermissions(["engine.transmittal.view"]).length === 1,
  JSON.stringify(M.cleanPermissions(["engine.transmittal.view"])));
ok("...alongside a static key",
  M.cleanPermissions(["projects.list.view", "engine.transmittal.edit"]).length === 2);

// The namespace is what keeps it from colliding with the declared areas.
ok("a verb outside the four is refused", !M.isPermission("engine.transmittal.approve"));
ok("a bare engine key is refused", !M.isPermission("engine.transmittal"));
ok("an empty type key is refused", !M.isPermission("engine..view"));
ok("a nested type key is refused", !M.isPermission("engine.a.b.view"));
ok("nonsense is still refused", !M.isPermission("engine"));
ok("an unknown static key is still refused", !M.isPermission("projects.madeup.view"));
// engineeringDocs is ADJACENT and must not be swept in.
ok("engineeringDocs is not an engine key", !M.isEnginePermission("engineeringDocs.register.view"));
ok("...and is still a real permission", M.isPermission("engineeringDocs.register.view"));

// THE CATALOGUE DOES NOT GROW. Engine keys are structural, not declared, so the
// 177-key assertion in Gate A must not move.
ok("the declared catalogue is unchanged at 181",
  M.ALL_PERMISSIONS.length === 181, String(M.ALL_PERMISSIONS.length));
ok("...and contains no engine key",
  !M.ALL_PERMISSIONS.some((k) => k.startsWith("engine.")));

// AND THE SECTION HALF OF THE NAMESPACE, which was guarded only by prose. The
// line above stops an AREA keyed `engine` being declared; nothing stopped a
// SECTION key beginning `engine-`, and `sectionViewable` answers those from
// `engine.<rest>.view`. Declare `engine-audit` today and it is invisible to
// every granted member, visible to the owner (whose wildcard matches the
// shape), and nothing fails — the quietest possible way to lose a section.
const K = await import("@/platform/db/keys");
ok("no declared section key begins with the engine's prefix",
  !K.ALL_SECTION_KEYS.some((k) => /^engine-/.test(k)),
  K.ALL_SECTION_KEYS.filter((k) => /^engine-/.test(k)).join(","));
// `engineering-docs` is the adjacent one, and it must survive the check above.
ok("...and engineering-docs is still a declared section",
  K.ALL_SECTION_KEYS.includes("engineering-docs"));

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
