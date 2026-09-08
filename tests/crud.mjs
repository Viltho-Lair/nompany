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

// ---- AN ENGINE REGISTER IS GRANTABLE ---------------------------------------
// TWENTY-TWO REGISTERS THAT ONLY THE OWNER COULD OPEN, until 08/09/2026.
// `StudioRoles` draws its grid from `AREAS`, which is compile-time; an engine
// right is minted from a ROW, so the screen could offer none of them and no
// archetype held one. A right nothing can GRANT is the same bug as a right
// nothing can exercise (invariant 16), one step further out.
//
// THE TEST IS THE WHOLE ROUND TRIP, because each half passed on its own while
// the feature did not work: the roles route must OFFER the key, a role carrying
// it must SURVIVE `cleanPermissions` — which drops anything `isPermission` does
// not recognise, and an engine key is not in the closed catalogue — and the
// register must then actually open for somebody holding that key and nothing
// else.
async function engineGrant() {
  const ROLES = await import("../src/app/api/studios/[slug]/roles/route.ts");
  const { createUser } = await import("@/platform/auth/users");
  const { createRole } = await import("@/modules/people/roles");
  const { addCollaborator } = await import("@/platform/auth/collaborators");
  const { engineContext } = await import("@/platform/engine/context");
  const { listRecords } = await import("@/platform/engine/records");

  await F.signIn(F.owner.id);

  // ---- the screen offers it ------------------------------------------------
  const listed = await call(ROLES.GET, req(`/api/studios/${F.slug}/roles`), P());
  const areas = listed.body?.areas || [];
  // AREAS, NOT KEYS. The catalogue is 181 permission KEYS across 79 areas, and
  // conflating the two is how this assertion was wrong the first time it ran.
  ok("the roles screen is handed the declared catalogue", areas.length > 50,
    String(areas.length));

  const engineAreas = areas.filter((a) => String(a.key).startsWith("engine."));
  ok("AND THE STUDIO'S OWN REGISTERS BESIDE IT", engineAreas.length > 0,
    `${areas.length} areas, none of them engine`);

  const transmittal = engineAreas.find((a) => a.key === "engine.transmittal");
  ok("...including the built-in transmittal register", Boolean(transmittal),
    engineAreas.map((a) => a.key).join(", ").slice(0, 200));
  if (!transmittal) return;

  ok("...carrying the four verbs a register has",
    ["view", "create", "edit", "delete"].every((v) => transmittal.verbs.includes(v)),
    JSON.stringify(transmittal.verbs));
  // GROUPED UNDER ITS SECTION, not in a bucket called "Engine" — a studio finds
  // it beside the rest of Engineering & Documents.
  ok("...and grouped under the section it lives in",
    typeof transmittal.group === "string" && transmittal.group.length > 0
    && transmittal.group !== "Engine", transmittal.group);

  // ---- a role carrying it survives being stored ----------------------------
  // `cleanPermissions` DROPS ANY KEY `isPermission` DOES NOT RECOGNISE, and an
  // engine key is not in the closed catalogue — `isEnginePermission` is the one
  // place that set stops being closed. Silently dropping it here is what would
  // make the grant look like it worked and change nothing.
  const role = await createRole(F.studio.id, {
    name: `doc-controller-${F.rand()}`,
    permissions: ["engine.transmittal.view"],
  });
  ok("a role may CARRY an engine right",
    (role.permissions || []).includes("engine.transmittal.view"),
    JSON.stringify(role.permissions));

  // ---- and it opens the register -------------------------------------------
  // HOLDING THAT KEY AND NOTHING ELSE. No Administration right, no section
  // grant of any kind — the engine's context guards membership alone precisely
  // so this person is not refused before the engine's own gate is asked.
  const u = (await createUser({ email: `crud-eng-${F.rand()}@test.invalid`, passwordHash: "x" })).user;
  await addCollaborator(F.studio.id, { userId: u.id, alias: "docs", role: "member", roleIds: [role.id] });
  await F.signIn(u.id);

  const ctx = await engineContext(u, F.slug);
  ok("the engine context builds for somebody holding only an engine right",
    !ctx.error, JSON.stringify(ctx.error));
  if (ctx.error) return;

  const rows = await listRecords(ctx, "transmittal");
  ok("AND THE REGISTER OPENS FOR THEM", !rows.error && Array.isArray(rows.records),
    JSON.stringify(rows.error || rows).slice(0, 160));

  // A READER IS NOT A WRITER: the four verbs are separate keys precisely so
  // holding one says nothing about the others.
  ok("...offering no write they cannot do", rows.canCreate === false && rows.canDelete === false,
    JSON.stringify({ create: rows.canCreate, delete: rows.canDelete }));

  // ---- and a member holding nothing still sees none of it ------------------
  await F.signIn(F.memberUser.id);
  const strangerCtx = await engineContext(F.memberUser, F.slug);
  const refused = strangerCtx.error ? { error: strangerCtx.error } : await listRecords(strangerCtx, "transmittal");
  ok("a member holding no engine right is still refused",
    Boolean(refused.error), JSON.stringify(refused).slice(0, 140));
}

await engineGrant().catch((e) => ok("the engine-grant case threw", false, e?.message || String(e)));

// ---- THE EXPORT'S SECOND GATE ----------------------------------------------
// `reports.exports.view` opens the export surface; each data set still asks the
// right its own section already required. Giving somebody the export screen
// must not widen what they can see by one row — which is the whole reason the
// first right is safe to grant at all.
async function exportGates() {
  const EXPORT = await import("../src/app/api/studios/[slug]/reports/export/route.ts");
  const { createUser } = await import("@/platform/auth/users");
  const { createRole } = await import("@/modules/people/roles");
  const { addCollaborator } = await import("@/platform/auth/collaborators");

  const person = async (permissions, alias) => {
    const u = (await createUser({ email: `x-${alias}-${F.rand()}@test.invalid`, passwordHash: "x" })).user;
    const role = await createRole(F.studio.id, { name: `role-${alias}-${F.rand()}`, permissions });
    await addCollaborator(F.studio.id, { userId: u.id, alias, role: "member", roleIds: [role.id] });
    return u;
  };

  const get = (dataset) => call(
    EXPORT.GET,
    req(`/api/studios/${F.slug}/reports/export?dataset=${dataset}`),
    P(),
  );

  // ---- the export right ALONE opens nothing --------------------------------
  const exporter = await person(["reports.exports.view"], "exportonly");
  await F.signIn(exporter.id);
  const refused = await get("invoices");
  ok("the export right alone does not reach a register", refused.status === 403,
    `got ${refused.status}`);
  ok("...and names the right that is missing", refused.body?.key === "finance.cash.view",
    JSON.stringify(refused.body));

  // ---- the section right alone does not open the export --------------------
  // The other direction, and it is the half that makes the first right mean
  // something: somebody who may READ invoices still may not DOWNLOAD them.
  const reader = await person(["finance.cash.view"], "cashonly");
  await F.signIn(reader.id);
  const noExport = await get("invoices");
  ok("a section right alone does not confer exporting", noExport.status === 403,
    `got ${noExport.status}`);
  ok("...and names the export right", noExport.body?.key === "reports.exports.view",
    JSON.stringify(noExport.body));

  // ---- both together ------------------------------------------------------
  const both = await person(["reports.exports.view", "finance.cash.view"], "bothrights");
  await F.signIn(both.id);
  const allowed = await get("invoices");
  ok("BOTH RIGHTS TOGETHER EXPORT", allowed.status === 200, `got ${allowed.status}`);

  // A dataset nobody declared is not a permission question — the fix is the
  // URL, not a grant.
  const bogus = await get("nonsense");
  ok("an unknown data set is notfound rather than forbidden", bogus.status === 404,
    `got ${bogus.status}`);

  // AND AN OUTSIDER LEARNS NOTHING, invariant 2, even holding neither right.
  await F.signIn(F.outsider.id);
  const stranger = await get("invoices");
  ok("a non-member is told nothing", stranger.status !== 200, `got ${stranger.status}`);
}

await exportGates().catch((e) => ok("the export-gate case threw", false, e?.message || String(e)));

// ---- A STOCK ADJUSTMENT BIG ENOUGH TO NEED A SIGNATURE ----------------------
// `adjustStock` was the one write in Inventory with no document behind it: a
// person typing a number into the ledger every on-hand figure is summed from,
// asking only `inventory.stock.create` — the right somebody needs to count
// shelves, and therefore held by more people than should write off a container.
//
// THE THRESHOLD IS THE WHOLE DESIGN. Below it an adjustment applies at once, or
// a studio doing routine stock control acquires a queue nobody clears and turns
// the control off.
async function adjustmentApproval() {
  const STOCK = await import("../src/app/api/studios/[slug]/inventory/stock/route.ts");
  const ADJ = await import("../src/app/api/studios/[slug]/inventory/adjustments/route.ts");
  const ITEMS = await import("../src/app/api/studios/[slug]/inventory/items/route.ts");
  const { createUser } = await import("@/platform/auth/users");
  const { createRole } = await import("@/modules/people/roles");
  const { addCollaborator } = await import("@/platform/auth/collaborators");
  const { updateStudio } = await import("@/modules/main/studios");

  await updateStudio(F.studio.id, { currency: "USD" });
  await F.signIn(F.owner.id);

  const made = await call(ITEMS.POST, body("POST", { name: "Cement", sku: `CEM-${F.rand()}`, unit: "bag", unitCost: 50 }), P());
  const itemId = made.body?.item?.id;
  if (!ok("fixture: an item with a unit cost", Boolean(itemId), JSON.stringify(made.body).slice(0, 140))) return;

  const adjust = (qty, reason) => call(
    STOCK.POST, body("POST", { itemId, qty, reason }), P(),
  );

  // ---- below the limit applies at once -------------------------------------
  const small = await adjust(5, "Recount");            // 5 x 50 = 250
  ok("a small adjustment applies immediately",
    small.status === 201 && !small.body?.pending && Boolean(small.body?.movement),
    JSON.stringify(small.body).slice(0, 140));

  // ---- above it parks and moves nothing ------------------------------------
  const big = await adjust(100, "Pallet found");        // 100 x 50 = 5000
  const adjustmentId = big.body?.adjustment?.id;
  ok("a large adjustment parks for signature",
    big.body?.pending === true && big.body?.adjustment?.status === "Pending",
    JSON.stringify(big.body).slice(0, 160));
  ok("...valued at units times unit cost", big.body?.adjustment?.value === 5000,
    String(big.body?.adjustment?.value));
  // THE STEPS IT ACTUALLY NEEDS: 5,000 clears the first threshold and not the
  // second, so one signature rather than two.
  ok("...and needs exactly the steps its amount reaches",
    (big.body?.adjustment?.approvalPlan?.steps || []).length === 1,
    JSON.stringify(big.body?.adjustment?.approvalPlan?.steps));
  ok("...and moved no stock", !big.body?.movement);

  // ---- INVARIANT 7: the raiser never signs, owner included -----------------
  const self = await call(ADJ.PATCH, body("PATCH", { id: adjustmentId, action: "approve" }), P());
  ok("the person who raised it cannot sign it", self.body?.error === "same-signer",
    JSON.stringify(self.body));

  // ---- somebody else, holding the step's right ----------------------------
  const u = (await createUser({ email: `sc-${F.rand()}@test.invalid`, passwordHash: "x" })).user;
  const role = await createRole(F.studio.id, {
    name: `stock-control-${F.rand()}`,
    permissions: ["inventory.stock.view", "inventory.stock.approve"],
  });
  await addCollaborator(F.studio.id, { userId: u.id, alias: "stockcontrol", role: "member", roleIds: [role.id] });
  await F.signIn(u.id);

  const signed = await call(ADJ.PATCH, body("PATCH", { id: adjustmentId, action: "approve" }), P());
  ok("SOMEBODY ELSE HOLDING THE RIGHT SIGNS IT", signed.status === 200,
    JSON.stringify(signed.body).slice(0, 160));
  ok("...the adjustment is approved", signed.body?.adjustment?.status === "Approved");
  // THE STOCK MOVES ON THE LAST SIGNATURE AND NOT BEFORE.
  ok("...and the stock moves only now", Boolean(signed.body?.movement),
    JSON.stringify(signed.body?.movement || null).slice(0, 120));

  // ---- and not twice -------------------------------------------------------
  const again = await call(ADJ.PATCH, body("PATCH", { id: adjustmentId, action: "approve" }), P());
  ok("an approved adjustment cannot be approved again",
    again.body?.error === "already-decided", JSON.stringify(again.body));

  // ---- somebody without the right cannot sign -----------------------------
  await F.signIn(F.owner.id);
  const second = await adjust(200, "Another pallet");
  await F.signIn(F.memberUser.id);
  const noRight = await call(ADJ.PATCH, body("PATCH", { id: second.body?.adjustment?.id, action: "approve" }), P());
  ok("a member holding no stock right cannot sign", noRight.status >= 400,
    `got ${noRight.status}`);
}

await adjustmentApproval().catch((e) => ok("the adjustment case threw", false, e?.message || String(e)));

F.signOut();
console.log(`\ncrud: ${RESOURCES.length} resources · ${((Date.now() - started) / 1000).toFixed(1)}s`);

const pgFailed = await sweep();
console.log(failureCount() ? `\ncrud: ${failureCount()} FAILURES\n` : "\ncrud: all passed\n");
process.exit((failureCount() || pgFailed) ? 1 : 0);
