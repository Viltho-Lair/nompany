// INTEGRATION SUITE — the tests.
//
// WHAT THIS EXISTS FOR. Every serious bug found in the August audit lived in
// WIRING, not in logic: a context that resolved `access` and forgot to return
// it, a route that read an assignment from the wrong level of the body, a guard
// placed above the branch it was written for. The unit suite could not see any
// of them, because each one is correct in isolation and wrong only once
// connected. So these tests connect things: real repositories, real Redis, real
// route handlers, and one assertion per bug that actually happened.
//
// Each block names the defect it stands guard over, so nobody deletes it later
// wondering what it was for.

import { KEY_PREFIX, IX } from "@/lib/data/keys";
import { delPrefix, getIndex } from "@/lib/data/store";
import { getRedisClient } from "@/lib/data/redis";
import { createUser, mintSession } from "@/lib/data/users";
import { createStudio, renameStudio, getStudioBySlug } from "@/lib/data/studios";
import { addCollaborator, updateCollaborator, getCollaboratorByUser } from "@/lib/data/collaborators";
import { listRoles } from "@/lib/data/roles";
import { ADMIN_ROLE_ID } from "@/lib/permissions";
import { SESSION_COOKIE } from "@/lib/identity";
import { studioContext, canAdminister } from "@/lib/studios";
import { tasksContext, createTask, updateTask, removeTask } from "@/lib/tasks";
import { financeContext, createInvoice, removeInvoice, listInvoices } from "@/lib/finance";
import { inventoryContext, createItem, adjustStock } from "@/lib/inventory";
import { hrContext, requestVacation, decideVacation } from "@/lib/hr";
import { __signIn, __signOut } from "./nextHeaders.mjs";

import { seedSuperAdmin, loginSuper, SUPER_COOKIE } from "@/lib/superAuth";

const PUT_COLLABORATORS = (await import("@/app/api/studios/[slug]/collaborators/route.js")).PUT;
const EXPORT_CSV = (await import("@/app/api/super/site-analytics/export/route.js")).GET;
const YEAR_ROLLOVER = (await import("@/app/api/cron/year-rollover/route.js")).GET;

// ---- harness ---------------------------------------------------------------
let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? `  — ${extra}` : ""}`);
};
const rand = () => Math.random().toString(36).slice(2, 8);

// A signed-in caller, the way a browser is one: a real session token in the
// cookie jar, looked up against Redis by the real currentUser().
async function signInAs(userId) {
  __signIn(SESSION_COOKIE, await mintSession(userId, 600));
}
const params = (slug) => Promise.resolve({ slug });
const jsonReq = (body) =>
  new Request("http://localhost/test", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

console.log(`\nintegration suite — namespace "${KEY_PREFIX}"\n`);

// ---- fixture ---------------------------------------------------------------
// One studio, four people: its owner, and three collaborators holding the
// starter roles the product ships with. Built once, because every block below
// is a read or a write against the same studio, exactly as a real one is.
const slug = `t-${rand()}${rand()}`;
const owner = (await createUser({ email: `owner-${rand()}@test.invalid`, passwordHash: "x" })).user;
const created = await createStudio({ ownerUserId: owner.id, name: "Test Studio", slug, ownerAlias: "Owner" });
if (created.error) { console.error("fixture failed:", created.error); process.exit(1); }
const studio = created.studio;

const roles = await listRoles(studio.id);            // seeds the starter roles
const roleId = (name) => roles.find((r) => r.name === name)?.id;

async function person(alias, roleName) {
  const user = (await createUser({ email: `${alias}-${rand()}@test.invalid`, passwordHash: "x" })).user;
  await addCollaborator(studio.id, {
    userId: user.id, alias, role: "member",
    roleIds: roleName ? [roleId(roleName)] : [],
  });
  return { user, collaborator: await getCollaboratorByUser(studio.id, user.id) };
}

const member = await person("Member", "Member");
const viewer = await person("Viewer", "Viewer");
const nobody = await person("Nobody", null);

// ============================================================================
console.log("== tasks: the board writes at all");
// REGRESSION: tasksContext resolved `access` and left it out of the object it
// returned, so requirePermission(undefined, …) refused every write in the
// module — creating, editing, deleting, appointing — for everybody including
// the owner. The build passed, the unit suite passed, and the board was dead.
{
  const ctx = await tasksContext(owner, slug);
  ok("owner can open Tasks", !ctx.error, ctx.error);
  ok("the context carries access", ctx.access instanceof Set);

  const made = await createTask(ctx, { title: "Ship the thing", assigneeCollaboratorId: viewer.collaborator.id });
  ok("owner can create a task", !!made.task, made.error);

  const edited = await updateTask(ctx, made.task?.id, { title: "Ship the thing, renamed" });
  ok("owner can edit a task", edited.task?.title === "Ship the thing, renamed", edited.error);

  // A task is assigned by somebody authorised and COMPLETED by the person it
  // was given to — so finishing your own work cannot need a board right.
  const viewerCtx = await tasksContext(viewer.user, slug);
  const moved = await updateTask(viewerCtx, made.task?.id, { status: "Done" });
  ok("the assignee can finish their own task without a board right", moved.task?.status === "Done", moved.error);

  const overreach = await updateTask(viewerCtx, made.task?.id, { title: "not mine to rename" });
  ok("...but cannot rewrite what was asked of them", overreach.error === "forbidden", JSON.stringify(overreach));

  const gone = await removeTask(ctx, made.task?.id);
  ok("owner can delete a task", gone.ok === true, gone.error);

  const shut = await tasksContext(nobody.user, slug);
  ok("somebody with no role cannot open Tasks", shut.error === "forbidden", shut.error);
}

// ============================================================================
console.log("\n== people: assignment cannot escalate");
// REGRESSION: the route read the assignment from the top level of the body
// while the screen sent it under `patch`, so cleanAssignment saw nothing, the
// escalation check never ran, and `patch` was written to the row verbatim —
// anyone who could edit people could hand themselves the Admin wildcard, or
// `role: "owner"`, and hold every permission in the studio.
{
  // Somebody who may edit people and nothing else — the case the check exists
  // for. An owner or an Admin already holds everything and can never trip it.
  await updateCollaborator(studio.id, member.collaborator.id, {
    overrides: { allow: ["people.members.edit"], deny: [] },
  });

  await signInAs(member.user.id);
  const grab = await PUT_COLLABORATORS(
    jsonReq({ collaboratorId: member.collaborator.id, patch: { roleIds: [ADMIN_ROLE_ID] } }),
    { params: params(slug) },
  );
  ok("cannot give yourself the Admin role", grab.status === 403, `got ${grab.status}`);

  const seize = await PUT_COLLABORATORS(
    jsonReq({ collaboratorId: member.collaborator.id, patch: { role: "owner" } }),
    { params: params(slug) },
  );
  const after = await getCollaboratorByUser(studio.id, member.user.id);
  ok("cannot write yourself `role: owner`", after.role !== "owner", `role is ${after.role} (${seize.status})`);

  const rename = await PUT_COLLABORATORS(
    jsonReq({ collaboratorId: member.collaborator.id, patch: { alias: "Renamed" } }),
    { params: params(slug) },
  );
  ok("...but may still do the job they hold", rename.status === 200, `got ${rename.status}`);

  await signInAs(owner.id);
  const granted = await PUT_COLLABORATORS(
    jsonReq({ collaboratorId: viewer.collaborator.id, patch: { roleIds: [ADMIN_ROLE_ID] } }),
    { params: params(slug) },
  );
  ok("an owner may hand out Admin", granted.status === 200, `got ${granted.status}`);
  __signOut();
}

// ============================================================================
console.log("\n== admin is a role, not a flag");
// REGRESSION: `isAdmin` was a second answer to a question roleIds already
// answered, and canAdminister read the flag rather than the permission set.
{
  const adminCtx = await studioContext(viewer.user, slug);      // holds Admin from above
  ok("holding the Admin role administers the studio", canAdminister(adminCtx.access));
  ok("...and resolves to every permission", adminCtx.access.has("finance.cash.delete"));

  const plainCtx = await studioContext(nobody.user, slug);
  ok("holding nothing does not", !canAdminister(plainCtx.access));

  const row = await getCollaboratorByUser(studio.id, viewer.user.id);
  ok("no isAdmin flag is stored", row.isAdmin === undefined, JSON.stringify(row.isAdmin));
}

// ============================================================================
console.log("\n== references survive a deletion");
// REGRESSION: six collections numbered themselves `rows.length + 1`, which is
// counting rather than numbering. Delete one and the next create reuses its
// reference — two invoices bearing INV-0002 is not a cosmetic problem.
{
  const fin = await financeContext(owner, slug);
  const lines = [{ description: "Work", qty: 1, unitPrice: 100 }];
  const a = await createInvoice(fin, { clientName: "Acme", lines });
  const b = await createInvoice(fin, { clientName: "Acme", lines });
  ok("two invoices get two references", a.invoice.reference !== b.invoice.reference,
    `${a.invoice.reference} vs ${b.invoice.reference}`);

  await removeInvoice(fin, b.invoice.id);                       // a draft, so removable
  const c = await createInvoice(fin, { clientName: "Acme", lines });
  ok("the deleted reference is not reissued", c.invoice.reference !== b.invoice.reference,
    `reused ${c.invoice.reference}`);

  const all = (await listInvoices(fin)).map((i) => i.reference);
  ok("every reference on file is unique", new Set(all).size === all.length, all.join(", "));
}

// ============================================================================
console.log("\n== the stock ledger is guarded");
// REGRESSION: adjustStock was the one write in Inventory with no permission
// check of its own, and the route in front of it asked only the coarse
// section-wide question — true for somebody granted nothing but vendors.
{
  const inv = await inventoryContext(owner, slug);
  const item = await createItem(inv, { name: "Widget" });
  ok("owner can register an item", !!item.item, item.error);

  const moved = await adjustStock(inv, { itemId: item.item.id, qty: 5 });
  ok("owner can adjust stock", !!moved.movement, moved.error);

  const viewerInv = await inventoryContext(viewer.user, slug);
  // The Admin role was handed to Viewer above, so take it back first — this
  // block is about somebody who may SEE inventory and not move it.
  await updateCollaborator(studio.id, viewer.collaborator.id, { roleIds: [roleId("Viewer")] });
  const refused = await adjustStock(await inventoryContext(viewer.user, slug), { itemId: item.item.id, qty: -1 });
  ok("a viewer cannot move the ledger", refused.error === "forbidden", JSON.stringify(refused));
  ok("the viewer could still open Inventory", !viewerInv.error, viewerInv.error);
}

// ============================================================================
console.log("\n== leave: taking back your own request");
// REGRESSION: the hr.vacations.approve guard sat above the self-cancel branch
// it was written for, so withdrawing your own pending request required the
// right to decide other people's — and nobody without it could ever withdraw.
{
  const hr = await hrContext(member.user, slug);
  ok("a member can open HR", !hr.error, hr.error);
  ok("...and does NOT hold approve", !hr.access.has("hr.vacations.approve"));

  const asked = await requestVacation(hr, { from: "2026-09-01", to: "2026-09-03", type: "Annual" });
  ok("a member can request their own leave", asked.vacation?.status === "Pending", JSON.stringify(asked));

  const withdrawn = await decideVacation(hr, asked.vacation?.id, "Cancelled");
  ok("...and can cancel it without the approve right", withdrawn.vacation?.status === "Cancelled",
    JSON.stringify(withdrawn));
}

// ============================================================================
console.log("\n== renaming happens now, not at midnight");
// A studio's name and address used to be stored as a request and applied by a
// cron at 00:00. They apply on save. The address is the half that matters: the
// new one has to resolve immediately and the old one has to stop, or a rename
// leaves two live addresses for one studio.
{
  const ownerB = (await createUser({ email: `own2-${rand()}@test.invalid`, passwordHash: "x" })).user;
  const first = `t-${rand()}${rand()}`;
  const made = await createStudio({ ownerUserId: ownerB.id, name: "Before", slug: first });
  ok("fixture studio created", !made.error, made.error);

  const renamed = `t-${rand()}${rand()}`;
  const out = await renameStudio(made.studio.id, { name: "After", slug: renamed });
  ok("the rename reports a change", out.changed === true, JSON.stringify(out.error));
  ok("the name changed on the row", out.studio.name === "After", out.studio.name);

  ok("the new address resolves", (await getStudioBySlug(renamed))?.id === made.studio.id);
  ok("the old address does not", (await getStudioBySlug(first)) === null);

  // The old slug must be RELEASED, not merely unused — otherwise it stays
  // claimed forever and nobody can ever take it.
  ok("the old address is free to claim again", (await getIndex(IX.slug(first))) === null);

  // Two studios cannot share an address, whichever order they ask in.
  const clash = await renameStudio(studio.id, { slug: renamed });
  ok("a taken address is refused", clash.error === "slug-taken", JSON.stringify(clash));
  ok("...and the refused studio keeps its own", (await getStudioBySlug(slug))?.id === studio.id);

  const noop = await renameStudio(made.studio.id, { name: "After", slug: renamed });
  ok("renaming to what it already is changes nothing", noop.changed === false, JSON.stringify(noop));
}

// ============================================================================
console.log("\n== the traffic export");
// The annual email was the only way this data ever left the database, and it is
// gone. So the download that replaced it has to work, and has to be owner-only
// — it answers with every page anyone has visited.
{
  const seeded = await seedSuperAdmin({ email: `sup-${rand()}@test.invalid`, password: "irrelevant-here" });
  ok("a console owner exists to test with", !!seeded.admin, seeded.error);

  __signOut();
  const shut = await EXPORT_CSV(new Request("http://localhost/x"));
  ok("a stranger is refused", shut.status === 401, `got ${shut.status}`);

  const signedIn = await loginSuper(seeded.admin.email, "irrelevant-here");
  ok("the owner can sign in", !!signedIn?.token);
  __signIn(SUPER_COOKIE, signedIn.token);

  const res = await EXPORT_CSV(new Request("http://localhost/x?days=7"));
  ok("the owner gets a file", res.status === 200, `got ${res.status}`);
  ok("...served as CSV", (res.headers.get("content-type") || "").includes("text/csv"));
  ok("...with a filename the browser will save",
    (res.headers.get("content-disposition") || "").includes("attachment; filename="),
    res.headers.get("content-disposition") || "");

  const body = await res.text();
  const blocks = ["date,sessions,page views", "page,views", "continent,visits", "device,visits", "totals,"];
  for (const b of blocks) ok(`...containing the "${b.split(",")[0]}" block`, body.includes(b));
  // The shapes readContinents/readDevices actually return differ from each
  // other; reading either one wrong shows up as a column of blanks rather than
  // an error, so the file is checked for real values and not just headings.
  ok("...with continents filled in, not blank", /\n[A-Za-z][^,\n]*,\d+/.test(body.split("continent,visits")[1] || ""));
  __signOut();
}

// ============================================================================
console.log("\n== cron jobs check who is calling");
// The check used to read `secret && auth !== …`, so an unset CRON_SECRET did not
// tighten it — it deleted it, leaving jobs that delete keys open to anyone who
// knew the path. It fails closed now, and both halves are worth holding: a
// missing secret must refuse, and a present one must still turn strangers away.
{
  const before = process.env.CRON_SECRET;
  const call = (headers) => YEAR_ROLLOVER(new Request("http://localhost/x", { headers }));

  process.env.CRON_SECRET = "";
  ok("no secret configured → refuses", (await call({})).status === 503);

  process.env.CRON_SECRET = "s3cr3t-for-this-test";
  ok("secret set, no credentials → refuses", (await call({})).status === 401);
  ok("...a wrong secret → refuses", (await call({ authorization: "Bearer nope" })).status === 401);
  ok("...the right secret → runs", (await call({ authorization: "Bearer s3cr3t-for-this-test" })).status === 200);
  // Vercel's edge strips inbound x-vercel-* headers, so this is trustworthy
  // where it appears — it is a second door, never a replacement for the secret.
  ok("...Vercel's own cron header → runs", (await call({ "x-vercel-cron": "1" })).status === 200);

  // It reports, it does not destroy: on any day but 1 January it records the
  // snapshot and says so.
  const ran = await (await call({ "x-vercel-cron": "1" })).json();
  ok("a normal day records the snapshot and stops there", ran.skipped === "not new year", JSON.stringify(ran));
  ok("...and counts the active users", typeof ran.active === "number", JSON.stringify(ran.active));

  if (before === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = before;
}

// ============================================================================
// Everything this suite wrote lives under the namespace, so cleanup is one
// prefix deletion. Runs whatever happened above — a failed assertion must not
// leave keys behind.
const swept = await delPrefix(KEY_PREFIX);
console.log(`\nswept ${swept} keys from "${KEY_PREFIX}"`);
await (await getRedisClient()).quit();

console.log(fails ? `\n${fails} FAILURES\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
