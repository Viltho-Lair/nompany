// CREATE, READ, UPDATE, DELETE — one full lifecycle per resource.
//
// WHAT THIS ANSWERS THAT `routes.mjs` DOES NOT. That file calls every GET once
// and proves the surface answers and refuses correctly; it deliberately never
// writes, because a generic POST body either fails validation (proving nothing)
// or puts rubbish into the fixture the next case reads. So writes need real
// bodies, and a real body is per-resource work — which is why this file has a
// hand-written table and `routes.mjs` has none.
//
// THE TABLE IS THE POINT, AND SO IS ITS SIZE. It does not cover every
// collection in the product and does not pretend to. Each row is a resource
// whose write path somebody has actually read, and adding one is a deliberate
// act: an entry that guesses at a body shape reports a red test about the test
// rather than about the code.
//
// WHAT EACH LIFECYCLE PROVES, and it is more than "the four verbs work":
//   • create returns the row, and the LIST then contains it — a create that
//     answers 201 and writes nowhere is the failure this catches
//   • update is visible on the next read, not merely acknowledged
//   • delete removes it, and the list no longer has it
//   • the same four verbs REFUSE a member holding no role at all (invariant 4)
//
// Every row is created and deleted inside its own case, so the studio is left
// as it was found and the cases do not depend on each other's order — the
// coupling that made Gate A's goldens move six modules at a time.

import { boot, ok, failureCount, req, ctx, call, sweep } from "./apiFixture.mjs";

const F = await boot("crud");
const P = () => ctx({ slug: F.slug });

// ---- the resources ---------------------------------------------------------
// `list`  reads the collection out of a GET body — each route names its own
//         key, so the shape is stated per row rather than guessed.
// `make`  a body good enough to pass validation, built fresh per run so two
//         runs in the same database cannot collide on a unique name.
// `patch` what changes, and `check` reads it back off the updated row.
const RESOURCES = [
  {
    name: "locations",
    module: "administration/locations",
    // THE LIST IS NOT ON THE ROUTE THAT WRITES IT, and this sweep is how that
    // was discovered: `administration/locations` exports POST, PUT and DELETE
    // and no GET at all, because Field Operations already served the list and a
    // second reader would have been a second answer. So the row says where to
    // read, rather than the harness assuming the two are the same route.
    readModule: "operations",
    list: (b) => b?.locations || [],
    make: () => ({ name: `Yard ${F.rand()}`, city: "Amman", country: "JO" }),
    patch: (id) => ({ id, name: `Yard renamed ${F.rand()}` }),
    check: (row, sent) => row?.name === sent.name,
  },
  {
    name: "departments",
    module: "administration/departments",
    list: (b) => b?.departments || [],
    make: () => ({ name: `Unit ${F.rand()}` }),
    patch: (id) => ({ id, name: `Unit renamed ${F.rand()}` }),
    check: (row, sent) => row?.name === sent.name,
  },
];

const load = (m) => import(`../src/app/api/studios/[slug]/${m}/route.ts`);

const body = (method, payload) => req(`/api/studios/${F.slug}/x`, { method, body: payload });

// ---- one resource, one lifecycle -------------------------------------------
async function lifecycle(r) {
  const mod = await load(r.module).catch((e) => ({ error: e.message }));
  if (!ok(`${r.name}: the route imports`, !mod.error, mod.error)) return;
  for (const verb of ["POST", "PUT", "DELETE"]) {
    if (!ok(`${r.name}: exports ${verb}`, typeof mod[verb] === "function")) return;
  }

  const reader = r.readModule ? await load(r.readModule).catch((e) => ({ error: e.message })) : mod;
  if (!ok(`${r.name}: the reading route imports`, !reader.error, reader.error)) return;
  if (!ok(`${r.name}: something exports a GET for the list`,
    typeof reader.GET === "function", r.readModule || r.module)) return;

  const readList = async () => r.list((await call(reader.GET, req(`/api/studios/${F.slug}/x`), P())).body);

  await F.signIn(F.owner.id);

  // ---- create --------------------------------------------------------------
  const sent = r.make();
  const created = await call(mod.POST, body("POST", sent), P());
  if (!ok(`${r.name}: create answers`, created.status < 300,
    `${created.status} ${JSON.stringify(created.body).slice(0, 140)}`)) return;

  const row = created.body?.[r.name.replace(/s$/, "")] || created.body?.location
    || created.body?.department || created.body?.row;
  const id = row?.id;
  if (!ok(`${r.name}: create returns a row with an id`, Boolean(id),
    JSON.stringify(created.body).slice(0, 160))) return;

  // ---- read it back --------------------------------------------------------
  // THE HALF A 201 DOES NOT PROVE. A create that answers and writes nowhere
  // looks identical from the response alone.
  const listed = await readList();
  ok(`${r.name}: the list contains what was just created`,
    listed.some((x) => x.id === id),
    `${listed.length} rows, none with id ${id}`);

  // ---- update --------------------------------------------------------------
  const patch = r.patch(id);
  const updated = await call(mod.PUT, body("PUT", patch), P());
  ok(`${r.name}: update answers`, updated.status < 300,
    `${updated.status} ${JSON.stringify(updated.body).slice(0, 140)}`);

  const after = await readList();
  ok(`${r.name}: the change is on the next read, not just acknowledged`,
    r.check(after.find((x) => x.id === id), patch),
    JSON.stringify(after.find((x) => x.id === id) || null).slice(0, 160));

  // ---- default deny, on every verb ----------------------------------------
  // A MEMBER HOLDING NO ROLE AT ALL (invariant 4). Asked before the delete so
  // the row still exists — a refusal on a row that is already gone would pass
  // for the wrong reason.
  await F.signIn(F.memberUser.id);
  for (const [verb, payload] of [["POST", r.make()], ["PUT", patch], ["DELETE", { id }]]) {
    const refused = await call(mod[verb], body(verb, payload), P());
    ok(`${r.name}: ${verb} refuses a member with no role`, refused.status >= 400,
      `got ${refused.status}`);
  }

  // ---- delete --------------------------------------------------------------
  await F.signIn(F.owner.id);
  const removed = await call(mod.DELETE, body("DELETE", { id }), P());
  ok(`${r.name}: delete answers`, removed.status < 300,
    `${removed.status} ${JSON.stringify(removed.body).slice(0, 140)}`);

  ok(`${r.name}: and it is gone from the list`,
    !(await readList()).some((x) => x.id === id), `id ${id} still present`);
}

// ---- run --------------------------------------------------------------------
const started = Date.now();

// SEQUENTIAL, unlike the route sweep, and deliberately. These cases WRITE, and
// several of them write to the same studio document — `editArr` is
// compare-and-set with a small flat backoff (invariant 9), so concurrent
// writers to one key make a queue rather than a speed-up.
for (const r of RESOURCES) {
  await lifecycle(r).catch((e) => ok(`${r.name}: lifecycle threw`, false, e?.message || String(e)));
}

F.signOut();
console.log(`\ncrud: ${RESOURCES.length} resources · ${((Date.now() - started) / 1000).toFixed(1)}s`);

const pgFailed = await sweep();
console.log(failureCount() ? `\ncrud: ${failureCount()} FAILURES\n` : "\ncrud: all passed\n");
process.exit((failureCount() || pgFailed) ? 1 : 0);
