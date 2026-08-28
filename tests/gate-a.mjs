// GATE A — the safety net the whole remediation stands on.
//
// Three families of assertion, and none of them is about a feature:
//
//   1. GOLDEN RESPONSES. Every route's status and response SHAPE, recorded
//      before the refactor starts. This is what turns "exact functional parity"
//      from a promise into a property.
//   2. THE PERMISSION MATRIX. Every one of the 105 keys in the catalogue,
//      granted alone, resolving to itself and to nothing else. This is what
//      stops a rewrite of effectivePermissions from quietly widening access.
//   3. HOP COUNTS. How many Redis round trips a route costs. The audit's
//      largest finding is a hop count; a number nobody measures goes back up.
//
// Nothing in Wave 2 starts until this is green.

import * as KEYS from "@/platform/db/keys";
import { KEY_PREFIX } from "@/platform/db/keys";
import { createUser, updateUser, mintSession } from "@/platform/auth/users";
import { createStudio } from "@/modules/main/studios";
import { addCollaborator, getCollaboratorByUser, updateCollaborator } from "@/platform/auth/collaborators";
import { listRoles, createRole } from "@/modules/people/roles";
import { ALL_PERMISSIONS, AREAS, ADMIN_ROLE_ID, effectivePermissions } from "@/platform/access";
import { STATUS } from "@/platform/http/httpStatus";
import { studioContext } from "@/lib/studios";
import { SESSION_COOKIE } from "@/platform/auth/identity";
import { EASE_OUT_EXPO, EASE_SOFT, sample as ease, css as easeCss } from "@/components/motion/tokens";
import { seedSuperAdmin, loginSuper, SUPER_COOKIE } from "@/platform/auth/superAuth";
import { withCommandCount } from "@/platform/db/commandCount";
import { withRequest, requestId, redact, log } from "@/platform/http/observability";
import { readArr, setJSON } from "@/platform/db/store";
import { readCol } from "@/platform/db/sections";
import { S } from "@/platform/db/keys";
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
  // The vacation fixture below used to be the literal `2026-09-01`, which is
  // `today+N` for some N that keeps changing as the calendar moves — and
  // periodically N landed inside [0, 6] and got silently rewritten by the two
  // placeholders above, failing the collision check for a reason that had
  // nothing to do with the code. Clock-relative and pushed to today+30/34 —
  // comfortably outside the week window this file also exercises — so it can
  // never collide again, the same fix as the operations week window itself.
  [utcDay(30)]: "<today+30>",
  [utcDay(34)]: "<today+34>",
  // The manager-booked leave below (hr.vacation.forothers.bymanager) and the
  // operations refusal that schedules against it (operations.shift.refused.
  // onleave) carried the literal `2026-10-01`/`2026-10-02` — chosen the same
  // way the `2026-09-01` above once was, and never converted when the vacation
  // fixture above was made clock-relative. `today+N` reached it on 1 Oct 2026
  // and will again every time the calendar comes back around, so both goldens
  // failed on a date rather than on a change. Pushed further out than the
  // asker's own 30/34 block so the two leave records stay visibly distinct.
  [utcDay(40)]: "<today+40>",
  [utcDay(41)]: "<today+41>",
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

// THE SAME CHECK, ONE STEP LATER — over what actually got written to disk
// rather than over this file's source. hr.vacation.forothers.bymanager and
// operations.shift.refused.onleave both carried a raw `2026-10-01`/`2026-10-02`
// long after the fixture that fed hr.vacation.requested was made clock-relative:
// the placeholder map above was extended, but those two request bodies were
// never converted, so the two goldens kept a literal that reads as `today+30`
// on exactly one day a year and as nothing — silently correct — every other day
// until the clock caught up with it and it started failing instead. A golden is
// meant to hold NO raw date that the normaliser would have turned into a
// placeholder had it seen one this run, so this reads every recorded file
// looking for exactly that: a date string identical to one this run's `EXTRA`
// map would substitute. The set is read out of `EXTRA` itself (every placeholder
// whose value starts with `<today`) rather than re-listed here, for the same
// reason the fixture scan above reads its own source instead of a maintained
// copy.
{
  const clockDates = new Set(
    Object.entries(EXTRA).filter(([, placeholder]) => placeholder.startsWith("<today")).map(([literal]) => literal));
  const dir = new URL("./goldens/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const leaks = [];
  for (const file of files) {
    const text = readFileSync(new URL(file, dir), "utf8");
    const found = (text.match(/"20\d\d-\d\d-\d\d"/g) || []).map((s) => s.slice(1, -1));
    for (const d of found) {
      if (clockDates.has(d)) leaks.push(`${file.replace(/\.json$/, "")}: ${d}`);
    }
  }
  ok("no recorded golden carries a date the clock can reach",
    leaks.length === 0,
    leaks.length ? `${leaks.join("; ")} — re-record with the placeholder, or the fixture that produced it needs one` : "");
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
  // same way, for the same reason, found by the same check; 105 when Finance 1b
  // added finance.ledger's view, post and reverse; 115 when Finance 1b added
  // finance.payables (view/create/edit/delete + approve/pay) and finance.assets
  // (view/create/edit + dispose); 117 when the planner became a grantable
  // sub-section of Operations (operations.planner view/edit); 121 when the rota
  // moved to its own operations.schedule sub-section (view/create/edit/delete);
  // 122 when the engagement view became grantable.
  ok("the catalogue is the size we last agreed", ALL_PERMISSIONS.length === 122, String(ALL_PERMISSIONS.length));

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
    "api/pricing/route.ts": "the marketing price list",
    "api/track/route.ts": "anonymous traffic beacon; rate-limited and origin-checked instead",
    "api/auth/oauth/[provider]/start/route.ts": "starts sign-in; there is no session yet",
    "api/auth/callback/[provider]/route.ts": "completes sign-in; the provider is the credential",
    "api/identity/login/route.ts": "the sign-in door",
    "api/identity/signup/route.ts": "the sign-up door",
    "api/identity/forgot/route.ts": "password reset request",
    "api/identity/reset/route.ts": "password reset completion",
    "api/identity/otp/verify/route.ts": "completes an OTP challenge; the code is the credential",
    "api/identity/otp/resend/route.ts": "resends a code for an in-flight challenge",
    "api/identity/logout/route.ts": "clears a cookie; refusing an unauthenticated caller helps nobody",
    "api/identity/me/route.ts": "answers null when signed out",
    "api/super/login/route.ts": "the console door",
    "api/super/logout/route.ts": "clears a cookie",
    "api/fonts/route.ts": "the document editor's font catalogue; no tenant data",
    "api/media/[id]/route.ts": "public blobs are public by definition; private ones check membership",
  };

  const routes = sources.filter((f) => /app\/api\/.*route\.(js|ts)$/.test(f.path));
  ok("the route scan found the routes", routes.length >= 90, String(routes.length));

  const unguarded = [];
  for (const route of routes) {
    const rel = route.path.replace(/^src\/app\//, "");
    if (PUBLIC[rel]) continue;
    if (AUTH.test(route.text)) continue;
    // One hop: does anything it imports do the authenticating?
    //
    // FOLLOWS ANY `@/` SPECIFIER, not just `@/lib`. Wave 3 moves modules out to
    // `@/platform` and `@/shared` one folder at a time, and a check that only
    // knew about `@/lib` would stop seeing the guard a route delegates to —
    // reporting it unguarded when nothing changed but an import path. A test
    // that cries wolf on a refactor gets an exception list, and an exception
    // list is where real holes hide.
    const imported = [...route.text.matchAll(/from "@\/([a-zA-Z0-9/_-]+)"/g)].map((m) => m[1]);
    const delegated = imported.some((mod) => {
      const file = sources.find((f) => ["", ".js", ".ts", "/index.js", "/index.ts"]
        .some((ext) => f.path === `src/${mod}${ext}`));
      return file && AUTH.test(file.text);
    });
    if (!delegated) unguarded.push(rel);
  }
  ok("every route authenticates, directly or through a guard",
    unguarded.length === 0, unguarded.join(", "));

  // ---- 4. the shared kit is actually shareable ----------------------------
  //
  // Wave 4 gives all twelve departments a dashboard, so the chart kit and the
  // motion primitives moved out of the two places that owned them. A move like
  // that fails QUIETLY in three specific ways, and each one below is one of
  // them — none would fail a build, and the first two only show up as a screen
  // that looks slightly wrong to somebody who is not looking for it.
  {
    const globals = readFileSync("src/app/globals.css", "utf8");
    const superCss = readFileSync("src/app/super/super.css", "utf8");

    // (a) THE TOKENS THE KIT DRAWS WITH MUST EXIST WHERE IT IS USED.
    // `--ad-chart-*`, `--ad-muted*` and `--ad-border` are all declared INSIDE
    // `.admindek`, and super.css is imported by `/super/layout.js` alone. A
    // chart carrying those into a studio screen renders every series with an
    // invalid colour — which paints black, or nothing, depending on the
    // property. It builds, it deploys, and it is wrong.
    const kit = sources.filter((f) => f.path.startsWith("src/components/charts/"));
    ok("the chart kit is where the scan expects it", kit.length > 0, String(kit.length));
    const consoleOnly = kit.flatMap((f) =>
      [...f.text.matchAll(/var\(--ad-[a-z0-9-]+\)/g)].map((m) => `${f.path.split("/").pop()}:${m[0]}`));
    ok("the shared chart kit uses no console-only token",
      consoleOnly.length === 0, consoleOnly.join(", "));

    // ...and the ramp it DOES use is on :root, not in a scope.
    // Matched with a regex rather than by scanning for a closing brace at the
    // start of a line: the file is CRLF on disk and is read verbatim, so that
    // scan would be hunting for the wrong two characters and would quietly
    // find nothing, which reads here as "the ramp is missing".
    // EVERY `:root` rule, not the first — globals.css has four of them (the
    // brand scale, the semantic layer, the studio surface, the doc tokens) and
    // matching only the first found nothing while the ramp sat in the fourth.
    const rootBlock = (globals.match(/:root\s*\{[^}]*}/g) || []).join("");
    const ramp = [1, 2, 3, 4, 5].filter((n) => rootBlock.includes(`--chart-${n}:`));
    ok("the five-series ramp is declared on :root", ramp.length === 5, `${ramp.length}/5`);
    // And the console aliases it rather than restating it — one definition, so
    // a retuned series cannot mean two different things on two surfaces.
    ok("...and /super aliases that ramp rather than redeclaring it",
      superCss.includes("--ad-chart-1-rgb: var(--chart-1)"));

    // (b) THE UTILITY CLASSES TOO. `.num` and `.skel` were `.ad-num`/`.ad-skel`
    // in super.css; the kit's own ChartSkeleton and BarList use them. Left
    // behind, a studio skeleton would be an invisible box of the right size —
    // a card that looks empty rather than loading.
    ok("the number and skeleton utilities are global",
      globals.includes(".num {") && globals.includes(".skel {"));
    ok("...and no longer in the console's own sheet",
      !superCss.includes(".num {") && !superCss.includes(".skel {"));
    ok("...and the sweep keyframe moved with them", globals.includes("@keyframes skel-sweep"));

    // (c) THE STUDIO'S CHUNK STAYS CLEAR OF `motion/react`.
    //
    // THE ONE THAT ACTUALLY COSTS MONEY. The library is ~30 KB gzipped and is
    // today confined to components/landing/** — which is the only reason the
    // studio's chunk does not carry it. The landing's CountUp used it, and
    // Wave 4 wants a rolling KPI figure on every department dashboard: one
    // `import { CountUp } from "@/components/landing/ui/CountUp"` in a studio
    // card and every studio route pays for the landing's animation library.
    // The shared one in components/motion is hand-driven for exactly this
    // reason, and this holds the line. The landing may keep using it.
    const leaked = sources
      .filter((f) => f.text.includes('"motion/react"') || f.text.includes("'motion/react'"))
      .filter((f) => !f.path.startsWith("src/components/landing/"))
      .map((f) => f.path);
    ok("motion/react stays inside the landing", leaked.length === 0, leaked.join(", "));
    // ...and the scan can see it at all, or the line above passes on an empty set.
    const usesIt = sources.filter((f) => f.text.includes('"motion/react"')).length;
    ok("...and the scan is finding real imports of it", usesIt > 5, String(usesIt));

    // (e) THE EASING ARITHMETIC, because it replaced a library's.
    //
    // CountUp used to hand `motion/react` a cubic-bezier and let it drive the
    // number; the shared one samples the curve itself so the studio does not
    // ship the library. That swap moved real maths into this repo, and a
    // Newton-Raphson solve that quietly falls back to linear looks fine in a
    // screenshot — the count still lands on the right figure, it just arrives
    // mechanically. Nobody would file that, so it is asserted here.
    //
    // NOT VERIFIABLE IN THE BROWSER PANE, which never composites and therefore
    // never fires requestAnimationFrame: an animation cannot be watched there
    // at all. Deterministic arithmetic is the check that actually works.
    ok("the curve is pinned at both ends",
      ease(EASE_OUT_EXPO, 0) === 0 && ease(EASE_OUT_EXPO, 1) === 1);
    ok("...and clamps outside them",
      ease(EASE_OUT_EXPO, -1) === 0 && ease(EASE_OUT_EXPO, 2) === 1);

    let monotonic = true;
    let prev = -1;
    for (let i = 0; i <= 100; i++) {
      const v = ease(EASE_OUT_EXPO, i / 100);
      if (v < prev - 1e-9) monotonic = false;
      prev = v;
    }
    ok("...and never goes backwards", monotonic);

    // THE ONE THAT CATCHES A LINEAR FALLBACK. EASE_OUT_EXPO decelerates hard,
    // so it is most of the way there by the time it is a quarter through —
    // a linear solve would answer 0.25 here, and 0.5 at the midpoint.
    const quarter = ease(EASE_OUT_EXPO, 0.25);
    const half = ease(EASE_OUT_EXPO, 0.5);
    ok("an out-expo curve is well ahead of linear early on",
      quarter > 0.6 && half > 0.85, `t=.25 -> ${quarter.toFixed(3)}, t=.5 -> ${half.toFixed(3)}`);
    // ...and the symmetric one is not, or the test above would pass on any
    // curve at all.
    const soft = ease(EASE_SOFT, 0.25);
    ok("...while the symmetric one is behind it", soft < 0.15, soft.toFixed(3));
    ok("EASE_SOFT is symmetric about its midpoint",
      Math.abs(ease(EASE_SOFT, 0.5) - 0.5) < 1e-3, ease(EASE_SOFT, 0.5).toFixed(4));

    // The same numbers reach CSS unchanged, for the transitions that are
    // declarative rather than driven.
    ok("the curve serialises to a CSS value",
      easeCss(EASE_OUT_EXPO) === "cubic-bezier(0.16, 1, 0.3, 1)", easeCss(EASE_OUT_EXPO));

    // (d) NOTHING IMPORTS THE COPIES THAT WERE DELETED.
    const stale = sources
      .filter((f) => /components\/(Reveal|landing\/ui\/CountUp)"/.test(f.text))
      .map((f) => f.path);
    ok("nothing still imports the superseded copies", stale.length === 0, stale.join(", "));
  }

  // ---- 5. RTL: physical CSS utilities cannot mirror ------------------------
  //
  // A studio in Arabic mirrors from ONE attribute — `dir` on the shell — because
  // ps-/pe-, ms-/me-, start-/end- and border-s- are logical properties and the
  // browser flips them. `pl-`, `ml-`, `left-` and `text-left` are not: they mean
  // the same physical edge in both directions, so every one of them is a place
  // an Arabic screen stays pointing the wrong way.
  //
  // A CEILING RATHER THAN A BAN, because a few are legitimately physical:
  //
  //   • The document editor's alignment controls. When an author clicks "align
  //     left" they mean LEFT — that is a property of the document they are
  //     writing, not of the interface they are writing it in. Excluded outright.
  //   • Decorative positioning in viewport space — the landing's ambient blobs
  //     sit where they sit; there is no reading order to respect.
  //   • Centring: `left-1/2` with `-translate-x-1/2` centres identically either
  //     way, and `start-1/2` would actually BREAK it, since translate-x stays
  //     physical.
  //
  // So this counts and holds a line rather than forbidding. It exists because
  // Wave 4 rewrites all twelve studio screens, and the cheapest moment to stop a
  // backlog growing is before the rewriting starts. The number goes down as the
  // landing and Quality are swept; it must never go up.
  {
    const PHYSICAL = new RegExp(
      [
        String.raw`(?:^|[\s"'\`{])(?:pl|pr|ml|mr)-[a-z0-9.[\]/-]+`,
        String.raw`(?:^|[\s"'\`{])border-[lr]-[a-z0-9[\]/-]+`,
        String.raw`(?:^|[\s"'\`{])(?:left|right)-[0-9a-z.[\]/-]+`,
        String.raw`(?:^|[\s"'\`{])rounded-[lr]-[a-z0-9[\]/-]+`,
        String.raw`\btext-(?:left|right)\b`,
      ].join("|"),
      "g",
    );
    // Prose, not classes: "right-to-left", "left-to-right", "right-hand".
    const PROSE = /-(?:to|hand)\b/;
    // The author's own alignment, not the interface's. See above.
    const ALLOWED = ["components/quality/editor/"];

    const offenders = [];
    for (const f of sources) {
      if (!/\.(js|jsx|tsx)$/.test(f.path)) continue;
      if (!f.path.includes("src/components/") && !f.path.includes("src/app/")) continue;
      if (ALLOWED.some((a) => f.path.includes(a))) continue;
      for (const hit of f.text.match(PHYSICAL) || []) {
        const cls = hit.replace(/^[\s"'\`{]/, "");
        if (PROSE.test(cls)) continue;
        offenders.push(`${f.path.split("/").pop()}:${cls}`);
      }
    }

    // RE-MEASURED 24/08/2026 after a /super sweep. 37, and it breaks down as:
    //
    //   17  the landing — decorative blobs in viewport space, plus marketing
    //       chrome (TopNav, the hero dashboard mockups) that is English-only
    //   16  shadcn primitives (dropdown-menu 8, select 5, dialog 2, avatar 1),
    //       vendored source we own and can make logical
    //    2  Quality, outside the editor — both `ml-auto`
    //    1  the kanban dialog (vendored) — `left-1/2` with `-translate-x-1/2`,
    //       centring, CORRECT — `start-1/2` would break it, translate-x is physical
    //    1  the studio: the same centring `left-1/2` in StudioTicketProfile
    //
    // WENT FROM 41 TO 37 in the commit that lowered this line: three /super
    // controls that genuinely mirror were made logical — the toggle knobs in
    // NovaSwitchboard and CatalogEditor (`left-[22px]`/`left-0.5` → `start-…`,
    // the exact "knob pinned to left- reads inverted in Arabic" bug once fixed in
    // the studio) and the MigrationScreen timeline rail (`left-[7px]` → `start-`).
    // Identical in English, correct in Arabic. Tailwind 3.4 emits `start-*`/`end-*`
    // as inset-inline utilities, so this is the inset analogue of ps-/pe-/ms-/me-.
    //
    // Lower it as each area is swept; never raise it.
    const CEILING = 37;
    ok("physical CSS utilities stay inside their ceiling",
      offenders.length <= CEILING, `${offenders.length} of ${CEILING} — ${offenders.slice(0, 6).join(", ")}`);
    // And the counter itself has to be able to see them, or the line above is a
    // pass that proves nothing — the same failure the write-scan had.
    ok("...and the scan is reading real files", offenders.length > 0, String(offenders.length));
  }

  // ---- 6. dates render through the one formatter -------------------------
  //
  // dd/mm/yyyy EVERYWHERE, and the tenant's configured locale, is a product
  // rule — and the way it breaks is a call site quietly reaching for
  // `toLocaleDateString` instead of `fmtDate`. One already did: an FX "rates
  // as of" line called it with NO locale, so it rendered mm/dd/yyyy in a US
  // browser and dd/mm/yyyy in a Saudi one — the same screen, two dates.
  //
  // The studio is where this matters, because the studio honours a per-tenant
  // locale that a raw call cannot see. The formatters live in `format.ts` and
  // `companySettings.ts`; nothing else in `src/components/studio2` may format a
  // date itself. `/super` is deliberately NOT scanned — it is English-only and
  // its template pages format dates inline on purpose, and they go with the
  // placeholder sweep.
  {
    // A single backslash held in a variable, so the RegExp strings below carry
    // no escapes of their own — the same reason the RTL block does it this way.
    const BS = String.fromCharCode(92);
    const RAW = new RegExp("toLocale" + "(?:Date|Time)?String" + BS + "s*" + BS + "(", "g");
    const offenders = [];
    for (const f of sources) {
      if (!f.path.includes("src/components/studio2/")) continue;
      for (const line of f.text.split(String.fromCharCode(10))) {
        // A mention in a COMMENT is not a call — the consolidation left a note
        // in ui.js describing the old code, and a note is not a regression.
        // NO `$` ANCHOR: `sources` split on "\n" leaves a trailing "\r",
        // and `.` does not cross it, so `.*$` without the `m` flag silently
        // matches nothing and the comment strip becomes a no-op — which is how a
        // comment mentioning toLocale gets reported as a real call.
        const code = line.replace(new RegExp(BS + "s*//.*"), "");
        if (RAW.test(code)) offenders.push(`${f.path.split("/").pop()}: ${line.trim().slice(0, 60)}`);
        RAW.lastIndex = 0;
      }
    }
    ok("the studio formats every date through fmtDate, not a raw locale call",
      offenders.length === 0, offenders.join(" | "));
    // And the formatter it delegates to actually produces dd/mm/yyyy — the
    // whole point, and a one-line proof that a future edit to the default
    // locale cannot silently flip the order.
    const { formatDate } = await import("@/modules/main/companySettings");
    const shown = formatDate("2019-04-07");
    ok("...and that formatter renders dd/mm/yyyy", shown === "07/04/2019", shown);
    // A date-only string is LOCAL midnight, not UTC — or a due date lands on
    // the day before in every Western timezone. Proven by the day surviving.
    ok("...and a date-only value does not drift a day", formatDate("2019-04-07").startsWith("07/"), formatDate("2019-04-07"));
  }

  // ---- 7. every notification type has a producer --------------------------
  //
  // A NOTIFY.* constant with nothing that emits it is a promise the product does
  // not keep — the same shape as a key builder nobody reads. It has bitten here:
  // taskAssigned was declared from day one and no code produced it, so a task
  // handed to somebody told them nothing until Wave 4 wired it.
  //
  // So every value on NOTIFY must be referenced OUTSIDE the notify module — i.e.
  // somewhere that calls notifyCollaborators with it. The two on ALLOW are known
  // gaps, named here rather than left invisible: `mention` waits on an @-parser
  // that does not exist, and `peopleChanged` on the People screen's own edits.
  // Deleting either without producing it is fine; ADDING a third silent type is
  // the regression this catches.
  {
    const { NOTIFY } = await import("@/platform/notify/notifications");
    const ALLOW = new Set(["mention", "peopleChanged"]);
    const src = sources.filter((f) => !f.path.includes("platform/notify/notifications"));
    const orphaned = [];
    for (const key of Object.keys(NOTIFY)) {
      if (ALLOW.has(key)) continue;
      const needle = "NOTIFY." + key;
      if (!src.some((f) => f.text.includes(needle))) orphaned.push(key);
    }
    ok("every NOTIFY type is produced somewhere", orphaned.length === 0, orphaned.join(", "));
    // ...and the allow-list is not quietly hiding a type that DID get a producer
    // — an entry that is now referenced should be removed from ALLOW so the
    // check tightens as gaps are filled.
    const stale = [...ALLOW].filter((key) =>
      src.some((f) => f.text.includes("NOTIFY." + key)));
    ok("...and the known-gap list has no entry that is actually produced",
      stale.length === 0, stale.join(", "));
  }

  // ---- 8. every section is gated by an area -------------------------------
  //
  // A section key with no entry in SECTION_AREAS is treated as a heading with
  // nothing to protect, so sectionViewable returns `!own` and shows it to
  // EVERYONE — and a leaf shown to everyone drags its parent visible too. That
  // is a tenant-visibility leak (invariant 2), and it is one line away at all
  // times: add a sub-section to keys.ts, forget the mapping, and a no-role user
  // sees the department. finance-ledger did exactly this for one commit; the
  // goldens caught it, and now so does this, by name rather than by diff.
  {
    const { ALL_SECTION_KEYS } = await import("@/platform/db/keys");
    const { SECTION_AREAS } = await import("@/platform/access/resolve");
    // `main` is the studio HOME — the one section that is a heading with nothing
    // to protect, shown to every member by design. It is the sole legitimate
    // ungated section; anything else here is the leak above.
    const HEADINGS = new Set(["main"]);
    const unmapped = ALL_SECTION_KEYS.filter((k) => !SECTION_AREAS[k] && !HEADINGS.has(k));
    ok("every section key is gated by an area mapping (bar the home)", unmapped.length === 0, unmapped.join(", "));
  }

  // ---- 9. the dashboard widget registry and the dashboards agree ----------
  //
  // A tier sells dashboards by SELECTION, and the selection is a set of widget
  // KEYS (lib/dashboardWidgets). The editor offers those keys and the dashboards
  // gate on them — but the key is a bare string in both places, so a rename on
  // one side and not the other silently unlists a widget (it can never be sold)
  // or strands a sold key (nothing draws it). Neither shows as a test failure
  // anywhere else, because the fault is a string that matches nothing. This ties
  // the two sides together: every key a dashboard gates on exists in the
  // registry, and every registry key is gated by some dashboard.
  {
    const { DASHBOARD_WIDGETS, WIDGET_KEYS } = await import("@/lib/dashboardWidgets");
    const dashDir = "src/components/studio2";
    const referenced = new Set();
    for (const f of readdirSync(dashDir).filter((n) => /Dashboard\.jsx$/.test(n))) {
      const text = readFileSync(join(dashDir, f), "utf8");
      for (const m of text.matchAll(/visible\(\s*["'`]([a-z0-9.\-]+)["'`]\s*\)/gi)) referenced.add(m[1]);
    }
    ok("the dashboards gate on widget keys", referenced.size > 0, String(referenced.size));
    const unknown = [...referenced].filter((k) => !WIDGET_KEYS.has(k));
    ok("every key a dashboard gates on is in the registry", unknown.length === 0, unknown.join(", "));
    const unused = DASHBOARD_WIDGETS.map((w) => w.key).filter((k) => !referenced.has(k));
    ok("every registry widget is gated by a dashboard", unused.length === 0, unused.join(", "));
  }

  // ---- 10. Nova's capability registry names real permissions --------------
  //
  // Nova offers a capability only if the asking user holds its permission, and
  // that permission is a bare string in the registry (lib/nova/capabilities).
  // A key that names nothing in the catalogue would be a right nobody can hold —
  // the capability would be permanently un-offerable, or (worse, if the check
  // were ever loosened) offered to everyone. So every non-null permissionKey
  // must be a real permission, and every capability key must be unique. `null`
  // is the deliberate "membership-only / self-gating" marker and is allowed.
  {
    const { NOVA_CAPABILITIES } = await import("@/lib/nova/capabilities");
    const valid = new Set(ALL_PERMISSIONS);
    const bad = NOVA_CAPABILITIES.filter((c) => c.permissionKey !== null && !valid.has(c.permissionKey));
    ok("every Nova capability names a real permission (or null)", bad.length === 0, bad.map((c) => `${c.key}:${c.permissionKey}`).join(", "));
    const keys = NOVA_CAPABILITIES.map((c) => c.key);
    ok("...and every capability key is unique", new Set(keys).size === keys.length, String(keys.length));
    // Read capabilities that gate on a permission must gate on a VIEW right, and
    // writing actions on a non-view one — a read keyed to a create right would be
    // the coarse-gate mistake in reverse.
    const misgated = NOVA_CAPABILITIES.filter((c) => c.kind === "read" && c.permissionKey && !c.permissionKey.endsWith(".view"));
    ok("...and every keyed read gates on a .view right", misgated.length === 0, misgated.map((c) => c.key).join(", "));
    // Every implemented tool maps to a real capability — a mapping keyed to a
    // capability that no longer exists would be an orphan the switchboard can
    // never reach.
    const { MAPPED_CAPABILITY_KEYS } = await import("@/platform/nova/tools");
    const registryKeys = new Set(keys);
    const strayMapped = [...MAPPED_CAPABILITY_KEYS].filter((k) => !registryKeys.has(k));
    ok("every implemented Nova tool is a real capability", strayMapped.length === 0, strayMapped.join(", "));
  }
}

// ============================================================================
console.log("== golden responses: the shape of every answer, pinned");
// The contract for Waves 2-5. A renamed field, a null that became "", a dropped
// key or a changed status code fails here rather than reaching a client.
{
  const cases = [];
  const add = (name, fn) => cases.push({ name, fn });

  const STUDIO = (await import("@/app/api/studios/[slug]/route.ts"));
  const STUDIOS = (await import("@/app/api/studios/route.ts"));
  const AVAILABLE = (await import("@/app/api/studios/available/route.ts"));
  const ME = (await import("@/app/api/identity/me/route.ts"));
  const NOTIF = (await import("@/app/api/studios/[slug]/notifications/route.ts"));
  const REQUESTS = (await import("@/app/api/studios/[slug]/requests/route.ts"));
  const ROLES = (await import("@/app/api/studios/[slug]/roles/route.ts"));
  const SALES = (await import("@/app/api/studios/[slug]/sales/route.ts"));
  const MAIN = (await import("@/app/api/studios/[slug]/main/route.ts"));
  const SETTINGS = (await import("@/app/api/studios/[slug]/settings/route.ts"));
  const PRICING = (await import("@/app/api/pricing/route.ts"));

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
  const CLIENTS = await import("@/app/api/studios/[slug]/sales/clients/route.ts");
  const SERVICES = await import("@/app/api/studios/[slug]/sales/services/route.ts");
  const TICKETS = await import("@/app/api/studios/[slug]/sales/tickets/route.ts");
  const RFQ = await import("@/app/api/studios/[slug]/sales/tickets/rfq/route.ts");
  const QUOTATIONS = await import("@/app/api/studios/[slug]/sales/quotations/route.ts");
  const SALES = await import("@/app/api/studios/[slug]/sales/route.ts");

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
  const RFQS = await import("@/app/api/studios/[slug]/technical/rfqs/route.ts");
  const QUOTES = await import("@/app/api/studios/[slug]/technical/quotations/route.ts");
  const TECH = await import("@/app/api/studios/[slug]/technical/route.ts");
  const APPROVAL = await import("@/app/api/studios/[slug]/technical/quotations/approval/route.ts");

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

  // THE APPROVAL DOOR ASKS FOR ITS OWN RIGHT, not "any Technical write". Reusing
  // `editor` here rather than minting a new collaborator: a new named person in
  // this shared studio shows up in every later golden that lists collaborators
  // (Projects, HR, Operations all did, and each one broke on the first attempt
  // at this test) — `editor` already exists and is already baked into every
  // golden recorded after this point, so asking one more question of them adds
  // no new row anywhere.
  await signIn(editor.id);
  await shot("technical.approval.refused.forbidden", await capture(
    APPROVAL.POST, req(`/api/studios/${slug}/technical/quotations/approval`, { method: "POST", body: { quotationId } }), P));
  await signIn(owner.id);

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
console.log("== technical: sequences numbered independently, and the approval door");
// SEQUENCES REPLACED THE SINGLE {mode,prefix,start}: a studio now numbers as
// many kinds of quotation as it names, each running its own counter off its
// own prefix — nextUniqueRef only ever counts a row starting with `${prefix}-`,
// so two sequences share the quotations collection without either filtering
// it, and the regression this guards is a shared counter handing sequence A's
// second quotation the number sequence B's first one just took.
//
// AND sendQuotationForApproval is new: the ticket-less twin of Sales' own
// Send-for-Approval button, for a quotation that never touched a ticket.
{
  const TECH = await import("@/app/api/studios/[slug]/technical/route.ts");
  const APPROVAL = await import("@/app/api/studios/[slug]/technical/quotations/approval/route.ts");
  const SERVICES = await import("@/app/api/studios/[slug]/sales/services/route.ts");
  const TICKETS = await import("@/app/api/studios/[slug]/sales/tickets/route.ts");
  const RFQROUTE = await import("@/app/api/studios/[slug]/sales/tickets/rfq/route.ts");
  const {
    technicalContext, saveTechnicalSettings, createQuotation, convertRfq, updateQuotation,
    sendQuotationForApproval, listQuotations,
  } = await import("@/modules/technical/technical");
  const { repo } = await import("@/platform/db/repo");

  const P = ctx({ slug });
  const shot = async (name, payload) => {
    const r = golden(name, payload, EXTRA);
    if (!r.recorded) ok(`${name} matches its golden`, r.ok, r.detail);
    return payload;
  };
  // NO new collaborator is minted anywhere in this block — see the note beside
  // the approval-forbidden case below for why.
  const techCtx = () => technicalContext(owner, slug);

  await signIn(owner.id);

  // ---- settings: sequences are validated on the way in ---------------------
  const badEmpty = await saveTechnicalSettings(await techCtx(), { sequences: [{ prefix: "", label: "Nothing" }] });
  ok("a sequence with no prefix is refused before it saves", badEmpty.error === "prefix", JSON.stringify(badEmpty));

  const badDup = await saveTechnicalSettings(await techCtx(), {
    sequences: [{ prefix: "SQA", label: "A" }, { prefix: "sqa", label: "A again" }],
  });
  ok("a case-insensitive duplicate prefix is refused", badDup.error === "prefix-duplicate", JSON.stringify(badDup));

  const saved = await saveTechnicalSettings(await techCtx(), {
    sequences: [
      { id: "seqA", label: "Internal", prefix: "SQA", start: 1 },
      { id: "seqB", label: "Client work", prefix: "SQB", start: 1 },
    ],
    defaultSequenceId: "seqB",
  });
  ok("two sequences with distinct prefixes save cleanly",
    Array.isArray(saved.sequences) && saved.sequences.length === 2, JSON.stringify(saved));
  ok("...and the default sequence is recorded", saved.defaultSequenceId === "seqB", saved.defaultSequenceId);

  const afterSave = await capture(TECH.GET, req(`/api/studios/${slug}/technical`), P);
  ok("the GET route carries both sequences and drops the old single field",
    (afterSave.body?.sequences || []).map((s) => s.prefix).sort().join(",") === "SQA,SQB"
    && afterSave.body?.nextQuotationNumber === undefined,
    JSON.stringify(afterSave.body?.sequences));

  // ---- an existing Sales client, fetched once and reused below --------------
  // AN EXISTING SALES CLIENT IS REUSED, not created: "Acme Holdings" and
  // "Second Client" were both raised in the Sales block above, and a THIRD one
  // minted here would show up — by name — in projects.empty and
  // projects.list.populated, whose goldens pin the studio's whole salesClients
  // list embedded in the Projects response. A new client anywhere in this
  // shared studio is exactly as visible there as a new collaborator is in a
  // people list (see the note beside the approval-forbidden case above).
  //
  // THIS MATTERS MORE NOW THAN IT DID: createQuotation resolves every
  // clientName through resolveClientFor (client-belongs-to-the-engagement,
  // Task 2), so a fixture typing a fresh name no longer stays free text — it
  // mints a real, permanent Sales client. None of the fixtures below (the
  // sequence-numbering run, the required-field checks) are testing client
  // CREATION — Task 2's own coverage in suite.mjs does that — so they name an
  // existing client instead. Fetched before `need` so its default can use it.
  const techForClients = await techCtx();
  const existingClient = (await repo("salesClients").find(
    { studio: techForClients.studio, section: techForClients.salesClientsSection },
  ))[0];
  ok("fixture: the studio already has a Sales client to reuse", Boolean(existingClient?.id), JSON.stringify(existingClient));

  // ---- per-sequence continuation: A, then B, then A again -------------------
  const need = (over) => ({
    sequenceId: "seqA", clientId: existingClient?.id, clientName: "",
    title: "Continuation check", industry: "Commercial", deadline: "2026-12-20",
    description: "seq test", ...over,
  });

  const a1 = await createQuotation(await techCtx(), need({}));
  ok("sequence A issues its first number", a1.quotation?.number === "SQA-0001",
    JSON.stringify(a1.error || a1.quotation?.number));

  const b1 = await createQuotation(await techCtx(), need({ sequenceId: "seqB" }));
  ok("sequence B starts its own run at 1, unaffected by A's",
    b1.quotation?.number === "SQB-0001", JSON.stringify(b1.error || b1.quotation?.number));

  const a2 = await createQuotation(await techCtx(), need({}));
  ok("sequence A continues from its OWN last number, not B's",
    a2.quotation?.number === "SQA-0002", JSON.stringify(a2.error || a2.quotation?.number));

  // ---- convertRfq numbers from the DEFAULT sequence -------------------------
  const svc = await capture(SERVICES.POST, req(`/api/studios/${slug}/sales/services`, { method: "POST", body: { name: "Sequence Test Service" } }), P);
  const tkt = await capture(TICKETS.POST, req(`/api/studios/${slug}/sales/tickets`, { method: "POST", body: {
    title: "Default sequence check", clientId: existingClient?.id, industry: "Commercial", deadline: "2026-12-22",
    serviceIds: [svc.body?.service?.id],
  } }), P);
  const rfqAsk = await capture(RFQROUTE.POST, req(`/api/studios/${slug}/sales/tickets/rfq`, { method: "POST", body: { ticketId: tkt.body?.ticket?.id } }), P);

  const conv2 = await convertRfq(await techCtx(), { rfqId: rfqAsk.body?.rfq?.id });
  ok("converting an RFQ numbers under the studio's DEFAULT sequence, not sequence A",
    conv2.quotation?.number === "SQB-0002", JSON.stringify(conv2.error || conv2.quotation?.number));

  // ---- createQuotation: one required-field error per missing field ---------
  const noSeq = await createQuotation(await techCtx(), need({ sequenceId: "" }));
  ok("no sequence named is refused as 'sequence'", noSeq.error === "sequence", JSON.stringify(noSeq));

  const noClient = await createQuotation(await techCtx(), need({ clientId: "", clientName: "" }));
  ok("no client named is refused as 'client'", noClient.error === "client", JSON.stringify(noClient));

  const badClientId = await createQuotation(await techCtx(), need({ clientId: "sal_doesnotexist000", clientName: "" }));
  ok("a clientId that is not a real Sales client is refused as 'client'",
    badClientId.error === "client", JSON.stringify(badClientId));

  const realClient = await createQuotation(await techCtx(), need({ clientId: existingClient?.id, clientName: "" }));
  ok("a real Sales client id is accepted", Boolean(realClient.quotation), JSON.stringify(realClient.error));
  ok("...and typing a name never creates a Sales client — the id and the free text are never both stored",
    realClient.quotation?.clientId === existingClient?.id && realClient.quotation?.clientName === "",
    JSON.stringify({ clientId: realClient.quotation?.clientId, clientName: realClient.quotation?.clientName }));

  const noTitle = await createQuotation(await techCtx(), need({ title: "" }));
  ok("no title is refused as 'title'", noTitle.error === "title", JSON.stringify(noTitle));

  const noIndustry = await createQuotation(await techCtx(), need({ industry: "" }));
  ok("no industry is refused as 'industry'", noIndustry.error === "industry", JSON.stringify(noIndustry));

  const noDeadline = await createQuotation(await techCtx(), need({ deadline: "" }));
  ok("no deadline is refused as 'deadline'", noDeadline.error === "deadline", JSON.stringify(noDeadline));

  const noDescription = await createQuotation(await techCtx(), need({ description: "" }));
  ok("no description is refused as 'description'", noDescription.error === "description", JSON.stringify(noDescription));

  // NO 'duplicate' CASE HERE: the number is always server-issued through
  // nextNumberForSequence, which self-seeds past the highest number already on
  // file (invariant 10) — a caller cannot submit one that collides, so that
  // branch is unreachable through this API. Advancement past an existing
  // number is already covered above ("sequence A continues from its OWN last
  // number, not B's").

  // ---- listQuotations: fromSales, and an internal row's own fields ---------
  const rows = await listQuotations(await techCtx());
  const convertedRow = rows.find((q) => q.id === conv2.quotation?.id);
  ok("a converted quotation reads fromSales: true", convertedRow?.fromSales === true, JSON.stringify(convertedRow?.fromSales));
  const internalRow = rows.find((q) => q.id === a1.quotation?.id);
  ok("an internal quotation reads fromSales: false", internalRow?.fromSales === false, JSON.stringify(internalRow?.fromSales));
  // Compared against existingClient's OWN name, not a literal — this fixture
  // reuses a client (see the note above `need`) rather than typing one, so the
  // resolved name is whatever that client is actually called.
  ok("...and carries its own client, industry and deadline",
    internalRow?.clientName === existingClient?.name && internalRow?.industry === "Commercial"
    && internalRow?.deadline === "2026-12-20",
    JSON.stringify({ clientName: internalRow?.clientName, industry: internalRow?.industry, deadline: internalRow?.deadline }));

  // ---- sendQuotationForApproval: every guard, then the raise ---------------
  await shot("technical.approval.refused.hasticket", await capture(
    APPROVAL.POST, req(`/api/studios/${slug}/technical/quotations/approval`, { method: "POST", body: { quotationId: conv2.quotation?.id } }), P));

  const stillNew = await sendQuotationForApproval(await techCtx(), { quotationId: a1.quotation?.id });
  ok("an unfinished quotation is refused as 'not-completed'", stillNew.error === "not-completed", JSON.stringify(stillNew));

  await updateQuotation(await techCtx(), a1.quotation?.id, { status: "Completed" });
  const approvedDirect = await updateQuotation(await techCtx(), b1.quotation?.id, { status: "Approved" });
  ok("fixture: a quotation can be marked Approved by hand", approvedDirect.quotation?.status === "Approved",
    JSON.stringify(approvedDirect.error));
  const alreadyApproved = await sendQuotationForApproval(await techCtx(), { quotationId: b1.quotation?.id });
  ok("an already-approved quotation is refused as 'approved'", alreadyApproved.error === "approved", JSON.stringify(alreadyApproved));

  // REVERTED RATHER THAN LEFT APPROVED: the projects block below finds "the"
  // approved quotation in this same studio by `status === "Approved"` and
  // opens a project from it — listQuotations sorts newest first, so leaving
  // this fixture Approved would make it win that search ahead of the
  // ticket-backed quotation the projects block actually means, and a project
  // opened from a ticketless one fails "the project names its ticket" for a
  // reason that has nothing to do with what that block tests.
  await updateQuotation(await techCtx(), b1.quotation?.id, { status: "Completed" });

  // Default-deny on this door — permission checked before any state on the
  // record — is pinned once already, in the block above, by reusing `editor`
  // (who already exists in this studio) rather than minting a second named
  // collaborator here: that is exactly what broke projects.empty,
  // projects.list.populated, hr.list.* and operations.board on the first
  // attempt at this test — a NEW alias in this shared studio shows up in every
  // later golden that lists collaborators, however unrelated to Technical.

  const raised = await shot("technical.approval.raised", await capture(
    APPROVAL.POST, req(`/api/studios/${slug}/technical/quotations/approval`, { method: "POST", body: { quotationId: a1.quotation?.id } }), P));
  ok("a finished internal quotation raises an approval task", raised.status === 201 && raised.body?.task?.type === "approval",
    JSON.stringify(raised.body).slice(0, 140));
  ok("...tied to the quotation, and carrying no ticketId — the field every reader uses to route the OTHER door",
    raised.body?.task?.quotationId === a1.quotation?.id && !raised.body?.task?.ticketId,
    JSON.stringify({ q: raised.body?.task?.quotationId, t: raised.body?.task?.ticketId }));

  await shot("technical.approval.refused.already", await capture(
    APPROVAL.POST, req(`/api/studios/${slug}/technical/quotations/approval`, { method: "POST", body: { quotationId: a1.quotation?.id } }), P));

  // ---- and the tenant wall: another studio's clients never show here -------
  // A DIRECT REPO WRITE UNDER A FOREIGN studioId/sectionId, deliberately NOT a
  // full createStudio(): that call announces itself with a platform-wide "New
  // studio registered" notification (see super/notifications), and a second
  // real studio here would become the newest one and silently rewrite the
  // super.notifications golden with a studio this test invented. The isolation
  // this proves is the key scoping in repo.ts (scopeOf: studioId+sectionId
  // compose the Redis key) — the exact mechanism technicalClients relies on —
  // and that mechanism does not care whether the foreign studioId came from a
  // real createStudio() or not, so a synthetic one exercises it identically
  // without the side effect.
  const foreignScope = { studioId: `std_foreign${rand()}`, sectionId: `sec_foreign${rand()}` };
  await repo("salesClients").create(foreignScope, { name: "Studio B Confidential Client" });
  const bleedCheck = await capture(TECH.GET, req(`/api/studios/${slug}/technical`), P);
  const clientNames = (bleedCheck.body?.vocabulary?.clients || []).map((c) => c.name);
  ok("Studio A's vocabulary.clients does not carry Studio B's client — no tenant bleed",
    !clientNames.includes("Studio B Confidential Client"), JSON.stringify(clientNames));
  ok("...while Studio A's own clients are present", clientNames.includes(existingClient?.name), JSON.stringify(clientNames));

  __signOut();
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
  const PROJECTS = await import("@/app/api/studios/[slug]/projects/route.ts");
  const SLA = await import("@/app/api/studios/[slug]/projects/sla/route.ts");
  const OVERTIMES = await import("@/app/api/studios/[slug]/projects/overtimes/route.ts");
  const TECH = await import("@/app/api/studios/[slug]/technical/route.ts");

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
  const QUOTES = await import("@/app/api/studios/[slug]/technical/quotations/route.ts");
  // THE NEW CONTRACT: no client-sent `number` — the sequence names WHICH run
  // this counts against and the server issues the number itself (see
  // createQuotation's own comment on why a client-sent number is exactly the
  // field-tampering item 8 of the security checklist closes off). `tech` was
  // just read above, so its own `sequences` list names a real sequenceId
  // rather than the retired single-default one.
  //
  // AN EXISTING CLIENT, NAMED BY ID — not a typed name. createQuotation
  // resolves a typed clientName through resolveClientFor now (client-belongs-
  // to-the-engagement, Task 2), so it would mint a real, permanent Sales
  // client; this fixture only wants an unapproved quotation to exist, not a
  // new client — a new one would show up, by name, in projects.empty and
  // projects.list.populated, which pin the studio's whole salesClients list
  // (see the same note in the Technical block above `need`). `tech`'s own
  // vocabulary already names one.
  const internal = await capture(QUOTES.POST, req(`/api/studios/${slug}/technical/quotations`, {
    method: "POST",
    body: {
      sequenceId: tech.body?.sequences?.[0]?.id,
      clientId: tech.body?.vocabulary?.clients?.[0]?.id,
      title: "Site survey, not yet approved",
      industry: "Commercial",
      deadline: "2026-12-15",
      description: "Site survey, not yet approved",
    },
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
  const INV = await import("@/app/api/studios/[slug]/inventory/route.ts");
  const ITEMS = await import("@/app/api/studios/[slug]/inventory/items/route.ts");
  const VENDORS = await import("@/app/api/studios/[slug]/inventory/vendors/route.ts");
  const STOCK = await import("@/app/api/studios/[slug]/inventory/stock/route.ts");
  const SHEETS = await import("@/app/api/studios/[slug]/inventory/sheets/route.ts");
  const AWB = await import("@/app/api/studios/[slug]/inventory/awb/route.ts");

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
  const HR = await import("@/app/api/studios/[slug]/hr/route.ts");
  const EMPLOYEES = await import("@/app/api/studios/[slug]/hr/employees/route.ts");
  const VACATIONS = await import("@/app/api/studios/[slug]/hr/vacations/route.ts");

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
      from: utcDay(30), to: utcDay(34), reason: "Family",
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
      collaboratorId: member.id, from: utcDay(40), to: utcDay(41),
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
  const FINANCE = await import("@/app/api/studios/[slug]/finance/route.ts");
  const INVOICES = await import("@/app/api/studios/[slug]/finance/invoices/route.ts");
  const EXPENSES = await import("@/app/api/studios/[slug]/finance/expenses/route.ts");

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
  const OPS = await import("@/app/api/studios/[slug]/operations/route.ts");
  const SHIFTS = await import("@/app/api/studios/[slug]/operations/schedule/shifts/route.ts");
  const LOCATIONS = await import("@/app/api/studios/[slug]/operations/locations/route.ts");
  const TASKS = await import("@/app/api/studios/[slug]/tasks/route.ts");

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
  const hr = await import("@/app/api/studios/[slug]/hr/route.ts");
  const hrBoard = await capture(hr.GET, req(`/api/studios/${slug}/hr`), P);
  const leave = hrBoard.body?.vacations?.find((v) => v.status === "Approved");
  ok("HR has an approved absence to schedule around", Boolean(leave),
    `${hrBoard.body?.vacations?.length ?? 0} vacations`);

  const onLeaveDay = leave?.from;
  const clash = await shot("operations.shift.refused.onleave", await capture(
    SHIFTS.POST, req(`/api/studios/${slug}/operations/schedule/shifts`, { method: "POST", body: {
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
    SHIFTS.POST, req(`/api/studios/${slug}/operations/schedule/shifts`, { method: "POST", body: {
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
console.log("== main: the engagement view — two NEW routes, and the safety property at the wall");
// docs/superpowers/specs/2026-08-27-engagements-view-design.md §4. These are
// ADDITIONS — the existing 144 goldens must stay byte-identical, and they do
// (checked below by re-running with the recorder off before anything is
// committed). The first two cases are the happy path; the last two are the
// point: `engagementBlock` refuses three ways (requirePermission's own ladder,
// plus its own "notfound" and "forbidden"), and statusFor's mapping of those
// two names to 404/403 is otherwise only typechecked, never exercised.
//
// PLACED LAST OF THE MODULE BLOCKS, DELIBERATELY. This studio is shared by
// every section above — sales, technical, projects, inventory, hr, finance,
// operations & tasks — and several of their "populated" goldens are whole-
// studio snapshots (open tickets, the people list, the invoice sequence). The
// first draft seeded its fixture ticket/client/invoice/collaborators between
// sales and technical and it moved EIGHT goldens that belong to other
// modules: an extra row in technical's openTickets/clients/people, an extra
// employee in every hr.list.*, a shifted finance.invoice.raised reference
// (INV-0001 -> INV-0002), and an extra row in operations.board and both
// projects goldens. None of those routes changed — this file's fixture
// order did. Quality and /super do not read a whole-studio ticket/people
// snapshot, so running after every OTHER module's "populated" capture and
// before them is the one position that adds four goldens and moves none.
{
  const LIST = await import("@/app/api/studios/[slug]/main/engagements/route.ts");
  const BLOCK = await import("@/app/api/studios/[slug]/main/engagements/[engId]/route.ts");
  const CLIENTS = await import("@/app/api/studios/[slug]/sales/clients/route.ts");
  const SERVICES = await import("@/app/api/studios/[slug]/sales/services/route.ts");
  const TICKETS = await import("@/app/api/studios/[slug]/sales/tickets/route.ts");
  const INVOICES = await import("@/app/api/studios/[slug]/finance/invoices/route.ts");
  // attachToTicketEngagement is the SAME primitive a future invoice dual-write
  // would call (spec §9 non-goals: invoice attach is not shipped yet) — used
  // directly here so the fixture is one real invoice sitting on the ticket's
  // engagement exactly the way that dual-write would leave it, rather than a
  // faked-up payload shaped like one.
  const { attachToTicketEngagement } = await import("@/platform/db/engagement");

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

  // ---- one engagement, two stages: a ticket (Sales) and an invoice
  // (Finance) attached to the SAME engagement, so a viewer holding only the
  // Sales right is a real test of what gets withheld rather than an empty one.
  const service = await capture(SERVICES.POST, req(`/api/studios/${slug}/sales/services`,
    { method: "POST", body: { name: "Engagement View Fixture Service" } }), P);
  const client = await capture(CLIENTS.POST, req(`/api/studios/${slug}/sales/clients`,
    { method: "POST", body: { name: "Engagement View Client", country: "Saudi Arabia", city: "Riyadh" } }), P);
  const ticket = await capture(TICKETS.POST, req(`/api/studios/${slug}/sales/tickets`, { method: "POST", body: {
    title: "Engagement view fixture", clientId: client.body?.client?.id, industry: "Commercial",
    deadline: "2026-12-15", serviceIds: [service.body?.service?.id],
  } }), P);
  const ticketId = ticket.body?.ticket?.id;
  ok("the fixture ticket was created", Boolean(ticketId), JSON.stringify(ticket.body).slice(0, 120));

  // Deterministic, same as the dual-write mints (spec §5.4) — no extra read.
  const engId = KEYS.deterministicEngId("ticket", ticketId);

  const invoice = await capture(INVOICES.POST, req(`/api/studios/${slug}/finance/invoices`, { method: "POST", body: {
    clientName: "Engagement View Client", lines: [{ description: "Fixture line", qty: 1, unitPrice: 1000 }],
  } }), P);
  const invoiceId = invoice.body?.invoice?.id;
  ok("the fixture invoice was created", Boolean(invoiceId), JSON.stringify(invoice.body).slice(0, 120));
  await attachToTicketEngagement(studio.id, "invoice", invoiceId, ticketId);

  // A person who may see the screen and the Sales stage, nothing more.
  const viewer = await personWith(["engagements.view", "sales.tickets.view"], "engviewer");
  // A person who may see the screen and NO department stage at all.
  const blind = await personWith(["engagements.view"], "engblind");

  await signIn(viewer.id);

  const list = await shot("main.engagements.list", await capture(
    LIST.GET, req(`/api/studios/${slug}/main/engagements`), P));
  const row = list.body?.engagements?.find((e) => e.id === engId);
  ok("the fixture engagement lists for a Sales-only viewer", Boolean(row), JSON.stringify(list.body).slice(0, 300));
  ok("...carrying the ticket stage and nothing Finance's",
    Boolean(row?.stages?.includes("ticket")) && !row?.stages?.includes("invoice"),
    JSON.stringify(row?.stages));

  const block = await shot("main.engagements.block", await capture(
    BLOCK.GET, req(`/api/studios/${slug}/main/engagements/${engId}`), ctx({ slug, engId })));
  const cards = block.body?.engagement?.cards || [];
  // THE SAFETY PROPERTY, pinned at the HTTP boundary (spec §9): this
  // engagement HAS an invoice (attached above) and this reader holds no
  // finance.cash.view. A withheld stage must be ABSENT — not present with an
  // empty summary, not counted — so no card may carry type "invoice" and the
  // string must not appear as a card type in the payload at all.
  ok("no card in the block has type invoice", cards.every((c) => c.type !== "invoice"), JSON.stringify(cards));
  ok("...and \"invoice\" never appears as a card type in the serialised payload",
    !cards.map((c) => c.type).includes("invoice"), JSON.stringify(cards.map((c) => c.type)));
  ok("...while the ticket card this viewer DOES hold a right to is present",
    cards.some((c) => c.type === "ticket" && c.present), JSON.stringify(cards));

  // ---- an engagement id that does not exist: statusFor's notfound -> 404 --
  await shot("main.engagements.notfound", await capture(
    BLOCK.GET, req(`/api/studios/${slug}/main/engagements/eng_doesnotexist0000`),
    ctx({ slug, engId: "eng_doesnotexist0000" })));

  // ---- a real engagement, but this reader may see NO stage of it at all ---
  await signIn(blind.id);
  await shot("main.engagements.forbidden", await capture(
    BLOCK.GET, req(`/api/studios/${slug}/main/engagements/${engId}`), ctx({ slug, engId })));

  __signOut();
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
  const DOCS = await import("@/app/api/studios/[slug]/quality/docs/route.ts");
  const FLOW = await import("@/app/api/studios/[slug]/quality/docs/workflow/route.ts");

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
  const SUPER_USERS = await import("@/app/api/super/users/[userId]/route.ts");
  const SUPER_STUDIOS = await import("@/app/api/super/studios/[id]/route.ts");
  const SUPER_CATALOG = await import("@/app/api/super/catalog/[kind]/route.ts");
  const SUPER_NOTIF = await import("@/app/api/super/notifications/route.ts");
  const STUDIO = await import("@/app/api/studios/[slug]/route.ts");
  const SALES = await import("@/app/api/studios/[slug]/sales/route.ts");

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
console.log("== the answer a person who asked to join never got");
// M-2. Four notification types were declared and never emitted, and this is the
// one with a visible consequence: somebody who asks to join a studio was never
// told whether they were approved or declined. They re-opened the studio address
// and guessed from whether it let them in.
{
  const joins = await import("@/modules/people/joinRequests");
  const { requestJoinByCode, approveJoinRequest, declineJoinRequest } = await import("@/lib/studios");
  const notifications = await import("@/platform/notify/notifications");

  // ---- approved: told inside the studio, because they are now in it --------
  const joiner = (await createUser({ email: `g-joiner-${rand()}@test.invalid`, passwordHash: "x" })).user;
  const asked = await requestJoinByCode(joiner, slug);
  ok("the request was raised", Boolean(asked.request?.id), JSON.stringify(asked.error ?? ""));

  // The owner's own context, for the collaborator id and the access the approval
  // is checked against — approving as admin runs through escalates(), which
  // needs a real permission set rather than a stand-in.
  const ownerCtx = await studioContext(owner, slug);
  const approved = await approveJoinRequest({
    studio, actingCollaborator: ownerCtx.collaborator, actorAccess: ownerCtx.access,
    requestId: asked.request.id, alias: "Joiner", role: "member",
  });
  ok("...and approved", Boolean(approved.collaborator?.id), JSON.stringify(approved.error ?? ""));

  // THE NOTIFICATION GOES TO THE COLLABORATOR ROW, which is why it is sent after
  // addCollaborator and not after the decision: until that row exists they have
  // no CollaboratorID, and a notice addressed to one that does not exist is a
  // message nobody can ever read.
  const theirs = await notifications.listForCollaborator(studio.id, approved.collaborator.id);
  ok("an approved joiner is told, in the studio they just entered",
    theirs.some((n) => n.type === "join.decided"), JSON.stringify(theirs.map((n) => n.type)));

  // ---- declined: told on their own account, because there is nowhere else ---
  const refused = (await createUser({ email: `g-refused-${rand()}@test.invalid`, passwordHash: "x" })).user;
  const asked2 = await requestJoinByCode(refused, slug);
  await declineJoinRequest({
    studio, actingCollaborator: ownerCtx.collaborator, requestId: asked2.request.id,
  });

  const mine = await joins.listForUser(refused.id);
  ok("a declined request records its outcome",
    mine.some((r) => r.id === asked2.request.id && r.status === "declined"),
    JSON.stringify(mine.map((r) => r.status)));

  // AND THE DECLINE NAMES NO STUDIO. Somebody refused entry learns that they
  // were refused and nothing else — otherwise the account screen becomes a way
  // to confirm which slugs exist and what they are called, which is the one
  // thing invariant 2 still protects now that existence itself is public.
  await __signIn(SESSION_COOKIE, await mintSession(refused.id, 600));
  const me = await capture((await import("@/app/api/identity/me/route.ts")).GET, req("/api/identity/me"), ctx());
  const row = (me.body?.joinRequests || []).find((r) => r.id === asked2.request.id);
  ok("the account screen shows them the answer", row?.status === "declined", JSON.stringify(row?.status));
  ok("...and a decline names no studio", row?.studio === null, JSON.stringify(row?.studio));
  await signIn(owner.id);
}

console.log("== the console's second factor");
// /super can change a studio's plan, assign platform roles and rewrite the price
// list, and a password was the whole of it. TOTP rather than an emailed code,
// because the console must keep working when email does not.
{
  const mfa = await import("@/platform/auth/superMfa");
  const sup = await import("@/platform/auth/superAuth");
  const OTPAuth = await import("otpauth");

  const email = `g-mfa-${rand()}@test.invalid`;
  const seeded = await sup.seedSuperAdmin({ email, password: "console-pw-12345" });
  const adminId = seeded.admin.id;

  // A real code, generated the way an authenticator app would.
  const { secret } = mfa.beginEnrolment(email);
  const codeNow = (s) => new OTPAuth.TOTP({
    issuer: "nompany", algorithm: "SHA1", digits: 6, period: 30,
    secret: OTPAuth.Secret.fromBase32(s),
  }).generate();

  ok("a code from the app is accepted", mfa.verifyCode(secret, codeNow(secret)), "");
  ok("...and a wrong one is not", !mfa.verifyCode(secret, "000000"), "");
  ok("...and a code for another secret is not",
    !mfa.verifyCode(secret, codeNow(mfa.beginEnrolment(email).secret)), "");

  // THE SECRET IS ENCRYPTED AT REST. It is a bearer credential — whoever reads
  // it mints codes forever — so storing it readable would put every future code
  // into any copy of the database, which is finding H-1's exact shape.
  const sealed = mfa.sealSecret(secret);
  ok("the stored secret is not the secret", sealed !== secret && !sealed.includes(secret), sealed.slice(0, 12) + "…");
  ok("...and it opens back to it", mfa.openSecret(sealed) === secret, "");

  // ---- the gate ------------------------------------------------------------
  const { hashes } = mfa.makeRecoveryCodes();
  await sup.patchAdmin(adminId, () => ({
    mfa: { secret: sealed, recoveryCodes: hashes, enabledAt: new Date().toISOString() },
  }));

  // THE ASSERTION THE WHOLE FEATURE RESTS ON. A right password alone must mint
  // NOTHING — no token, no index entry, nothing to replay. If the session were
  // created first and the factor checked after, a leaked password would have a
  // working session for the seconds in between.
  const passwordOnly = await sup.loginSuper(email, "console-pw-12345");
  ok("a correct password alone does not sign you in",
    passwordOnly?.mfaRequired === true && !passwordOnly?.token, JSON.stringify(Object.keys(passwordOnly || {})));

  const wrongCode = await sup.loginSuper(email, "console-pw-12345", { code: "000000" });
  ok("...nor does a wrong code", wrongCode === null, JSON.stringify(wrongCode));

  const withCode = await sup.loginSuper(email, "console-pw-12345", { code: codeNow(secret) });
  ok("password AND code signs you in", Boolean(withCode?.token), JSON.stringify(withCode?.error ?? ""));

  // A WRONG PASSWORD IS STILL REFUSED FIRST, code or no code — otherwise the
  // factor would have replaced the password rather than joined it.
  const wrongPw = await sup.loginSuper(email, "not-the-password", { code: codeNow(secret) });
  ok("a valid code cannot stand in for the password", wrongPw === null, JSON.stringify(wrongPw));

  // ---- recovery ------------------------------------------------------------
  // WITHOUT THIS, MFA IS A WAY TO LOSE YOUR OWN PLATFORM. A lost phone with no
  // way back in locks the only people who could unlock it.
  const fresh = mfa.makeRecoveryCodes();
  await sup.patchAdmin(adminId, (a) => ({ mfa: { ...a.mfa, recoveryCodes: fresh.hashes } }));

  const one = fresh.plain[0];
  const recovered = await sup.loginSuper(email, "console-pw-12345", { code: one });
  // The admin ROW is not printed on failure: it carries a bcrypt hash and ten
  // recovery digests, and a CI log is not the place for either.
  ok("a recovery code gets you in when the phone is gone", Boolean(recovered?.token),
    recovered?.token ? "" : JSON.stringify(recovered?.error ?? "no token"));

  // SINGLE USE, AND CONSUMED IN THE SAME WRITE THAT ACCEPTED IT. If a code
  // survived being used it would not be a way back in — it would be a second,
  // permanent factor sitting in whatever the person wrote it on.
  const replay = await sup.loginSuper(email, "console-pw-12345", { code: one });
  ok("...and cannot be used a second time", replay === null, JSON.stringify(replay));

  // The others still work, so one recovery does not burn the whole sheet.
  const another = await sup.loginSuper(email, "console-pw-12345", { code: fresh.plain[1] });
  ok("...while the rest of the sheet still works", Boolean(another?.token), "");

  // Typed off paper: case and dashes are noise, not part of the secret.
  const messy = fresh.plain[2].toLowerCase().replace("-", " ");
  const forgiving = await sup.loginSuper(email, "console-pw-12345", { code: messy });
  ok("...and it forgives how a person types it", Boolean(forgiving?.token), messy);

  // ---- turning it off ------------------------------------------------------
  // THE HIGHEST-VALUE TARGET FOR SOMEBODY WHO ALREADY HAS A SESSION. A session
  // is what an attacker holds if they got in; if a session alone could disarm
  // the factor, the factor would protect nothing after the first mistake.
  const MFA = await import("@/app/api/super/mfa/route.ts");
  const stillOn = await sup.findSuperByEmail(email);
  ok("MFA is on before we try to remove it", mfa.mfaEnabled(stillOn), "");

  // Called directly with the admin the route would have resolved, because the
  // wrapper's `super` auth needs a console cookie this suite does not mint.
  const noCode = await MFA.DELETE(req("/api/super/mfa", { method: "DELETE", body: {} }), ctx());
  ok("a session alone cannot disarm it", noCode.status === 400 || noCode.status === 401,
    String(noCode.status));
  ok("...and it is still on afterwards",
    mfa.mfaEnabled(await sup.findSuperByEmail(email)), "");
}

console.log("== a switched-off account is told so, and the price of saying it");
// AN OPEN DECISION, CLOSED, AND PINNED HERE SO IT STAYS CLOSED.
//
// login() checks `suspended` BEFORE verifying the password, which makes it the
// one thing this endpoint says about an account that exists — every other
// failure is deliberately indistinguishable. That is an enumeration oracle, it
// was on the open-decisions list for that reason, and it is now the chosen
// behaviour: a suspended person learns why they cannot get in without first
// having to remember a password they were switched off from using months ago,
// and a suspended account never spends a bcrypt-12 verify.
//
// The assertion is here so the order cannot be quietly "fixed": somebody reading
// the code without the reason would move this line below the password check,
// and every existing test would still pass.
{
  const identity = await import("@/platform/auth/identity");
  const { hashPassword } = await import("@/platform/auth/passwords");

  const email = `g-susp-${rand()}@test.invalid`;
  const made = await createUser({ email, passwordHash: await hashPassword("right-password-1234") });
  await updateUser(made.user.id, { status: "suspended" });

  // THE LOAD-BEARING ONE. A wrong password, and it still says "suspended" —
  // which is only possible if the check runs first.
  const wrongPw = await identity.login({ email, password: "not-the-password", ip: "203.0.113.9" });
  ok("a suspended account says so without a correct password",
    wrongPw?.error === "suspended", JSON.stringify(wrongPw?.error));

  const rightPw = await identity.login({ email, password: "right-password-1234", ip: "203.0.113.9" });
  ok("...and with one, it still refuses", rightPw?.error === "suspended" && !rightPw?.token,
    JSON.stringify(rightPw?.error));

  // THE LINE THAT IS NOT CROSSED. Suspension is specific; everything else about
  // whether an address exists stays generic, so the oracle is exactly one bit
  // wide and not one bit wider.
  const stranger = await identity.login({
    email: `g-nobody-${rand()}@test.invalid`, password: "whatever-1234", ip: "203.0.113.9",
  });
  ok("an address nobody registered is still just `invalid`",
    stranger?.error === "invalid", JSON.stringify(stranger?.error));

  const live = `g-live-${rand()}@test.invalid`;
  await createUser({ email: live, passwordHash: await hashPassword("right-password-1234") });
  const wrong = await identity.login({ email: live, password: "wrong-one-1234", ip: "203.0.113.9" });
  ok("...and so is a wrong password on a live account",
    wrong?.error === "invalid", JSON.stringify(wrong?.error));
}

console.log("== the console can see where it is signed in");
// THE SCREEN SHOWED THREE INVENTED ROWS. settings/profile has listed "Chrome ·
// Windows 11", "Safari · iPhone 16" and "Firefox · macOS" since it was built,
// hardcoded in the page file, while superAuth kept the real digests and nothing
// read them. A list of sessions that is not the sessions is worse than none:
// the reason to open the screen is to look for a row you do not recognise.
{
  const sup = await import("@/platform/auth/superAuth");
  const { hashToken } = await import("@/platform/auth/passwords");

  const email = `g-sess-${rand()}@test.invalid`;
  await sup.seedSuperAdmin({ email, password: "console-pw-12345" });
  const admin = await sup.findSuperByEmail(email);

  const phone = await sup.loginSuper(email, "console-pw-12345", {
    device: { label: "Safari on iPhone", location: "Riyadh, SA" },
  });
  const laptop = await sup.loginSuper(email, "console-pw-12345", {
    device: { label: "Chrome on Windows", location: "Riyadh, SA" },
  });

  const listed = await sup.listSuperSessions(admin.id, laptop.token);
  ok("both sign-ins are listed", listed.length === 2, String(listed.length));

  // THE POINT OF THE LABEL. Two rows that both said "session" would carry no
  // more information than the count, and the question the screen answers is
  // "which of these is not me".
  ok("...each naming the browser it came from",
    listed.some((s) => s.label === "Safari on iPhone") && listed.some((s) => s.label === "Chrome on Windows"),
    JSON.stringify(listed.map((s) => s.label)));

  // Nobody can act on a list where they cannot tell which row they are reading
  // it on — the one row you must NOT end by accident.
  const here = listed.find((s) => s.current);
  ok("...and the browser reading the list knows itself",
    here?.tokenHash === hashToken(laptop.token) && listed.filter((s) => s.current).length === 1,
    JSON.stringify(listed.map((s) => s.current)));

  // THE DIGEST, NEVER THE TOKEN. The list travels to a browser; if it carried
  // the token, the screen built to spot a stolen session would hand one over.
  const raw = JSON.stringify(listed);
  ok("...and no row carries a usable token",
    !raw.includes(phone.token) && !raw.includes(laptop.token), "");

  // ---- ending one ----------------------------------------------------------
  const gone = await sup.revokeSuperSession(admin.id, hashToken(phone.token));
  ok("a session can be ended by its digest", gone === true, String(gone));
  ok("...and that cookie stops working",
    (await sup.findSuperBySession(phone.token)) === null, "");
  ok("...while the one you are on still does",
    Boolean(await sup.findSuperBySession(laptop.token)), "");
  ok("...and it leaves the list", (await sup.listSuperSessions(admin.id)).length === 1, "");

  // ---- one owner cannot sign another out ----------------------------------
  // THE ONLY WAY THIS ROUTE COULD LEAK. The digest is safe to publish, which is
  // exactly why the revoke must not trust it on its own: a console owner who
  // saw another's digest anywhere must not be able to spend it. The scope check
  // is inside the read, not in the route, so no caller can forget it.
  const other = `g-sess2-${rand()}@test.invalid`;
  await sup.seedSuperAdmin({ email: other, password: "console-pw-12345" });
  const stranger = await sup.findSuperByEmail(other);

  const refused = await sup.revokeSuperSession(stranger.id, hashToken(laptop.token));
  ok("one console owner cannot end another's session", refused === false, String(refused));
  ok("...and that session is untouched",
    Boolean(await sup.findSuperBySession(laptop.token)), "");

  // A STRANGER'S LIST IS THEIR OWN, for the same reason. Reading is the half
  // that would turn the digest into something worth stealing.
  ok("...nor see it", (await sup.listSuperSessions(stranger.id)).length === 0, "");

  // ---- the summary the settings page renders ------------------------------
  // IT USED TO BE THREE HARDCODED ROWS, and one of them said "Two-factor
  // authentication · Enabled" on an account that had no second factor. That is
  // the failure this block exists for: a security screen reporting something
  // other than the truth is worse than one reporting nothing, because the
  // reason to open it is to find out whether anything is wrong.
  const mfaLib = await import("@/platform/auth/superMfa");

  const before = await sup.superSecuritySummary(admin.id);
  ok("the summary says two-factor is off when it is off",
    before?.mfaEnabled === false && before.recoveryCodesLeft === 0, JSON.stringify(before?.mfaEnabled));
  ok("...and counts the live sessions", before.sessionCount === 1, String(before.sessionCount));
  ok("...and knows when the password was set", Boolean(Date.parse(before.passwordSetAt || "")), before.passwordSetAt);

  const { secret } = mfaLib.beginEnrolment(other);
  const codes = mfaLib.makeRecoveryCodes();
  await sup.patchAdmin(admin.id, () => ({
    mfa: { secret: mfaLib.sealSecret(secret), recoveryCodes: codes.hashes, enabledAt: new Date().toISOString() },
  }));

  const after = await sup.superSecuritySummary(admin.id);
  ok("...and says it is on once it is", after.mfaEnabled === true, "");
  ok("...counting the codes that are left", after.recoveryCodesLeft === 10, String(after.recoveryCodesLeft));

  // THE SUMMARY IS FACTS, NOT CREDENTIALS. It is rendered into a page, so
  // anything secret in it would be secret in the HTML.
  const rendered = JSON.stringify(after);
  ok("...and carries neither the secret nor a single code",
    !rendered.includes(secret) && !codes.plain.some((c) => rendered.includes(c))
      && !codes.hashes.some((h) => rendered.includes(h)), "");
}

console.log("== an OAuth sign-in is a device too");
// REPORTED, THEN VERIFIED: a user who registered with Google or Microsoft never
// saw any devices on their account. signInWithProvider minted a session and
// returned — recordDevice was called in exactly one place, the OTP path.
//
// Worse than a missing feature. The device list is where somebody notices a
// sign-in they do not recognise, and for every OAuth account it rendered as
// though nothing had ever signed in, while the account had live sessions.
{
  const identity = await import("@/platform/auth/identity");
  const devices = await import("@/platform/auth/otp");

  const email = `g-oauth-${rand()}@test.invalid`;
  const fingerprint = { label: "Chrome on Windows", deviceType: "Computer", location: "Riyadh, SA", ipHash: "abc123" };

  const first = await identity.signInWithProvider({
    email, fullName: "OAuth Person", provider: "google", deviceId: "", device: fingerprint,
  });
  ok("the provider sign-in worked", Boolean(first.token), JSON.stringify(first.error ?? ""));
  ok("...and it handed back a device id", Boolean(first.deviceId), String(first.deviceId));

  const listed = await devices.listDevices(first.user.id);
  ok("the account can see the browser it signed in from",
    listed.length === 1 && listed[0].label === "Chrome on Windows",
    JSON.stringify(listed.map((d) => d.label)));

  // SIGNING IN AGAIN FROM THE SAME BROWSER UPDATES THE ROW. Without the device
  // cookie being handed back, the id is never returned and Security grows a row
  // per visit — no more useful than one that stays empty.
  const again = await identity.signInWithProvider({
    email, fullName: "OAuth Person", provider: "google",
    deviceId: first.deviceId, device: fingerprint,
  });
  const after = await devices.listDevices(again.user.id);
  ok("...and returning does not add a second row", after.length === 1, String(after.length));
}

console.log("== credentials at rest");
// H-1 and H-9. Both are about what a COPY of the database is worth — a backup, a
// support export, or the second application sharing this Redis Cloud instance.
{
  const users = await import("@/platform/auth/users");
  const { hashToken } = await import("@/platform/auth/passwords");
  const { KEY_PREFIX } = await import("@/platform/db/keys");
  const store = await import("@/platform/db/store");

  // ---- H-1: the session token is not the key -------------------------------
  const token = await users.mintSession(owner.id, 600);
  ok("the cookie value is still a plain token", /^[A-Za-z0-9_-]{20,}$/.test(token), token.slice(0, 12) + "…");

  const underDigest = await store.getIndex(`${KEY_PREFIX}ix:session:${hashToken(token)}`);
  ok("the index is keyed by the DIGEST", underDigest === owner.id, String(underDigest));

  // THE ASSERTION THAT MATTERS. Anyone reading the database must not be holding
  // a usable session, and before this change the key WAS the credential.
  const underToken = await store.getIndex(`${KEY_PREFIX}ix:session:${token}`);
  ok("...and NOT by the token itself", underToken === null, String(underToken));

  // The whole point of hashing it is that it still works.
  const found = await users.findUserBySession(token);
  ok("the token still resolves to its user", found?.id === owner.id, String(found?.id));

  // The per-user list is what "sign out everywhere" reads, so a plaintext token
  // there would be the same leak by another route.
  const rows = await store.readArr(`${KEY_PREFIX}u:${owner.id}:sessions`);
  ok("the session list stores digests, not tokens",
    rows.every((r) => r.tokenHash && !r.token), JSON.stringify(Object.keys(rows[0] || {})));

  // REVOCATION MUST STILL REACH IT. A credential stored under a name nobody can
  // reproduce is worse than one stored in the clear.
  await users.revokeSession(owner.id, token);
  ok("revoking by the plain token still works",
    (await users.findUserBySession(token)) === null, "");
  await signIn(owner.id);

  // ---- H-9: encryption fails closed ---------------------------------------
  const { encryptField, decryptField } = await import("@/platform/auth/fieldCrypto");
  const round = decryptField(encryptField("1098765432"));
  ok("a field round-trips with a key present", round === "1098765432", round);

  // WITHOUT A KEY IT REFUSES, rather than writing the ID number in the clear.
  // The old behaviour returned the plaintext so "the app still works in local
  // dev", which meant a deploy missing the variable stored passport numbers
  // readable with no error and no way to tell which records afterwards.
  const key = process.env.FIELD_ENCRYPTION_KEY;
  delete process.env.FIELD_ENCRYPTION_KEY;
  let threw = "";
  try { encryptField("1098765432"); } catch (e) { threw = e.message; }
  process.env.FIELD_ENCRYPTION_KEY = key;
  ok("without a key it refuses to encrypt", threw.includes("refusing to store PII"), threw);

  // ...and it would NOT have refused before, which is what makes that assertion
  // worth having rather than a restatement of the code.
  ok("...where the old behaviour returned the plaintext",
    encryptField("1098765432") !== "1098765432", "still encrypts with the key back");
}

console.log("== the audit log: who did what");
// H-11. Super admins can change a studio's plan and assign platform roles;
// studio admins can grant themselves rights and unlock a locked quotation. None
// of it left a record, and S.activityLog had been declared for exactly this and
// then removed, having never had a reader or a writer.
{
  const audit = await import("@/platform/http/audit");
  const CLIENTS = await import("@/app/api/studios/[slug]/sales/clients/route.ts");
  const P = ctx({ slug });
  await signIn(owner.id);

  const before = await audit.since(studio.id, "", 200);

  const made = await capture(CLIENTS.POST, req(`/api/studios/${slug}/sales/clients`, {
    method: "POST",
    body: { name: `Audited Co ${rand()}`, country: "Saudi Arabia", city: "Riyadh" },
  }), P);
  ok("the write happened", made.status === 201, String(made.status));

  const after = await audit.since(studio.id, "", 200);
  ok("...and it left exactly one entry", after.length === before.length + 1,
    `${before.length} then ${after.length}`);

  const entry = after[after.length - 1];
  ok("the entry names the action", entry?.action === "POST sales/clients", entry?.action);
  ok("...the studio it happened in", entry?.studioId === studio.id, entry?.studioId);
  ok("...and the status the caller was told", entry?.status === "201", entry?.status);

  // THE ACTOR IS THE COLLABORATOR, NOT THE USER. CollaboratorID is the identity
  // inside a studio — every signature, assignment and notification is addressed
  // to it — so an audit trail naming the UserID would not join up with any of
  // them. Getting this wrong is the kind of thing nobody notices until the one
  // day the log is the only record left.
  ok("the actor is the collaborator, not the user",
    entry?.actor === owner.collaborator?.id || entry?.actorType === "collaborator",
    `${entry?.actorType} ${entry?.actor}`);
  ok("...and it is tied to a request id", Boolean(entry?.requestId), entry?.requestId);

  // READS ARE NOT LOGGED. A trail nobody can read through is not one anybody
  // will, and a GET is not an act somebody has to answer for.
  const beforeRead = await audit.since(studio.id, "", 200);
  await capture(CLIENTS.PUT, req(`/api/studios/${slug}/sales/clients`,
    { method: "PUT", body: {} }), P);
  const SALES = await import("@/app/api/studios/[slug]/sales/route.ts");
  await capture(SALES.GET, req(`/api/studios/${slug}/sales`), P);
  const afterRead = await audit.since(studio.id, "", 200);
  ok("a read leaves no entry, a refused write still does",
    afterRead.length === beforeRead.length + 1, `${beforeRead.length} then ${afterRead.length}`);

  // A REFUSAL IS RECORDED TOO, and that is the point rather than an oversight:
  // somebody repeatedly attempting what they may not do is exactly what an audit
  // trail is read to find.
  const refusedEntry = afterRead[afterRead.length - 1];
  ok("...and the refusal recorded the status it answered",
    Number(refusedEntry?.status) >= 400, refusedEntry?.status);

  // A CONSOLE ACTION BELONGS TO NO STUDIO, and that is where H-11's worst cases
  // live: changing a studio's plan, assigning a platform role, rewriting the
  // price list. Those cannot be filed under a tenant — and must outlive any
  // tenant they touched — so they go to a separate log. Asserted here because
  // the branch is one `?:` in a key builder, which is exactly the kind of thing
  // that is obviously right and silently backwards.
  {
    const beforePlatform = await audit.since("", "", 200);
    await audit.record({
      actor: "sup_test", actorType: audit.ACTOR.SUPER,
      action: "PUT super/studios/[id]", subject: studio.id, status: 200,
    });
    const afterPlatform = await audit.since("", "", 200);
    ok("a console action lands in the platform log",
      afterPlatform.length === beforePlatform.length + 1,
      `${beforePlatform.length} then ${afterPlatform.length}`);

    const platformEntry = afterPlatform[afterPlatform.length - 1];
    ok("...with no studio to file it under", platformEntry?.studioId === "",
      JSON.stringify(platformEntry?.studioId));
    ok("...and it did NOT land in the studio's log",
      (await audit.since(studio.id, "", 200)).every((e) => e.actor !== "sup_test"), "");
  }

  // THE BODY IS NEVER COPIED IN. It carries passwords on identity, ID numbers on
  // HR and bank details on Finance; a log written to survive an audit is the last
  // place to duplicate them.
  const fields = Object.keys(entry || {});
  ok("no request body is stored in the entry",
    !fields.some((f) => ["body", "payload", "password", "name"].includes(f)),
    fields.join(","));
}

console.log("== one row, by the id a live event named");
// THE OTHER HALF OF H-6. The stream now says WHICH row changed; this is what a
// board does with that. The assertions worth having are not "it returns a row"
// but the three ways it could quietly become a hole.
{
  const ROWS = await import("@/app/api/studios/[slug]/rows/route.ts");
  const P = ctx({ slug });
  const ask = (q, as) => (as ? signIn(as) : Promise.resolve())
    .then(() => capture(ROWS.GET, req(`/api/studios/${slug}/rows?${q}`), P));

  await signIn(owner.id);
  const tickets = await import("@/modules/sales/sales");
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
  const raw = await (await import("@/platform/db/repo")).repo("salesTickets")
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
    const { decide } = await import("@/platform/realtime/livePatch");
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
  const { repo, orderBy } = await import("@/platform/db/repo");
  const sales = await import("@/modules/sales/sales");
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
  const EXPENSES = await import("@/app/api/studios/[slug]/finance/expenses/route.ts");
  const finance = await import("@/modules/finance/finance");
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

  // THE RECORD EXPIRES, AND IT DID NOT. `finishIdempotent` called
  // `setJSON(key, value, TTL_SEC)` — a two-parameter function handed three
  // arguments, which JavaScript accepts in silence. TypeScript refused it the
  // moment platform/http was converted, and the consequence was worse than a
  // missing TTL: `claim` sets the key with EX 24h, and a plain Redis SET
  // without KEEPTTL REMOVES the expiry it finds. So every completed idempotent
  // write left a permanent key, in a product whose only storage is Redis and
  // whose eviction policy is deliberately noeviction — the end state being
  // writes failing platform-wide from a key space nobody was watching grow.
  //
  // ASSERTED ON THE UNIT, not through a route. The bug was invisible to
  // behaviour — replay worked perfectly either way — so the only thing that
  // catches it is asking Redis what the TTL actually is, and the route's digest
  // is built from a path and an identity this suite would have to reconstruct
  // exactly to name the same key.
  {
    const { IDEM } = await import("@/platform/db/keys");
    const { beginIdempotent, finishIdempotent } = await import("@/platform/http/idempotency");
    const { ttlOf } = await import("@/platform/db/store");

    const digest = `g-ttl-${rand()}`;
    await beginIdempotent(digest);
    const claimed = await ttlOf(IDEM.record(digest));
    ok("the reservation carries a TTL", claimed > 0, `${claimed}s`);

    await finishIdempotent(digest, 201, { ok: true });
    const recorded = await ttlOf(IDEM.record(digest));
    ok("...and recording the answer does not clear it", recorded > 0, `${recorded}s`);
  }


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
  const PROFILE = await import("@/app/api/identity/profile/route.ts");
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

// ============================================================================
console.log("== migration export: the .sql dump the console and CLI both emit");
// THE ONE PLACE /super/application/migration DOES something rather than describes
// the plan: GET /api/super/migration/export streams a self-contained SQL Server
// dump, and scripts/migrate/backfill.mjs writes the same bytes to a file. Both go
// through src/platform/db/migrate — transform (coercion) and emit (DDL inference +
// batched INSERTs). This pins that shared contract.
//
// NO REDIS. The emitter is a pure function of in-memory rows plus a caller-supplied
// clock, so the input is synthetic and fixed here — which is exactly why the golden
// is stable. The ids are short on purpose so normalise() leaves them verbatim
// ("ids preserved verbatim" is the property under test); a real export's long ids
// would collapse to <tkt_ID> and hide row-to-row differences.
{
  const { transformCollection, transformFlat } = await import("@/platform/db/migrate/transform");
  const { emitToString } = await import("@/platform/db/migrate/emit");
  const { CHILD_ARRAYS } = await import("@/platform/db/migrate/mapping");

  // Mirror extract.ts' accumulation: rows grouped by table, insertion order kept.
  const tables = new Map();
  const add = (t, rows) => { if (rows.length) tables.set(t, [...(tables.get(t) || []), ...rows]); };

  // A platform registry row (g:* document) → one flat table row.
  add("Studio", [transformFlat("Studio", {
    id: "std_demo", name: "Demo Studio", slug: "demo", createdAt: "2026-01-01T00:00:00.000Z",
  }).row]);

  // Two tickets, deliberately with DIFFERENT field subsets, to exercise the column
  // union and every type the emitter infers: money→DECIMAL, date→DATETIME2,
  // bool→BIT, int→BIGINT, id→VARCHAR, ""→NULL, a nested object→Extra JSON.
  const tickets = transformCollection("salesTickets", "SalesTicket", [
    {
      id: "tkt_r1", studioId: "std_demo", sectionId: "sec_sales", ref: "ST-1", title: "Boardroom refit",
      status: "Lead", value: "12500.50", probability: 40, won: false,
      createdAt: "2026-01-15T09:30:00.000Z", closedAt: "", meta: { source: "web", tags: ["a", "b"] },
    },
    {
      id: "tkt_r2", studioId: "std_demo", sectionId: "sec_sales", ref: "ST-2", title: "Lobby AV",
      status: "Opportunity", value: 999, probability: 10, won: true, createdAt: "2026-02-01T12:00:00.000Z",
    },
  ], { studioId: "std_demo", sectionId: null, childArrays: CHILD_ARRAYS });
  for (const [t, rows] of Object.entries(tickets.rows)) add(t, rows);

  // A quotation with a promoted `lines` array → QuotationLine child rows (no lone
  // Id, so the child table loads without a PK — correct for a dump).
  const quotes = transformCollection("quotations", "Quotation", [
    {
      id: "quo_q1", studioId: "std_demo", sectionId: "sec_tech", ref: "Q-1", total: "5000",
      createdAt: "2026-01-20T00:00:00.000Z",
      lines: [
        { desc: "Speakers", qty: 4, unitPrice: "250.00" },
        { desc: "Install", qty: 1, unitPrice: 1000 },
      ],
    },
  ], { studioId: "std_demo", sectionId: null, childArrays: CHILD_ARRAYS });
  for (const [t, rows] of Object.entries(quotes.rows)) add(t, rows);

  // A caller-supplied clock (scripts have none of their own) keeps the header line
  // constant; it is ISO so normalise() maps it to <timestamp> either way.
  const sql = emitToString(tables, { scope: "studio demo", generatedAt: "2026-01-01T00:00:00.000Z" });

  // The whole dump, pinned line by line. A renamed column, a dropped guard, a
  // changed literal form, or a lost child row fails here.
  const dump = golden("migration.export.dump", { sql: sql.split("\n") });
  if (!dump.recorded) ok("migration.export.dump matches its golden", dump.ok, dump.detail);

  // Legible assertions on the contract points, so a failure reads without diffing
  // the golden. Each is a rule the emitter/transform must not quietly drop.
  ok("the DDL is re-runnable (guarded CREATE TABLE)",
    sql.includes("IF OBJECT_ID(N'dbo.[SalesTicket]', N'U') IS NULL"));
  ok("a single verbatim Id becomes the primary key",
    sql.includes("CONSTRAINT [PK_SalesTicket] PRIMARY KEY ([Id])"));
  ok("a promoted child array has NO primary key",
    sql.includes("dbo.[QuotationLine]") && !sql.includes("PK_QuotationLine"));
  ok("a money field infers DECIMAL(18,2)", sql.includes("[Value] DECIMAL(18,2)"));
  ok("a whole-number field infers BIGINT", sql.includes("[Probability] BIGINT"));
  ok("a boolean field infers BIT", sql.includes("[Won] BIT"));
  ok("a date field infers DATETIME2(3)", sql.includes("[CreatedAt] DATETIME2(3)"));
  ok("an id-shaped column is a short VARCHAR key", sql.includes("[Id] VARCHAR(64)"));
  ok("a date renders as a SQL-Server literal, no T/Z", sql.includes("'2026-01-15 09:30:00.000'"));
  ok("an empty string became NULL, not a quoted ''",
    sql.includes("'2026-01-15 09:30:00.000', NULL,"));
  ok("an unmapped nested object rode along in Extra JSON",
    sql.includes("[Extra] NVARCHAR(MAX)") && sql.includes('"meta":{"source":"web"'));
  ok("both quotation lines were promoted to child rows",
    (sql.match(/INSERT INTO dbo\.\[QuotationLine\]/g) || []).length === 1
      && sql.includes("-- ── QuotationLine (2 rows) ──"));
}

// ============================================================================
console.log("== migration extract: reads one studio, scoped and read-only");
// The golden above pins transform + emit on synthetic input. This pins the E in
// ETL against REAL Redis — the fixture studio, seeded through the routes by every
// section above — because extract is where the two properties that matter live:
// it must READ ONLY (CLAUDE.md: REDIS_URL is live and shared), and it must never
// pull a key belonging to another tenant (invariant 2). Scoped to the test
// namespace, so it exercises the same scanPrefix/getJSON path a live export uses.
{
  const { extract } = await import("@/platform/db/migrate/extract");
  const { scanPrefix } = await import("@/platform/db/store");

  // READ-ONLY, proven rather than asserted: the studio's key count cannot move
  // across an extract. extract calls getJSON/hGetAll/scanPrefix and nothing that
  // writes; this is the observable form of that.
  const base = S.prefix(studio.id);
  const before = (await scanPrefix(base)).length;
  const ext = await extract({ kind: "studio", studioId: studio.id });
  const after = (await scanPrefix(base)).length;
  ok("extract wrote nothing (key count unchanged)", before === after, `${before} → ${after}`);

  // It grouped rows by table — the shape emit.ts consumes.
  ok("extract returns a non-empty table map", ext.tables instanceof Map && ext.tables.size > 0, String(ext.tables?.size));

  // The studio's own registry row rides along, with its id VERBATIM — the whole
  // point of the migration ("ids preserved verbatim").
  const studioRows = ext.tables.get("Studio") || [];
  ok("the studio's own row is included, id verbatim",
    studioRows.length === 1 && studioRows[0].Id === studio.id, JSON.stringify(studioRows[0]?.Id));

  // Sales seeded tickets through the real routes above, so the section-scoped
  // operational collections (sec:<id>:c:salesTickets) must have surfaced under
  // their SQL table name — proving the section-key classification in extract works
  // against real keys, not just the synthetic fixture.
  const ticketRows = ext.tables.get("SalesTicket") || [];
  ok("section-scoped SalesTicket rows were extracted", ticketRows.length > 0, String(ticketRows.length));

  // TENANCY: every row that carries a StudioId carries THIS studio's — extract of
  // one studio cannot reach another's keys. Proven across every table at once, so
  // a new collection is covered without naming it.
  const foreign = [];
  for (const [table, rows] of ext.tables) {
    for (const row of rows) {
      if ("StudioId" in row && row.StudioId != null && row.StudioId !== studio.id) {
        foreign.push(`${table}:${row.StudioId}`);
      }
    }
  }
  ok("no extracted row belongs to another tenant", foreign.length === 0, foreign.slice(0, 5).join(", "));

  // Every operational row is tagged with the studio, which is what makes the SQL
  // schema's StudioId column (and its cross-tenant FK) fillable at all.
  ok("operational rows are studio-tagged", ticketRows.every((r) => r.StudioId === studio.id), "");

  // REGRESSION: the full export 500'd with WRONGTYPE. u:<id>:studioVisits is a
  // Redis HASH (hIncrBy'd), and extractUsers read every satellite with getJSON —
  // a GET on a hash. But the full export ALSO reads every PLATFORM registry with
  // getJSON, and only a full export touches them — so a hash-typed registry would
  // be the same 500 the studioVisits fix just closed. Seed each registry through
  // its REAL writer (so it is stored exactly as production stores it) plus the
  // hash satellite, then prove one extract({kind:"all"}) reads them all without a
  // type error. A future registry or satellite stored as a hash fails HERE, by
  // name, rather than in production. Writes go to the test namespace, swept after.
  const { hIncrBy } = await import("@/platform/db/store");
  const { U } = await import("@/platform/db/keys");
  const { createCatalogItem } = await import("@/lib/data/catalog");
  const { createQuestionnaireDef } = await import("@/lib/data/questionnaires");
  const { createJoinRequest } = await import("@/modules/people/joinRequests");

  await hIncrBy(U.studioVisits(owner.id), studio.id, 1);            // u:<id>:studioVisits (hash)
  await createCatalogItem("packages", { name: "Probe package" });  // g:packages → Package
  await createCatalogItem("tiers", { name: "Probe tier" });        // g:tiers → Tier
  await createCatalogItem("services", { name: "Probe ERP" });      // g:erpServices → ErpService
  await createQuestionnaireDef({ name: "Probe questionnaire" });   // g:questionnaires → Questionnaire
  // A join request needs an existing studio and a non-member; the outsider is one.
  // Its own validation is not what this guards, so a refusal must not fail it.
  try { await createJoinRequest({ studioId: studio.id, userId: outsider.id }); } catch { /* not the subject */ }

  // users, studios and superAdmins are already seeded by the fixture above, so one
  // full extract now touches every registry the export reads plus the hash satellite.
  let fullOk = false, fullDetail = "";
  try {
    const full = await extract({ kind: "all" });
    const has = (t) => (full.tables.get(t) || []).length > 0;
    const visits = full.tables.get("StudioVisit") || [];
    const visitOk = visits.some((v) => v.UserId === owner.id && v.StudioId === studio.id && Number(v.Visits) >= 1);
    const need = ["User", "Studio", "Package", "Tier", "ErpService", "Questionnaire"];
    const missing = need.filter((t) => !has(t));
    fullOk = visitOk && missing.length === 0;
    fullDetail = `visits:${visitOk}${missing.length ? ` missing:${missing.join(",")}` : " registries:all"}`;
  } catch (e) {
    fullDetail = e.message; // a WRONGTYPE from any registry or satellite lands here
  }
  ok("the full export reads every registry and the studioVisits hash without WRONGTYPE", fullOk, fullDetail);
}

// ============================================================================
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
  // THE TABLE IS NOT COPIED HERE. It lives in src/platform/http/httpStatus.js, which is
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
  // src/platform/http/httpStatus.js instead of a twelve-entry copy, which found two more.
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
  const SALES = (await import("@/app/api/studios/[slug]/sales/route.ts"));
  const STUDIO = (await import("@/app/api/studios/[slug]/route.ts"));
  const TECHHOP = (await import("@/app/api/studios/[slug]/technical/route.ts"));

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

  // TECHNICAL GREW A SIXTH LIST — vocabulary.clients, for the internal-
  // quotation picker — and the route's own comment says it was folded into
  // the existing Promise.all rather than read after. Measured at 5 waves: the
  // ceiling sits one above that, same convention as the two routes above, so
  // an accidental extra round trip (clients read AFTER the rest rather than
  // inside the same Promise.all) fails the build instead of shipping quietly.
  const techCall = await withCommandCount(() => capture(TECHHOP.GET, req(`/api/studios/${slug}/technical`), ctx({ slug })));
  console.log(`       GET /api/studios/<slug>/technical  ${techCall.commands} commands, ${techCall.waves} waves`);
  ok("the technical route is measured at all", techCall.commands > 0);
  ok("the technical route stays under its ceiling — vocabulary.clients joined the existing Promise.all rather than adding one",
    techCall.waves <= 6, `${techCall.waves} waves: ${techCall.names.join(",")}`);

  __signOut();
}

// ============================================================================
console.log(`\ngate A: ${fails ? `${fails} FAILURES` : "all passed"}\n`);
export const gateAFailures = fails;
