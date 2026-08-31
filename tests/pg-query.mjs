import { register } from "node:module";
import { pathToFileURL } from "node:url";

// SELF-REGISTERING LOADER, same reason and same shape as tests/restructure.mjs:
// this file runs bare (`node tests/pg-query.mjs`) as well as through
// tests/suite.mjs, and pgQuery.ts reaches its sibling with an extensionless
// specifier (`./keys`, house style per CLAUDE.md) that plain Node's ESM
// resolver cannot follow without this hook filling the extension in. Skipped
// under tsx for the identical documented reason: calling register() again from
// inside tsx's own loader thread while it is still evaluating has reproduced a
// deadlock elsewhere in this repo (scripts/migrate/backfill-engagements.mjs).
const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("./loader.mjs", import.meta.url), { data: { root } });
}

// Dynamic, not static — a static `import` is resolved before ANY module-level
// code runs (including the register() call above), which is exactly what
// leaves it too early to see the hook.
const { buildSelect, buildCount } = await import("../src/platform/db/pgQuery.ts");

const SCOPE = { studioId: "st_1", sectionId: "sec_1" };

// NO DATABASE ANYWHERE IN THIS FILE. buildSelect/buildCount are pure — they
// hand back { text, params } and run no query — which is what makes this
// suite provable before a Cloud SQL instance exists at all.

export async function testExactMatch(t) {
  const { text, params } = buildSelect(SCOPE, "tickets", { where: { status: "Open" } });
  t.equal(/payload->>'status' = \$4/.test(text), true, "an exact match is an equality on the extracted field");
  t.equal(params[3], "Open", "the value is a parameter, never interpolated");
}

export async function testUndefinedIsIgnoredNotMatched(t) {
  const { text } = buildSelect(SCOPE, "tickets", { where: { status: undefined, kind: "x" } });
  t.equal(/status/.test(text), false, "an undefined filter contributes no clause");
}

export async function testArrayMeansOneOf(t) {
  const { text } = buildSelect(SCOPE, "tickets", { where: { status: ["Open", "Won"] } });
  t.equal(/= ANY\(/.test(text), true, "an array reads as one-of");
}

export async function testContainsIsCaseInsensitive(t) {
  const { text, params } = buildSelect(SCOPE, "clients", { where: { name: { contains: "acme" } } });
  t.equal(/ILIKE/.test(text), true, "contains is a case-insensitive substring");
  t.equal(params[3], "%acme%", "wrapped in wildcards as a parameter");
}

export async function testTextOrderUsesAnIcuCollation(t) {
  // localeCompare is the JavaScript default and 47 of 51 service sorts rely on
  // it. A bare ORDER BY disagrees with it on any non-ASCII string, which in a
  // bilingual EN/AR product means Arabic client names sort differently.
  const { text } = buildSelect(SCOPE, "clients", { order: "name" });
  t.equal(/COLLATE "und-x-icu"/.test(text), true, "text ordering is ICU, matching localeCompare");
}

export async function testNumberOrderCasts(t) {
  const { text } = buildSelect(SCOPE, "invoices", { order: { field: "total", as: "number", dir: "desc" } });
  t.equal(/\(payload->>'total'\)::numeric DESC/.test(text), true, "a numeric sort casts");
}

export async function testOrderIsMadeTotal(t) {
  const { text } = buildSelect(SCOPE, "clients", { order: "name" });
  t.equal(/payload->>'id'/.test(text.split("ORDER BY")[1]), true,
    "id is the stable tiebreak, so a page boundary cannot repeat a row");
}

export async function testDefaultOrderIsNewestFirst(t) {
  const { text } = buildSelect(SCOPE, "tickets", {});
  t.equal(/ORDER BY seq DESC/.test(text), true, "no order means readCol's order");
}

export async function testUnknownOperatorThrows(t) {
  let threw = false;
  try { buildSelect(SCOPE, "tickets", { where: { x: { like: "y" } } }); } catch { threw = true; }
  t.equal(threw, true, "an unknown operator is refused, exactly as matchesWhere refuses it");
}

// ---- coverage beyond the brief's nine: the fixes made while translating -----
// matchesWhere and orderBy (see pgQuery.ts's own comments on `ne` and on
// `{ field: null }`) are exercised here so a later refactor cannot quietly
// regress a case the brief's own list did not happen to cover.

export async function testNullMeansIsNull(t) {
  // A bare `= NULL` is never true in SQL for any row, which would silently
  // turn "field is null" into "match nothing" — the honest translation is
  // IS NULL, and it must take no parameter slot (there is nothing to bind).
  const { text, params } = buildSelect(SCOPE, "tickets", { where: { closedAt: null } });
  t.equal(/payload->>'closedAt' IS NULL/.test(text), true, "a null filter becomes IS NULL");
  t.equal(params.length, 3, "IS NULL binds no extra parameter");
}

export async function testNeUsesIsDistinctFrom(t) {
  // `<>` is UNKNOWN (never true) the instant either side is SQL NULL, which
  // would make "ne" silently exclude a row whose field is simply absent.
  // matchesWhere's `v !== arg` has no such blind spot, and IS DISTINCT FROM is
  // the operator built to agree with it.
  const { text, params } = buildSelect(SCOPE, "tickets", { where: { status: { ne: "Closed" } } });
  t.equal(/payload->>'status' IS DISTINCT FROM \$4/.test(text), true, "ne compiles to IS DISTINCT FROM, not <>");
  t.equal(params[3], "Closed", "the excluded value is still a parameter");
}

export async function testCountMirrorsSelectsWhereClause(t) {
  // buildCount shares whereClauses with buildSelect — the same filter must
  // produce the same predicate, or a list screen's count and its rows could
  // disagree about which rows qualify.
  const { text, params } = buildCount(SCOPE, "tickets", { where: { status: "Open" } });
  t.equal(/^SELECT count\(\*\)::int AS n FROM/.test(text), true, "count selects a scalar, not rows");
  t.equal(/payload->>'status' = \$4/.test(text), true, "count applies the identical WHERE translation");
  t.equal(params[3], "Open", "and the identical parameter binding");
}

export async function testScopeAndCollectionAreAlwaysParameterised(t) {
  // tenant_id/section_id/collection gate every row this table will ever hold
  // (defence in depth alongside RLS) — they must never be interpolated, only
  // ever bound as $1/$2/$3.
  const { text, params } = buildSelect(SCOPE, "tickets", {});
  t.equal(/tenant_id = \$1 AND section_id = \$2 AND collection = \$3/.test(text), true,
    "scope and collection are parameterised, never inlined");
  t.equal(params[0] === "st_1" && params[1] === "sec_1" && params[2] === "tickets", true,
    "in that exact order");
}

export async function testLimitIsTheLastParameter(t) {
  const { text, params } = buildSelect(SCOPE, "tickets", { where: { status: "Open" }, limit: 10 });
  t.equal(text.trim().endsWith(`LIMIT $${params.length}`), true, "LIMIT binds the final parameter");
  t.equal(params[params.length - 1], 10, "and it is the value passed in");
}

// ---- harness ----------------------------------------------------------------
// Same non-throwing, accumulate-and-report shape as tests/suite.mjs's own
// ok() and tests/restructure.mjs's makeHarness() — one bad assertion must not
// hide the rest.
function makeHarness() {
  let fails = 0;
  return {
    equal(actual, expected, message = "") {
      const cond = actual === expected;
      if (!cond) fails += 1;
      console.log(
        `${cond ? "  ok  " : " FAIL "} ${message}` +
        (cond ? "" : `  — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`),
      );
    },
    get fails() { return fails; },
  };
}

// import.meta.url is a file:// URL on every platform, but
// `file://${process.argv[1]}` is POSIX-only: on Windows argv[1] is a
// backslashed path (e.g. C:\...), so the naive template never matches and the
// runner silently no-ops. pathToFileURL(...).href normalises both sides.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    const tests = [
      testExactMatch,
      testUndefinedIsIgnoredNotMatched,
      testArrayMeansOneOf,
      testContainsIsCaseInsensitive,
      testTextOrderUsesAnIcuCollation,
      testNumberOrderCasts,
      testOrderIsMadeTotal,
      testDefaultOrderIsNewestFirst,
      testUnknownOperatorThrows,
      testNullMeansIsNull,
      testNeUsesIsDistinctFrom,
      testCountMirrorsSelectsWhereClause,
      testScopeAndCollectionAreAlwaysParameterised,
      testLimitIsTheLastParameter,
    ];
    let totalFails = 0;
    for (const test of tests) {
      console.log(`\n== ${test.name}`);
      const t = makeHarness();
      await test(t);
      totalFails += t.fails;
    }
    console.log(totalFails ? `\n${totalFails} FAILURES\n` : "\nall passed\n");
    process.exit(totalFails ? 1 : 0);
  })().catch((e) => { console.error(e); process.exit(1); });
}
