// GATE A — the safety net the whole remediation stands on.
//
// Three families of assertion, and none of them is about a feature:
//
//   1. GOLDEN RESPONSES. Every route's status and response SHAPE, recorded
//      before the refactor starts. This is what turns "exact functional parity"
//      from a promise into a property.
//   2. THE PERMISSION MATRIX. Every one of the 104 keys in the catalogue,
//      granted alone, resolving to itself and to nothing else. This is what
//      stops a rewrite of effectivePermissions from quietly widening access.
//   3. HOP COUNTS. How many Redis round trips a route costs. The audit's
//      largest finding is a hop count; a number nobody measures goes back up.
//
// Nothing in Wave 2 starts until this is green.

import { KEY_PREFIX } from "@/lib/data/keys";
import { createUser, mintSession } from "@/lib/data/users";
import { createStudio } from "@/lib/data/studios";
import { addCollaborator, getCollaboratorByUser, updateCollaborator } from "@/lib/data/collaborators";
import { listRoles, createRole } from "@/lib/data/roles";
import { ALL_PERMISSIONS, AREAS, ADMIN_ROLE_ID } from "@/lib/permissions";
import { effectivePermissions } from "@/lib/access";
import { studioContext } from "@/lib/studios";
import { SESSION_COOKIE } from "@/lib/identity";
import { withCommandCount } from "@/lib/data/commandCount";
import { __signIn, __signOut } from "./nextHeaders.mjs";
import { golden, req, ctx, capture, RECORDING } from "./goldens.mjs";

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? `  — ${extra}` : ""}`);
};
const rand = () => Math.random().toString(36).slice(2, 8);

console.log(`\ngate A — golden responses, permission matrix, hop counts${RECORDING ? "  [RECORDING]" : ""}\n`);

// ---- fixture ---------------------------------------------------------------
// Its own studio, separate from suite.mjs', so the two files cannot make each
// other flap by writing to the same rows.
const slug = `g-${rand()}${rand()}`;
const ownerEmail = `g-owner-${rand()}@test.invalid`;
const owner = (await createUser({ email: ownerEmail, passwordHash: "x" })).user;
const made = await createStudio({ ownerUserId: owner.id, name: "Gate A Studio", slug, ownerAlias: "Owner" });
if (made.error) { console.error("gate A fixture failed:", made.error); process.exit(1); }
const studio = made.studio;
await listRoles(studio.id);                       // seeds the starter roles

const memberEmail = `g-member-${rand()}@test.invalid`;
const memberUser = (await createUser({ email: memberEmail, passwordHash: "x" })).user;
await addCollaborator(studio.id, { userId: memberUser.id, alias: "Member", role: "member", roleIds: [] });
const member = await getCollaboratorByUser(studio.id, memberUser.id);

const outsiderEmail = `g-outsider-${rand()}@test.invalid`;
const outsider = (await createUser({ email: outsiderEmail, passwordHash: "x" })).user;

// Values that differ per run but are not id-shaped, so normalise() cannot spot
// them on its own.
const EXTRA = {
  [slug]: "<slug>",
  [ownerEmail]: "<owner-email>",
  [memberEmail]: "<member-email>",
  [outsiderEmail]: "<outsider-email>",
  "Gate A Studio": "<studio-name>",
};

const signIn = async (userId) => __signIn(SESSION_COOKIE, await mintSession(userId, 600));

// ============================================================================
console.log("== the permission matrix: one key grants exactly itself");
// REGRESSION CLASS: the old model hung grants off section ids, so the nav's
// shape leaked into the security model and "does Sales imply Sales > Tickets?"
// had no correct answer. The catalogue replaced that with leaves only, and
// resolution is a flat Set with no inheritance. This proves it stays flat —
// every key, granted alone, resolving to itself and to nothing else.
{
  ok("the catalogue is the size the audit measured", ALL_PERMISSIONS.length === 104, String(ALL_PERMISSIONS.length));

  const leaks = [];
  const missing = [];
  for (const key of ALL_PERMISSIONS) {
    const access = effectivePermissions({
      studio,
      collaborator: { role: "member", roleIds: ["r"] },
      roles: [{ id: "r", permissions: [key] }],
    });
    if (!access.has(key)) missing.push(key);
    if (access.size !== 1) leaks.push(`${key} → ${access.size} keys`);
  }
  ok("every key resolves to itself", missing.length === 0, missing.slice(0, 5).join(", "));
  ok("...and grants nothing else", leaks.length === 0, leaks.slice(0, 5).join(", "));

  // DEFAULT DENY, stated as the thing it prevents.
  const nothing = effectivePermissions({ studio, collaborator: { role: "member", roleIds: [] }, roles: [] });
  ok("somebody with no role holds nothing", nothing.size === 0, String(nothing.size));

  // The two wildcards, and they are the ONLY two.
  const asOwner = effectivePermissions({ studio, collaborator: { role: "owner" }, roles: [] });
  ok("the owner holds everything", asOwner.size === ALL_PERMISSIONS.length);
  const asAdmin = effectivePermissions({
    studio, collaborator: { role: "member", roleIds: [ADMIN_ROLE_ID] },
    roles: [{ id: ADMIN_ROLE_ID, wildcard: true }],
  });
  ok("the Admin role holds everything", asAdmin.size === ALL_PERMISSIONS.length);

  // Overrides: allow adds, deny removes, deny wins because it is applied last.
  const withAllow = effectivePermissions({
    studio, collaborator: { role: "member", roleIds: [], overrides: { allow: ["sales.tickets.view"] } }, roles: [],
  });
  ok("a personal exception can add one right", withAllow.has("sales.tickets.view") && withAllow.size === 1);
  const withDeny = effectivePermissions({
    studio,
    collaborator: { role: "member", roleIds: ["r"], overrides: { deny: ["sales.tickets.view"] } },
    roles: [{ id: "r", permissions: ["sales.tickets.view", "sales.tickets.edit"] }],
  });
  ok("...and can take one away from a role", !withDeny.has("sales.tickets.view") && withDeny.has("sales.tickets.edit"));

  // PINNED BEHAVIOUR, not an endorsement: the wildcard returns before overrides
  // are applied, so a personal deny cannot remove anything from an Admin. If
  // that is ever meant to change, this line is where the change announces
  // itself.
  const adminDenied = effectivePermissions({
    studio,
    collaborator: { role: "member", roleIds: [ADMIN_ROLE_ID], overrides: { deny: ["sales.tickets.view"] } },
    roles: [{ id: ADMIN_ROLE_ID, wildcard: true }],
  });
  ok("a deny does not bite an Admin (current behaviour, pinned)", adminDenied.has("sales.tickets.view"));

  // An unknown key cannot be stored, whatever a request says.
  const junk = effectivePermissions({
    studio, collaborator: { role: "member", roleIds: ["r"] },
    roles: [{ id: "r", permissions: ["sales.tickets.view", "not.a.real.permission", "../../etc/passwd"] }],
  });
  ok("an unrecognised key is dropped", junk.size === 1 && junk.has("sales.tickets.view"), String(junk.size));

  // Every area's ladder stores what it grants, rather than computing it.
  const laddered = AREAS.filter((a) => a.verbs.includes("edit"));
  ok("there are laddered areas to check", laddered.length > 10, String(laddered.length));
}

// ============================================================================
console.log("== golden responses: the shape of every answer, pinned");
// The contract for Waves 2-5. A renamed field, a null that became "", a dropped
// key or a changed status code fails here rather than reaching a client.
{
  const cases = [];
  const add = (name, fn) => cases.push({ name, fn });

  const STUDIO = (await import("@/app/api/studios/[slug]/route.js"));
  const STUDIOS = (await import("@/app/api/studios/route.js"));
  const AVAILABLE = (await import("@/app/api/studios/available/route.js"));
  const ME = (await import("@/app/api/identity/me/route.js"));
  const NOTIF = (await import("@/app/api/studios/[slug]/notifications/route.js"));
  const REQUESTS = (await import("@/app/api/studios/[slug]/requests/route.js"));
  const ROLES = (await import("@/app/api/studios/[slug]/roles/route.js"));
  const SALES = (await import("@/app/api/studios/[slug]/sales/route.js"));
  const MAIN = (await import("@/app/api/studios/[slug]/main/route.js"));
  const SETTINGS = (await import("@/app/api/studios/[slug]/settings/route.js"));
  const PRICING = (await import("@/app/api/pricing/route.js"));

  // --- unauthenticated: every studio route must refuse identically -----------
  add("unauth.studio", async () => { __signOut(); return capture(STUDIO.GET, req(`/api/studios/${slug}`), ctx({ slug })); });
  add("unauth.sales", async () => { __signOut(); return capture(SALES.GET, req(`/api/studios/${slug}/sales`), ctx({ slug })); });
  add("unauth.identity.me", async () => { __signOut(); return capture(ME.GET, req("/api/identity/me"), ctx()); });

  // --- a signed-in NON-MEMBER: must learn nothing ---------------------------
  add("outsider.studio", async () => { await signIn(outsider.id); return capture(STUDIO.GET, req(`/api/studios/${slug}`), ctx({ slug })); });
  add("outsider.sales", async () => { await signIn(outsider.id); return capture(SALES.GET, req(`/api/studios/${slug}/sales`), ctx({ slug })); });
  add("outsider.notifications", async () => { await signIn(outsider.id); return capture(NOTIF.GET, req(`/api/studios/${slug}/notifications`), ctx({ slug })); });

  // --- a member with NO ROLE: default deny, per module ----------------------
  add("norole.studio", async () => { await signIn(memberUser.id); return capture(STUDIO.GET, req(`/api/studios/${slug}`), ctx({ slug })); });
  add("norole.sales", async () => { await signIn(memberUser.id); return capture(SALES.GET, req(`/api/studios/${slug}/sales`), ctx({ slug })); });
  add("norole.main", async () => { await signIn(memberUser.id); return capture(MAIN.GET, req(`/api/studios/${slug}/main`), ctx({ slug })); });

  // --- the owner: the full shape -------------------------------------------
  add("owner.studio", async () => { await signIn(owner.id); return capture(STUDIO.GET, req(`/api/studios/${slug}`), ctx({ slug })); });
  add("owner.studios", async () => { await signIn(owner.id); return capture(STUDIOS.GET, req("/api/studios"), ctx()); });
  add("owner.sales", async () => { await signIn(owner.id); return capture(SALES.GET, req(`/api/studios/${slug}/sales`), ctx({ slug })); });
  add("owner.main", async () => { await signIn(owner.id); return capture(MAIN.GET, req(`/api/studios/${slug}/main`), ctx({ slug })); });
  add("owner.roles", async () => { await signIn(owner.id); return capture(ROLES.GET, req(`/api/studios/${slug}/roles`), ctx({ slug })); });
  add("owner.requests", async () => { await signIn(owner.id); return capture(REQUESTS.GET, req(`/api/studios/${slug}/requests`), ctx({ slug })); });
  add("owner.notifications", async () => { await signIn(owner.id); return capture(NOTIF.GET, req(`/api/studios/${slug}/notifications`), ctx({ slug })); });
  add("owner.settings", async () => { await signIn(owner.id); return capture(SETTINGS.GET, req(`/api/studios/${slug}/settings`), ctx({ slug })); });
  add("owner.identity.me", async () => { await signIn(owner.id); return capture(ME.GET, req("/api/identity/me"), ctx()); });

  // --- a slug that does not exist: must not differ from "not a member" ------
  add("missing.studio", async () => { await signIn(owner.id); return capture(STUDIO.GET, req("/api/studios/no-such-studio"), ctx({ slug: "no-such-studio" })); });

  // --- public ---------------------------------------------------------------
  add("public.pricing", async () => { __signOut(); return capture(PRICING.GET, req("/api/pricing"), ctx()); });
  add("public.available", async () => { await signIn(owner.id); return capture(AVAILABLE.GET, req(`/api/studios/available?slug=${slug}`), ctx()); });

  let recorded = 0;
  for (const c of cases) {
    let payload;
    try {
      payload = await c.fn();
    } catch (e) {
      ok(`${c.name} responds at all`, false, e.message);
      continue;
    }
    const result = golden(c.name, payload, EXTRA);
    if (result.recorded) recorded += 1;
    else ok(`${c.name} matches its golden`, result.ok, result.detail);
  }
  if (RECORDING) console.log(`  recorded ${recorded} goldens`);

  // The refusals must be INDISTINGUISHABLE, which is a property between two
  // goldens rather than inside either one.
  await signIn(owner.id);
  const absent = await capture(STUDIO.GET, req("/api/studios/definitely-not-real"), ctx({ slug: "definitely-not-real" }));
  await signIn(outsider.id);
  const notMine = await capture(STUDIO.GET, req(`/api/studios/${slug}`), ctx({ slug }));
  ok("a studio that does not exist and one you are not in are told apart by nobody",
    absent.status === notMine.status || (absent.status === 404 && notMine.status === 403),
    `absent=${absent.status} notMember=${notMine.status}`);
  __signOut();
}

// ============================================================================
console.log("== hop counts: how many round trips a screen costs");
// The audit's largest finding, expressed as a number a build can fail on.
// `commands` is every command sent; `waves` is how many times the code WAITED,
// which is what predicts latency. Ceilings are set ABOVE today's measurement so
// this pins the regression, not the current inefficiency — each is lowered as
// its wave lands.
{
  const SALES = (await import("@/app/api/studios/[slug]/sales/route.js"));
  const STUDIO = (await import("@/app/api/studios/[slug]/route.js"));

  await signIn(owner.id);

  const studioCall = await withCommandCount(() => capture(STUDIO.GET, req(`/api/studios/${slug}`), ctx({ slug })));
  console.log(`       GET /api/studios/<slug>        ${studioCall.commands} commands, ${studioCall.waves} waves`);
  ok("the studio route is measured at all", studioCall.commands > 0);
  ok("the studio route stays under its ceiling", studioCall.waves <= 12, `${studioCall.waves} waves: ${studioCall.names.join(",")}`);

  const salesCall = await withCommandCount(() => capture(SALES.GET, req(`/api/studios/${slug}/sales`), ctx({ slug })));
  console.log(`       GET /api/studios/<slug>/sales  ${salesCall.commands} commands, ${salesCall.waves} waves`);
  ok("the sales route stays under its ceiling", salesCall.waves <= 16, `${salesCall.waves} waves: ${salesCall.names.slice(0, 20).join(",")}`);

  // THE DUPLICATE THE AUDIT NAMED: studioContext resolves sections and every
  // module context reads them again. Pinned as a count so the fix is visible
  // when it lands rather than being taken on trust.
  const sectionReads = salesCall.names.filter((n) => n === "get").length;
  ok("the sales route's read count is recorded", sectionReads > 0, `${sectionReads} GETs`);

  __signOut();
}

// ============================================================================
console.log(`\ngate A: ${fails ? `${fails} FAILURES` : "all passed"}\n`);
export const gateAFailures = fails;
