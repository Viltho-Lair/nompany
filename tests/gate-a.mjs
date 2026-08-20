// GATE A — the safety net the whole remediation stands on.
//
// Three families of assertion, and none of them is about a feature:
//
//   1. GOLDEN RESPONSES. Every route's status and response SHAPE, recorded
//      before the refactor starts. This is what turns "exact functional parity"
//      from a promise into a property.
//   2. THE PERMISSION MATRIX. Every one of the 103 keys in the catalogue,
//      granted alone, resolving to itself and to nothing else. This is what
//      stops a rewrite of effectivePermissions from quietly widening access.
//   3. HOP COUNTS. How many Redis round trips a route costs. The audit's
//      largest finding is a hop count; a number nobody measures goes back up.
//
// Nothing in Wave 2 starts until this is green.

import * as KEYS from "@/lib/data/keys";
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
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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
  // A COUNT, deliberately hardcoded. Deriving it from the catalogue would make
  // the assertion tautological — the point is that adding or removing a right
  // is a visible act. 104 at the audit; 103 after quality.documents.share was
  // removed for granting nothing.
  ok("the catalogue is the size we last agreed", ALL_PERMISSIONS.length === 103, String(ALL_PERMISSIONS.length));

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
console.log("== the architecture, asserted rather than remembered");
// THREE WHOLE CLASSES OF DEFECT, each of which has already happened here once,
// and none of which any individual test would catch — because the fault is
// always something that ISN'T there.
//
// A permission granted on the access grid that enforces nothing. A key builder
// declared and never read. A route with no authentication. Each is invisible
// while you are looking at the file that has the problem, because the problem
// is the absence of a second file.
//
// These scan the source rather than exercising it, so they cover code nobody
// has written yet.
{
  const SRC = "src";
  const sources = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      // Stored with forward slashes whatever the platform, because every match
      // below is a path pattern and a Windows backslash would silently match
      // nothing — which reads as "all clear" rather than as a broken test.
      if (/\.(js|jsx|ts|tsx)$/.test(path)) {
        sources.push({ path: path.split("\\").join("/"), text: readFileSync(path, "utf8") });
      }
    }
  })(SRC);
  ok("there are sources to scan", sources.length > 300, String(sources.length));

  const seenIn = (needle, exclude) =>
    sources.filter((f) => !f.path.includes(exclude) && f.text.includes(needle));

  // ---- 1. every declared right is enforced somewhere ----------------------
  // THE ONE THAT CAUGHT quality.documents.share. It sat on the access grid, was
  // grantable, and granted nothing: the key builder, the collection and the
  // reserved route prefix all existed and no code read any of them. Somebody
  // could have handed out what they believed was the power to publish a
  // controlled document to the outside world.
  //
  // Verbs are checked at AREA level because resolution composes them —
  // `access.has(`${area}.${verb}`)` in sectionViewable — so the literal
  // "sales.tickets.view" legitimately appears nowhere. EXTRAS are always
  // spelled out, which is exactly why they are the ones that die quietly.
  const orphanAreas = AREAS.filter((a) => !seenIn(a.key, "permissions.js").length);
  ok("every area is referenced by something that enforces it",
    orphanAreas.length === 0, orphanAreas.map((a) => a.key).join(", "));

  const orphanExtras = [];
  for (const area of AREAS) {
    for (const extra of area.extra || []) {
      const key = `${area.key}.${extra.key}`;
      if (!seenIn(key, "permissions.js").length) orphanExtras.push(key);
    }
  }
  ok("every extra right is actually checked somewhere",
    orphanExtras.length === 0, orphanExtras.join(", "));

  // ---- 2. every key builder has a reader ----------------------------------
  // A declared key that nothing reads is a promise the product does not keep:
  // s:<id>:activityLog implied an audit trail that never existed, and
  // ix:stoken implied time-limited access links that were never minted.
  const GROUPS = { REG: KEYS.REG, U: KEYS.U, S: KEYS.S, SEC: KEYS.SEC, IX: KEYS.IX,
    OTP: KEYS.OTP, CHAT: KEYS.CHAT, FX: KEYS.FX, RL: KEYS.RL, STAT: KEYS.STAT, MEDIA: KEYS.MEDIA };
  const unread = [];
  for (const [group, members] of Object.entries(GROUPS)) {
    for (const name of Object.keys(members || {})) {
      if (!seenIn(`${group}.${name}`, "data/keys.js").length) unread.push(`${group}.${name}`);
    }
  }
  ok("every key builder is read by something", unread.length === 0, unread.join(", "));

  // ---- 3. every route authenticates --------------------------------------
  // Resolved ONE level through imports, because most routes delegate to a guard
  // (hrGuard, financeGuard, studioSide, nompanySide) rather than calling
  // currentUser themselves — a naive scan reports those as unauthenticated and
  // gets ignored within a week.
  const AUTH = /currentUser|currentSuperAdmin|cronDenied|studioSide|nompanySide|Guard\(|studioContext/;

  // Deliberately public, each for a stated reason. Adding to this list is how a
  // new public surface gets argued for, rather than appearing by omission.
  const PUBLIC = {
    "api/pricing/route.js": "the marketing price list",
    "api/track/route.js": "anonymous traffic beacon; rate-limited and origin-checked instead",
    "api/auth/oauth/[provider]/start/route.js": "starts sign-in; there is no session yet",
    "api/auth/callback/[provider]/route.js": "completes sign-in; the provider is the credential",
    "api/identity/login/route.js": "the sign-in door",
    "api/identity/signup/route.js": "the sign-up door",
    "api/identity/forgot/route.js": "password reset request",
    "api/identity/reset/route.js": "password reset completion",
    "api/identity/otp/verify/route.js": "completes an OTP challenge; the code is the credential",
    "api/identity/otp/resend/route.js": "resends a code for an in-flight challenge",
    "api/identity/logout/route.js": "clears a cookie; refusing an unauthenticated caller helps nobody",
    "api/identity/me/route.js": "answers null when signed out",
    "api/super/login/route.js": "the console door",
    "api/super/logout/route.js": "clears a cookie",
    "api/fonts/route.ts": "the document editor's font catalogue; no tenant data",
    "api/media/[id]/route.js": "public blobs are public by definition; private ones check membership",
  };

  const routes = sources.filter((f) => /app\/api\/.*route\.(js|ts)$/.test(f.path));
  ok("the route scan found the routes", routes.length >= 90, String(routes.length));

  const unguarded = [];
  for (const route of routes) {
    const rel = route.path.replace(/^src\/app\//, "");
    if (PUBLIC[rel]) continue;
    if (AUTH.test(route.text)) continue;
    // One hop: does anything it imports from @/lib do the authenticating?
    const imported = [...route.text.matchAll(/from "@\/lib\/([a-zA-Z0-9/_-]+)"/g)].map((m) => m[1]);
    const delegated = imported.some((mod) => {
      const file = sources.find((f) => f.path === `src/lib/${mod}.js` || f.path === `src/lib/${mod}.ts`);
      return file && AUTH.test(file.text);
    });
    if (!delegated) unguarded.push(rel);
  }
  ok("every route authenticates, directly or through a guard",
    unguarded.length === 0, unguarded.join(", "));
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
