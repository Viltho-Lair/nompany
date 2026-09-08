// THE STUDIO THE API TESTS RUN AGAINST — built in seconds, on purpose.
//
// WHAT THIS REPLACES. Gate A took twelve minutes and almost none of it was
// assertions: a golden comparison is a string compare. The cost was the
// fixture — roughly forty collaborators, dozens of roles, and a web of tenders,
// quotations, projects, bills and invoices, every one of them written through a
// local proxy that stalls on connection bursts, and every one of them existing
// only to make some response body interesting enough to snapshot.
//
// `routes.mjs` and `crud.mjs` need none of that. Routes needs a studio, an
// owner, and somebody outside it; CRUD needs the owner and an empty studio to
// write into. Four users, one studio.
//
// `boot()` IS A FUNCTION RATHER THAN IMPORT-TIME WORK, and that is the one
// subtle thing in this file. `NOMPANY_KEY_PREFIX` has to be set before any
// module that reaches the store is imported, and ESM hoists static imports
// above every statement in the importing file — so a caller writing
// `process.env.NOMPANY_KEY_PREFIX = …` above `import { fixture } from
// "./apiFixture.mjs"` would set it AFTER this file had already run. Passing the
// suite name in makes the ordering explicit and impossible to get wrong.

import { register } from "node:module";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const rand = () => Math.random().toString(36).slice(2, 8);

/**
 * Claim a namespace, build the fixture, and hand back everything a suite needs.
 *
 * @param suite - short name; becomes part of the key prefix so two suites
 *   running in the same `npm test` cannot reap each other's fixtures.
 */
export async function boot(suite) {
  // ---- namespace, before anything else -------------------------------------
  // A SUITE THAT ENDS BY DELETING ITS WHOLE NAMESPACE MUST NOT SHARE ONE. The
  // integration suite and Gate A both used `test_` once, and the first to
  // finish reaped the other's fixtures mid-flight — twice in one session,
  // surfacing as a wall of unrelated `forbidden` failures with nothing pointing
  // at the real cause. NOMPANY_TEST_SESSION is the second half of the same
  // guard, for two agent sessions sharing one database.
  const session = process.env.NOMPANY_TEST_SESSION ? `${process.env.NOMPANY_TEST_SESSION}_` : "";
  process.env.NOMPANY_KEY_PREFIX = process.env.NOMPANY_KEY_PREFIX || `test_${session}${suite}_`;

  if (process.env.NODE_ENV === "production") {
    console.error(`Refusing to run ${suite} with NODE_ENV=production.`);
    process.exit(1);
  }
  if (!process.env.NOMPANY_KEY_PREFIX.trim()) {
    console.error("NOMPANY_KEY_PREFIX must not be empty — that would run against live keys.");
    process.exit(1);
  }

  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* CI supplies the environment directly */ }

  if (!process.env.DATABASE_URL) {
    console.error(`DATABASE_URL is not set — ${suite} needs a Postgres to talk to.`);
    process.exit(1);
  }

  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("./loader.mjs", import.meta.url), { data: { root } });

  // ---- sweep on the way IN, not only on the way out ------------------------
  // A run that is killed, times out or crashes leaves its fixtures behind, and
  // the next one builds on top of them. Under Gate A that produced 187 failures
  // in one go — every list carrying rows from a previous life — which looks
  // exactly like a mass regression and is the most expensive false alarm there
  // is. Costs nothing on a clean run.
  //
  // CLAIM FIRST, THEN SWEEP AROUND THE LOCK, or the sweep destroys the thing
  // telling a concurrent run to stay out.
  const { claimNamespace, sweepExcept, lockKeyFor } = await import("./exclusive.mjs");
  await claimNamespace(process.env.NOMPANY_KEY_PREFIX, `${suite}.mjs`);
  await sweepExcept(process.env.NOMPANY_KEY_PREFIX, lockKeyFor(process.env.NOMPANY_KEY_PREFIX));

  const { createUser, mintSession } = await import("@/platform/auth/users");
  const { createStudio } = await import("@/modules/main/studios");
  const { addCollaborator } = await import("@/platform/auth/collaborators");
  const { listRoles } = await import("@/modules/people/roles");
  const { SESSION_COOKIE } = await import("@/platform/auth/identity");
  const { __signIn, __signOut } = await import("./nextHeaders.mjs");

  // ---- the people, and why each exists -------------------------------------
  //   owner     holds everything; proves a route WORKS
  //   member    a member holding no role; proves default deny (invariant 4)
  //   outsider  signed in, not a member; proves the URL never authorises
  //             (invariant 2) — what they learn is nothing about the contents
  //   (nobody)  signed out; proves the route asks who you are first
  const slug = `${suite}-${rand()}${rand()}`;
  const owner = (await createUser({ email: `${suite}-owner-${rand()}@test.invalid`, passwordHash: "x" })).user;

  const made = await createStudio({
    ownerUserId: owner.id, name: `${suite} test studio`, slug, ownerAlias: "Owner",
  });
  if (made.error) {
    console.error(`${suite} fixture failed:`, made.error);
    process.exit(1);
  }
  await listRoles(made.studio.id);   // seeds the starter role

  const memberUser = (await createUser({ email: `${suite}-member-${rand()}@test.invalid`, passwordHash: "x" })).user;
  await addCollaborator(made.studio.id, { userId: memberUser.id, alias: "Member", role: "member", roleIds: [] });

  const outsider = (await createUser({ email: `${suite}-outsider-${rand()}@test.invalid`, passwordHash: "x" })).user;

  return {
    slug, studio: made.studio, owner, memberUser, outsider, rand,
    signIn: async (userId) => __signIn(SESSION_COOKIE, await mintSession(userId, 600)),
    signOut: () => __signOut(),
  };
}

// ---- the harness -----------------------------------------------------------
// Accumulate and report rather than throw on the first mismatch — the shape
// tests/restructure.mjs and tests/suite.mjs already use. One bad route must not
// hide the other hundred and seventy-two; what a person needs from a sweep is
// the whole list of what broke.
//
// ONLY FAILURES ARE PRINTED. Gate A printed a line per assertion and buried its
// own verdict in fifteen hundred lines of `ok`, which is how a run that had
// CRASHED came to read as "0 failures".
//
// IT WRITES TO THE STREAM, NOT THROUGH `console.log`, and that is not fussiness.
// `routes.mjs` silences `console.log` while the passes run, because every route
// logs a line and 275 of them bury the output. The first version of this
// printed failures through the same function it was silencing, so a run with
// one real failure printed "1 FAILURES" and not one word about WHICH — the
// identical shape as Gate A's crash reading as "0 failures". A harness that can
// be muted by the thing it is watching is not a harness.
let failures = 0;
export function ok(message, cond, detail = "") {
  if (!cond) {
    failures += 1;
    process.stdout.write(` FAIL  ${message}${detail ? `  — ${detail}` : ""}\n`);
  }
  return cond;
}
export const failureCount = () => failures;

// ---- a bounded concurrency pool --------------------------------------------
// THE BIGGEST LEVER ON WALL CLOCK, and it is available here for a reason it was
// not available to Gate A: a golden records what the studio looked like at that
// moment, so a golden suite must run strictly sequentially. A route sweep
// asserts a STATUS, which no other route can move, so the calls are independent.
//
// SIX, NOT SIXTY. The local cloud-sql-proxy fails on connection bursts — a
// suite run alongside a dev server has died at connect for exactly that — so
// this is deliberately modest. Raising it trades a flaky failure that looks
// like a code problem for a few seconds, which is a bad trade.
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) || 1 }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

// ---- calling a route -------------------------------------------------------
// Routes are called the way Next calls them — a real Request and a params
// promise — so what is under test is the handler, not a reimplementation of
// what the handler is thought to do.
export function req(url, { method = "GET", body, headers = {} } = {}) {
  const init = { method, headers: { host: "nompany.test", ...headers } };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return new Request(`http://nompany.test${url}`, init);
}

export const ctx = (params = {}) => ({ params: Promise.resolve(params) });

/** Status + parsed body. A non-JSON body comes back as text rather than throwing. */
export async function call(handler, request, context) {
  const res = await handler(request, context);
  let body;
  const text = await res.text();
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}

// ---- teardown --------------------------------------------------------------
// THE ORDER IS LOAD-BEARING, and it is the same constraint `test:parity` and
// `dev:sandbox:clean` carry. `REG.studios` is namespaced by this run's prefix
// and is the ONLY record of which studios this run created; `collection_rows`
// is keyed by a real `tenant_id` that no prefix can namespace, so the tenant
// sweep must read that list BEFORE `delPrefix` erases it. Deleting by an
// explicit id list rather than by a predicate is invariant 17.
export async function sweep() {
  const { readArr, delPrefix } = await import("@/platform/db/store");
  const { REG } = await import("@/platform/db/keys");
  const { sweepPgTenants } = await import("./pg-sweep.mjs");

  let pgFailed = false;
  try {
    const ids = (await readArr(REG.studios)).map((s) => s.id).filter(Boolean);
    const n = await sweepPgTenants(ids);
    console.log(`swept ${n} postgres row(s) across ${ids.length} studio(s)`);
  } catch (e) {
    // Caught HERE so the prefix delete below still runs. A throw at this point
    // strands the namespace, and the next run builds on top of these fixtures
    // and reports failures with nothing pointing at why.
    pgFailed = true;
    console.error(`Postgres sweep failed — continuing so this run does not strand its namespace: ${e.message}`);
  }

  const swept = await delPrefix(process.env.NOMPANY_KEY_PREFIX);
  console.log(`swept ${swept} keys from "${process.env.NOMPANY_KEY_PREFIX}"`);
  return pgFailed;
}
