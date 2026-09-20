// A SWITCHED-OFF PART'S API DOES NOT ANSWER. Pure, plus a scan of the routes
// off the disk — so a route added this afternoon is covered this afternoon,
// which is the property `tests/routes.mjs` exists for one layer up.
//
// THE DEFECT THIS GUARDS: switching a department off took its screens, its
// widgets and its reads, and left every address underneath it answering. An
// integration, a script or a tab left open since before the switch could still
// write into a department its owner had closed.
//
// TWO WAYS TO BE WRONG, and this file refuses both: an address that belongs to
// a part and is in neither table (so nothing gates it), and one that IS in a
// table but whose route never reaches the gate — because it is hand-written and
// forgot to ask.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const S = await import("@/platform/http/sectionRoutes");
const K = await import("@/platform/db/keys");
const { BUILTIN_TYPES } = await import("@/platform/engine/builtins");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const DIR = "src/app/api/studios/[slug]";

/** Every route file under the studio, as its `<first>/<second>` address. */
function routeFiles(dir = DIR, prefix = []) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) out.push(...routeFiles(path, [...prefix, name]));
    else if (name === "route.ts") out.push({ file: path, segments: prefix });
  }
  return out;
}

const routes = routeFiles();

console.log("\n== which part an address belongs to");

ok("the scan found the studio's routes", routes.length > 100, String(routes.length));
ok("a path outside the studio belongs to nothing", S.switchKeyForPath("/api/me/rating") === "");
ok("the studio root is exempt", S.switchKeyForPath("/api/studios/acme") === "");
ok("a department's own address names it", S.switchKeyForPath("/api/studios/acme/inventory") === "inventory");
ok("a part's address names the part", S.switchKeyForPath("/api/studios/acme/finance/bills") === "finance-payables");
// THE SWITCH, NEVER THE STORAGE: these three are filed under one department and
// worked in another, and the gate must follow the screen.
ok("purchase orders name Procurement → Orders", S.switchKeyForPath("/api/studios/acme/inventory/orders") === "procurement-orders");
ok("air waybills name Logistics → Shipments", S.switchKeyForPath("/api/studios/acme/inventory/awb") === "logistics-shipments");
ok("leave names HR → Leave", S.switchKeyForPath("/api/studios/acme/hr/vacations") === "hr-leave");
// A deeper path is still its part's: `hr/payroll/bank` is Payroll's.
ok("a third segment does not change the answer", S.switchKeyForPath("/api/studios/acme/hr/payroll/bank") === "hr-payroll");
// A dynamic segment is the record it names, not a part of the address.
ok("a record id is not read as a part", S.switchKeyForPath("/api/studios/acme/projects/abc123/costs") === "projects");
ok("an unmapped route under a mapped department falls back to it",
  S.switchKeyForPath("/api/studios/acme/inventory/something-new") === "inventory");
ok("an unmapped route under an exempt department stays exempt",
  S.switchKeyForPath("/api/studios/acme/settings/something-new") === "");

console.log("\n== every section named is one the owner can actually switch");

const keys = new Set([
  ...K.SECTION_DEFS.flatMap((d) => [d.key, ...(d.children || []).map((c) => c.key)]),
  ...BUILTIN_TYPES.map((t) => `engine-${t.key}`),
]);
const named = [...new Set(Object.values(S.SECTION_BY_ROUTE))];
const unknown = named.filter((k) => !keys.has(k));
ok("no address names a section that does not exist", unknown.length === 0, unknown.join(", "));
const filed = named.filter((k) => K.isFiledOnlySection(k));
ok("no address names a filed-only storage row", filed.length === 0, filed.join(", "));
const system = named.filter((k) => K.isSystemSection(k));
ok("no address names Settings — it is never off", system.length === 0, system.join(", "));

console.log("\n== every studio route is mapped or exempt, and reaches the gate");

const unlisted = [];
const ungated = [];
for (const { file, segments } of routes) {
  const key = segments.length
    ? (segments[1] && !segments[1].startsWith("[") ? `${segments[0]}/${segments[1]}` : segments[0])
    : "(root)";
  const department = key.split("/")[0];
  const listed = key in S.SECTION_BY_ROUTE || key in S.EXEMPT_ROUTES
    || department in S.SECTION_BY_ROUTE || department in S.EXEMPT_ROUTES;
  if (!listed) { unlisted.push(key); continue; }

  // A ROUTE IS GATED EITHER BY THE WRAPPER OR BY HAND. `route()` asks for every
  // address it wraps; anything still hand-written has to call the refusal
  // itself, and this is what notices when one does not.
  if (!S.switchKeyForPath(`/api/studios/acme/${segments.join("/")}`)) continue;
  const text = readFileSync(file, "utf8");
  const wrapped = /from "@\/platform\/http\/route"/.test(text) && /\broute\(/.test(text);
  if (!wrapped && !text.includes("sectionOffRefusal")) ungated.push(file.replace(`${DIR}/`, ""));
}
ok("every studio route is in one of the two tables", unlisted.length === 0, [...new Set(unlisted)].join(", "));
ok("every route that belongs to a part reaches the gate", ungated.length === 0, ungated.join(", "));

console.log("\n== the refusal itself");

const rows = [
  { id: "f", key: "finance", parentId: null, enabled: true },
  { id: "fp", key: "finance-payables", parentId: "f", enabled: false },
  { id: "t", key: "tendering", parentId: null, enabled: false },
  { id: "tr", key: "tendering-register", parentId: "t", enabled: true },
];
const asked = (path) => S.sectionOffRefusal(new Request(`http://x${path}`), rows);
ok("a switched-off part refuses", asked("/api/studios/acme/finance/bills")?.status === 404);
ok("…and says which answer it is", Boolean(asked("/api/studios/acme/finance/bills")));
ok("a part under a switched-off department refuses",
  asked("/api/studios/acme/tendering/tenders")?.status === 404);
ok("a part that is on answers", asked("/api/studios/acme/finance/invoices") === null);
ok("an exempt address answers whatever is switched off",
  asked("/api/studios/acme/settings/sections") === null);
// THE WAY BACK ON. Switching a part on is itself an API call, so gating the
// Sections panel's own route would leave a studio unable to undo a switch.
ok("the Sections panel is exempt by name", "settings" in S.EXEMPT_ROUTES);
ok("no sections at all means nothing is off", S.sectionOffRefusal(new Request("http://x/api/studios/acme/finance/bills"), undefined) === null);

// THE WRAPPER ASKS, and it asks before the handler runs: a refusal that arrived
// after a write would be a refusal in name only.
const wrapper = readFileSync("src/platform/http/route.ts", "utf8");
ok("the route wrapper asks the table", /switchKeyForPath\(new URL\(request\.url\)\.pathname\)/.test(wrapper));
ok("…and refuses before the handler",
  wrapper.indexOf("switchKeyForPath") < wrapper.indexOf("await handler(args"));

console.log(fails === 0 ? "\nsection routes model: all passed\n" : `\nsection routes model: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
