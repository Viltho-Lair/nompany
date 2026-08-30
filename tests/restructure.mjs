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
const { AREAS } = await import("../src/platform/access/index.ts");
const { effectivePermissions, scopeFor, escalates } = await import("../src/platform/access/resolve.ts");

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

export async function testTheFiveMovesAreDeclared(t) {
  const moved = COLLECTION_MOVES.map((m) => m.collection).sort();
  t.equal(
    moved.join(","),
    ["awbAirlines", "awbShipments", "generatedDocuments", "locations", "permits",
     "qualityAcknowledgements", "qualityAudit", "qualityDocuments",
     "qualityRevisions", "qualityTypes", "quotations"].sort().join(","),
    "every collection that changes owner is declared",
  );
}

export async function testNoAreaExistsForASectionWithNoScreen(t) {
  // A right nothing can exercise is a bug (invariant 16). These four sections
  // are declared for ordering and have no screens until P4a/P5/P6/P7.
  const empty = ["tendering", "manufacturing", "assets", "reports"];
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
  "src/components/studio2/StudioSales.js": [
    { value: "sales", reason: "StatusPill.jsx's STATUS_TONES record-kind key for ticket-stage colours" },
  ],
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
      testTheFiveMovesAreDeclared,
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
