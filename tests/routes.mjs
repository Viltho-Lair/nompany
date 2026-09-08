// EVERY API ROUTE, CALLED ONCE.
//
// WHAT THIS REPLACES, AND WHY IT ASKS A DIFFERENT QUESTION. Gate A pinned 379
// full response bodies. That caught unintended change — a field appearing on a
// list nobody was looking at — and it cost twelve minutes and a re-record of
// sixteen files every time a section was added. This asks a smaller question of
// a wider surface: does every route answer at all, and does it ask who you are
// before it answers?
//
// THE LIST IS DERIVED FROM THE FILESYSTEM, never typed out. A route added this
// afternoon is covered this afternoon with nobody remembering to add it, which
// is the one property a hand-kept list cannot have. `tests/restructure.mjs`
// reads its lists out of the source for the same reason.
//
// THREE CALLERS, THREE INVARIANTS:
//   signed out  the route asks who you are before doing anything (invariant 4)
//   outsider    a slug is a public address and never authorises (invariant 2)
//   owner       the route actually works — no 500, no throw on import
//
// WRITES ARE NOT CALLED HERE. A POST needs a body that means something; a
// generic one either fails validation, proving nothing, or writes rubbish into
// the fixture the next case reads. `tests/crud.mjs` exercises writes properly,
// with real bodies, one resource at a time.

import { readdirSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { boot, ok, failureCount, pool, req, ctx, call, sweep } from "./apiFixture.mjs";

const F = await boot("routes");

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

// ---- the routes, off the disk ----------------------------------------------
function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = `${dir}/${entry}`;
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// SYNTHETIC IDS ARE THE POINT, not a shortcut. A route handed an id that does
// not exist must answer "not there" rather than throw, and that is exactly the
// case a fixture built so every id resolves would never reach. `slug` is the
// one real value, because without it every studio route stops at the door and
// the sweep would prove only that the door works.
const PARAMS = {
  slug: F.slug,
  id: `no_such_${F.rand()}`,
  projectId: `pro_nosuch${F.rand()}`,
  planId: `pln_nosuch${F.rand()}`,
  engId: `eng_nosuch${F.rand()}`,
  templateId: `tpl_nosuch${F.rand()}`,
  typeKey: "transmittal",
  userId: `usr_nosuch${F.rand()}`,
  kind: "package",
  provider: "google",
};

function describe(file) {
  const path = file.replace(/^src\/app/, "").replace(/\/route\.ts$/, "");
  const params = {};
  // Covers `[id]`, `[...rest]` and `[[...segments]]` in one pass.
  const url = path.replace(/\[{1,2}\.{0,3}([^\]]+?)\]{1,2}/g, (_, raw) => {
    const name = raw.replace(/^\.{3}/, "");
    const value = PARAMS[name] ?? `x_${name}`;
    params[name] = value;
    return value;
  });
  return { file, path, url, params };
}

const routes = walk("src/app/api")
  .filter((f) => /\/route\.ts$/.test(f))
  .sort()
  .map(describe);

// ---- what is legitimately public -------------------------------------------
// THE ONE HAND-KEPT LIST IN THIS FILE, and it is hand-kept deliberately: a
// route that answers a stranger is a decision somebody makes, and a derived
// rule would let the next one become public by accident.
//
//   pricing/stats/showcase  the marketing site reads them before anyone signs in
//   contact                 the public contact form
//   applications            the public job application form
//   fonts                   static assets
//   dev-login               sandbox only; refuses outside development
//   me/rating               ANSWERS A STRANGER ON PURPOSE, and this sweep found
//                           it. The browser asks "should I show the rating
//                           prompt"; for somebody signed out the answer is
//                           `{prompt: false}`, which carries no data about
//                           anybody. The POST on the same route 401s, which is
//                           where the actual write is. Listed rather than
//                           excused by a rule, so the next 200 to a stranger is
//                           still a failure somebody has to look at.
//   identity/*              signing in cannot require being signed in
//   auth/*                  OAuth start and callback; both redirect
//   cron/*                  guarded by CRON_SECRET rather than a session (invariant 15)
const PUBLIC = new Set([
  "/api/pricing", "/api/stats", "/api/showcase", "/api/contact",
  "/api/applications", "/api/fonts", "/api/dev-login", "/api/me/rating",
]);
const PUBLIC_PREFIX = ["/api/identity/", "/api/auth/", "/api/cron/"];
const isPublic = (path) => PUBLIC.has(path) || PUBLIC_PREFIX.some((p) => path.startsWith(p));

// A studio route is one carrying the slug — the set invariant 2 is about.
const isStudioScoped = (r) => Object.hasOwn(r.params, "slug");

// HOW MANY CALLS OVERLAP. Twelve rather than the six this started at, measured:
// six took 262 seconds and twelve takes appreciably less, because almost all of
// that time is round trips through the local cloud-sql-proxy rather than work.
// Not raised further — the proxy fails on connection BURSTS, and trading a
// flaky failure that looks like a code problem for a few more seconds is a bad
// trade. Override with API_TEST_LANES when a machine can take more.
const LANES = Number(process.env.API_TEST_LANES || 12);

// EVERY ROUTE LOGS A LINE, and 275 of them buries the one thing a person opened
// this output to read. The observability logger has no level switch — adding
// one to production code for a test's benefit would be the tail wagging the
// dog — so the sweep silences `console.log` around the passes and restores it
// before reporting. `console.error` is left alone: a route that logs an error
// during the sweep is exactly what should still reach the screen.
let restore = null;
const quiet = () => { restore = console.log; console.log = () => {}; };
const loud = () => { if (restore) console.log = restore; restore = null; };

const get = (r) => call(r.mod.GET, req(r.url), ctx(r.params))
  .catch((e) => ({ status: 599, body: e?.message || String(e) }));

// ---- a route file that cannot be imported is a 500 in production ------------
// AND IT IS INVISIBLE TO `tsc`, which type-checks a module without ever
// evaluating it. A bad specifier or a top-level call that needs a request
// throws on the first request and nowhere earlier.
export function testEveryRouteModuleLoads() {
  for (const r of routes) {
    if (!ok(`${r.path} imports`, !r.error, r.error)) continue;
    ok(`${r.path} exports an HTTP method`, r.methods.length > 0,
      "no GET/POST/PUT/PATCH/DELETE export");
  }
}

export async function testSignedOutIsRefused() {
  F.signOut();
  const cases = routes.filter((r) => r.mod?.GET && !isPublic(r.path));
  await pool(cases, LANES, async (r) => {
    const res = await get(r);
    ok(`${r.path} refuses a signed-out caller`, res.status !== 200, `got ${res.status}`);
  });
  return cases.length;
}

export async function testAnOutsiderLearnsNothing() {
  await F.signIn(F.outsider.id);
  const cases = routes.filter((r) => r.mod?.GET && isStudioScoped(r));
  await pool(cases, LANES, async (r) => {
    const res = await get(r);
    // NOT 200 — and 403-vs-404 is deliberately not asserted. A slug is a public
    // address (`requestJoinByCode` exists so somebody can type one they were
    // told), so existence is discoverable by design and both answers are
    // correct. What must never come back is contents.
    ok(`${r.path} tells a non-member nothing`, res.status !== 200, `got ${res.status}`);
  });
  return cases.length;
}

export async function testTheOwnerGetsAnAnswer() {
  await F.signIn(F.owner.id);
  const fell = [];
  await pool(routes.filter((r) => r.mod?.GET), LANES, async (r) => {
    const res = await get(r);
    // NOT "must be 200". Many of these are handed a synthetic id and 404
    // correctly, and some want a query parameter this sweep does not supply.
    // A 5xx is different in kind: the handler fell over, and no request the
    // caller could have sent would have avoided it.
    //
    // EXCEPT WHEN IT SAYS SO. A route refusing because a secret is absent is
    // FAILING CLOSED, which is the behaviour invariant 15 demands of cron and
    // which the OAuth start routes copy — locally there is no CRON_SECRET and
    // no provider configured, so all seven answer 503 and are correct. Matched
    // on the answer rather than on a list of route paths, so a new fail-closed
    // route is covered and a route that starts falling over for a REAL reason
    // is not quietly excused by being on a list.
    const broke = res.status >= 500 && !/not.configured/i.test(JSON.stringify(res.body));
    if (broke) fell.push(`${r.path} → ${res.status} ${JSON.stringify(res.body).slice(0, 120)}`);
    ok(`${r.path} does not fall over for somebody who may open it`, !broke,
      broke ? `${res.status} ${JSON.stringify(res.body).slice(0, 140)}` : "");
  });
  return fell;
}

// ---- coverage, stated as a number ------------------------------------------
// THE HALF A SWEEP NEEDS AND A PER-ROUTE ASSERTION CANNOT GIVE. Gate A's "no
// golden is left behind" answered this from the other end. Without it, a filter
// typo that silently selected four routes would pass every assertion above and
// report success.
export function testTheSweepReachedEveryRoute() {
  ok("the sweep found the API tree at all", routes.length > 100, `${routes.length} route files`);
  const gettable = routes.filter((r) => r.mod?.GET).length;
  ok("...and most of them answer a GET", gettable > routes.length / 2,
    `${gettable} of ${routes.length}`);
  ok("...and the studio-scoped majority is reached by the outsider pass",
    routes.filter(isStudioScoped).length > 80,
    `${routes.filter(isStudioScoped).length} studio-scoped`);
}

// ---- run --------------------------------------------------------------------
const started = Date.now();

for (const r of routes) {
  try {
    r.mod = await import(pathToFileURL(`${process.cwd()}/${r.file}`).href);
    r.methods = METHODS.filter((m) => typeof r.mod[m] === "function");
  } catch (e) {
    r.error = e?.message || String(e);
    r.methods = [];
  }
}

const loadedAt = Date.now();

testEveryRouteModuleLoads();
testTheSweepReachedEveryRoute();

// TWO SCOPES, AND THE DEFAULT IS THE FAST ONE.
//
// Measured on this machine: import 0.9s, signed-out 0.0s, outsider 1.1s —
// and the owner pass 241s. Almost all of that last number is round trips
// through the local cloud-sql-proxy: eight document reads per request at
// roughly 280ms each, and raising the lane count from 6 to 32 and the pool
// from 3 to 32 moved it by six per cent, so it is latency rather than
// contention. On CI, where Postgres is a container in the same network, the
// same pass is a different order of magnitude.
//
// So `quick` — the default — runs everything except that pass, in about two
// seconds, and still proves: every route file imports (invisible to `tsc`,
// a 500 on the first request in production), every one exports a method,
// nothing answers a signed-out caller, and no studio route tells a
// non-member anything. That is the check worth having on every save.
//
// `full` adds the owner pass and is what CI runs. `API_TEST_SCOPE=full`.
const SCOPE = process.env.API_TEST_SCOPE || "quick";

quiet();
const t0 = Date.now();
const signedOut = await testSignedOutIsRefused();
const t1 = Date.now();
const outsider = await testAnOutsiderLearnsNothing();
const t2 = Date.now();
const fell = SCOPE === "full" ? await testTheOwnerGetsAnAnswer() : [];
const t3 = Date.now();
loud();

const secs = (a, b) => `${((b - a) / 1000).toFixed(1)}s`;
console.log(`  import ${secs(started, loadedAt)} · signed-out ${secs(t0, t1)}`
  + ` · outsider ${secs(t1, t2)}`
  + (SCOPE === "full" ? ` · owner ${secs(t2, t3)}` : " · owner SKIPPED (API_TEST_SCOPE=full to run it)"));

F.signOut();

console.log(
  `\nroutes: ${routes.length} files · ${routes.filter((r) => r.mod?.GET).length} GETs · `
  + `${signedOut} signed-out · ${outsider} outsider · `
  + `${((Date.now() - started) / 1000).toFixed(1)}s`,
);
if (fell.length) {
  console.log("  fell over:");
  for (const line of fell) console.log(`    ${line}`);
}

const pgFailed = await sweep();
console.log(failureCount() ? `\nroutes: ${failureCount()} FAILURES\n` : "\nroutes: all passed\n");
process.exit((failureCount() || pgFailed) ? 1 : 0);
