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
  const { text, params } = buildSelect(SCOPE, "tickets", { where: { status: ["Open", "Won"] } });
  t.equal(/= ANY\(/.test(text), true, "an array reads as one-of");
  // MINOR fix (round 1): this used to assert the SQL shape only, which would
  // pass against a builder that never bound the array at all.
  t.equal(Array.isArray(params[3]) && params[3].join(",") === "Open,Won", true,
    "the array itself reaches params, not just the SQL shape");
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
  // Fix round 1: also coalesces to 0, matching orderBy's `Number(a) || 0` —
  // see testOrderCoalescesMissingNumberToZero's sibling text-order test below
  // for why a bare cast alone was wrong.
  const { text } = buildSelect(SCOPE, "invoices", { order: { field: "total", as: "number", dir: "desc" } });
  t.equal(/COALESCE\(\(payload->>'total'\)::numeric, 0\) DESC/.test(text), true,
    "a numeric sort casts and coalesces a missing field to 0");
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

// ---- fix round 1 -------------------------------------------------------------
// A review of the first version of this file found that its own `{ field: null
// }` comment correctly diagnosed the JSON asymmetry (an ABSENT key gives
// `undefined` in JS; `payload->>'f'` collapses an absent key AND a stored JSON
// null to the same SQL NULL) and then shipped a translation that did not act
// on it. The same blind spot turned up in `nin`, `ne` with a null argument,
// and NULL-ordering. Every test below is written to FAIL against the
// pre-fix-round-1 code — most pointedly the ABSENT-key case specifically
// (not just the "value is JSON null" case), since that half is what was wrong.

export async function testNullRequiresKeyPresent(t) {
  // matchesWhere's `value !== null`: an absent key is `undefined`, and
  // `undefined !== null` is true — so `{ field: null }` must EXCLUDE an
  // absent key and match only a row that is PRESENT with a stored null.
  // Pre-fix, this was a bare `field IS NULL`, true for an absent key too —
  // the exact case this filter exists to tell apart from a present null.
  const { text, params } = buildSelect(SCOPE, "tickets", { where: { closedAt: null } });
  t.equal(/payload->'closedAt' IS NOT NULL AND payload->>'closedAt' IS NULL/.test(text), true,
    "a null filter requires the key present AND its value null, not merely SQL NULL");
  t.equal(params.length, 3, "no parameter is bound — IS NULL/IS NOT NULL take none");
}

export async function testNeUsesIsDistinctFrom(t) {
  // `<>` is UNKNOWN (never true) the instant either side is SQL NULL, which
  // would make "ne" silently exclude a row whose field is simply absent.
  // matchesWhere's `v !== arg` has no such blind spot, and IS DISTINCT FROM is
  // the operator built to agree with it — for a non-null argument (a null
  // argument is its own case, tested separately below).
  const { text, params } = buildSelect(SCOPE, "tickets", { where: { status: { ne: "Closed" } } });
  t.equal(/payload->>'status' IS DISTINCT FROM \$4/.test(text), true, "ne compiles to IS DISTINCT FROM, not <>");
  t.equal(params[3], "Closed", "the excluded value is still a parameter");
}

export async function testNeNullKeepsAnAbsentKey(t) {
  // matchesWhere's `v !== null`: an absent key is `undefined`, and
  // `undefined !== null` is true, so `{ field: { ne: null } }` must KEEP an
  // absent-key row. Pre-fix, `IS DISTINCT FROM NULL` folded absent and
  // explicit-null together (both give SQL NULL from ->>'f'), wrongly
  // excluding it. The fix routes ne:null through the same presence-aware
  // test `{ field: null }` uses, negated.
  const { text, params } = buildSelect(SCOPE, "tickets", { where: { closedAt: { ne: null } } });
  t.equal(/NOT \(payload->'closedAt' IS NOT NULL AND payload->>'closedAt' IS NULL\)/.test(text), true,
    "ne:null negates the presence-and-null test, not IS DISTINCT FROM NULL");
  t.equal(params.length, 3, "no parameter is bound for a null argument");
}

export async function testInNullMemberRequiresKeyPresent(t) {
  // `[null, "2024-01-01"].includes(v)` is true for a row genuinely PRESENT
  // with a stored null, but `= ANY(['null', ...])` (pre-fix: null coerced to
  // the STRING "null" via .map(String)) could never match a real SQL NULL —
  // `NULL = ANY(...)` is never true, whatever the array holds. The null
  // member needs the same presence-and-null test `{ field: null }` uses.
  const { text, params } = buildSelect(SCOPE, "tickets", { where: { closedAt: { in: [null, "2024-01-01"] } } });
  t.equal(/payload->'closedAt' IS NOT NULL AND payload->>'closedAt' IS NULL/.test(text), true,
    "a null member of an `in` array matches only a PRESENT null");
  t.equal(Array.isArray(params[3]) && params[3][0] === "2024-01-01", true,
    "the non-null members still bind through ANY()");
}

export async function testNinKeepsAnAbsentKey(t) {
  // The row's field is simply not there. matchesWhere's
  // `!arg.includes(undefined)` is true for ANY array (a Comparable array
  // never contains undefined), so nin must keep an absent-key row
  // unconditionally. Pre-fix, `NOT (field = ANY($n))` turned an absent field
  // into SQL NULL (three-valued logic: NULL = ANY(...) is NULL, NOT NULL is
  // NULL), which a WHERE clause reads as excluded — the opposite of
  // matchesWhere.
  const { text } = buildSelect(SCOPE, "tickets", { where: { status: { nin: ["Open", "Won"] } } });
  t.equal(/payload->'status' IS NULL/.test(text), true,
    "nin has an explicit absent-key arm (single `->`), not just NOT(field = ANY(...))");
}

export async function testNinExcludesAnExplicitNullOnlyWhenTheArrayHasOne(t) {
  // arg contains null: a present-and-null row must be EXCLUDED (nin has no
  // separate "kept" arm for it in that case), while a present, non-null value
  // absent from the array is still kept via the third arm.
  const { text } = buildSelect(SCOPE, "tickets", { where: { closedAt: { nin: [null, "2024-01-01"] } } });
  t.equal(/payload->>'closedAt' IS NULL/.test(text), false,
    "when the array itself contains null, there is no separate present-and-null KEEP arm");
  t.equal(/payload->'closedAt' IS NULL/.test(text), true, "the absent-key arm is still present");
}

export async function testOrderCoalescesMissingTextToEmptyString(t) {
  // orderBy's default comparator is `String(a ?? "").localeCompare(...)` — a
  // missing field sorts as empty string, not as SQL NULL (which Postgres
  // would otherwise sort last in ASC / first in DESC, disagreeing with "as if
  // it were an empty string").
  const { text } = buildSelect(SCOPE, "clients", { order: "name" });
  t.equal(/COALESCE\(payload->>'name', ''\) COLLATE "und-x-icu"/.test(text), true,
    "a text sort coalesces a missing field to '', matching orderBy's String(a ?? \"\")");
}

export async function testContainsEscapesWildcards(t) {
  // matchesWhere's contains is `.includes(...)` — a literal substring match.
  // ILIKE treats %, _ and its own escape character specially; pre-fix, a
  // client searching for "50%" matched far more than a literal "50%" would.
  const { params } = buildSelect(SCOPE, "clients", { where: { name: { contains: "50%_x\\y" } } });
  t.equal(params[3], "%50\\%\\_x\\\\y%",
    "%, _ and the escape character itself are escaped before being wrapped in the search wildcards");
}

export async function testGtCastsNumericForANumberArgument(t) {
  const { text, params } = buildSelect(SCOPE, "invoices", { where: { total: { gt: 100 } } });
  t.equal(/\(payload->>'total'\)::numeric > \$4/.test(text), true, "a numeric argument casts to numeric");
  t.equal(params[3], 100, "bound as a number");
}

export async function testGtUsesCollateCForAStringArgument(t) {
  // JavaScript's `>` on two strings compares UTF-16 code units — "a" > "B" is
  // true — which is byte order, not localeCompare's locale order. This is the
  // OPPOSITE collation from orderClause's ICU choice: orderBy explicitly
  // calls localeCompare; matchesWhere's gt/gte/lt/lte explicitly do not.
  // Pre-fix, every argument was cast `::numeric`, which would either coerce a
  // reference-number string to NaN or raise a cast error rather than compare
  // it the way JavaScript does.
  const { text, params } = buildSelect(SCOPE, "invoices", { where: { ref: { gt: "INV-100" } } });
  t.equal(/payload->>'ref' COLLATE "C" > \$4/.test(text), true,
    "a string argument compares by code-unit order (COLLATE \"C\"), not ICU, and not numeric");
  t.equal(params[3], "INV-100", "bound as text, not cast to numeric");
}

export async function testGtNullArgumentThrows(t) {
  // Fix round 2: `{ gt: null }` type-checks (Comparable admits null) and is
  // not a near-miss — matchesWhere's raw JS `>` coerces null to 0, so
  // `5 > null` is true, while the string-comparison fallback this used to
  // fall into compares the field's TEXT against the literal "null" and
  // answers a different, unrelated question (a field holding "5" would read
  // as not-greater). Every other unrecognised shape in this file already
  // fails loudly (the unknown-operator default case) rather than guessing —
  // this closes the one case that used to guess instead.
  let threw = null;
  try { buildSelect(SCOPE, "invoices", { where: { total: { gt: null } } }); } catch (e) { threw = e; }
  t.equal(threw instanceof Error, true, "a null argument to gt/gte/lt/lte is refused, not silently mistranslated");
  t.equal(/gt/.test(threw?.message || "") && /null/.test(threw?.message || ""), true,
    "the error names the operator and the reason, not just that it failed");

  for (const op of ["gte", "lt", "lte"]) {
    let alsoThrew = false;
    try { buildSelect(SCOPE, "invoices", { where: { total: { [op]: null } } }); } catch { alsoThrew = true; }
    t.equal(alsoThrew, true, `"${op}" with a null argument is refused too, not just "gt"`);
  }
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
      testNullRequiresKeyPresent,
      testNeUsesIsDistinctFrom,
      testNeNullKeepsAnAbsentKey,
      testInNullMemberRequiresKeyPresent,
      testNinKeepsAnAbsentKey,
      testNinExcludesAnExplicitNullOnlyWhenTheArrayHasOne,
      testOrderCoalescesMissingTextToEmptyString,
      testContainsEscapesWildcards,
      testGtCastsNumericForANumberArgument,
      testGtUsesCollateCForAStringArgument,
      testGtNullArgumentThrows,
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
