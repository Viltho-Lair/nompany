// GATE A — the safety net the whole remediation stands on.
//
// Three families of assertion, and none of them is about a feature:
//
//   1. GOLDEN RESPONSES. Every route's status and response SHAPE, recorded
//      before the refactor starts. This is what turns "exact functional parity"
//      from a promise into a property.
//   2. THE PERMISSION MATRIX. Every one of the 102 keys in the catalogue,
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
import { STATUS } from "@/lib/httpStatus";
import { effectivePermissions } from "@/lib/access";
import { studioContext } from "@/lib/studios";
import { SESSION_COOKIE } from "@/lib/identity";
import { seedSuperAdmin, loginSuper, SUPER_COOKIE } from "@/lib/superAuth";
import { withCommandCount } from "@/lib/data/commandCount";
import { withRequest, requestId, redact, log } from "@/lib/observability";
import { readArr, setJSON } from "@/lib/data/store";
import { readCol } from "@/lib/data/sections";
import { S } from "@/lib/data/keys";
import { __signIn, __signOut } from "./nextHeaders.mjs";
import { golden, req, ctx, capture, RECORDING, touched } from "./goldens.mjs";
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

// A DATE THE APP TOOK FROM ITS OWN CLOCK IS NOT A CONSTANT, and recording one
// as though it were is how a golden suite starts failing on a calendar rather
// than on a change.
//
// Five goldens carried a literal `2026-08-20`: an invoice's issueDate, an
// expense's date, a project's receivedDate, and both ends of the operations
// week window. Every one of those is `new Date()` inside the service, so all
// five would have failed the following morning — and the week window, being
// today through today+6, would have failed every single day after recording.
// Nothing in the product would have changed. The suite was pinning the clock.
//
// Computed in UTC because every producer is: finance.js and projects.js slice
// toISOString(), and operations.js weekWindow() carries its own comment about
// why the window is built in one zone throughout. Taking local time here would
// leave the placeholder matching nothing anywhere east of Greenwich — which is
// precisely the machine that recorded these files, and precisely the mismatch
// against a CI runner that thinks in UTC.
const utcDay = (offset = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

// Values that differ per run but are not id-shaped, so normalise() cannot spot
// them on its own.
const EXTRA = {
  [slug]: "<slug>",
  [ownerEmail]: "<owner-email>",
  [memberEmail]: "<member-email>",
  [outsiderEmail]: "<outsider-email>",
  "Gate A Studio": "<studio-name>",
  [utcDay(0)]: "<today>",
  [utcDay(6)]: "<today+6>",   // the far end of the operations week window
};

// THE SUBSTITUTION ABOVE IS A BLIND STRING REPLACE, which is fine until a
// fixture date happens to land on today or today+6 — then a date the test
// deliberately chose gets rewritten into a placeholder, and its golden fails
// for a reason that has nothing to do with the code.
//
// The fixtures are read out of this file rather than listed here, so the check
// cannot go stale the way a hand-maintained copy would. The nearest one is
// twelve days out, so this cannot fire today; it fires on the morning somebody
// adds a date near now, and it says what to do about it.
{
  const fixtureDates = new Set(
    (readFileSync(new URL(import.meta.url), "utf8").match(/"20\d\d-\d\d-\d\d"/g) || [])
      .map((s) => s.slice(1, -1)));
  const collisions = [utcDay(0), utcDay(6)].filter((d) => fixtureDates.has(d));
  ok("no fixture date collides with a clock-derived placeholder",
    collisions.length === 0,
    collisions.length
      ? `${collisions.join(", ")} is both a fixture and today/today+6 — move the fixture further out`
      : "");
}

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
  // removed for granting nothing; 102 after quality.documents.setup went the
  // same way, for the same reason, found by the same check.
  ok("the catalogue is the size we last agreed", ALL_PERMISSIONS.length === 102, String(ALL_PERMISSIONS.length));

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
  // THE PRICING RESPONSE CARRIES AN FX TABLE, and the first recording of it
  // baked in about a hundred and fifty LIVE MARKET RATES. That golden was
  // wrong in three separate ways at once:
  //
  //   1. It failed in CI, which is how it was found. CI has no
  //      EXCHANGERATE_API_KEY — deliberately, because nobody wants a test
  //      suite spending a metered quota — so the fetch threw, the snapshot
  //      came back empty, and `rates` was {} against a golden full of numbers.
  //   2. It would have failed in production too, on the first day the API
  //      republished. Rates move daily. Nothing about the product would have
  //      changed.
  //   3. Locally it PASSED, and that was the worst part: this machine has a
  //      real key in .env.local, so every run of the suite was making a live
  //      call to a metered third-party API to fetch data it then asserted
  //      against. The test was buying its own expected values.
  //
  // Seeded instead, with a table small enough to read and check by hand. The
  // route derives every pair by division — rate(SAR→X) = usd[X] / usd[SAR] —
  // so USD lands on 1/3.75 and SAR on exactly 1, and that arithmetic is the
  // thing actually worth pinning. `nextUpdateAt` is far enough out that
  // isFresh() is always true, which is what stops the network call.
  await setJSON(KEYS.FX.snapshot, {
    base: "USD",
    rates: { USD: 1, SAR: 3.75, EUR: 0.92, GBP: 0.79, AED: 3.67, JPY: 150 },
    updatedAt: 1750000000,
    nextUpdateAt: 4102444800,   // 2100-01-01, i.e. never stale inside a test run
    fetchedAt: 1750000000,
  });
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
console.log("== sales: the module's whole surface, with data in it");
// The empty-state goldens above are worth having and are not enough: a response
// shape only shows itself once there is a row in it. Every case here seeds
// THROUGH THE REAL ROUTES rather than through the repositories, so the write
// paths are pinned alongside the reads and the seeding is itself under test.
//
// It also pins the thing the audit called M-8. Sales routes gate writes on a
// COARSE flag first — canManage, meaning "any write on any area of this module"
// — and the fine-grained requirePermission lives inside the service. That is
// defence in depth working, and it means two different callers get two
// different refusals for what looks like the same act: somebody with no write
// anywhere is told "read-only" by the gate, and somebody with a write in a
// SIBLING area gets past the gate and is told "forbidden" by the service.
//
// Both are correct. Neither was written down. Both are goldens now.
{
  const CLIENTS = await import("@/app/api/studios/[slug]/sales/clients/route.js");
  const SERVICES = await import("@/app/api/studios/[slug]/sales/services/route.js");
  const TICKETS = await import("@/app/api/studios/[slug]/sales/tickets/route.js");
  const RFQ = await import("@/app/api/studios/[slug]/sales/tickets/rfq/route.js");
  const QUOTATIONS = await import("@/app/api/studios/[slug]/sales/quotations/route.js");
  const SALES = await import("@/app/api/studios/[slug]/sales/route.js");

  const P = ctx({ slug });
  const shot = async (name, payload) => {
    const r = golden(name, payload, EXTRA);
    if (!r.recorded) ok(`${name} matches its golden`, r.ok, r.detail);
    return payload;
  };

  // ---- somebody who may do exactly one thing -----------------------------
  // Built per case so a test never depends on a role another test edited.
  const personWith = async (permissions, alias) => {
    const u = (await createUser({ email: `g-${alias}-${rand()}@test.invalid`, passwordHash: "x" })).user;
    const role = await createRole(studio.id, { name: `role-${alias}`, permissions });
    await addCollaborator(studio.id, { userId: u.id, alias, role: "member", roleIds: [role.id] });
    return u;
  };

  await signIn(owner.id);

  // ---- seed, and pin what each create answers ----------------------------
  const service = await shot("sales.service.created", await capture(
    SERVICES.POST, req(`/api/studios/${slug}/sales/services`, { method: "POST", body: { name: "Audio Visual Solutions" } }), P));
  const serviceId = service.body?.service?.id;
  ok("the service was created", Boolean(serviceId), JSON.stringify(service.body).slice(0, 120));

  const client = await shot("sales.client.created", await capture(
    CLIENTS.POST, req(`/api/studios/${slug}/sales/clients`, { method: "POST", body: { name: "Acme Holdings", country: "Saudi Arabia", city: "Riyadh" } }), P));
  const clientId = client.body?.client?.id;
  ok("the client was created", Boolean(clientId), JSON.stringify(client.body).slice(0, 120));

  const ticket = await shot("sales.ticket.created", await capture(
    TICKETS.POST, req(`/api/studios/${slug}/sales/tickets`, { method: "POST", body: {
      title: "Boardroom refit", clientId, industry: "Commercial", deadline: "2026-12-01",
      serviceIds: [serviceId],
    } }), P));
  const ticketId = ticket.body?.ticket?.id;
  ok("the ticket was created", Boolean(ticketId), JSON.stringify(ticket.body).slice(0, 120));

  // STATUS IS AUTOMATED UP TO APPROVAL. A new ticket is a Lead, whatever the
  // request asked for — pinned because it is a rule a screen could quietly
  // start overriding.
  ok("a new ticket is a Lead", ticket.body?.ticket?.status === "Lead", ticket.body?.ticket?.status);
  ok("...and Normal urgency, even for the owner", ticket.body?.ticket?.urgency === "Normal", ticket.body?.ticket?.urgency);

  const forced = await capture(TICKETS.POST, req(`/api/studios/${slug}/sales/tickets`, { method: "POST", body: {
    title: "Cannot start won", clientId, industry: "Commercial", deadline: "2026-12-02",
    serviceIds: [serviceId], status: "Closed Won", urgency: "Critical",
  } }), P);
  ok("a ticket cannot be born already won", forced.body?.ticket?.status === "Lead", forced.body?.ticket?.status);

  await shot("sales.ticket.edited", await capture(
    TICKETS.PUT, req(`/api/studios/${slug}/sales/tickets`, { method: "PUT", body: { id: ticketId, title: "Boardroom refit, phase 1" } }), P));

  // ---- the RFQ hop: Sales asks, and the ticket moves ---------------------
  await shot("sales.rfq.requested", await capture(
    RFQ.POST, req(`/api/studios/${slug}/sales/tickets/rfq`, { method: "POST", body: { ticketId, note: "Two rooms, ceiling mics" } }), P));

  // ---- the populated read, which is the shape the screen actually gets ----
  const populated = await capture(SALES.GET, req(`/api/studios/${slug}/sales`), P);
  await shot("sales.list.populated", populated);
  // Found BY ID, not by position. listTickets sorts newest-first, so `[0]` is
  // whichever ticket was created last — an assertion that passes or fails on
  // the order other cases happen to run in is worse than no assertion.
  const raised = populated.body?.tickets?.find((t) => t.id === ticketId);
  ok("the ticket comes back in the list", Boolean(raised), `${populated.body?.tickets?.length ?? 0} tickets`);
  ok("...carrying its client's name, resolved not stored", raised?.clientName === "Acme Holdings", raised?.clientName);
  ok("...and the RFQ moved it to Opportunity", raised?.status === "Opportunity", raised?.status);

  // The OTHER ticket had no RFQ raised against it, so it is still a Lead. The
  // pair is the assertion: the move is caused by the RFQ, not by time passing.
  const untouched = populated.body?.tickets?.find((t) => t.title === "Cannot start won");
  ok("a ticket with no RFQ stays a Lead", untouched?.status === "Lead", untouched?.status);

  // ---- a quotation that does not exist is a 404, not a leak --------------
  await shot("sales.quotation.missing", await capture(
    QUOTATIONS.GET, req(`/api/studios/${slug}/sales/quotations?id=quo_doesnotexist0000`), P));

  // ---- refusals: the two shapes, and why they differ ---------------------
  const viewer = await personWith(["sales.tickets.view"], "salesviewer");
  await signIn(viewer.id);
  await shot("sales.refused.readonly.ticket", await capture(
    TICKETS.POST, req(`/api/studios/${slug}/sales/tickets`, { method: "POST", body: { title: "Nope", clientId, industry: "Commercial", deadline: "2026-12-03", serviceIds: [serviceId] } }), P));
  await shot("sales.refused.readonly.client", await capture(
    CLIENTS.POST, req(`/api/studios/${slug}/sales/clients`, { method: "POST", body: { name: "Nope Ltd" } }), P));

  // A SIBLING WRITE gets past the coarse gate and is refused by the service.
  const clerk = await personWith(["sales.clients.view", "sales.clients.create"], "salesclerk");
  await signIn(clerk.id);
  await shot("sales.refused.forbidden.ticket", await capture(
    TICKETS.POST, req(`/api/studios/${slug}/sales/tickets`, { method: "POST", body: { title: "Not mine to raise", clientId, industry: "Commercial", deadline: "2026-12-03", serviceIds: [serviceId] } }), P));
  await shot("sales.allowed.client", await capture(
    CLIENTS.POST, req(`/api/studios/${slug}/sales/clients`, { method: "POST", body: { name: "Second Client" } }), P));

  // Settings answer to their own right, not to "can write in Sales".
  await shot("sales.refused.settings", await capture(
    SERVICES.POST, req(`/api/studios/${slug}/sales/services`, { method: "POST", body: { name: "Sneaky Service" } }), P));

  // ---- and a member of NO studio sees the same wall ----------------------
  await signIn(outsider.id);
  await shot("sales.outsider.ticket", await capture(
    TICKETS.POST, req(`/api/studios/${slug}/sales/tickets`, { method: "POST", body: { title: "Not even a member", clientId, industry: "Commercial", deadline: "2026-12-03", serviceIds: [serviceId] } }), P));

  __signOut();
  await shot("sales.unauth.ticket", await capture(
    TICKETS.POST, req(`/api/studios/${slug}/sales/tickets`, { method: "POST", body: { title: "Not even signed in" } }), P));
}

// ============================================================================
console.log("== technical: converting, locking, and the rights that are not bigger edits");
// The other half of the order-to-cash spine. Three rules here are the sharpest
// in the product, and all three are the kind that a refactor "simplifies" away
// because each looks like a special case of something else:
//
//   CONVERT is not a bigger EDIT. technical.rfq.convert is an `extra`, granted
//   deliberately, because turning a request into a priced document is a
//   different act from correcting one.
//
//   LOCK and UNLOCK are two rights, and unlock is the larger. Locking says "this
//   is finished"; unlocking reopens a document a client is already holding.
//
//   A LOCKED QUOTATION ACCEPTS EXACTLY ONE REQUEST — the unlock, alone.
//   Bundling an unlock with an edit would be a way to smuggle a change past the
//   lock in a single write.
{
  const RFQS = await import("@/app/api/studios/[slug]/technical/rfqs/route.js");
  const QUOTES = await import("@/app/api/studios/[slug]/technical/quotations/route.js");
  const TECH = await import("@/app/api/studios/[slug]/technical/route.js");

  const P = ctx({ slug });
  const shot = async (name, payload) => {
    const r = golden(name, payload, EXTRA);
    if (!r.recorded) ok(`${name} matches its golden`, r.ok, r.detail);
    return payload;
  };
  const personWith = async (permissions, alias) => {
    const u = (await createUser({ email: `g-${alias}-${rand()}@test.invalid`, passwordHash: "x" })).user;
    const role = await createRole(studio.id, { name: `role-${alias}`, permissions });
    await addCollaborator(studio.id, { userId: u.id, alias, role: "member", roleIds: [role.id] });
    return u;
  };

  await signIn(owner.id);

  // The Technical board, as Technical sees it — the RFQ Sales raised is here.
  const board = await shot("technical.list", await capture(TECH.GET, req(`/api/studios/${slug}/technical`), P));
  const rfqId = board.body?.rfqs?.find((r) => r.status === "New")?.id;
  ok("Sales' RFQ arrived on the Technical board", Boolean(rfqId), `${board.body?.rfqs?.length ?? 0} rfqs`);

  // ---- convert is its own right ------------------------------------------
  // Somebody who may EDIT an RFQ but was not given `convert`. They get past the
  // coarse gate — they hold a write in this module — and the service refuses.
  const editor = await personWith(["technical.rfq.view", "technical.rfq.create", "technical.rfq.edit"], "techeditor");
  await signIn(editor.id);
  await shot("technical.refused.convert", await capture(
    QUOTES.POST, req(`/api/studios/${slug}/technical/quotations`, { method: "POST", body: { rfqId } }), P));

  await signIn(owner.id);
  const converted = await shot("technical.quotation.converted", await capture(
    QUOTES.POST, req(`/api/studios/${slug}/technical/quotations`, { method: "POST", body: { rfqId } }), P));
  const quotationId = converted.body?.quotation?.id;
  ok("the RFQ converted to a quotation", Boolean(quotationId), JSON.stringify(converted.body).slice(0, 120));

  // THE ONE RECIPROCAL EDGE IN THE WHOLE GRAPH. Every other link is held by the
  // child alone; converting writes the quotation's id back onto the RFQ, so
  // this is the single place a back-pointer is a fact rather than a copy.
  const after = await capture(TECH.GET, req(`/api/studios/${slug}/technical`), P);
  const sourceRfq = after.body?.rfqs?.find((r) => r.id === rfqId);
  ok("the RFQ now points at the quotation it became", sourceRfq?.quotationId === quotationId, sourceRfq?.quotationId);
  ok("...and is marked Converted", sourceRfq?.status === "Converted", sourceRfq?.status);

  // Converting the same RFQ twice is a conflict, not a second quotation.
  await shot("technical.refused.convert.twice", await capture(
    QUOTES.POST, req(`/api/studios/${slug}/technical/quotations`, { method: "POST", body: { rfqId } }), P));

  // ---- lock is its own right too -----------------------------------------
  const pricer = await personWith(
    ["technical.quotations.view", "technical.quotations.create", "technical.quotations.edit"], "techpricer");
  await signIn(pricer.id);
  await shot("technical.quotation.edited.bypricer", await capture(
    QUOTES.PUT, req(`/api/studios/${slug}/technical/quotations`, { method: "PUT", body: { id: quotationId, title: "Boardroom refit — priced" } }), P));
  // The RIGHT is checked before the STATE, so somebody without technical
  // .quotations.lock is told they may not lock rather than that the document is
  // not ready — which is the more useful answer, and the one that does not leak
  // where the document has got to.
  const noLock = await shot("technical.refused.lock", await capture(
    QUOTES.PUT, req(`/api/studios/${slug}/technical/quotations`, { method: "PUT", body: { id: quotationId, locked: true } }), P));
  ok("a missing lock right is reported as the right, not the state",
    noLock.body?.error === "forbidden", noLock.body?.error);

  // LOCKING IS NOT AVAILABLE UNTIL THE DOCUMENT IS APPROVED, and this refusal
  // is worth pinning on its own: it is asked of the APPROVAL rather than of the
  // document's own status, which was once a real bug — a quotation both
  // authorities had signed showed Approved in the list and still refused to
  // lock. The Lock button was even offered, because the list it was drawn from
  // already carried the right answer.
  await signIn(owner.id);
  await shot("technical.refused.lock.notapproved", await capture(
    QUOTES.PUT, req(`/api/studios/${slug}/technical/quotations`, { method: "PUT", body: { id: quotationId, locked: true } }), P));

  await shot("technical.quotation.approved", await capture(
    QUOTES.PUT, req(`/api/studios/${slug}/technical/quotations`, { method: "PUT", body: { id: quotationId, status: "Approved" } }), P));

  const locked = await shot("technical.quotation.locked", await capture(
    QUOTES.PUT, req(`/api/studios/${slug}/technical/quotations`, { method: "PUT", body: { id: quotationId, locked: true } }), P));
  ok("an approved quotation locks", locked.body?.quotation?.locked === true, JSON.stringify(locked.body).slice(0, 140));

  // ---- what a locked quotation will and will not accept -------------------
  const lockedEdit = await shot("technical.refused.edit.locked", await capture(
    QUOTES.PUT, req(`/api/studios/${slug}/technical/quotations`, { method: "PUT", body: { id: quotationId, title: "Sneaking a change in" } }), P));
  ok("a locked quotation refuses an edit", lockedEdit.status === 409, `${lockedEdit.status} ${JSON.stringify(lockedEdit.body)}`);

  // AN UNLOCK BUNDLED WITH AN EDIT is refused as a locked write, not honoured
  // as an unlock — otherwise unlock becomes a way to smuggle a change past the
  // lock in one round trip.
  const bundled = await shot("technical.refused.unlock.bundled", await capture(
    QUOTES.PUT, req(`/api/studios/${slug}/technical/quotations`, { method: "PUT", body: { id: quotationId, locked: false, title: "And this too" } }), P));
  ok("an unlock bundled with an edit is refused, not honoured", bundled.status === 409,
    `${bundled.status} ${JSON.stringify(bundled.body)}`);

  // Unlock is a rarer right than lock: an editor who may lock still may not
  // reopen.
  const locker = await personWith(
    ["technical.quotations.view", "technical.quotations.edit", "technical.quotations.lock"], "techlocker");
  await signIn(locker.id);
  const noUnlock = await shot("technical.refused.unlock", await capture(
    QUOTES.PUT, req(`/api/studios/${slug}/technical/quotations`, { method: "PUT", body: { id: quotationId, locked: false } }), P));
  ok("holding lock does not imply holding unlock", noUnlock.body?.error === "forbidden",
    `${noUnlock.status} ${JSON.stringify(noUnlock.body)}`);

  await signIn(owner.id);
  const reopened = await shot("technical.quotation.unlocked", await capture(
    QUOTES.PUT, req(`/api/studios/${slug}/technical/quotations`, { method: "PUT", body: { id: quotationId, locked: false } }), P));
  ok("the owner can reopen it", reopened.body?.quotation?.locked === false, JSON.stringify(reopened.body).slice(0, 120));

  // ---- and the walls, as everywhere else ---------------------------------
  await signIn(outsider.id);
  await shot("technical.outsider", await capture(TECH.GET, req(`/api/studios/${slug}/technical`), P));
  __signOut();
  await shot("technical.unauth", await capture(TECH.GET, req(`/api/studios/${slug}/technical`), P));
}

// ============================================================================
console.log("== projects: opened from an approved quotation, and only once");
// The far end of the order-to-cash spine, and the place three rules meet:
//
//   A PROJECT IS OPENED FROM AN APPROVED QUOTATION, not from a wish. Approval
//   is asked of the Tasks board, the same authority Technical's lock asks.
//
//   A QUOTATION OPENS EXACTLY ONE PROJECT. "A ticket has one project. A second
//   project means a second ticket, because a client asking for more work starts
//   the process from scratch."
//
//   THE PROJECT CARRIES THE WHOLE LINEAGE — ticketId, quotationId, clientId —
//   because every downstream record (sheets, invoices, deliveries, overtimes,
//   AWBs, tasks) hangs off the project and needs to reach back up.
{
  const PROJECTS = await import("@/app/api/studios/[slug]/projects/route.js");
  const SLA = await import("@/app/api/studios/[slug]/projects/sla/route.js");
  const OVERTIMES = await import("@/app/api/studios/[slug]/projects/overtimes/route.js");
  const TECH = await import("@/app/api/studios/[slug]/technical/route.js");

  const P = ctx({ slug });
  const shot = async (name, payload) => {
    const r = golden(name, payload, EXTRA);
    if (!r.recorded) ok(`${name} matches its golden`, r.ok, r.detail);
    return payload;
  };
  const personWith = async (permissions, alias) => {
    const u = (await createUser({ email: `g-${alias}-${rand()}@test.invalid`, passwordHash: "x" })).user;
    const role = await createRole(studio.id, { name: `role-${alias}`, permissions });
    await addCollaborator(studio.id, { userId: u.id, alias, role: "member", roleIds: [role.id] });
    return u;
  };

  await signIn(owner.id);

  // Re-read rather than carrying a variable across blocks: each block should
  // stand up on its own, so one being deleted cannot quietly break the next.
  const tech = await capture(TECH.GET, req(`/api/studios/${slug}/technical`), P);
  const approved = tech.body?.quotations?.find((q) => q.status === "Approved");
  ok("there is an approved quotation to open a project from", Boolean(approved?.id),
    `${tech.body?.quotations?.length ?? 0} quotations`);

  await shot("projects.empty", await capture(PROJECTS.GET, req(`/api/studios/${slug}/projects`), P));

  // ---- a quotation nobody approved cannot open a project -----------------
  // An INTERNAL quotation, created straight from the Quotations screen rather
  // than converted from an RFQ — the second of the two ways a quotation is born,
  // and the one that arrives unapproved. Made here rather than reused from the
  // Technical block, because the only approved quotation in the studio is the
  // one that legitimately opens a project below.
  const QUOTES = await import("@/app/api/studios/[slug]/technical/quotations/route.js");
  const internal = await capture(QUOTES.POST, req(`/api/studios/${slug}/technical/quotations`, {
    method: "POST",
    body: { number: "Q-INTERNAL-1", description: "Site survey, not yet approved", handledBy: "Owner" },
  }), P);
  const draftId = internal.body?.quotation?.id;
  ok("an internal quotation can be raised without an RFQ", Boolean(draftId),
    JSON.stringify(internal.body).slice(0, 140));
  ok("...and arrives unapproved", internal.body?.quotation?.status !== "Approved",
    internal.body?.quotation?.status);

  const notApproved = await shot("projects.refused.notapproved", await capture(
    PROJECTS.POST, req(`/api/studios/${slug}/projects`, { method: "POST", body: { quotationId: draftId } }), P));
  ok("a project cannot be opened from an unapproved quotation",
    notApproved.body?.error === "not-approved", `${notApproved.status} ${JSON.stringify(notApproved.body)}`);
  await shot("projects.refused.noquotation", await capture(
    PROJECTS.POST, req(`/api/studios/${slug}/projects`, { method: "POST", body: { quotationId: "quo_nothinghere000" } }), P));

  // ---- opening it --------------------------------------------------------
  const opened = await shot("projects.opened", await capture(
    PROJECTS.POST, req(`/api/studios/${slug}/projects`, { method: "POST", body: { quotationId: approved?.id } }), P));
  const project = opened.body?.project;
  ok("the project opened", Boolean(project?.id), JSON.stringify(opened.body).slice(0, 140));

  // THE LINEAGE, asserted field by field. Every downstream record hangs off
  // this row, so a missing key here is a whole department unable to reach back.
  ok("the project names its quotation", project?.quotationId === approved?.id, project?.quotationId);
  ok("...its ticket", Boolean(project?.ticketId), project?.ticketId);
  ok("...and its client", Boolean(project?.clientId), project?.clientId);

  // ---- and only once -----------------------------------------------------
  await shot("projects.refused.twice", await capture(
    PROJECTS.POST, req(`/api/studios/${slug}/projects`, { method: "POST", body: { quotationId: approved?.id } }), P));

  const populated = await capture(PROJECTS.GET, req(`/api/studios/${slug}/projects`), P);
  await shot("projects.list.populated", populated);
  ok("one quotation yielded exactly one project", populated.body?.projects?.length === 1,
    String(populated.body?.projects?.length));

  // ---- SLA and Overtimes answer to their OWN rights ----------------------
  // Both are sub-sections of Projects with grants of their own, so somebody who
  // may run the project list is not thereby entitled to set service levels or
  // approve overtime. Each route gates on its own flag, before the service.
  const lister = await personWith(
    ["projects.list.view", "projects.list.create", "projects.list.edit"], "projlister");
  await signIn(lister.id);
  await shot("projects.refused.sla", await capture(
    SLA.POST, req(`/api/studios/${slug}/projects/sla`, { method: "POST", body: { name: "Four hour response" } }), P));
  await shot("projects.refused.overtimes", await capture(
    OVERTIMES.POST, req(`/api/studios/${slug}/projects/overtimes`, { method: "POST", body: { projectId: project?.id } }), P));

  // ---- the walls ---------------------------------------------------------
  await signIn(outsider.id);
  await shot("projects.outsider", await capture(PROJECTS.GET, req(`/api/studios/${slug}/projects`), P));
  __signOut();
  await shot("projects.unauth", await capture(PROJECTS.GET, req(`/api/studios/${slug}/projects`), P));
}

// ============================================================================
console.log("== inventory: one shared row, two owners, and a check digit");
// THE SHEET IS THE INTERESTING PART. A project sheet's line is ONE record, not
// one per department — Inventory records that the material is on order and
// Projects sees it; Projects records that installation is done and Inventory
// sees it. Two records would make that a copy again, with the same drift and
// the same arguments about which is right.
//
// So both departments read every column and each may WRITE only its own, and
// saveSheetLine asks for whichever the caller SAYS they are writing as. That
// makes the owner field a claim, and a claim is exactly the kind of thing a
// refactor stops checking. It is checked before the sheet is even looked up.
{
  const INV = await import("@/app/api/studios/[slug]/inventory/route.js");
  const ITEMS = await import("@/app/api/studios/[slug]/inventory/items/route.js");
  const VENDORS = await import("@/app/api/studios/[slug]/inventory/vendors/route.js");
  const STOCK = await import("@/app/api/studios/[slug]/inventory/stock/route.js");
  const SHEETS = await import("@/app/api/studios/[slug]/inventory/sheets/route.js");
  const AWB = await import("@/app/api/studios/[slug]/inventory/awb/route.js");

  const P = ctx({ slug });
  const shot = async (name, payload) => {
    const r = golden(name, payload, EXTRA);
    if (!r.recorded) ok(`${name} matches its golden`, r.ok, r.detail);
    return payload;
  };
  const personWith = async (permissions, alias) => {
    const u = (await createUser({ email: `g-${alias}-${rand()}@test.invalid`, passwordHash: "x" })).user;
    const role = await createRole(studio.id, { name: `role-${alias}`, permissions });
    await addCollaborator(studio.id, { userId: u.id, alias, role: "member", roleIds: [role.id] });
    return u;
  };

  await signIn(owner.id);

  const vendor = await shot("inventory.vendor.created", await capture(
    VENDORS.POST, req(`/api/studios/${slug}/inventory/vendors`, { method: "POST", body: { name: "Gulf AV Supply" } }), P));
  const vendorId = vendor.body?.vendor?.id;
  ok("the vendor was created", Boolean(vendorId), JSON.stringify(vendor.body).slice(0, 120));

  await shot("inventory.vendor.duplicate", await capture(
    VENDORS.POST, req(`/api/studios/${slug}/inventory/vendors`, { method: "POST", body: { name: "gulf av supply" } }), P));

  // A FOREIGN-CURRENCY ITEM MUST DECLARE ITS LANDED COSTS. The quotation builder
  // converts a bought-abroad price into the studio's money as
  // (unitCost + shipping + customs) x crossRate, so an item priced in a currency
  // that is not the studio's and carries neither figure would quote a number
  // that is knowably wrong. Refused at the point of entry rather than producing
  // a confident wrong price later.
  await shot("inventory.item.refused.nocharges", await capture(
    ITEMS.POST, req(`/api/studios/${slug}/inventory/items`, { method: "POST", body: {
      name: "Ceiling microphone", sku: "MIC-CEIL-01", vendorId, unitCost: 420, currency: "USD",
    } }), P));

  const item = await shot("inventory.item.created", await capture(
    ITEMS.POST, req(`/api/studios/${slug}/inventory/items`, { method: "POST", body: {
      name: "Ceiling microphone", sku: "MIC-CEIL-01", vendorId,
      unitCost: 420, currency: "USD", shippingCharges: 25, customsCharges: 15,
    } }), P));
  const itemId = item.body?.item?.id;
  ok("the item was created", Boolean(itemId), JSON.stringify(item.body).slice(0, 120));

  await shot("inventory.item.duplicate.sku", await capture(
    ITEMS.POST, req(`/api/studios/${slug}/inventory/items`, { method: "POST", body: {
      name: "Another mic", sku: "MIC-CEIL-01", vendorId,
      unitCost: 10, currency: "USD", shippingCharges: 0, customsCharges: 0,
    } }), P));

  await shot("inventory.item.unknown.vendor", await capture(
    ITEMS.POST, req(`/api/studios/${slug}/inventory/items`, { method: "POST", body: {
      name: "Orphan", vendorId: "sal_novendorhere00",
    } }), P));

  await shot("inventory.stock.received", await capture(
    STOCK.POST, req(`/api/studios/${slug}/inventory/stock`, { method: "POST", body: {
      itemId, quantity: 12, kind: "in", note: "Opening stock",
    } }), P));

  // ---- THE OWNERSHIP CLAIM ------------------------------------------------
  // Each of these holds a real write right in ONE of the two departments and
  // asks to write as the OTHER. Both are refused on the right, before the sheet
  // is looked up — so the refusal cannot be confused with "no such sheet".
  const storeman = await personWith(
    ["inventory.sheets.view", "inventory.sheets.edit"], "storeman");
  await signIn(storeman.id);
  const storemanClaim = await shot("inventory.sheet.refused.claiming.projects", await capture(
    SHEETS.PUT, req(`/api/studios/${slug}/inventory/sheets`, { method: "PUT", body: {
      sheetId: "she_whichever0000", rowId: "row-1", owner: "projects", values: { installed: true },
    } }), P));
  ok("a storeman claiming to write as Projects is refused on the right they lack",
    storemanClaim.body?.key === "projects.list.edit", JSON.stringify(storemanClaim.body));

  // The project manager needs inventory.sheets.VIEW as well, or they are refused
  // at the door for not being able to open Inventory at all — which would look
  // like the ownership check working and would not be it. Both sides of a
  // symmetric rule have to be refused for the SAME reason, or only one of them
  // is actually tested.
  const pm = await personWith(
    ["projects.list.view", "projects.list.edit", "inventory.sheets.view"], "projectmanager");
  await signIn(pm.id);
  const pmClaim = await shot("inventory.sheet.refused.claiming.inventory", await capture(
    SHEETS.PUT, req(`/api/studios/${slug}/inventory/sheets`, { method: "PUT", body: {
      sheetId: "she_whichever0000", rowId: "row-1", owner: "inventory", values: { serials: ["SN-1"] },
    } }), P));
  ok("...and it names the right they lack, not the module they cannot open",
    pmClaim.body?.key === "inventory.sheets.edit", JSON.stringify(pmClaim.body));

  // ---- AWB: eleven digits, and the last one is arithmetic -----------------
  // An air waybill's check digit is the serial modulo 7. 176-1234567 gives 5,
  // so 17612345675 is well formed and 17612345676 is not — the format is
  // validated rather than trusted, which is what stops a typo becoming a
  // shipment nobody can trace.
  await signIn(owner.id);
  const shipment = await shot("inventory.awb.tracked", await capture(
    AWB.POST, req(`/api/studios/${slug}/inventory/awb`, { method: "POST", body: { awbNumber: "17612345675" } }), P));
  ok("a well-formed waybill is accepted", shipment.status === 201, `${shipment.status} ${JSON.stringify(shipment.body).slice(0, 100)}`);
  ok("...and stored in canonical form", shipment.body?.shipment?.awbNumber === "176-12345675",
    shipment.body?.shipment?.awbNumber);

  await shot("inventory.awb.badcheckdigit", await capture(
    AWB.POST, req(`/api/studios/${slug}/inventory/awb`, { method: "POST", body: { awbNumber: "17612345676" } }), P));
  await shot("inventory.awb.tooshort", await capture(
    AWB.POST, req(`/api/studios/${slug}/inventory/awb`, { method: "POST", body: { awbNumber: "1761234" } }), P));
  await shot("inventory.awb.duplicate", await capture(
    AWB.POST, req(`/api/studios/${slug}/inventory/awb`, { method: "POST", body: { awbNumber: "176-1234567-5" } }), P));

  // AWB is its own right, gated before the service.
  await signIn(storeman.id);
  await shot("inventory.awb.refused", await capture(
    AWB.POST, req(`/api/studios/${slug}/inventory/awb`, { method: "POST", body: { awbNumber: "18012345675" } }), P));

  // ---- the populated read and the walls -----------------------------------
  await signIn(owner.id);
  await shot("inventory.list.populated", await capture(INV.GET, req(`/api/studios/${slug}/inventory`), P));
  await signIn(outsider.id);
  await shot("inventory.outsider", await capture(INV.GET, req(`/api/studios/${slug}/inventory`), P));
  __signOut();
  await shot("inventory.unauth", await capture(INV.GET, req(`/api/studios/${slug}/inventory`), P));
}

// ============================================================================
console.log("== hr: whose records, which numbers, and what is on disk");
// The sharpest tenancy rules in the product are inside a single studio rather
// than between studios, and they all live here.
//
//   WHOSE RECORDS is scope. hr.employees and hr.vacations are the only two
//   areas in the whole catalogue that declare themselves `scoped`, and the
//   ladder is own < department < all. Scope is enforced in the READ — a screen
//   that filtered client-side would be a screen that shipped everybody's salary
//   to everybody's browser.
//
//   WHICH NUMBERS is a separate right. Somebody may legitimately administer a
//   whole department's records without being entitled to read passport numbers,
//   so presence and expiry are HR-wide and the numbers answer to
//   hr.employees.salary.
//
//   WHAT IS ON DISK is neither. ID and passport numbers are AES-256-GCM
//   encrypted at rest, so a dump of the collaborator row does not expose them
//   even to somebody who never asked this API anything.
{
  const HR = await import("@/app/api/studios/[slug]/hr/route.js");
  const EMPLOYEES = await import("@/app/api/studios/[slug]/hr/employees/route.js");
  const VACATIONS = await import("@/app/api/studios/[slug]/hr/vacations/route.js");

  const P = ctx({ slug });
  const shot = async (name, payload) => {
    const r = golden(name, payload, EXTRA);
    if (!r.recorded) ok(`${name} matches its golden`, r.ok, r.detail);
    return payload;
  };
  const personWith = async (permissions, alias, scopes) => {
    const u = (await createUser({ email: `g-${alias}-${rand()}@test.invalid`, passwordHash: "x" })).user;
    const role = await createRole(studio.id, { name: `role-${alias}`, permissions, scopes });
    await addCollaborator(studio.id, { userId: u.id, alias, role: "member", roleIds: [role.id] });
    return { user: u, collaborator: await getCollaboratorByUser(studio.id, u.id) };
  };

  await signIn(owner.id);

  // ---- record an identity document ---------------------------------------
  const ID_NUMBER = "1098765432";
  const PASSPORT = "K01234567";
  await shot("hr.employment.saved", await capture(
    EMPLOYEES.PUT, req(`/api/studios/${slug}/hr/employees`, { method: "PUT", body: {
      collaboratorId: member.id,
      patch: { employeeCode: "EMP-014", mobile: "+966500000000", idNumber: ID_NUMBER,
        passportNumber: PASSPORT, idExpiry: "2030-01-01", passportExpiry: "2031-06-30" },
    } }), P));

  // WHAT IS ACTUALLY ON DISK. Asserted against the stored row rather than
  // against the code, so it stays true however the encryption is refactored —
  // and it is the one assertion here that a permission bug cannot fake.
  const rows = await readArr(S.collaborators(studio.id));
  const stored = JSON.stringify(rows.find((c) => c.id === member.id));
  ok("the ID number is not on disk in the clear", !stored.includes(ID_NUMBER));
  ok("...nor is the passport number", !stored.includes(PASSPORT));
  ok("...and what IS stored is marked as ciphertext", stored.includes("enc:v1:"));

  // ---- who may read the numbers back -------------------------------------
  const withSalary = await capture(HR.GET, req(`/api/studios/${slug}/hr`), P);
  await shot("hr.list.withsalary", withSalary);
  const meAsOwner = withSalary.body?.employees?.find((e) => e.id === member.id);
  ok("a holder of hr.employees.salary reads the ID number", meAsOwner?.idNumber === ID_NUMBER, meAsOwner?.idNumber);

  // Somebody who administers the whole department but was not given `salary`.
  const admin = await personWith(
    ["hr.employees.view", "hr.employees.create", "hr.employees.edit", "hr.vacations.view"],
    "hradmin", { "hr.employees": "all" });
  await signIn(admin.user.id);
  const withoutSalary = await capture(HR.GET, req(`/api/studios/${slug}/hr`), P);
  await shot("hr.list.withoutsalary", withoutSalary);
  const seen = withoutSalary.body?.employees?.find((e) => e.id === member.id);
  ok("without the salary right the number is withheld", !seen?.idNumber, JSON.stringify(seen?.idNumber));
  ok("...but its PRESENCE is not a secret", seen?.hasId === true, JSON.stringify(seen?.hasId));
  ok("...and neither is its expiry", seen?.idExpiry === "2030-01-01", seen?.idExpiry);

  // THE DIVERGENCE THE AUDIT NAMED (M-9): writing the number needs `edit`,
  // reading it needs `salary`. So this caller can OVERWRITE a number they cannot
  // see. Pinned as current behaviour, not endorsed — the fix is to gate the
  // write on the same right, and this is where that change announces itself.
  const blindWrite = await capture(EMPLOYEES.PUT, req(`/api/studios/${slug}/hr/employees`, {
    method: "PUT", body: { collaboratorId: member.id, patch: { idNumber: "9999999999" } },
  }), P);
  await shot("hr.employment.blindwrite", blindWrite);
  ok("somebody who cannot READ an ID number can still overwrite it (M-9, pinned)",
    blindWrite.status === 200, `${blindWrite.status} ${JSON.stringify(blindWrite.body).slice(0, 80)}`);

  // Put it back, so later cases see the number the earlier ones recorded.
  await signIn(owner.id);
  await capture(EMPLOYEES.PUT, req(`/api/studios/${slug}/hr/employees`, {
    method: "PUT", body: { collaboratorId: member.id, patch: { idNumber: ID_NUMBER } },
  }), P);

  // ---- scope: whose records ----------------------------------------------
  // The default when a role grants no scope is `own`, the safe end of the
  // ladder — somebody sees themselves and nobody else.
  const ownScope = await personWith(["hr.employees.view"], "hrown", {});
  await signIn(ownScope.user.id);
  const mineOnly = await capture(HR.GET, req(`/api/studios/${slug}/hr`), P);
  await shot("hr.list.ownscope", mineOnly);
  ok("scope `own` returns exactly one person", mineOnly.body?.employees?.length === 1,
    String(mineOnly.body?.employees?.length));
  ok("...and that person is the caller", mineOnly.body?.employees?.[0]?.id === ownScope.collaborator.id,
    mineOnly.body?.employees?.[0]?.alias);

  // `all` sees the studio. The pair is the assertion: the same request, the same
  // data, two different answers decided by the role.
  await signIn(admin.user.id);
  const everyone = await capture(HR.GET, req(`/api/studios/${slug}/hr`), P);
  ok("scope `all` returns more than one", (everyone.body?.employees?.length ?? 0) > 1,
    String(everyone.body?.employees?.length));

  // ---- vacations: asking is not approving --------------------------------
  // Requesting leave is deliberately NOT a manage-write — anybody who can open
  // HR may ask for their own. Deciding is its own right.
  const asker = await personWith(["hr.vacations.view", "hr.vacations.create"], "hrasker", {});
  await signIn(asker.user.id);
  const asked = await shot("hr.vacation.requested", await capture(
    VACATIONS.POST, req(`/api/studios/${slug}/hr/vacations`, { method: "POST", body: {
      from: "2026-09-01", to: "2026-09-05", reason: "Family",
    } }), P));
  const vacationId = asked.body?.vacation?.id;
  ok("somebody can ask for their own leave", Boolean(vacationId), JSON.stringify(asked.body).slice(0, 120));

  // BOOKING LEAVE FOR SOMEBODY ELSE, which this caller may do — and the golden
  // is named for what happens rather than for what I assumed would.
  //
  // requestVacation guards it with `if (target !== me && !canManage) forbidden`,
  // and that branch CANNOT FIRE. canManage is sectionManageable over HR's areas,
  // and SECTION_AREAS maps hr-employees to both hr.employees AND hr.vacations —
  // so holding hr.vacations.create, which the line above already required, makes
  // canManage true by construction. Anyone who reaches the check has passed it.
  //
  // Not a hole: the permission does the work the branch was meant to do. But it
  // is a guard nobody can exercise, which is the same dead-capability shape the
  // permission catalogue forbids, and it is recorded here rather than left to be
  // rediscovered. It also AUTO-APPROVES, because a manager booking leave has
  // already made the decision.
  const forOthers = await shot("hr.vacation.forothers.bymanager", await capture(
    VACATIONS.POST, req(`/api/studios/${slug}/hr/vacations`, { method: "POST", body: {
      collaboratorId: member.id, from: "2026-10-01", to: "2026-10-02",
    } }), P));
  ok("somebody who may create leave may book it for another (the !canManage branch is unreachable)",
    forOthers.status === 201, `${forOthers.status} ${JSON.stringify(forOthers.body).slice(0, 80)}`);
  ok("...and a manager booking it has already decided",
    forOthers.body?.vacation?.status === "Approved", forOthers.body?.vacation?.status);

  await shot("hr.vacation.refused.approve", await capture(
    VACATIONS.PUT, req(`/api/studios/${slug}/hr/vacations`, { method: "PUT", body: {
      id: vacationId, status: "Approved",
    } }), P));

  await signIn(owner.id);
  await shot("hr.vacation.approved", await capture(
    VACATIONS.PUT, req(`/api/studios/${slug}/hr/vacations`, { method: "PUT", body: {
      id: vacationId, status: "Approved",
    } }), P));

  // ---- the walls ----------------------------------------------------------
  await signIn(outsider.id);
  await shot("hr.outsider", await capture(HR.GET, req(`/api/studios/${slug}/hr`), P));
  __signOut();
  await shot("hr.unauth", await capture(HR.GET, req(`/api/studios/${slug}/hr`), P));
}

// ============================================================================
console.log("== finance: a number that only goes forward, and money that is derived");
// TWO RULES, and the first one is the reason a counter exists at all.
//
//   A REFERENCE ONLY EVER MOVES FORWARD. It is the one thing in this product
//   that cannot be derived from the records: delete the newest invoice and the
//   highest surviving reference goes backwards, so a count-based scheme would
//   reissue a number a client is already holding. The tally is stored, seeded
//   from the rows in hand, and stepped inside one Lua call so two invoices
//   raised in the same moment cannot both be INV-0004.
//
//   MONEY IS DERIVED, NEVER STORED. Totals are computed from the lines on every
//   read, so there is no second number that can disagree with the first.
{
  const FINANCE = await import("@/app/api/studios/[slug]/finance/route.js");
  const INVOICES = await import("@/app/api/studios/[slug]/finance/invoices/route.js");
  const EXPENSES = await import("@/app/api/studios/[slug]/finance/expenses/route.js");

  const P = ctx({ slug });
  const shot = async (name, payload) => {
    const r = golden(name, payload, EXTRA);
    if (!r.recorded) ok(`${name} matches its golden`, r.ok, r.detail);
    return payload;
  };
  const personWith = async (permissions, alias) => {
    const u = (await createUser({ email: `g-${alias}-${rand()}@test.invalid`, passwordHash: "x" })).user;
    const role = await createRole(studio.id, { name: `role-${alias}`, permissions });
    await addCollaborator(studio.id, { userId: u.id, alias, role: "member", roleIds: [role.id] });
    return u;
  };
  const raise = (body) => capture(
    INVOICES.POST, req(`/api/studios/${slug}/finance/invoices`, { method: "POST", body }), P);

  await signIn(owner.id);

  const LINES = [{ description: "Boardroom refit, stage 1", qty: 1, unitPrice: 25000 }];

  await shot("finance.invoice.refused.nolines", await raise({ clientName: "Acme Holdings", lines: [] }));
  await shot("finance.invoice.refused.noclient", await raise({ lines: LINES }));

  const first = await shot("finance.invoice.raised", await raise({ clientName: "Acme Holdings", lines: LINES }));
  const firstRef = first.body?.invoice?.reference;
  const firstId = first.body?.invoice?.id;
  ok("the first invoice is numbered", Boolean(firstRef), JSON.stringify(first.body).slice(0, 120));

  // MONEY IS DERIVED. 25000 at the default 15% VAT is 3750 and 28750, computed
  // from the line rather than taken from the request — a client that posted its
  // own total would be posting a number nobody checked.
  const inv = first.body?.invoice;
  ok("the subtotal comes from the lines", inv?.subtotal === 25000, String(inv?.subtotal));
  ok("...the VAT from the rate", inv?.vat === 3750, String(inv?.vat));
  ok("...and the total from both", inv?.total === 28750, String(inv?.total));

  const second = await raise({ clientName: "Acme Holdings", lines: LINES });
  const secondRef = second.body?.invoice?.reference;
  ok("the second invoice gets the next number", secondRef !== firstRef, `${firstRef} then ${secondRef}`);

  // THE ASSERTION THIS BLOCK EXISTS FOR. Delete the newest invoice — the
  // highest surviving reference now goes BACKWARDS — and raise another. A
  // scheme that counted rows, or read the maximum off the rows, would hand the
  // deleted invoice's number to a different client.
  const deleted = await capture(INVOICES.DELETE, req(`/api/studios/${slug}/finance/invoices`, {
    method: "DELETE", body: { id: second.body?.invoice?.id },
  }), P);
  ok("the newest invoice can be deleted", deleted.status === 200, `${deleted.status} ${JSON.stringify(deleted.body).slice(0, 80)}`);

  const third = await raise({ clientName: "Acme Holdings", lines: LINES });
  const thirdRef = third.body?.invoice?.reference;
  ok("a deleted number is NOT reissued", thirdRef !== secondRef, `deleted ${secondRef}, then got ${thirdRef}`);
  ok("...and the sequence still moves forward", thirdRef > secondRef, `${secondRef} then ${thirdRef}`);

  // Two raised at once must not collide — the tally is stepped inside Redis,
  // not read-then-written by the caller.
  const [a, b, c] = await Promise.all([
    raise({ clientName: "Acme Holdings", lines: LINES }),
    raise({ clientName: "Acme Holdings", lines: LINES }),
    raise({ clientName: "Acme Holdings", lines: LINES }),
  ]);
  const refs = [a, b, c].map((r) => r.body?.invoice?.reference);
  ok("three invoices raised at once get three different numbers",
    new Set(refs).size === 3, refs.join(", "));

  // ---- expenses, and the module read --------------------------------------
  await shot("finance.expense.recorded", await capture(
    EXPENSES.POST, req(`/api/studios/${slug}/finance/expenses`, { method: "POST", body: {
      description: "Freight forwarding", amount: 1200, category: "Logistics",
    } }), P));

  const board = await capture(FINANCE.GET, req(`/api/studios/${slug}/finance`), P);
  ok("the finance board lists what was raised", (board.body?.invoices?.length ?? 0) >= 4,
    String(board.body?.invoices?.length));

  // ---- rights --------------------------------------------------------------
  const viewer = await personWith(["finance.cash.view"], "financeviewer");
  await signIn(viewer.id);
  await shot("finance.refused.raise", await raise({ clientName: "Acme Holdings", lines: LINES }));

  await signIn(outsider.id);
  await shot("finance.outsider", await capture(FINANCE.GET, req(`/api/studios/${slug}/finance`), P));
  __signOut();
  await shot("finance.unauth", await capture(FINANCE.GET, req(`/api/studios/${slug}/finance`), P));
}

// ============================================================================
console.log("== operations & tasks: a shift knows about leave, and finishing is not editing");
// TWO CROSS-DEPARTMENT RULES, and they are the interesting ones because neither
// module owns both halves.
//
//   A SHIFT CANNOT BE GIVEN TO SOMEBODY HR HAS ALREADY APPROVED LEAVE FOR.
//   Operations does not own vacations and HR does not own the rota, so this is
//   Operations asking HR a question at the moment of writing — caught here
//   rather than discovered on the day.
//
//   FINISHING YOUR OWN WORK IS NOT EDITING IT. A task is assigned by somebody
//   authorised and COMPLETED by the person it was given to, so the assignee may
//   move it to Done without holding a board right — and may not rewrite what
//   was asked of them.
{
  const OPS = await import("@/app/api/studios/[slug]/operations/route.js");
  const SHIFTS = await import("@/app/api/studios/[slug]/operations/shifts/route.js");
  const LOCATIONS = await import("@/app/api/studios/[slug]/operations/locations/route.js");
  const TASKS = await import("@/app/api/studios/[slug]/tasks/route.js");

  const P = ctx({ slug });
  const shot = async (name, payload) => {
    const r = golden(name, payload, EXTRA);
    if (!r.recorded) ok(`${name} matches its golden`, r.ok, r.detail);
    return payload;
  };
  const personWith = async (permissions, alias) => {
    const u = (await createUser({ email: `g-${alias}-${rand()}@test.invalid`, passwordHash: "x" })).user;
    const role = await createRole(studio.id, { name: `role-${alias}`, permissions });
    await addCollaborator(studio.id, { userId: u.id, alias, role: "member", roleIds: [role.id] });
    return { user: u, collaborator: await getCollaboratorByUser(studio.id, u.id) };
  };

  await signIn(owner.id);

  // ---- operations ---------------------------------------------------------
  const location = await shot("operations.location.created", await capture(
    LOCATIONS.POST, req(`/api/studios/${slug}/operations/locations`, { method: "POST", body: {
      name: "Riyadh HQ", city: "Riyadh", country: "Saudi Arabia",
    } }), P));
  const locationId = location.body?.location?.id;
  ok("the location was created", Boolean(locationId), JSON.stringify(location.body).slice(0, 120));

  // Whoever asked for leave in the HR block. Found by their approved vacation
  // rather than by name, so this stays true if the fixture is reshuffled.
  const hr = await import("@/app/api/studios/[slug]/hr/route.js");
  const hrBoard = await capture(hr.GET, req(`/api/studios/${slug}/hr`), P);
  const leave = hrBoard.body?.vacations?.find((v) => v.status === "Approved");
  ok("HR has an approved absence to schedule around", Boolean(leave),
    `${hrBoard.body?.vacations?.length ?? 0} vacations`);

  const onLeaveDay = leave?.from;
  const clash = await shot("operations.shift.refused.onleave", await capture(
    SHIFTS.POST, req(`/api/studios/${slug}/operations/shifts`, { method: "POST", body: {
      date: onLeaveDay, collaboratorId: leave?.collaboratorId, locationId,
      startTime: "08:00", endTime: "16:00",
    } }), P));
  ok("a shift cannot be given to somebody on approved leave",
    clash.body?.error === "on-leave", `${clash.status} ${JSON.stringify(clash.body)}`);
  ok("...and the refusal says which absence it clashes with",
    Boolean(clash.body?.from && clash.body?.to), JSON.stringify(clash.body));

  // The same person, a day they are not on leave: the rule is about the
  // absence, not about the person.
  const fine = await shot("operations.shift.created", await capture(
    SHIFTS.POST, req(`/api/studios/${slug}/operations/shifts`, { method: "POST", body: {
      date: "2026-11-03", collaboratorId: leave?.collaboratorId, locationId,
      startTime: "08:00", endTime: "16:00",
    } }), P));
  ok("...but the same person can be scheduled outside it", fine.status === 201,
    `${fine.status} ${JSON.stringify(fine.body).slice(0, 100)}`);

  await shot("operations.board", await capture(OPS.GET, req(`/api/studios/${slug}/operations`), P));

  // ---- tasks --------------------------------------------------------------
  // The assignee needs tasks.board.VIEW, or tasksContext refuses them at the door
  // and the test proves they cannot open Tasks rather than proving they may
  // finish their own work. Same shape as the Inventory sheet-owner case: a
  // refusal has to be for the reason under test.
  const doer = await personWith(["tasks.board.view"], "taskdoer");
  const assigned = await shot("tasks.assigned", await capture(
    TASKS.POST, req(`/api/studios/${slug}/tasks`, { method: "POST", body: {
      title: "Commission the boardroom", assigneeCollaboratorId: doer.collaborator.id,
    } }), P));
  const taskId = assigned.body?.task?.id;
  ok("a task can be assigned", Boolean(taskId), JSON.stringify(assigned.body).slice(0, 120));

  // THE ASSIGNEE HOLDS NO BOARD RIGHT AT ALL and may still finish their own
  // work. Finishing is not editing.
  await signIn(doer.user.id);
  const finished = await shot("tasks.finished.byassignee", await capture(
    TASKS.PUT, req(`/api/studios/${slug}/tasks`, { method: "PUT", body: { id: taskId, status: "Done" } }), P));
  ok("the assignee can finish their own task without a board right",
    finished.body?.task?.status === "Done", JSON.stringify(finished.body).slice(0, 120));

  const overreach = await shot("tasks.refused.rename.byassignee", await capture(
    TASKS.PUT, req(`/api/studios/${slug}/tasks`, { method: "PUT", body: { id: taskId, title: "Not mine to rename" } }), P));
  ok("...but cannot rewrite what was asked of them",
    overreach.body?.error === "forbidden", `${overreach.status} ${JSON.stringify(overreach.body)}`);

  // DELETE IS ITS OWN RIGHT. canManage is true for anybody holding any write on
  // the board, so a Delete button drawn off canManage would be offered to
  // people the service then refuses.
  const editor = await personWith(["tasks.board.view", "tasks.board.create", "tasks.board.edit"], "taskeditor");
  await signIn(editor.user.id);
  await shot("tasks.refused.delete", await capture(
    TASKS.DELETE, req(`/api/studios/${slug}/tasks`, { method: "DELETE", body: { id: taskId } }), P));

  await signIn(outsider.id);
  await shot("tasks.outsider", await capture(TASKS.GET, req(`/api/studios/${slug}/tasks`), P));
  __signOut();
  await shot("operations.unauth", await capture(OPS.GET, req(`/api/studios/${slug}/operations`), P));
}

// ============================================================================
console.log("== quality: four signatures, four rights, and nobody signs twice");
// The controlled-document register, and the strictest workflow in the product.
//
//   draft ──submit──► review ──review──► approval ──approve──► approved
//                       │                   │                     │
//                       └──── reject ───────┘                  publish
//                                                                 ▼
//                                                             effective ──withdraw──► superseded
//
// FOUR RIGHTS, NOT ONE. review, approve, publish and obsolete are declared
// separately in the catalogue and none of them is a bigger `edit`. Folding
// review and approve together would let one person sign both halves, and a
// revision signed twice by one hand has been reviewed by nobody.
//
// AND THE RULE THAT CANNOT LIVE IN THE PERMISSION MODEL. Holding both rights is
// legitimate — a small studio may have one person who is genuinely both — but
// using both ON ONE RECORD is not. So it is enforced at the transition, by
// comparing the reviewer's CollaboratorID to the actor's.
{
  const DOCS = await import("@/app/api/studios/[slug]/quality/docs/route.js");
  const FLOW = await import("@/app/api/studios/[slug]/quality/docs/workflow/route.js");

  const P = ctx({ slug });
  const shot = async (name, payload) => {
    const r = golden(name, payload, EXTRA);
    if (!r.recorded) ok(`${name} matches its golden`, r.ok, r.detail);
    return payload;
  };
  const personWith = async (permissions, alias) => {
    const u = (await createUser({ email: `g-${alias}-${rand()}@test.invalid`, passwordHash: "x" })).user;
    const role = await createRole(studio.id, { name: `role-${alias}`, permissions });
    await addCollaborator(studio.id, { userId: u.id, alias, role: "member", roleIds: [role.id] });
    return { user: u, collaborator: await getCollaboratorByUser(studio.id, u.id) };
  };
  const move = (id, action, body = {}) => capture(
    FLOW.POST,
    req(`/api/studios/${slug}/quality/docs/workflow?id=${id}`, { method: "POST", body: { action, ...body } }),
    P);

  await signIn(owner.id);

  const doc = await shot("quality.document.created", await capture(
    DOCS.POST, req(`/api/studios/${slug}/quality/docs`, { method: "POST", body: {
      title: "Boardroom commissioning procedure", prefix: "SOP", dept: "TEC",
    } }), P));
  const docId = doc.body?.document?.id ?? doc.body?.doc?.id ?? doc.body?.id;
  ok("the document was created", Boolean(docId), JSON.stringify(doc.body).slice(0, 160));

  // ---- the ladder must be climbed in order --------------------------------
  // Signing as approver before anybody has reviewed is a state error, not a
  // permission one — the owner holds every right and is still refused.
  await shot("quality.refused.approve.outoforder", await move(docId, "approve"));
  await shot("quality.refused.publish.outoforder", await move(docId, "publish"));

  // A DOCUMENT WITH NOTHING IN IT CANNOT BE SENT FOR REVIEW, which is the right
  // refusal and one worth having: an empty revision signed by two people is the
  // exact ceremony this module exists to prevent.
  await shot("quality.refused.submit.empty", await move(docId, "submit"));

  // The body is stringified ProseMirror JSON, not HTML — the store parses it once
  // purely to refuse anything that is not a document. CAPTURED and asserted
  // rather than fired and forgotten: the first version of this sent HTML, was
  // refused, and the failure surfaced three steps later as "no revision", which
  // is the least useful place to learn about it.
  const CONTENT = JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Commission the room, then sign here." }] }],
  });
  const written = await capture(DOCS.PATCH, req(`/api/studios/${slug}/quality/docs?id=${docId}`, {
    method: "PATCH", body: { content: CONTENT },
  }), P);
  ok("the document accepts content", written.status === 200, `${written.status} ${JSON.stringify(written.body).slice(0, 120)}`);

  // A REVISION IS THE UNIT THAT GETS SIGNED, not the document — and a new
  // document already HAS its first one, open and in draft. `start` is for the
  // revision AFTER an issue, so on a document nobody has issued yet there is
  // nothing to revise and it says so.
  const tooEarly = await shot("quality.refused.start.notissued", await move(docId, "start"));
  ok("a document nobody has issued has no next revision to open",
    tooEarly.body?.error === "not-issued", `${tooEarly.status} ${JSON.stringify(tooEarly.body)}`);

  const submitted = await shot("quality.submitted", await move(docId, "submit"));
  ok("a document with content and an open revision can be sent for review",
    submitted.status === 200, `${submitted.status} ${JSON.stringify(submitted.body).slice(0, 120)}`);

  // ---- each signature is its own right -------------------------------------
  // An author who may write the document and send it for review, and nothing
  // more. Refused at both signature steps, each naming a different right.
  const author = await personWith(
    ["quality.documents.view", "quality.documents.create", "quality.documents.edit"], "qauthor");
  await signIn(author.user.id);
  const noReview = await shot("quality.refused.review", await move(docId, "review"));
  ok("editing a document does not entitle you to review it",
    noReview.body?.error === "forbidden", `${noReview.status} ${JSON.stringify(noReview.body)}`);

  // ---- NOBODY SIGNS BOTH HALVES -------------------------------------------
  // One person holding BOTH rights, which is legitimate. They review, and are
  // then refused their own approval — not because of what they hold, but
  // because of who signed the line above.
  const both = await personWith(
    ["quality.documents.view", "quality.documents.edit",
      "quality.documents.review", "quality.documents.approve"], "qboth");
  await signIn(both.user.id);

  const reviewed = await shot("quality.reviewed", await move(docId, "review"));
  ok("somebody holding the review right may sign as reviewer", reviewed.status === 200,
    `${reviewed.status} ${JSON.stringify(reviewed.body).slice(0, 100)}`);

  const sameHand = await shot("quality.refused.approve.samesigner", await move(docId, "approve"));
  ok("the same hand cannot then sign as approver", sameHand.body?.error === "same-signer",
    `${sameHand.status} ${JSON.stringify(sameHand.body)}`);
  ok("...and it is a conflict, not a permission refusal — they DO hold the right",
    sameHand.status === 409, String(sameHand.status));

  // A PURE APPROVER IS LOCKED OUT ENTIRELY, and this is a finding rather than a
  // rule. The workflow route is gated `{ write: true }`, which asks canManage —
  // and canManage is sectionManageable, which only ever looks at the create,
  // edit and delete VERBS. `approve` is an EXTRA, so somebody granted exactly
  // "view a document and sign it off" never reaches the service that would let
  // them.
  //
  // That defeats the separation of duties the module is built around: a quality
  // manager who signs but never authors is the normal case in a controlled
  // register, and the catalogue declares review and approve separately so they
  // CAN be two people. All five of quality's extras — setup, review, approve,
  // publish, obsolete — are unusable in isolation for the same reason.
  //
  // Pinned, not fixed: changing the gate mid-Gate-A would move goldens recorded
  // to describe today. Recorded as M-15.
  const pureApprover = await personWith(
    ["quality.documents.view", "quality.documents.approve"], "qpureapprover");
  await signIn(pureApprover.user.id);
  const lockedOut = await shot("quality.refused.approve.pureapprover", await move(docId, "approve"));
  ok("somebody granted only view+approve cannot reach the workflow at all (M-15, pinned)",
    lockedOut.body?.error === "read-only", `${lockedOut.status} ${JSON.stringify(lockedOut.body)}`);

  // So the working approver needs an authoring right they have no use for,
  // purely to get past the gate.
  const approver = await personWith(
    ["quality.documents.view", "quality.documents.edit", "quality.documents.approve"], "qapprover");
  await signIn(approver.user.id);
  const approved = await shot("quality.approved", await move(docId, "approve"));
  ok("a second pair of hands may approve it", approved.status === 200,
    `${approved.status} ${JSON.stringify(approved.body).slice(0, 100)}`);

  // ---- publishing is somebody else's decision again ------------------------
  const noPublish = await shot("quality.refused.publish", await move(docId, "publish"));
  ok("approving does not entitle you to issue", noPublish.body?.error === "forbidden",
    `${noPublish.status} ${JSON.stringify(noPublish.body)}`);

  await signIn(owner.id);
  const issued = await shot("quality.published", await move(docId, "publish", {
    effectiveDate: "2026-12-01", nextReviewDate: "2027-12-01",
  }));
  ok("the owner can issue the revision", issued.status === 200,
    `${issued.status} ${JSON.stringify(issued.body).slice(0, 120)}`);

  // ---- what an issued document will accept ---------------------------------
  await shot("quality.refused.review.afterissue", await move(docId, "review"));

  // NOW `start` means something: the issued revision stays effective and
  // untouched while its successor is drafted beside it. That is the whole point
  // of a controlled register — the version people are working to does not
  // become editable because somebody began the next one.
  const next = await shot("quality.revision.next", await move(docId, "start"));
  ok("an issued document can begin its next revision", next.status === 200,
    `${next.status} ${JSON.stringify(next.body).slice(0, 120)}`);
  await shot("quality.refused.start.alreadyopen", await move(docId, "start"));

  // ---- the walls ----------------------------------------------------------
  await signIn(outsider.id);
  await shot("quality.outsider", await capture(
    DOCS.GET, req(`/api/studios/${slug}/quality/docs`), P));
  __signOut();
  await shot("quality.unauth", await capture(
    DOCS.GET, req(`/api/studios/${slug}/quality/docs`), P));
}

// ============================================================================
console.log("== /super: a second identity, and the wall between them");
// The console runs on a SuperAdmin identity that is not a User at all — separate
// registry, separate cookie, separate lifetime, outside every cascade.
//
// WHY THAT MATTERS MORE THAN IT LOOKS. A nompany owner holds BOTH cookies in the
// same browser at the same time: they are a subscriber somewhere and an operator
// here. If either identity leaked into the other's routes, the failure would be
// silent and it would be worst exactly where it matters — their studio-side chat
// replies posted as nompany, or a subscriber session reaching the console.
//
// So the wall is asserted in BOTH directions, which is the only way to test a
// wall. Testing one side proves the door is locked; testing both proves it is a
// wall.
{
  const SUPER_USERS = await import("@/app/api/super/users/[userId]/route.js");
  const SUPER_STUDIOS = await import("@/app/api/super/studios/[id]/route.js");
  const SUPER_CATALOG = await import("@/app/api/super/catalog/[kind]/route.js");
  const SUPER_NOTIF = await import("@/app/api/super/notifications/route.js");
  const STUDIO = await import("@/app/api/studios/[slug]/route.js");
  const SALES = await import("@/app/api/studios/[slug]/sales/route.js");

  const shot = async (name, payload) => {
    const r = golden(name, payload, EXTRA);
    if (!r.recorded) ok(`${name} matches its golden`, r.ok, r.detail);
    return payload;
  };

  // ---- nobody, and then a subscriber ---------------------------------------
  __signOut();
  await shot("super.unauth.notifications", await capture(
    SUPER_NOTIF.GET, req("/api/super/notifications"), ctx()));
  await shot("super.unauth.users", await capture(
    SUPER_USERS.PATCH, req(`/api/super/users/${owner.id}`, { method: "PATCH", body: { platformRole: "support" } }),
    ctx({ userId: owner.id })));

  // THE FIRST DIRECTION. A signed-in SUBSCRIBER — the owner of a studio, who
  // holds a perfectly good nc_sid — reaching the console. Their cookie is real,
  // their account is real, and it buys them nothing here.
  await signIn(owner.id);
  const subscriberAtTheDoor = await shot("super.refused.subscriber", await capture(
    SUPER_NOTIF.GET, req("/api/super/notifications"), ctx()));
  ok("a studio owner's session does not open the console",
    subscriberAtTheDoor.status === 401, `${subscriberAtTheDoor.status} ${JSON.stringify(subscriberAtTheDoor.body)}`);

  await shot("super.refused.subscriber.studios", await capture(
    SUPER_STUDIOS.PUT, req(`/api/super/studios/${studio.id}`, { method: "PUT", body: { packageKey: "free" } }),
    ctx({ id: studio.id })));

  // ---- the operator --------------------------------------------------------
  const email = `g-console-${rand()}@test.invalid`;
  const seeded = await seedSuperAdmin({ email, password: "console-password-here" });
  ok("a console identity can be seeded", Boolean(seeded?.admin?.id), JSON.stringify(seeded?.error));
  const session = await loginSuper(email, "console-password-here");
  ok("...and can sign in", Boolean(session?.token));

  // Signed in as BOTH at once, which is the real situation for a nompany owner.
  __signIn(SUPER_COOKIE, session.token);
  const asOperator = await shot("super.notifications", await capture(
    SUPER_NOTIF.GET, req("/api/super/notifications"), ctx()));
  ok("the console identity opens the console", asOperator.status === 200,
    `${asOperator.status} ${JSON.stringify(asOperator.body).slice(0, 100)}`);

  await shot("super.catalog.packages", await capture(
    SUPER_CATALOG.GET, req("/api/super/catalog/packages"), ctx({ kind: "packages" })));
  await shot("super.catalog.unknownkind", await capture(
    SUPER_CATALOG.GET, req("/api/super/catalog/nonsense"), ctx({ kind: "nonsense" })));

  // ---- THE SECOND DIRECTION, and the one that is easy to forget ------------
  // The console cookie is now in the jar. On its own — with no subscriber
  // session — it must buy nothing inside a studio. A tenant's data is a
  // tenant's data, and being nompany is not membership.
  __signOut();
  __signIn(SUPER_COOKIE, session.token);
  const operatorInAStudio = await shot("super.refused.operator.instudio", await capture(
    STUDIO.GET, req(`/api/studios/${slug}`), ctx({ slug })));
  ok("a console session does not open a studio", operatorInAStudio.status === 401,
    `${operatorInAStudio.status} ${JSON.stringify(operatorInAStudio.body)}`);

  const operatorInSales = await shot("super.refused.operator.insales", await capture(
    SALES.GET, req(`/api/studios/${slug}/sales`), ctx({ slug })));
  ok("...nor a studio's Sales board", operatorInSales.status === 401,
    `${operatorInSales.status} ${JSON.stringify(operatorInSales.body)}`);

  // ---- what the console may legitimately do -------------------------------
  __signIn(SUPER_COOKIE, session.token);
  await shot("super.studio.repackaged", await capture(
    SUPER_STUDIOS.PUT, req(`/api/super/studios/${studio.id}`, { method: "PUT", body: { packageKey: "free" } }),
    ctx({ id: studio.id })));
  await shot("super.studio.unknownpackage", await capture(
    SUPER_STUDIOS.PUT, req(`/api/super/studios/${studio.id}`, { method: "PUT", body: { packageKey: "not-a-package" } }),
    ctx({ id: studio.id })));
  await shot("super.studio.nothingtochange", await capture(
    SUPER_STUDIOS.PUT, req(`/api/super/studios/${studio.id}`, { method: "PUT", body: {} }),
    ctx({ id: studio.id })));

  await shot("super.user.roled", await capture(
    SUPER_USERS.PATCH, req(`/api/super/users/${memberUser.id}`, { method: "PATCH", body: { platformRole: "support" } }),
    ctx({ userId: memberUser.id })));
  await shot("super.user.unknownrole", await capture(
    SUPER_USERS.PATCH, req(`/api/super/users/${memberUser.id}`, { method: "PATCH", body: { platformRole: "emperor" } }),
    ctx({ userId: memberUser.id })));
  await shot("super.user.notfound", await capture(
    SUPER_USERS.PATCH, req("/api/super/users/usr_nobodyhere0000", { method: "PATCH", body: { platformRole: "support" } }),
    ctx({ userId: "usr_nobodyhere0000" })));

  // AN OPERATOR IS NOT A SUBSCRIBER EITHER. The console refuses to demote the
  // User record behind a super-admin address, because the two are separate
  // identities and editing one to reach the other is the confusion this whole
  // split exists to prevent.
  const asUser = (await createUser({ email, passwordHash: "x" })).user;
  if (asUser) {
    await shot("super.user.refused.superadmin", await capture(
      SUPER_USERS.PATCH, req(`/api/super/users/${asUser.id}`, { method: "PATCH", body: { status: "suspended" } }),
      ctx({ userId: asUser.id })));
  }

  __signOut();
}

// ============================================================================
console.log("== observability: a line you can trace, and a secret you cannot read");
// console.error was the entire strategy — thirty-one calls across nineteen
// modules, each a sentence with no way to tell which request produced it. On a
// platform running however many instances Vercel keeps warm, an error and its
// cause are two unrelated lines in two log streams, joined by guessing at
// timestamps.
{
  ok("there is no request id outside a request", requestId() === "");

  const seen = [];
  const traced = await withRequest("test/route", async () => {
    seen.push(requestId());
    // Something that actually talks to Redis, so the completion line has hops
    // to report rather than reporting zero and looking like it works.
    await readArr(S.collaborators(studio.id));
    await readArr(S.roles(studio.id));
    return "done";
  });
  ok("a request returns its handler's value", traced === "done", String(traced));
  ok("...and carries an id while it runs", /^[0-9a-f-]{36}$/.test(seen[0]), seen[0]);
  ok("...which is gone once it ends", requestId() === "");

  // TWO REQUESTS DO NOT SHARE AN ID, which is the whole point on a platform
  // that runs them concurrently in one process.
  const a = []; const b = [];
  await Promise.all([
    withRequest("test/a", async () => { a.push(requestId()); await readArr(S.roles(studio.id)); }),
    withRequest("test/b", async () => { b.push(requestId()); await readArr(S.roles(studio.id)); }),
  ]);
  ok("concurrent requests get different ids", a[0] !== b[0], `${a[0]} vs ${b[0]}`);

  // WHAT MUST NEVER REACH A LOG LINE. Enforced in one place rather than trusted
  // to thirty-one call sites — a rule each caller remembers is a hope.
  const cleaned = redact({
    email: "someone@example.com",
    password: "hunter2",
    passwordHash: "$2b$12$abcdefghijklmnop",
    token: "abc",
    idNumber: "1098765432",
    passportNumber: "K01234567",
    salary: 42000,
    nested: { sessionToken: "s3cret", harmless: "fine" },
    bearer: "aVeryLongOpaqueLookingValueThatIsClearlyACredential123456",
    ok: "kept",
  });
  const flat = JSON.stringify(cleaned);
  for (const secret of ["hunter2", "$2b$12$", "1098765432", "K01234567", "s3cret", "aVeryLongOpaque"]) {
    ok(`a secret never reaches a log line: ${secret.slice(0, 12)}`, !flat.includes(secret), flat.slice(0, 160));
  }
  ok("...while ordinary fields survive", cleaned.ok === "kept" && cleaned.nested.harmless === "fine", flat);
  ok("...and a credential-shaped value is caught even under an innocent key",
    cleaned.bearer === "<redacted>", String(cleaned.bearer));

  // The logger must never be the thing that breaks a request.
  let threw = false;
  try {
    const circular = { name: "loop" }; circular.self = circular;
    log.info("a circular payload", circular);
  } catch { threw = true; }
  ok("logging a circular payload does not throw", threw === false);
}

// ============================================================================
console.log("== one row, by the id a live event named");
// THE OTHER HALF OF H-6. The stream now says WHICH row changed; this is what a
// board does with that. The assertions worth having are not "it returns a row"
// but the three ways it could quietly become a hole.
{
  const ROWS = await import("@/app/api/studios/[slug]/rows/route.js");
  const P = ctx({ slug });
  const ask = (q, as) => (as ? signIn(as) : Promise.resolve())
    .then(() => capture(ROWS.GET, req(`/api/studios/${slug}/rows?${q}`), P));

  await signIn(owner.id);
  const tickets = await import("@/lib/sales");
  const sc = await tickets.salesContext(owner, slug);
  const someTicket = (await tickets.listTickets(sc))[0];
  ok("there is a ticket to fetch", Boolean(someTicket?.id), String(someTicket?.id));

  const one = await ask(`collection=salesTickets&id=${someTicket.id}`);
  ok("the owner gets the row the event named",
    one.status === 200 && one.body?.row?.id === someTicket.id, `${one.status} ${one.body?.row?.id}`);

  // A COLLECTION NOBODY DECLARED IS NOT READABLE THROUGH THIS DOOR. relations.js
  // is the registry, and it says of itself that a graph reaching everything can
  // be pointed at anything. Without this, the endpoint is a way to read any
  // collection in the studio by guessing its name.
  const madeUp = await ask("collection=collaborators&id=whatever");
  ok("an undeclared collection is refused, not fetched",
    madeUp.status === 404 && madeUp.body?.error === "unknown-kind",
    `${madeUp.status} ${JSON.stringify(madeUp.body)}`);

  // THE NODE'S OWN PERMISSION, NOT THE MODULE'S. This is the assertion that
  // stops the endpoint becoming a side door: somebody who may open Sales but
  // holds no tickets grant must not read a ticket through it.
  const nosy = (await createUser({ email: `g-nosy-${rand()}@test.invalid`, passwordHash: "x" })).user;
  const nosyRole = await createRole(studio.id, {
    name: `role-nosy-${rand()}`,
    permissions: ["sales.clients.view"],
  });
  await addCollaborator(studio.id, { userId: nosy.id, alias: "Nosy", role: "member", roleIds: [nosyRole.id] });

  const refused = await ask(`collection=salesTickets&id=${someTicket.id}`, nosy.id);
  ok("a viewer without the node's grant is refused",
    refused.status === 403 && refused.body?.error === "forbidden",
    `${refused.status} ${JSON.stringify(refused.body)}`);
  ok("...and is told which grant it wanted", refused.body?.key === "sales.tickets.view",
    JSON.stringify(refused.body?.key));

  // A DELETED ROW IS A 404 AND THAT IS THE USEFUL ANSWER — `row.deleted` names
  // an id that is already gone, and 404 is how the board learns to drop it.
  await signIn(owner.id);
  const gone = await ask("collection=salesTickets&id=sal_nosuchrow");
  ok("a row that is gone answers notfound", gone.status === 404 && gone.body?.error === "notfound",
    `${gone.status} ${JSON.stringify(gone.body)}`);

  // THE ASSERTION THE WHOLE PATCH PATH RESTS ON. A board splices this row into
  // the array the list endpoint gave it, so if the two disagree by even one
  // field the screen quietly shows something the server never said — and it
  // stays wrong until somebody reloads, which is the failure targeted patching
  // is supposed to prevent rather than cause.
  //
  // A Sales ticket is not its stored row: it carries clientName, RFQ status,
  // quotation value and a project link, all derived from four other
  // collections. Returning the raw row here would blank every one of them.
  const fromList = (await tickets.listTickets(sc)).find((t) => t.id === someTicket.id);
  const fromRow = (await ask(`collection=salesTickets&id=${someTicket.id}`)).body?.row;
  ok("a patched row is byte-identical to the listed one",
    JSON.stringify(fromRow) === JSON.stringify(fromList),
    JSON.stringify(fromRow) === JSON.stringify(fromList) ? "" :
      `list ${JSON.stringify(fromList).slice(0, 90)} vs row ${JSON.stringify(fromRow).slice(0, 90)}`);

  // ...and it would have caught a raw row, which is the version that looks fine
  // in isolation and is wrong on screen.
  const raw = await (await import("@/lib/data/repo")).repo("salesTickets")
    .byId({ studio: sc.studio, section: sc.ticketsSection }, someTicket.id);
  ok("...and the raw stored row would NOT have passed that",
    JSON.stringify(raw) !== JSON.stringify(fromList),
    `raw has ${Object.keys(raw || {}).length} fields, composed has ${Object.keys(fromList || {}).length}`);

  // ---- what the board does with an event ----------------------------------
  // The decision is a pure function precisely so it can be asked here, without a
  // browser or a session. Every wrong answer is a board that disagrees with the
  // server and stays that way until somebody reloads — the exact failure this
  // feature exists to prevent, so the branching is worth pinning individually.
  {
    const { decide } = await import("@/lib/livePatch");
    const into = { salesTickets: "tickets", salesClients: "clients" };
    const ev = (over) => ({ type: "row.updated", collection: "salesTickets", rowId: "sal_1", ...over });

    ok("an update to a held collection is patched",
      decide(ev(), into).action === "patch" && decide(ev(), into).field === "tickets",
      JSON.stringify(decide(ev(), into)));

    // CREATES AND DELETES RELOAD. They change the list's length and order, and
    // the totals rendered above it — none of which a spliced row can fix.
    for (const type of ["row.created", "row.deleted"]) {
      ok(`a ${type} reloads instead`, decide(ev({ type }), into).action === "reload", type);
    }

    // A COLLECTION THIS BOARD DOES NOT HOLD. Sales watching Technical is the
    // ordinary case: the event names a row in `rfqs`, and what changed here is a
    // derived column on a ticket whose id the event never mentions.
    ok("an event for a collection the board does not hold reloads",
      decide(ev({ collection: "rfqs" }), into).action === "reload", "rfqs");

    ok("an event with no row id reloads", decide(ev({ rowId: "" }), into).action === "reload", "");
    ok("an event with no collection reloads", decide(ev({ collection: "" }), into).action === "reload", "");
    ok("a malformed event reloads rather than throwing",
      decide(undefined, into).action === "reload" && decide(ev(), undefined).action === "reload", "");
  }

  // ONE ROW COSTS FAR LESS THAN THE MODULE, which is the entire point. Measured
  // rather than asserted as a ratio, because the number that matters is that it
  // is small and stays small.
  const rowCall = await withCommandCount(() => capture(
    ROWS.GET, req(`/api/studios/${slug}/rows?collection=salesTickets&id=${someTicket.id}`), P));
  console.log(`       one row: ${rowCall.commands} commands, ${rowCall.waves} waves`);
  ok("a single row costs fewer waves than the whole module", rowCall.waves <= 3, String(rowCall.waves));
}

console.log("== the repository: a query somebody else could answer");
// SEAM B IS A PURE LIFT, so the only thing worth asserting is that it did not
// change anything. Every case below is checked against the hand-written
// expression it replaces — the same filter, the same comparator, the same
// null-guard — rather than against what the repository "should" do, because
// what it should do IS what the call sites already did.
{
  const { repo, orderBy } = await import("@/lib/data/repo");
  const sales = await import("@/lib/sales");
  await signIn(owner.id);

  const context = await sales.salesContext(owner, slug);
  const scope = { studio: context.studio, section: context.clientsSection || context.section };
  const CLIENTS = repo("salesClients");

  const raw = await readCol(scope.studio.id, scope.section.id, "salesClients");
  ok("there are rows to query", raw.length > 0, String(raw.length));

  // ---- find with no query is readCol ---------------------------------------
  const everything = await CLIENTS.find(scope);
  ok("an unfiltered find is exactly the collection",
    JSON.stringify(everything) === JSON.stringify(raw), `${everything.length} vs ${raw.length}`);

  // ---- where: exact, in, ne, contains --------------------------------------
  const one = raw[0];
  ok("an exact match finds what filter() finds",
    JSON.stringify(await CLIENTS.find(scope, { where: { id: one.id } }))
      === JSON.stringify(raw.filter((r) => r.id === one.id)), one.id);

  const ids = raw.slice(0, 2).map((r) => r.id);
  ok("`in` matches includes()",
    JSON.stringify(await CLIENTS.find(scope, { where: { id: { in: ids } } }))
      === JSON.stringify(raw.filter((r) => ids.includes(r.id))), ids.join(","));

  ok("a bare array reads as `in` too",
    JSON.stringify(await CLIENTS.find(scope, { where: { id: ids } }))
      === JSON.stringify(raw.filter((r) => ids.includes(r.id))), "");

  ok("`ne` matches !==",
    JSON.stringify(await CLIENTS.find(scope, { where: { id: { ne: one.id } } }))
      === JSON.stringify(raw.filter((r) => r.id !== one.id)), "");

  // AN UNDEFINED CONDITION IS IGNORED, not matched against. Every hand-written
  // filter chain in the services guards optional parts with `if (x)`; a caller
  // must be able to build the object without stripping the empty ones.
  ok("an undefined condition does not filter anything out",
    (await CLIENTS.find(scope, { where: { name: undefined } })).length === raw.length, "");

  // ---- order: the comparator the call sites actually use --------------------
  // 47 of the 51 sorts in the service modules are
  // `(a.f || "").localeCompare(b.f || "")`. If `order` used a plain `<` this
  // assertion is where it would show, and it would show as a reordered list
  // rather than as an error.
  const byName = await CLIENTS.find(scope, { order: { field: "name" } });
  const handSorted = [...raw].sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
  ok("ordering matches localeCompare with the || \"\" guard",
    byName.map((r) => r.name).join("|") === handSorted.map((r) => r.name).join("|"),
    byName.map((r) => r.name).join(" , ").slice(0, 90));

  const desc = await CLIENTS.find(scope, { order: { field: "name", dir: "desc" } });
  ok("...and desc is exactly its reverse",
    desc.map((r) => r.id).join("|") === [...byName].reverse().map((r) => r.id).join("|"), "");

  // ---- limit and pagination ------------------------------------------------
  ok("limit truncates after ordering, not before",
    JSON.stringify(await CLIENTS.find(scope, { order: { field: "name" }, limit: 1 }))
      === JSON.stringify(byName.slice(0, 1)), "");

  const first = await CLIENTS.page(scope, { order: { field: "name" }, limit: 1 });
  ok("a page reports the total, not just its own size",
    first.total === raw.length && first.rows.length === 1, `${first.rows.length}/${first.total}`);

  if (raw.length > 1) {
    const second = await CLIENTS.page(scope, { order: { field: "name" }, limit: 1, cursor: first.nextCursor });
    ok("the next page starts after the cursor, with no repeat",
      second.rows[0]?.id !== first.rows[0]?.id, `${first.rows[0]?.id} then ${second.rows[0]?.id}`);
  }

  // A CURSOR WHOSE ROW WAS DELETED MEANS "START AGAIN", not a crash and not an
  // empty page — findIndex returns -1 and +1 makes it 0. Somebody deleting a
  // record while another person pages past it is ordinary.
  const stale = await CLIENTS.page(scope, { order: { field: "name" }, limit: 1, cursor: "sal_gone" });
  ok("a stale cursor restarts rather than failing", stale.rows.length === 1, String(stale.rows.length));

  // ---- byId and count ------------------------------------------------------
  ok("byId finds it", (await CLIENTS.byId(scope, one.id))?.id === one.id, one.id);
  ok("byId of nothing is null", (await CLIENTS.byId(scope, "sal_nope")) === null, "");
  ok("count counts without the caller materialising anything",
    (await CLIENTS.count(scope)) === raw.length, String(raw.length));

  // ---- the discipline ------------------------------------------------------
  // WHERE IS DATA, NOT A FUNCTION. The moment a predicate is accepted here the
  // seam has failed at its only job, because a JavaScript callback cannot become
  // a SQL WHERE clause. An unknown operator is a loud error rather than a
  // silently-ignored condition that returns too many rows.
  let threw = "";
  try { await CLIENTS.find(scope, { where: { name: { matches: /x/ } } }); }
  catch (e) { threw = e.message; }
  ok("an unknown operator is refused loudly", threw.includes("unknown operator"), threw);

  // ---- the comparator, asked directly -------------------------------------
  // THE FIXTURE ABOVE CANNOT PROVE THIS. Two rows called "Acme Holdings" and
  // "Second Client" sort the same way under localeCompare and under `<`, so the
  // assertion further up would stay green if the default silently became a
  // plain comparison. These inputs are chosen because the two disagree: in code
  // units "Zoe" < "ätna", and to a reader "ätna" belongs beside "Apple".
  {
    const rows = [{ id: "c", name: "Zoe" }, { id: "a", name: "ätna" }, { id: "b", name: "Apple" }];
    const viaRepo = [...rows].sort(orderBy({ field: "name" })).map((r) => r.name);
    const viaHand = [...rows].sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""))).map((r) => r.name);
    const viaPlain = [...rows].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).map((r) => r.name);

    ok("the default comparator IS localeCompare", viaRepo.join("|") === viaHand.join("|"), viaRepo.join(" , "));
    ok("...and these inputs would have caught a plain `<`", viaHand.join("|") !== viaPlain.join("|"),
      `localeCompare: ${viaHand.join(" , ")} vs plain: ${viaPlain.join(" , ")}`);
  }

  // NUMBERS ARE NOT TEXT, and "10" < "9" as strings. The `as: "number"` option
  // exists for the handful of genuinely numeric sorts; this is what it buys.
  {
    const rows = [{ id: "a", n: 9 }, { id: "b", n: 10 }, { id: "c", n: 100 }];
    const numeric = [...rows].sort(orderBy({ field: "n", as: "number" })).map((r) => r.n);
    const textual = [...rows].sort(orderBy({ field: "n" })).map((r) => r.n);
    ok("as:number sorts numerically", numeric.join(",") === "9,10,100", numeric.join(","));
    ok("...and text would have got it wrong", textual.join(",") !== "9,10,100", textual.join(","));
  }

  // TIES BREAK ON id, so a page boundary cannot land inside a group of equal
  // rows and show one of them on both pages.
  {
    const rows = [{ id: "z", name: "same" }, { id: "a", name: "same" }];
    const sorted = [...rows].sort(orderBy({ field: "name" })).map((r) => r.id);
    ok("equal rows fall back to a total order on id", sorted.join(",") === "a,z", sorted.join(","));
  }

  let noScope = "";
  try { await CLIENTS.find({ studio: context.studio }); }
  catch (e) { noScope = e.message; }
  ok("a scope without a section is refused", noScope.includes("scope needs"), noScope);
}

console.log("== idempotency: a retry does not bill twice");
// THE POINT IS NOT THAT THE RESPONSE REPEATS. It is that the WRITE happened
// once. A wrapper that re-ran the handler and returned the second result would
// satisfy any assertion about matching bodies while quietly creating two
// expenses, so the claim is checked against the collection, not the reply.
//
// EXPENSES, DELIBERATELY, AND NOT CLIENTS. The first draft used sales/clients
// and the count assertion was worthless there: createClient refuses a duplicate
// NAME on its own, so "exists exactly once" stayed true with idempotency
// switched off entirely. It was measuring the service's dedupe, not this.
//
// Two identical expenses are legitimate — the same taxi fare twice in a day is
// two expenses — so nothing but idempotency stands between a retry and a second
// row. Which is the actual risk: a timeout on the endpoint that books money.
{
  const EXPENSES = await import("@/app/api/studios/[slug]/finance/expenses/route.js");
  const finance = await import("@/lib/finance");
  await signIn(owner.id);

  const P = ctx({ slug });
  const send = (key, amount) => capture(EXPENSES.POST, req(`/api/studios/${slug}/finance/expenses`, {
    method: "POST",
    body: { amount, category: "Travel", note: "idempotency fixture" },
    headers: key ? { "idempotency-key": key } : {},
  }), P);

  const countAt = async (amount) => {
    const context = await finance.financeContext(owner, slug);
    return (await finance.listExpenses(context)).filter((e) => Number(e.amount) === amount).length;
  };

  const first = await send("bill-once-1", 4200);
  ok("the first attempt is created", first.status === 201, `${first.status} ${JSON.stringify(first.body).slice(0, 80)}`);

  const retry = await send("bill-once-1", 4200);
  ok("the retry replays the first answer",
    retry.status === first.status && JSON.stringify(retry.body) === JSON.stringify(first.body),
    `${retry.status} ${JSON.stringify(retry.body).slice(0, 80)}`);

  // THE ASSERTION THAT MATTERS. Nothing else in the stack would stop a second
  // row here, so this fails the moment the wrapper stops replaying.
  ok("...and the money was booked exactly once", (await countAt(4200)) === 1, String(await countAt(4200)));

  // WITHOUT THE HEADER NOTHING CHANGES, which is what makes this safe to switch
  // on under every converted route at once. The request RUNS, and a second
  // identical expense is a perfectly ordinary thing to have.
  const noKey = await send("", 4200);
  ok("an unkeyed repeat is executed, not replayed",
    noKey.body?.expense?.id !== first.body?.expense?.id, String(noKey.status));
  ok("...so now there are two", (await countAt(4200)) === 2, String(await countAt(4200)));

  // A DIFFERENT KEY IS A DIFFERENT INTENTION.
  const other = await send("bill-once-2", 7700);
  ok("a different key runs for real", other.status === 201, String(other.status));

  // THE KEY IS SCOPED TO THE CALLER. The client chooses the string, so a key
  // that only named itself would let one user replay — or claim — another's
  // answer by guessing a UUID.
  //
  // THE SECOND USER MUST BE ABLE TO DO THE THING. The first draft used the plain
  // member, who holds no Finance rights: they got 403, the assertion passed, and
  // it proved nothing — they would have been refused whether or not the key was
  // scoped. A permitted user is the only one whose success could have come from
  // the wrong place.
  const booker = (await createUser({ email: `g-booker-${rand()}@test.invalid`, passwordHash: "x" })).user;
  const bookerRole = await createRole(studio.id, {
    name: `role-booker-${rand()}`,
    permissions: ["finance.cash.view", "finance.cash.create"],
  });
  await addCollaborator(studio.id, { userId: booker.id, alias: "Booker", role: "member", roleIds: [bookerRole.id] });

  await signIn(booker.id);
  const stolen = await capture(EXPENSES.POST, req(`/api/studios/${slug}/finance/expenses`, {
    method: "POST",
    body: { amount: 999, category: "Travel", note: "second caller" },
    headers: { "idempotency-key": "bill-once-1" },
  }), P);
  ok("a permitted second user reusing the key is not handed the first user's answer",
    stolen.body?.expense?.id !== first.body?.expense?.id,
    `${stolen.status} ${stolen.body?.expense?.id ?? JSON.stringify(stolen.body).slice(0, 60)}`);
  ok("...and booked their own amount, not the first caller's",
    Number(stolen.body?.expense?.amount) === 999, JSON.stringify(stolen.body?.expense?.amount ?? null));
  await signIn(owner.id);
}

console.log("== CSRF: a write arriving from somebody else's page");
// THE CONTROL HAS TO BE EXERCISED OR IT IS A CLAIM, NOT A CONTROL. A CSRF check
// that is never fired is indistinguishable from one wired to the wrong method,
// or to a header name nobody sends — and both failures look exactly like safety
// right up until they don't.
{
  const PROFILE = await import("@/app/api/identity/profile/route.js");
  await signIn(owner.id);

  const attacker = { origin: "https://attacker.example" };
  const ours = { origin: "http://nompany.test" };

  // ORDER MATTERS. A legitimate value goes in FIRST, so that "the attacker's
  // write did not land" is a comparison against something real rather than
  // against absence. The first draft of this asserted on `firstName`, which the
  // profile does not store at all: it read back null, passed, and proved
  // nothing. A field that is never written looks identical to a field that was
  // successfully defended.
  const same = await capture(PROFILE.PUT, req("/api/identity/profile",
    { method: "PUT", body: { fullName: "Owner Legitimate" }, headers: ours }), ctx());
  ok("a same-origin write is allowed through", same.status === 200, String(same.status));

  const cross = await capture(PROFILE.PUT, req("/api/identity/profile",
    { method: "PUT", body: { fullName: "Mallory" }, headers: attacker }), ctx());
  ok("a cross-site write is refused",
    cross.status === 403 && cross.body?.error === "cross-site",
    `${cross.status} ${JSON.stringify(cross.body)}`);

  // REFUSING AND NOT WRITING ARE TWO DIFFERENT CLAIMS. A wrapper that returned
  // 403 after the handler had already run would satisfy the assertion above and
  // still have taken the write, so the record is read back rather than trusted.
  const after = await capture(PROFILE.GET, req("/api/identity/profile"), ctx());
  ok("...and the field still holds what its owner put there",
    after.body?.fullName === "Owner Legitimate",
    JSON.stringify(after.body?.fullName ?? null));

  // DELIBERATE HOLE, PINNED SO IT STAYS DELIBERATE. Reads are exempt: blocking
  // cross-site GETs would break ordinary linking, and reading a response
  // cross-origin needs CORS to allow it, which is a different control. If
  // somebody later "tightens" this into blocking reads, this fails and they get
  // to read the reason instead of guessing at it.
  const readCross = await capture(PROFILE.GET,
    req("/api/identity/profile", { headers: attacker }), ctx());
  ok("a cross-site READ is deliberately not blocked here", readCross.status === 200,
    String(readCross.status));
}

console.log("== no golden is left behind");
// A golden file that no case produces is debris. It is almost always the old
// name of a case that was renamed, and it is worse than an empty file: it sits
// in the directory looking like coverage of something that is no longer tested,
// and it is committed, so it looks deliberate.
//
// Two appeared within an hour of the Quality block being written, from exactly
// that — quality.refused.start.twice and quality.revision.started, both renamed
// once the rule they described turned out to be something else.
{
  const dir = new URL("./goldens/", import.meta.url);
  const onDisk = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  const orphans = onDisk.filter((name) => !touched.has(name));
  ok("every golden on disk was produced by a case in this run",
    orphans.length === 0, orphans.join(", "));
  ok("...and every case produced one", touched.size === onDisk.length - orphans.length,
    `${touched.size} cases, ${onDisk.length} files`);
}

// ============================================================================
console.log("== status codes: what each refusal claims to be");
// EVERY ROUTE MAPS ITS OWN ERRORS, and they do not agree. `notfound` is 404 in
// most places, `forbidden` is 403 in most places, and the quotations route
// sends everything except notfound and locked as 400 — so a permission refusal
// arrives claiming the caller sent nonsense.
//
// That is a real inconsistency and it is NOT fixed here: changing a status
// mid-Gate-A would move the goldens that exist to record today's behaviour.
// Wave 2's shared route wrapper (refactoring-strategy.md 2.1) replaces all 97
// hand-written mappings with one table, and this is its checklist.
//
// So the count is pinned rather than the absence. Today's known mismatches pass;
// a NEW one fails, and the list prints itself as more goldens land — nobody has
// to remember to re-derive it.
{
  // THE TABLE IS NOT COPIED HERE. It lives in src/lib/httpStatus.js, which is
  // what the route wrapper will map through, so the scanner and the product
  // cannot drift into two opinions about what a refusal is worth. A local copy
  // is how this check would quietly stop meaning anything.
  const EXPECTED = STATUS;

  const dir = new URL("./goldens/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const mismatches = [];
  for (const file of files) {
    let doc;
    try { doc = JSON.parse(readFileSync(new URL(file, dir), "utf8")); } catch { continue; }
    const error = doc?.body && typeof doc.body === "object" ? doc.body.error : null;
    const want = error ? EXPECTED[error] : null;
    if (want && want !== doc.status) mismatches.push(`${file.replace(/\.json$/, "")}: ${error} is ${doc.status}, should be ${want}`);
  }

  ok("the golden set is big enough to be worth scanning", files.length >= 50, String(files.length));
  for (const m of mismatches) console.log(`       for wave 2: ${m}`);

  // KNOWN, AND ONLY THESE — BY NAME, NOT BY COUNT.
  //
  // This was a number (3) until the scanner started reading the real table in
  // src/lib/httpStatus.js instead of a twelve-entry copy, which found two more.
  // That exposed the flaw in counting: the honest response to "5 where 3 were
  // expected" is indistinguishable from the dishonest one, because both are
  // spelled `KNOWN = 5`, and nobody reviewing the diff can tell whether a route
  // regressed or the scanner got better.
  //
  // Named, both directions cost something. A NEW mismatch fails because it is
  // not on the list. A FIXED one fails too, because a stale entry means the list
  // is claiming a defect that no longer exists — so the wrapper's conversion
  // commits have to delete their line here, which is the checklist maintaining
  // itself instead of rotting.
  const KNOWN = [
    // FOUR ENTRIES LEFT THIS LIST when technical/quotations went through the
    // wrapper: convert, lock and unlock stopped answering 403-as-400, and
    // lock.notapproved stopped answering 409-as-400. Their goldens were
    // re-recorded in the same commit, which is what deleting a line here costs
    // and exactly why the guard is by name rather than by count.
    //
    // What remains is in a route the wrapper has not reached yet. `not-approved`
    // is 422 in projects and was 400 in technical — the same name, two statuses,
    // decided independently. Technical now agrees with the table; projects is
    // the last one that does not.
    // EMPTY, AND THAT IS THE POINT OF THE EXERCISE. Every route the wrapper has
    // reached now answers with the same vocabulary as every other route.
    //
    // The list is kept rather than deleted because the remaining departments are
    // still on their own hand-written ladders, and the first of them to disagree
    // with the table will fail the build and be named here until it is converted.
  ];
  const nameOf = (m) => m.split(":")[0];
  const unexpected = mismatches.filter((m) => !KNOWN.includes(nameOf(m)));
  const stale = KNOWN.filter((k) => !mismatches.some((m) => nameOf(m) === k));

  ok("no route has newly started disagreeing about what a refusal is worth",
    unexpected.length === 0, unexpected.join(" | "));
  ok("...and every mismatch still on the known list is still real",
    stale.length === 0, stale.length ? `fixed — delete from KNOWN: ${stale.join(", ")}` : "");
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
  // 12 → 7 when the route stopped re-reading sections studioContext had already
  // handed it, and 7 → 3 when W8 landed. The measurement is 2, which is the
  // number the plan set as the target for this route.
  //
  // The ceiling only ever ratchets down, and sits one wave above the
  // measurement so an accidental extra round trip fails the build.
  ok("the studio route stays under its ceiling", studioCall.waves <= 3, `${studioCall.waves} waves: ${studioCall.names.join(",")}`);

  const salesCall = await withCommandCount(() => capture(SALES.GET, req(`/api/studios/${slug}/sales`), ctx({ slug })));
  console.log(`       GET /api/studios/<slug>/sales  ${salesCall.commands} commands, ${salesCall.waves} waves`);
  // 16 → 8 with Seam C, and 8 → 4 with W8. The measurement is 3, and 3 is the
  // structural floor for this route rather than a stopping point chosen for
  // convenience: the section list cannot be fetched until the studio id is
  // known, and the seven collections cannot be fetched until the section ids
  // are. Going below it means denormalising one of those into the other — a
  // real option, with a real invalidation cost, and not one to take silently.
  ok("the sales route stays under its ceiling", salesCall.waves <= 4, `${salesCall.waves} waves: ${salesCall.names.slice(0, 20).join(",")}`);

  // THE DUPLICATE THE AUDIT NAMED: studioContext resolves sections and every
  // module context reads them again. Pinned as a count so the fix is visible
  // when it lands rather than being taken on trust.
  // WHICH KEYS, AND HOW MANY OF THEM ARE THE SAME ONE. This is the number that
  // says which fix W8 needs: repeats are what a request-scoped cache collapses,
  // distinct keys are what batching helps. Printed rather than asserted, because
  // it is a diagnosis, and pinning it would only make the fix noisier to land.
  // THE ORDER THE KEYS WERE ASKED FOR is what a wave count cannot show, and it
  // is how W8 was designed rather than guessed: a wave can only be removed by
  // finding a key whose NAME depends on a value fetched in the wave before it.
  // Four of the original seven turned out not to — g:users and g:studios are
  // fixed keys that were being read after the index that "found" them.
  //
  // Set NOMPANY_HOP_TRACE=1 to print it again the next time this matters.
  if (process.env.NOMPANY_HOP_TRACE === "1") {
    console.log("       sales read order:");
    salesCall.keys.forEach((k, i) => console.log(`         ${String(i + 1).padStart(2)}  ${k}`));
  }

  const uniq = new Set(salesCall.keys);
  const repeats = salesCall.keys.length - uniq.size;
  console.log(`       sales keys: ${salesCall.keys.length} reads, ${uniq.size} distinct, ${repeats} repeated`);
  for (const k of uniq) {
    const n = salesCall.keys.filter((x) => x === k).length;
    if (n > 1) console.log(`         ×${n}  ${k}`);
  }

  const sectionReads = salesCall.names.filter((n) => n === "get").length;
  ok("the sales route's read count is recorded", sectionReads > 0, `${sectionReads} GETs`);

  __signOut();
}

// ============================================================================
console.log(`\ngate A: ${fails ? `${fails} FAILURES` : "all passed"}\n`);
export const gateAFailures = fails;
