import { register } from "node:module";
import { pathToFileURL } from "node:url";

// SELF-REGISTERING LOADER, unlike engagement.mjs and its siblings. Those files
// only ever run through tests/suite.mjs, whose bootstrap (integration.test.mjs)
// registers tests/loader.mjs before anything project-shaped is imported. This
// file's own verification step runs it bare — `node tests/restructure.mjs` —
// so it has to do that registration itself: keys.ts and platform/access/index.ts
// reach their own siblings with extensionless specifiers (`./engagementId`,
// house style per CLAUDE.md), which plain Node's ESM resolver cannot follow
// without the loader's resolve() hook filling the extension in.
//
// Safe to run twice: when tests/suite.mjs later imports this file (Step 4),
// integration.test.mjs has already registered the loader once, and this line
// registers it again — verified harmless (a second hook just passes an
// already-resolved, already-extensioned specifier through to the first one's
// `next()`, so nothing is resolved twice). SKIPPED under tsx specifically,
// because that IS unsafe: scripts/migrate/backfill-engagements.mjs documents a
// reproduced deadlock from calling register() again from inside tsx's own
// loader thread while it is still evaluating.
const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("./loader.mjs", import.meta.url), { data: { root } });
}

// Dynamic, not static — a static `import` is resolved before ANY module-level
// code runs (including the register() call above), which is exactly what
// leaves it too early to see the hook. scripts/migrate/*.mjs solve the same
// ordering problem the same way.
const {
  SECTION_KEY_MAP, PERMISSION_KEY_MAP, COLLECTION_MOVES,
  mapSectionKey, mapPermissionKey,
} = await import("../src/platform/db/restructure.ts");
const { SECTION_DEFS, ALL_SECTION_KEYS } = await import("../src/platform/db/keys.ts");
// Dynamic for the same reason as every import in this file — see above.
const { departmentOf } = await import("../src/shared/studio/insights.ts");
const { AREAS } = await import("../src/platform/access/index.ts");
const { effectivePermissions, scopeFor, escalates, sectionViewable, SECTION_AREAS, NO_SCREEN_YET } = await import("../src/platform/access/resolve.ts");
const { sectionName } = await import("../src/shared/studio/sections.ts");

export async function testEveryOldSectionKeyIsAccountedFor(t) {
  // The twelve departments' keys as they stand before the rename. Every one must
  // map somewhere — a key that maps nowhere is a section whose records nobody
  // has decided the fate of.
  const before = [
    "main", "sales", "sales-tickets", "sales-clients", "sales-live", "sales-settings",
    "technical", "technical-quotations", "technical-rfq", "technical-live", "technical-settings",
    "projects", "projects-list", "projects-sla", "projects-overtimes", "projects-settings",
    "inventory", "inventory-stock", "inventory-vendors", "inventory-items", "inventory-sheets", "inventory-awb",
    "hr", "hr-employees",
    "finance", "finance-cash", "finance-ledger", "finance-payables", "finance-assets", "finance-settings",
    "operations", "operations-schedule", "operations-tracking", "operations-planner", "operations-settings",
    "quality", "quality-documents",
    "tasks", "tasks-settings",
  ];
  for (const key of before) {
    t.equal(typeof mapSectionKey(key), "string", `${key} maps somewhere`);
    t.equal(mapSectionKey(key).length > 0, true, `${key} maps to a real key`);
  }
}

export async function testEveryMappedTargetActuallyExists(t) {
  // A map that points at a key SECTION_DEFS does not define is a section that
  // renders nowhere and a grant nobody can hold.
  for (const [from, to] of Object.entries(SECTION_KEY_MAP)) {
    t.equal(ALL_SECTION_KEYS.includes(to), true, `${from} -> ${to} exists in SECTION_DEFS`);
  }
}

export async function testEveryMappedPermissionTargetIsARealArea(t) {
  const areaKeys = new Set(AREAS.map((a) => a.key));
  for (const [from, to] of Object.entries(PERMISSION_KEY_MAP)) {
    const area = to.split(".").slice(0, -1).join(".");
    t.equal(areaKeys.has(area) || areaKeys.has(to), true, `${from} -> ${to} names a real area`);
  }
}

export async function testMapIsIdempotent(t) {
  // Running the migration twice must be safe, so a key that has ALREADY been
  // renamed maps to itself rather than to nothing.
  for (const to of Object.values(SECTION_KEY_MAP)) {
    t.equal(mapSectionKey(to), to, `${to} maps to itself`);
  }
}

export async function testEveryDeclaredMoveIsListed(t) {
  // RENAMED FROM testTheFiveMovesAreDeclared. It counted P0's five moves, and
  // the list is not closed: `locations` joined when Administration's Master
  // data got a screen it could be opened from. The name said five because five
  // was true once, which is exactly how a test name stops describing the test.
  //
  // WHAT IT GUARDS is unchanged and worth keeping: a collection cannot change
  // owner without somebody adding it here, so a silent re-home — rows alive,
  // correct, and reachable by nobody — fails a test rather than going
  // unnoticed until a screen comes up empty.
  const moved = COLLECTION_MOVES.map((m) => m.collection).sort();
  t.equal(
    moved.join(","),
    ["awbAirlines", "awbShipments", "generatedDocuments", "locations",
     "qualityAcknowledgements", "qualityAudit", "qualityDocuments",
     "qualityRevisions", "qualityTypes", "quotations"].sort().join(","),
    "every collection that changes owner is declared",
  );

  // AND EACH MOVES INTO A SECTION THAT CAN OPEN IT. That is the rule
  // COLLECTION_MOVES has always followed and the reason locations could not
  // move until now: a target still in NO_SCREEN_YET renders nothing, so rows
  // sent there are stranded. Permits are the live example — they are NOT in
  // the list above, because quality-hse is still declared and screenless.
  for (const m of COLLECTION_MOVES) {
    t.equal(NO_SCREEN_YET.includes(m.to), false,
      `${m.collection} moves into ${m.to}, which must not be a section that renders nothing`);
  }
}

export async function testNoAreaExistsForASectionWithNoScreen(t) {
  // A right nothing can exercise is a bug (invariant 16). These sections are
  // declared for ordering and have no screens until P5/P6/P7.
  //
  // READ FROM NO_SCREEN_YET RATHER THAN LISTED HERE, and that is the whole
  // point of the change. The list used to be typed out — "tendering,
  // manufacturing, assets, reports" — and when Tendering got its register the
  // list was not updated, so this assertion went red and STAYED red, asserting
  // that a section which had just shipped a screen must not have any rights.
  // A hand-kept copy of NO_SCREEN_YET is a second answer to "what renders
  // nothing", free to disagree with the one the product actually resolves
  // against, which is exactly what happened.
  //
  // administration-master is skipped: it is the one CHILD in the list, and a
  // child's rights are its parent's business, not its own.
  const empty = NO_SCREEN_YET.filter((key) => !key.includes("-"));
  t.equal(empty.length > 0, true, "there is still at least one screenless section to check");
  for (const key of empty) {
    const found = AREAS.filter((a) => a.key.startsWith(`${key}.`));
    t.equal(found.length, 0, `${key} has no rights yet: ${found.map((a) => a.key).join(",")}`);
  }
}

export async function testEveryAreaGroupIsARealSectionLabel(t) {
  const labels = new Set(SECTION_DEFS.map((d) => d.name));
  for (const area of AREAS) {
    t.equal(labels.has(area.group), true, `area ${area.key} is grouped under a real section (${area.group})`);
  }
}

// KNOWN_COLLISIONS — exact (file, value) pairs where a literal SPELLED like a
// retired section or permission key is something else entirely: an icon
// name, a StatusPill record-kind discriminator, a frozen per-tier dashboard-
// widget key, a stored per-studio task-authority code, or an API route
// segment the P0 restructure never moved. Task 5's review found eight such
// collisions, each verified by checking whether the value is EVER resolved
// against SECTION_KEY_MAP/PERMISSION_KEY_MAP/SECTION_DEFS/AREAS anywhere (it
// is not, in every case) before being added here.
//
// Consulted by BOTH assertions below. The check is never a whole-file
// exemption: a matching line is excused only when the EXACT quoted token
// that triggered the match is itself one of the file's listed values — a
// genuine retired-key survivor sitting on another line of the same file, or
// even a different quoted token on the SAME line, still fails. A stale entry
// here fails LOUDLY the day the file it names stops needing it (nothing will
// ever match it again, and nothing depends on that — unlike a stale split
// literal in production code, which fails silently forever).
const KNOWN_COLLISIONS = {
  "src/components/studio2/StudioFrame.js": [
    { value: "sales", reason: "icons.js's icon-name registry key for the CRM & Sales row" },
  ],
  "src/components/studio2/StudioTechnical.js": [
    { value: "sales", reason: "icons.js's icon-name registry key for the quotation's origin badge" },
  ],
  // GONE, ALL THREE, and deliberately not replaced by a fourth. Every screen
  // drawing a ticket-stage pill named the pill's record-kind "sales", which is
  // spelled exactly like a retired SECTION key — so each needed an exemption
  // here saying "not that sales", and the next such screen needed another. The
  // kind is `ticketStage` now (StatusPill.jsx), which collides with nothing.
  "src/components/studio2/QualityWorkflow.js": [
    { value: "quality", reason: "StatusPill.jsx's STATUS_TONES record-kind key for revision-state colours" },
  ],
  "src/modules/tasks/taskRouting.ts": [
    { value: "sales", reason: "a STORED Task-settings authority code (types.ts's TaskAssignees)" },
  ],
  "src/lib/dashboardWidgets.ts": [
    { value: "technical.rfq-funnel", reason: "a FROZEN per-tier dashboard-widget key (renaming one is a data migration)" },
  ],
  "src/components/studio2/TechnicalDashboard.jsx": [
    { value: "technical.rfq-funnel", reason: "the same frozen widget key, referenced by its consumer" },
  ],
  "src/components/studio2/StudioOperations.js": [
    { value: "operations", reason: "the unmoved API route segment (src/app/api/studios/[slug]/operations/)" },
    { value: "operations/schedule", reason: "same — the schedule sub-route, never renamed" },
  ],
};

// A TRAP WORTH KNOWING, because it cost a red build: both assertions below
// shell out to `git grep`, which searches TRACKED FILES ONLY. A brand-new
// source file is untracked until it is `git add`-ed, so it is INVISIBLE to
// this check — the suite passes locally, and the same tree fails in CI the
// moment the file is committed. If you have just written a new screen or
// module, stage it before you believe a green run here.
//
// Every double-quoted token on a line, so a hit can be checked against
// KNOWN_COLLISIONS by the EXACT literal that matched rather than by the
// looser substring the grep pattern itself allows.
function quotedTokens(line) {
  const re = /"([^"]*)"/g;
  const out = [];
  let m;
  while ((m = re.exec(line))) out.push(m[1]);
  return out;
}

// Re-greps a single already-flagged file for the lines that actually match,
// so each can be checked token by token against KNOWN_COLLISIONS. `matches`
// decides, per extracted token, whether it is the retired-key shape being
// hunted (exact equality for section keys, prefix for permission keys — see
// each caller). Kept separate from the whole-tree grep below for the same
// execFileSync/argv reasons documented there.
function survivingTokens(execFileSync, file, argvPattern, matches) {
  let out;
  try {
    out = execFileSync("git", ["grep", "-n", "--", argvPattern, file], { encoding: "utf8" });
  } catch (e) {
    if (e.status === 1) return [];
    throw e;
  }
  const prefix = `${file}:`;
  const allowed = KNOWN_COLLISIONS[file] || [];
  const survivors = [];
  for (const line of out.split("\n")) {
    if (!line.startsWith(prefix)) continue;
    const rest = line.slice(prefix.length);
    const content = rest.slice(rest.indexOf(":") + 1);
    for (const token of quotedTokens(content)) {
      if (!matches(token)) continue;
      if (allowed.some((c) => c.value === token)) continue;
      survivors.push(token);
    }
  }
  return survivors;
}

export async function testNoRetiredPermissionKeySurvivesInSource(t) {
  // THE SECOND ARCHITECTURAL ASSERTION, the same shape as
  // testNoRetiredSectionKeySurvivesInSource below but for PERMISSION keys
  // rather than SECTION keys. A literal "operations.tracking.view" or
  // "quality.documents.approve" left behind in a route guards on a key nobody
  // holds any more the moment Task 4's rename lands — isPermission accepts
  // only the renamed spelling — and requirePermission cannot tell "nobody
  // granted this" from "this key doesn't exist any more", so the route just
  // returns 403 for everybody with nothing pointing at the cause. Grep is the
  // only thing that finds these.
  //
  // THE PATTERN IS `"<area-key>` — an opening quote followed by the bare area
  // key, with no closing quote — so ONE pattern catches both the bare form
  // (`"sales.tickets"`, e.g. a RoleSchema.scopes property name) and every
  // verb-suffixed permission literal built from it (`"sales.tickets.view"`,
  // `"sales.tickets.create"`, ...), since both start with the same substring.
  // The SAME wildcard-`.` behaviour that lets one pattern do that is what
  // makes it match a few unrelated values too — see KNOWN_COLLISIONS above.
  //
  // src/platform/db/restructure.ts is excluded for the same reason as the
  // section-key assertion below: it IS the map, and a map has to name every
  // retired key as a SOURCE to say where it went — without the exclusion this
  // assertion could never pass, on the very file that fixes the problem it
  // exists to catch.
  //
  // execFileSync, not execSync + a shell string — the same Windows incident
  // documented on testNoRetiredSectionKeySurvivesInSource below: execSync's
  // default shell on Windows is cmd.exe, which does not treat single quotes as
  // quoting at all, so a quoted pattern and a `:!…` exclusion pathspec both
  // arrive at git mangled, git exits non-zero, and `|| true` would swallow
  // that into an EMPTY stdout — a false pass on every single key, silently.
  // execFileSync hands git its argv directly, no shell, so there is nothing
  // for a shell to re-quote.
  //
  // RED ON ARRIVAL. This task (4) renames the catalogue; it does not sweep the
  // 31 files in src/ still guarding on the old spelling. Task 5 does that
  // sweep and turns this green — do not sweep it here.
  const { execFileSync } = await import("node:child_process");
  const retired = Object.keys(PERMISSION_KEY_MAP).filter((k) => PERMISSION_KEY_MAP[k] !== k);
  for (const key of retired) {
    let files;
    try {
      files = execFileSync(
        "git",
        ["grep", "-l", "--", `"${key}`, "src", ":!src/platform/db/restructure.ts"],
        { encoding: "utf8" },
      ).trim().split("\n").filter(Boolean);
    } catch (e) {
      // Exit code 1 is git grep's "no match" — the good outcome, not an error.
      if (e.status === 1) files = [];
      else throw e;
    }
    const matches = (token) => new RegExp(`^${key}`).test(token);
    const bad = [];
    for (const file of files) {
      const survivors = survivingTokens(execFileSync, file, `"${key}`, matches);
      if (survivors.length) bad.push(`${file}: ${survivors.join(", ")}`);
    }
    t.equal(bad.join("\n"), "", `no source file still names the retired permission key "${key}"\n${bad.join("\n")}`);
  }
}

export async function testNoRetiredSectionKeySurvivesInSource(t) {
  // THE ARCHITECTURAL ASSERTION. A literal "sales-tickets" left behind in a
  // module looks up a section that no longer exists, and getSectionByKey returns
  // null — which every call site reads as "no section", i.e. an empty screen
  // with no error. Grep is the only thing that finds these.
  //
  // src/platform/db/restructure.ts itself is excluded: it IS this map, and a
  // map has to name every retired key as a SOURCE to say where it went — without
  // the exclusion this assertion could never pass, on the very file that fixes
  // the problem it exists to catch.
  //
  // execFileSync, not execSync + a shell string: execSync's default shell on
  // Windows is cmd.exe, which does not treat single quotes as quoting at all —
  // the quoted pattern and the `:!…` exclusion pathspec both arrived at git
  // mangled, git exited non-zero, and `|| true` swallowed that into an EMPTY
  // stdout — a false pass on every single key, silently. execFileSync hands git
  // its argv directly, no shell, so there is nothing for a shell to re-quote.
  const { execFileSync } = await import("node:child_process");
  const retired = Object.keys(SECTION_KEY_MAP).filter((k) => SECTION_KEY_MAP[k] !== k);
  for (const key of retired) {
    let files;
    try {
      files = execFileSync(
        "git",
        ["grep", "-l", "--", `"${key}"`, "src", ":!src/platform/db/restructure.ts"],
        { encoding: "utf8" },
      ).trim().split("\n").filter(Boolean);
    } catch (e) {
      // Exit code 1 is git grep's "no match" — the good outcome, not an error.
      if (e.status === 1) files = [];
      else throw e;
    }
    const matches = (token) => token === key;
    const bad = [];
    for (const file of files) {
      const survivors = survivingTokens(execFileSync, file, `"${key}"`, matches);
      if (survivors.length) bad.push(`${file}: ${survivors.join(", ")}`);
    }
    t.equal(bad.join("\n"), "", `no source file still names the retired key "${key}"\n${bad.join("\n")}`);
  }
}

// ---- permission resolution --------------------------------------------------
// TASK 3: the alias has to be read on the way IN to effectivePermissions, or
// the rename in Task 4 empties every role in every studio with nothing logged
// (see resolve.ts's own comment on this). These exercise the real signature —
// effectivePermissions takes ONE Subject argument, `{ collaborator, roles }` —
// not the two-argument shape an earlier draft of this task described.
//
// UPDATED BY TASK 5, NOW THAT TASK 4 HAS RENAMED THE CATALOGUE. When this
// suite was written (Task 3), catalogue.ts had not been renamed yet, so
// isPermission still only recognised the pre-rename spelling of an area, and
// four sub-assertions below checked that an old-vintage grant resolved to
// ITSELF — the only thing observable at the time. That was deliberate, not an
// oversight: an earlier draft that asserted the MAPPED key directly could
// only have been made to pass by mapping every stored key forward
// UNCONDITIONALLY, which would have emptied every role in every studio the
// moment that file landed, one task earlier than the incident this alias
// exists to prevent. resolve.ts checks the raw string first and falls back to
// the mapped one only when the raw string is no longer recognised (see its
// comment) — so before Task 4, "raw resolves" and "mapped resolves" were the
// same observable fact, and the sub-assertions could only check the former.
// Now that Task 4 has renamed the areas, isPermission rejects the pre-rename
// spelling, and the SAME fallback line in resolve.ts is what makes the old
// stored key resolve to its MAPPED form instead — which is what these
// sub-assertions check today, per the Task 4 implementer's and reviewer's
// shared verdict that they were superseded, not masking a regression: a
// permanently-red assertion for an unrecorded reason is exactly the kind of
// noise that would hide the next real failure. (Both the implementer's own
// recommendation and the reviewer's independent confirmation are recorded in
// docs/progress.md under Task 4.)

export async function testAnOldStoredGrantStillResolves(t) {
  // A role holds "sales.tickets.view" — written against the catalogue as it
  // stood before this restructure. Now that Task 4 has renamed the area, that
  // raw string is no longer a permission isPermission recognises, so
  // resolveGrant's fallback is what carries it forward: the grant must
  // resolve to its MAPPED, current-catalogue spelling, `crmSales.tickets.view`
  // — a role written under the old catalogue keeps working, silently, exactly
  // as invariant 4 (default deny) requires it not to instead go dark.
  const roles = [{ id: "r1", permissions: ["sales.tickets.view", "sales.tickets.create"], scopes: {} }];
  const eff = effectivePermissions({ collaborator: { roleIds: ["r1"] }, roles });
  t.equal(eff.has("crmSales.tickets.view"), true, "an old-vintage grant now resolves to its post-rename spelling");
  t.equal(eff.has("crmSales.tickets.create"), true, "every verb still carries across");

  // The dependency this fact rests on: mapPermissionKey names exactly the
  // target resolveGrant's fallback produced above.
  t.equal(mapPermissionKey("sales.tickets.view"), "crmSales.tickets.view", "the map this fallback consumes already names the post-rename key");
}

export async function testANewStoredGrantResolvesUnchanged(t) {
  // "hr.employees" is one of the areas the restructure does NOT rename — its
  // "new" vintage and its current vintage are the same string. A grant stored
  // in that form has to resolve today exactly as any other currently-valid
  // key does, proving the fallback introduced by this task does not disturb
  // the ordinary, unmapped case.
  const roles = [{ id: "r1", permissions: ["hr.employees.view"], scopes: {} }];
  const eff = effectivePermissions({ collaborator: { roleIds: ["r1"] }, roles });
  t.equal(eff.has("hr.employees.view"), true, "a grant already in its final form still resolves to itself");
}

export async function testAnUnknownGrantStillGrantsNothing(t) {
  // THE ALIAS MUST NOT BECOME A HOLE. A key nothing recognises still grants
  // nothing (default deny, invariant 4) on all three carriers — a role's own
  // list and both sides of a personal override.
  const roles = [{ id: "r1", permissions: ["nonsense.area.view"], scopes: {} }];
  const eff = effectivePermissions({ collaborator: { roleIds: ["r1"] }, roles });
  t.equal(eff.has("sales.tickets.view"), false, "nonsense in the role grants nothing real");
  t.equal(eff.size, 0, "nonsense in the role, on its own, grants literally nothing");

  const eff2 = effectivePermissions({
    collaborator: { roleIds: [], overrides: { allow: ["nonsense.area.view"], deny: [] } },
    roles: [],
  });
  t.equal(eff2.size, 0, "nonsense in a personal allow, with no role at all, grants literally nothing");
}

export async function testAPersonalOverrideSurvivesTheRename(t) {
  // Personal overrides are the per-person diff applied ON TOP of a role — the
  // exact same stored-string problem as role.permissions, just on
  // collaborator.overrides instead. Unmapped, every personal exception in the
  // product would have been silently discarded the moment the rename landed.
  // Both sides are exercised against pre-rename stored strings, now resolved
  // through the CURRENT (post-Task-4) catalogue, which is the situation every
  // studio's real stored data is actually in until Task 7's migration tidies
  // it up.
  const roles = [{ id: "r1", permissions: ["sales.tickets.view"], scopes: {} }];

  // Allow: the role doesn't hold clients, but a personal exception adds it —
  // written pre-rename, resolved to its mapped, post-rename form.
  const withAllow = effectivePermissions({
    collaborator: { roleIds: ["r1"], overrides: { allow: ["sales.clients.view"], deny: [] } },
    roles,
  });
  t.equal(withAllow.has("crmSales.clients.view"), true, "a personal allow written pre-rename still grants, under its mapped key");

  // THE POSITIVE CONTROL FOR THE DENY BELOW: role r1 alone, no override at
  // all, genuinely holds the mapped key — without this, "withDeny.has(...) ===
  // false" would pass just as well if the alias were entirely broken (a role
  // that never resolves has nothing to remove either), proving nothing about
  // deny actually removing something. This is what makes it a removal, not a
  // no-op the assertion cannot tell apart from one.
  const withoutDeny = effectivePermissions({ collaborator: { roleIds: ["r1"] }, roles });
  t.equal(withoutDeny.has("crmSales.tickets.view"), true, "the role alone genuinely holds the key the deny below removes");

  // Deny: the role holds tickets.view, but a personal exception removes it.
  // Both sides run through the SAME resolveGrant as the role list, which is
  // what lets a deny written pre-rename find and remove the grant that now
  // resolves to its mapped, post-rename form.
  const withDeny = effectivePermissions({
    collaborator: { roleIds: ["r1"], overrides: { allow: [], deny: ["sales.tickets.view"] } },
    roles,
  });
  t.equal(withDeny.has("crmSales.tickets.view"), false, "a personal deny written pre-rename still removes, under its mapped key");

  // The two facts that together explain why: the map names exactly the
  // post-rename target both assertions above observed.
  t.equal(mapPermissionKey("sales.clients.view"), "crmSales.clients.view", "the allow key's post-rename target is what the map names");
  t.equal(mapPermissionKey("sales.tickets.view"), "crmSales.tickets.view", "the deny key's post-rename target is what the map names");
}

export async function testScopeForResolvesAnUnmigratedAreaKey(t) {
  // RoleSchema.scopes is keyed by AREA KEY (resolve.ts's scopeFor reads
  // r.scopes?.[areaKey]), not by permission. After the rename, every stored
  // scopes object still carries the OLD key as its property name. Without
  // mapping, a lookup by the NEW key misses and silently falls back to "own" —
  // someone granted "all" would quietly see only their own row.

  // A changed area: stored under the pre-rename key, asked about by the
  // post-rename key.
  const changedRoles = [{ id: "r1", permissions: [], scopes: { "sales.tickets": "all" } }];
  t.equal(
    scopeFor({ collaborator: { roleIds: ["r1"] }, roles: changedRoles }, "crmSales.tickets"),
    "all",
    "a scope stored under the old area key still resolves when asked about the new one",
  );

  // An unchanged area, exactly as the brief's own example: "hr.employees" maps
  // to itself, so this also proves the fix does not disturb the ordinary case.
  const unchangedRoles = [{ id: "r1", permissions: [], scopes: { "hr.employees": "all" } }];
  t.equal(
    scopeFor({ collaborator: { roleIds: ["r1"] }, roles: unchangedRoles }, "hr.employees"),
    "all",
    "an unchanged area's scope still resolves",
  );
}

// ---- escalation (fix round 1) ------------------------------------------------
// FIX ROUND 1: escalates() read role.permissions straight through isPermission,
// unmapped, while actorAccess (built by effectivePermissions, above) was
// already going through resolveGrant. Once Task 4 renames the areas — and
// before Task 7's data migration rewrites every stored role — a role still
// holding "sales.tickets.view" would have that string DROPPED inside
// escalates() (isPermission rejects the old spelling) before it ever reached
// `granting`, so an actor who does NOT hold the equivalent
// "crmSales.tickets.view" would see nothing to object to, and a privilege
// escalation would go through: invariant 5 ("nobody grants what they do not
// hold") breached at the one door built to enforce it.
//
// UPDATED BY TASK 5, NOW THAT TASK 4 HAS RENAMED THE CATALOGUE. When this
// suite was written (Task 3's fix round), catalogue.ts had not been renamed
// yet, so isPermission("sales.tickets.view") was STILL true, and both the
// fixed and the pre-fix code resolved that string to itself either way —
// there was no stored key for which raw resolution and mapped resolution
// disagreed, so no assertion against the real catalogue could flip between
// "refused" and "allowed" depending on whether resolveGrant was wired in.
// (Verified by hand at the time: reverting escalates() to the pre-fix
// `if (isPermission(k)) granting.add(k)` and re-running these produced the
// identical pass/fail result.) That was the same sequencing artifact already
// disclosed and accepted for the effectivePermissions tests above, arrived at
// again on this door for the identical reason — not a gap, and not something
// Task 4 was free to skip re-verifying.
//
// Now that Task 4 has renamed the areas, the raw pre-rename spelling is no
// longer a permission isPermission recognises, so the two sub-assertions this
// affects below now check the MAPPED key instead of the raw one — exactly the
// branch that was structurally unreachable before and is what actually proves
// the fix, rather than merely being consistent with it. What these tests
// prove either way: escalates() and effectivePermissions resolve the SAME
// stored key to the SAME held value
// (testEscalationAndEffectivePermissionsAgreeOnTheSameStoredKey), which is
// exactly the "same footing" property the fix depends on — that agreement is
// what makes the refusal actually fire.

export async function testEscalatesRefusesAStoredRoleTheActorDoesNotHold(t) {
  // The actor holds nothing relevant. The role being assigned (looked up by
  // id from the `roles` list — the exact path the gap was in, as opposed to
  // an inline `overrides.allow`) stores an old-vintage key.
  const roles = [{ id: "r_tickets", permissions: ["sales.tickets.view"], scopes: {} }];
  const actorAccess = effectivePermissions({ collaborator: { roleIds: [] }, roles: [] });
  const result = escalates(actorAccess, { roleIds: ["r_tickets"] }, roles);
  t.equal(result?.error, "escalation", "an actor holding nothing may not hand out a stored role's grant");
  // Named by its MAPPED spelling — resolveGrant is what escalates() actually
  // adds to `granting`, and now that Task 4 has renamed the area, the raw
  // pre-rename string is never a member of that set on its own.
  t.equal(result?.keys?.includes("crmSales.tickets.view"), true, "the refused key is named by its post-rename spelling");
}

export async function testEscalatesAllowsAStoredRoleTheActorDoesHold(t) {
  // The mirror case required alongside the refusal above: the fix must not
  // turn into a blanket denial. The actor holds the same stored role
  // themselves, so handing it to somebody else grants nothing beyond what
  // they already have.
  const roles = [{ id: "r_tickets", permissions: ["sales.tickets.view"], scopes: {} }];
  const actorAccess = effectivePermissions({ collaborator: { roleIds: ["r_tickets"] }, roles });
  const result = escalates(actorAccess, { roleIds: ["r_tickets"] }, roles);
  t.equal(result, null, "an actor who genuinely holds the right may still hand it out");
}

export async function testEscalatesRefusesAnUnmappedPersonalOverrideToo(t) {
  // The other carrier escalates() reads: assignment.overrides.allow. Every
  // real call site pre-filters this via cleanAssignment/cleanRole, so it is
  // always already-valid by the time escalates() sees it — but the fix routes
  // it through resolveGrant too rather than trusting that every future caller
  // remembers to pre-filter. An actor holding nothing may not grant a
  // permission via a personal override either.
  const actorAccess = effectivePermissions({ collaborator: { roleIds: [] }, roles: [] });
  const result = escalates(actorAccess, { overrides: { allow: ["sales.tickets.view"], deny: [] } }, []);
  t.equal(result?.error, "escalation", "an unmapped personal override still cannot grant beyond what the actor holds");
}

export async function testEscalationAndEffectivePermissionsAgreeOnTheSameStoredKey(t) {
  // THE "SAME FOOTING" PROPERTY the fix exists to guarantee: escalates()'s
  // `granting` set and effectivePermissions()'s `held` set must resolve an
  // IDENTICAL stored key to the IDENTICAL result, or the two doors are
  // comparing different vocabularies. Build one role, give one actor that
  // role, and confirm handing that same role to somebody else is a no-op
  // escalation-wise — the two functions have to agree that what is held and
  // what is being granted are the same thing.
  const roles = [{ id: "r_tickets", permissions: ["sales.tickets.view"], scopes: {} }];
  const actorAccess = effectivePermissions({ collaborator: { roleIds: ["r_tickets"] }, roles });
  // Held under its MAPPED spelling now that Task 4 has renamed the area —
  // resolveGrant is the one function both doors share, so both resolve the
  // same pre-rename stored string to the same post-rename key.
  t.equal(actorAccess.has("crmSales.tickets.view"), true, "effectivePermissions resolves the stored key to its post-rename spelling");
  t.equal(escalates(actorAccess, { roleIds: ["r_tickets"] }, roles), null, "escalates() resolves it to the same key, so granting what is already held is allowed");

  // The dependency both functions share: this is the value resolveGrant's
  // fallback returns on BOTH sides, keeping them in agreement.
  t.equal(mapPermissionKey("sales.tickets.view"), "crmSales.tickets.view", "both doors fall back to the same post-rename target");
}

// Task 6: every one of the seventeen roots and their children must render an
// Arabic sidebar row, not an English fallback — sectionName()'s whole reason
// to exist. A missing key here is invisible to tsc and to next build; it only
// shows up as English text in an Arabic studio, which is exactly the bug
// sections.ts's opening comment records having shipped once already.
//
// RFQ, SLA, AWB, BOQ and HSE are initialisms an Arabic speaker says as-is —
// see the "Kept as the initialism" comment beside engineering-docs-rfq in
// sections.ts for the reasoning. They are named here EXPLICITLY and stripped
// before the Latin-letter check, rather than the check being loosened to "skip
// if it contains Latin" — that would let a genuine untranslated English name
// through silently, which is the one failure mode this test exists to catch.
const PERMITTED_INITIALISMS = ["RFQ", "SLA", "AWB", "BOQ", "HSE"];
export async function testEverySectionHasAnArabicName(t) {
  for (const key of ALL_SECTION_KEYS) {
    const ar = sectionName(key, "", "ar");
    t.equal(ar.length > 0, true, `${key} has an Arabic name`);
    let withoutInitialisms = ar;
    for (const word of PERMITTED_INITIALISMS) {
      withoutInitialisms = withoutInitialisms.replaceAll(word, "");
    }
    t.equal(/[A-Za-z]/.test(withoutInitialisms), false,
      `${key}'s Arabic name is not English text (got "${ar}")`);
  }
}

// ---- Task 8: the nav and the router -----------------------------------------
// The task-8 brief invented `navFor(...)` as the thing to test against — no
// such function exists anywhere in the codebase (the only `navFor` in the repo
// is an unrelated helper in src/components/public/AccountHome.js). The real
// primitive the nav and the router both build on is `sectionViewable(access,
// sectionKey, allKeys)`, exported from platform/access and already used by
// lib/studios.ts's `visibleSections` (what the sidebar renders) and by
// app/api/studios/[slug]/stream/route.ts. These two tests ask it directly.

export async function testEmptySectionsDoNotRender(t) {
  // tendering, manufacturing, assets and reports are declared in keys.ts's
  // SECTION_DEFS for ORDERING ONLY — no children, no area of their own, no
  // screen until a later phase. A person holding an unrelated narrow right
  // (crmSales.tickets.view — not admin, not wildcard) must not see any of
  // the four: sectionViewable's "a heading with nothing to protect stays"
  // fallthrough used to answer `true` for every such heading, Main included,
  // which would have rendered a nav row that opens nothing. See the fix and
  // comment on sectionViewable in platform/access/resolve.ts.
  const access = new Set(["crmSales.tickets.view"]);
  for (const key of ["tendering", "manufacturing", "assets", "reports"]) {
    t.equal(sectionViewable(access, key, ALL_SECTION_KEYS), false,
      `${key} has nothing to open and does not render`);
  }
  // Main is the one heading in the same shape (no areas, no children) that
  // DOES stay — it is the studio home, reachable by membership alone. Proving
  // the four placeholders are absent would be hollow if the fix had also
  // taken Main down with them.
  t.equal(sectionViewable(access, "main", ALL_SECTION_KEYS), true,
    "main has nothing to protect and stays for everyone");
}

// testSectionsRenderInDefOrder is DELETED, on review (fix round 1). It
// asserted two ordinals on SECTION_DEFS itself, never called sectionViewable
// or anything nav-shaped, and passed unchanged against the pre-fix code —
// it was guarding Task 2's declaration order, not anything Task 8 touches.
// It also had an indexOf blind spot: `indexOf(x) < indexOf(y)` still passes
// when `x` is missing entirely (`-1 < anything`), so a deleted "crm-sales"
// would have passed it rather than failed it. SECTION_DEFS's order is
// exercised for real by testEmptySectionsDoNotRender and by
// testEveryKeyWithNothingToShowIsDeclared below (both walk ALL_SECTION_KEYS,
// which is SECTION_DEFS flattened in declaration order) — a dedicated
// order-only test would be redundant with those, so it is not replaced.

export async function testEveryKeyWithNothingToShowIsDeclared(t) {
  // THE OTHER DIRECTION of testEmptySectionsDoNotRender's proof. That test
  // pins the FOUR keys sectionViewable must answer false for; this one pins
  // that the list is COMPLETE — every key in ALL_SECTION_KEYS is accounted
  // for, either because it has a permission behind it (directly or through a
  // descendant) or because it is named in NO_SCREEN_YET (platform/access/
  // resolve.ts). Without this, a ninth key added later with a real screen
  // but no SECTION_AREAS entry would fail exactly the way tendering et al.
  // used to — silently absent for everyone, permission or not — and nothing
  // would say so. Now something does: this test, not a human noticing a
  // missing nav row.
  const hasOwnArea = (key) => Boolean(SECTION_AREAS[key]);
  const hasAreaBearingDescendant = (key) => {
    const children = ALL_SECTION_KEYS.filter((k) => k.startsWith(`${key}-`));
    return children.some((c) => hasOwnArea(c) || hasAreaBearingDescendant(c));
  };
  for (const key of ALL_SECTION_KEYS) {
    const accounted = key === "main" || hasOwnArea(key) || hasAreaBearingDescendant(key)
      || NO_SCREEN_YET.includes(key);
    t.equal(accounted, true,
      `${key} either has a permission behind it (directly or via a descendant) or is declared in NO_SCREEN_YET`);
  }
}

// ---- context-shaped literal-key check ---------------------------------------
// A SHAPE-based check ("does this string look like a section key") cannot
// tell "crm-crm-sales-tickets" from any other hyphenated identifier — it
// begins with no real root key, so nothing about its shape says it was
// SUPPOSED to be one. What actually caught all four Task 8 defects during
// the sandbox walk was the CONTEXT each literal sat in: it was the value
// being compared against `view`/`requested`/`screenKey`/`active?.key`, the
// value inside a `nav?.[...]`/`manage?.[...]` lookup, or the segment right
// after `${slug}/` in a path. This test asks the same five contexts the
// walk found bugs in, mechanically, rather than relying on a human walking
// every screen in two languages again next time.
//
// STRICTLY STRONGER than the two retired-key greps above: those are blind to
// a key that was never RETIRED (SECTION_KEY_MAP has no entry for it) because
// it was simply mistyped, doubled, or never renamed to begin with — exactly
// "crm-crm-sales-tickets"'s shape, and exactly why that survived two rounds
// of Task 5's sweep undetected.
//
// git grep -F, execFileSync argv arrays only — same Windows incident as
// testNoRetiredSectionKeySurvivesInSource above: cmd.exe (execSync's default
// shell) does not treat single quotes as quoting, so a shell-string pattern
// arrives at git mangled, git exits non-zero, and a swallowed non-zero exit
// is an EMPTY result read as a silent, universal pass. execFileSync hands
// git its argv directly — there is no shell to re-quote anything.
function gitGrepFiles(execFileSync, patterns, scopes) {
  const args = ["grep", "-l", "-F"];
  for (const p of patterns) args.push("-e", p);
  args.push("--", ...scopes);
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  } catch (e) {
    if (e.status === 1) return []; // no match anywhere — the good outcome
    throw e;
  }
}

function gitGrepLines(execFileSync, file, patterns) {
  const args = ["grep", "-n", "-F"];
  for (const p of patterns) args.push("-e", p);
  args.push("--", file);
  let out;
  try {
    out = execFileSync("git", args, { encoding: "utf8" });
  } catch (e) {
    if (e.status === 1) return [];
    throw e;
  }
  const prefix = `${file}:`;
  const lines = [];
  for (const raw of out.split("\n")) {
    if (!raw.startsWith(prefix)) continue;
    const rest = raw.slice(prefix.length);
    const sep = rest.indexOf(":");
    lines.push({ lineNo: rest.slice(0, sep), content: rest.slice(sep + 1) });
  }
  return lines;
}

// Keys the router sends somewhere ON PURPOSE that is NOT one of the fifteen
// sections: People, Access and the manual are pre-restructure standalone
// screens that never had a SECTION_DEFS entry (StudioFrame.js: "outside the
// tree entirely"), and Engagements is deliberately kept off the section tree
// so giving Main a child would not gate Main itself (catalogue.ts). None of
// these four are section keys and none of them should ever become one — a
// literal naming one of them is correct, not a survivor.
const NON_SECTION_TARGETS = ["people", "access", "documentation", "engagements"];
const isKnownRouteTarget = (key) => ALL_SECTION_KEYS.includes(key) || NON_SECTION_TARGETS.includes(key);

// COMPOUND_ROOTS IS A SECOND LIST THAT MUST AGREE WITH SECTION_DEFS, and its own
// comment says a hand-kept table is a list to forget to extend — while being one.
// It cannot be derived: shared/ holds pure values with no dependants and may not
// reach into platform/db, which is the rule that keeps a key builder out of a
// landing-page bundle. So the duplication is deliberate and the drift is what
// gets asserted instead.
//
// What breaks without it is quiet: departmentOf falls through to a first-dash
// split, so a new root spelled "field-ops-x" answers "field" — a department this
// product does not have — and every insight for it sorts under nothing. No error,
// no failing screen, just an insight that never surfaces where it belongs.
export async function testCompoundRootsCoversEveryDashedRoot(t) {
  const roots = SECTION_DEFS.map((d) => d.key).filter((k) => k.includes("-"));
  for (const root of roots) {
    t.equal(
      departmentOf(`${root}-child`) === root,
      true,
      `departmentOf resolves a child of the compound root "${root}" to "${root}" — add it to COMPOUND_ROOTS in shared/studio/insights.ts`,
    );
  }
}

export async function testAdministrationFollowsItsChildren(t) {
  // THE PARENT IS VISIBLE AS A CONSEQUENCE, not by a rule of its own — the
  // same fallthrough every other parent uses. Before the fold, all four
  // administration keys were in NO_SCREEN_YET and SECTION_AREAS had no entry
  // for any of them, so sectionViewable answered false however much somebody
  // held; the three screens were reached by routes that bypassed it on
  // purpose, which is why nobody noticed.
  const nobody = new Set(["crmSales.tickets.view"]);
  for (const key of ["administration", "administration-members", "administration-access", "administration-settings"]) {
    t.equal(sectionViewable(nobody, key, ALL_SECTION_KEYS), false,
      `${key} stays hidden from somebody holding none of its rights`);
  }

  // ONE RIGHT OPENS ONE CHILD AND THE PARENT, and nothing else. A member given
  // People must not thereby see Access or Studio settings — the whole point of
  // gating them separately rather than folding the nav and leaving the areas
  // deciding nothing.
  const peopleOnly = new Set(["administration.members.view"]);
  t.equal(sectionViewable(peopleOnly, "administration", ALL_SECTION_KEYS), true,
    "the parent shows for somebody holding one child's right");
  t.equal(sectionViewable(peopleOnly, "administration-members", ALL_SECTION_KEYS), true,
    "...and that child shows");
  t.equal(sectionViewable(peopleOnly, "administration-access", ALL_SECTION_KEYS), false,
    "...and Access does not");
  t.equal(sectionViewable(peopleOnly, "administration-settings", ALL_SECTION_KEYS), false,
    "...nor Studio settings");

  // AND THE OTHER TWO ANSWER THE SAME WAY ON THEIR OWN, so the wiring is
  // proved per key rather than inferred from one of them working.
  const accessOnly = new Set(["administration.access.view"]);
  t.equal(sectionViewable(accessOnly, "administration-access", ALL_SECTION_KEYS), true,
    "the Access right opens Access");
  t.equal(sectionViewable(accessOnly, "administration-members", ALL_SECTION_KEYS), false,
    "...and not People");

  const settingsOnly = new Set(["administration.settings.view"]);
  t.equal(sectionViewable(settingsOnly, "administration-settings", ALL_SECTION_KEYS), true,
    "the Settings right opens Studio settings");
  t.equal(sectionViewable(settingsOnly, "administration-members", ALL_SECTION_KEYS), false,
    "...and not People");

  // MASTER DATA STAYS ABSENT. It has no screen and no area; the locations move
  // that would give it one is a separate change. A nav row that opens nothing
  // is worse than an absent one, which is the rule NO_SCREEN_YET exists for.
  const everything = new Set([
    "administration.members.view", "administration.access.view", "administration.settings.view",
  ]);
  t.equal(sectionViewable(everything, "administration-master", ALL_SECTION_KEYS), false,
    "master data has no screen and stays hidden even from somebody holding every other right");
}

export async function testEveryContextualSectionKeyLiteralExists(t) {
  const { execFileSync } = await import("node:child_process");
  const bad = [];

  // Shape 1 — `href: "<key>"` or `href: "<key>/<rest>"`, a bare quoted
  // string (mainly notification producers across src/modules and src/app/api
  // — this is what caught inventory.ts's `href: "inventory-orders"`, a
  // notification deep-link to a section key that never existed). Only the
  // LEADING segment before the first "/" ever names a section (Task 7's
  // report makes the same point about stored notification hrefs).
  for (const file of gitGrepFiles(execFileSync, ["href: \""], ["src"])) {
    for (const { lineNo, content } of gitGrepLines(execFileSync, file, ["href: \""])) {
      const m = content.match(/href:\s*"([^"]+)"/);
      if (!m) continue;
      const leading = m[1].split("/")[0];
      if (!leading || isKnownRouteTarget(leading)) continue;
      bad.push(`${file}:${lineNo}: href "${m[1]}" — "${leading}" is not a section key`);
    }
  }

  // Shape 2 — `view|requested|screenKey|active?.key === "<key>"`. Scoped to
  // the studio router and its screens: `view` is a generic local-state name
  // everywhere else in the app (LandingPage.js, AccountHome.js,
  // QuestionnaireList.js all compare an unrelated `view` against tab names
  // like "overview"/"pricing"/"list") — outside this scope the same shape
  // means something else entirely, and checking it against ALL_SECTION_KEYS
  // there would be checking the wrong thing, not a stricter check.
  const COMPARISON_SCOPE = ["src/app/studio", "src/components/studio2"];
  const COMPARISON_PATTERNS = ["view === \"", "requested === \"", "screenKey === \"", "active?.key === \""];
  for (const file of gitGrepFiles(execFileSync, COMPARISON_PATTERNS, COMPARISON_SCOPE)) {
    for (const { lineNo, content } of gitGrepLines(execFileSync, file, COMPARISON_PATTERNS)) {
      const re = /(?:view|requested|screenKey|active\?\.key)\s*===\s*"([^"]+)"/g;
      let m;
      while ((m = re.exec(content))) {
        if (isKnownRouteTarget(m[1])) continue;
        bad.push(`${file}:${lineNo}: ${m[0]} — "${m[1]}" is not a section key`);
      }
    }
  }

  // Shape 3 — `nav?.["<key>"]` / `manage?.["<key>"]` (bracket) AND
  // `nav?.<key>` / `manage?.<key>` (dot access — the SAME lookup on the
  // SAME map, just written without the brackets a hyphenated key would
  // actually require). Fix round 1 checked only the bracket form and missed
  // four live sites written the other way: `nav?.sales` (StudioProjects.js),
  // `nav?.technical` (StudioTasks.js) — both retired department names, the
  // identical defect as the bracketed literals fixed elsewhere in this same
  // task, just invisible to a check that only recognised one of the two
  // equivalent syntaxes — and `nav?.people` (StudioHr.js, two sites),
  // genuinely dead: "people" has never been a nav key under either syntax.
  // Both maps are keyed 1:1 by real section keys (sectionNav/manageMap in
  // lib/studios.ts), so scoped to studio2 where they are actually built and
  // read. The dot-access regex requires a following identifier character, so
  // it does not also fire on the bracket form (`nav?.["x"]` has `[` right
  // after the dot, not a word character) — the two loops see disjoint text.
  const BRACKET_PATTERNS = ["nav?.[\"", "manage?.[\""];
  for (const file of gitGrepFiles(execFileSync, BRACKET_PATTERNS, ["src/components/studio2"])) {
    for (const { lineNo, content } of gitGrepLines(execFileSync, file, BRACKET_PATTERNS)) {
      const re = /(?:nav|manage)\?\.\[\s*"([^"]+)"\s*\]/g;
      let m;
      while ((m = re.exec(content))) {
        if (isKnownRouteTarget(m[1])) continue;
        bad.push(`${file}:${lineNo}: ${m[0]} — "${m[1]}" is not a section key`);
      }
    }
  }
  const DOT_PATTERNS = ["nav?.", "manage?."];
  for (const file of gitGrepFiles(execFileSync, DOT_PATTERNS, ["src/components/studio2"])) {
    for (const { lineNo, content } of gitGrepLines(execFileSync, file, DOT_PATTERNS)) {
      const re = /(?:nav|manage)\?\.(\w+)/g;
      let m;
      while ((m = re.exec(content))) {
        if (isKnownRouteTarget(m[1])) continue;
        bad.push(`${file}:${lineNo}: ${m[0]} — "${m[1]}" is not a section key`);
      }
    }
  }

  // Shape 4 — `` `/${slug}/<key>` `` or `` `/${studio.slug}/<key>` ``, a
  // path built as a template literal (this is what caught StudioSalesLive.js's
  // dead "sales" back-link and StudioTechnicalLive.js's dead "technical"
  // one — both retired department names, neither ever a `href: "..."` bare
  // string so shape 1 could not have seen them). `/api/studios/...` calls
  // are the SAME shape and are not section routes at all — excluded by
  // skipping any line that names that path outright, not by scoping files,
  // since the same file (and often the same component) also builds real
  // page hrefs a line or two away.
  const TEMPLATE_PATTERNS = ["${slug}/", "${studio.slug}/"];
  for (const file of gitGrepFiles(execFileSync, TEMPLATE_PATTERNS, ["src"])) {
    for (const { lineNo, content } of gitGrepLines(execFileSync, file, TEMPLATE_PATTERNS)) {
      if (content.includes("/api/studios")) continue;
      const re = /\$\{(?:studio\.)?slug\}\/([a-zA-Z0-9-]+)/g;
      let m;
      while ((m = re.exec(content))) {
        if (isKnownRouteTarget(m[1])) continue;
        bad.push(`${file}:${lineNo}: ${m[0]} — "${m[1]}" is not a section key`);
      }
    }
  }

  t.equal(bad.length, 0, `every contextual section-key literal names a real key or a known non-section route\n${bad.join("\n")}`);
}

// ---- harness ----------------------------------------------------------------
// Same non-throwing, accumulate-and-report shape as tests/suite.mjs's own
// ok(): one bad assertion must not hide the rest, which matters more here than
// most files, because three of the six tests are EXPECTED to fail until Tasks
// 2, 4 and 5 land (see the commit message) and a throw-on-first-mismatch
// harness (the node:assert shape the engagement-*.mjs files use) would only
// ever show the FIRST mismatch inside each of those loops, hiding how many of
// e.g. the fifteen mapped targets are actually missing.
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
// runner silently no-ops. pathToFileURL(...).href normalises both sides (same
// fix as engagement.mjs).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    const tests = [
      testEveryOldSectionKeyIsAccountedFor,
      testEveryMappedTargetActuallyExists,
      testEveryMappedPermissionTargetIsARealArea,
      testMapIsIdempotent,
      testEveryDeclaredMoveIsListed,
      testNoAreaExistsForASectionWithNoScreen,
      testEveryAreaGroupIsARealSectionLabel,
      testNoRetiredPermissionKeySurvivesInSource,
      testNoRetiredSectionKeySurvivesInSource,
      testAnOldStoredGrantStillResolves,
      testANewStoredGrantResolvesUnchanged,
      testAnUnknownGrantStillGrantsNothing,
      testAPersonalOverrideSurvivesTheRename,
      testScopeForResolvesAnUnmigratedAreaKey,
      testEscalatesRefusesAStoredRoleTheActorDoesNotHold,
      testEscalatesAllowsAStoredRoleTheActorDoesHold,
      testEscalatesRefusesAnUnmappedPersonalOverrideToo,
      testEscalationAndEffectivePermissionsAgreeOnTheSameStoredKey,
      testEverySectionHasAnArabicName,
      testEmptySectionsDoNotRender,
      testEveryKeyWithNothingToShowIsDeclared,
      testAdministrationFollowsItsChildren,
      testEveryContextualSectionKeyLiteralExists,
      testCompoundRootsCoversEveryDashedRoot,
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
