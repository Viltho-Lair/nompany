// WHAT A REPOSITORY FILTER CAN ASK POSTGRES TO DO.
//
// THE DEFECT THIS GUARDS: `repo.find({ where })` read the whole collection and
// filtered it in JavaScript, so checking one item's stock read every stock
// movement the studio had ever made — which a till scanning a basket cannot
// afford. Exact text filters now narrow in the database. What is pushed down
// must be a SUPERSET of what the in-memory filter keeps, because the in-memory
// filter still runs afterwards; anything that is not exact text stays in memory.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const { pushableWhere, matchesWhere } = await import("@/platform/db/repo");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log("\n== what is pushed down");
ok("an exact text value", same(pushableWhere({ itemId: "i1" }), { itemId: ["i1"] }));
ok("a list of text values", same(pushableWhere({ itemId: ["i1", "i2"] }), { itemId: ["i1", "i2"] }));
ok("an `in` of text values", same(pushableWhere({ status: { in: ["Open", "Won"] } }), { status: ["Open", "Won"] }));
ok("several fields at once", same(pushableWhere({ a: "x", b: ["y"] }), { a: ["x"], b: ["y"] }));

console.log("\n== what stays in memory");
ok("no filter pushes nothing", pushableWhere(undefined) === null && pushableWhere({}) === null);
ok("a number is not text", pushableWhere({ qty: 5 }) === null);
ok("a list holding a number is not pushed", pushableWhere({ id: ["a", 1] }) === null);
ok("a range is not pushed", pushableWhere({ amount: { gte: 1 } }) === null);
ok("`in` beside another operator is not pushed", pushableWhere({ s: { in: ["a"], ne: "b" } }) === null);
ok("contains is not pushed", pushableWhere({ name: { contains: "acme" } }) === null);
ok("an empty list is not pushed (it would match nothing in SQL)", pushableWhere({ id: [] }) === null);
ok("an undefined part is ignored", same(pushableWhere({ a: undefined, b: "x" }), { b: ["x"] }));
ok("only the text part of a mixed filter is pushed", same(pushableWhere({ itemId: "i1", qty: { gt: 0 } }), { itemId: ["i1"] }));

console.log("\n== the in-memory filter still has the last word");
const rows = [{ id: "1", itemId: "i1", qty: 3 }, { id: "2", itemId: "i1", qty: -1 }, { id: "3", itemId: "i2", qty: 2 }];
const where = { itemId: "i1", qty: { gt: 0 } };
const pushed = pushableWhere(where);
const superset = rows.filter((r) => Object.entries(pushed).every(([f, vs]) => vs.includes(String(r[f]))));
ok("the pushed part keeps both of i1's rows", superset.length === 2);
ok("…and the whole filter then keeps only the one it asked for",
  same(superset.filter((r) => matchesWhere(r, where)).map((r) => r.id), ["1"]));

console.log("\n== the SQL the push-down sends");
// A BIND PARAMETER, NOT A NUMBER. The first version of this query lost the `$`
// before its placeholders to a string-replace, so `payload ->> 4` would have
// read array index 4 of every row and matched nothing — silently, and only
// against a real database. The text is pinned here because nothing without one
// would notice.
const pgSrc = (await import("node:fs")).readFileSync("src/platform/db/pgRows.ts", "utf8");
const fn = pgSrc.slice(pgSrc.indexOf("export async function pgReadColWhere"), pgSrc.indexOf("// PgWriteOpts.announce"));
ok("the key is a text bind parameter", fn.includes("->> $${params.length - 1}::text)"));
ok("the values are a text-array bind parameter", fn.includes("= ANY($${params.length}::text[])"));
ok("the tenant is set by withTenant, as every read of the table must be", fn.includes("withTenant(studioId"));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
