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
    let hits;
    try {
      hits = execFileSync(
        "git",
        ["grep", "-l", "--", `"${key}"`, "src", ":!src/platform/db/restructure.ts"],
        { encoding: "utf8" },
      ).trim();
    } catch (e) {
      // Exit code 1 is git grep's "no match" — the good outcome, not an error.
      if (e.status === 1) hits = "";
      else throw e;
    }
    t.equal(hits, "", `no source file still names the retired key "${key}"\n${hits}`);
  }
}

// ---- permission resolution --------------------------------------------------
// TASK 3: the alias has to be read on the way IN to effectivePermissions, or
// the rename in Task 4 empties every role in every studio with nothing logged
// (see resolve.ts's own comment on this). These exercise the real signature —
// effectivePermissions takes ONE Subject argument, `{ collaborator, roles }` —
// not the two-argument shape an earlier draft of this task described.
//
// A NOTE ON WHAT THESE CAN ACTUALLY OBSERVE RIGHT NOW: catalogue.ts has not
// been renamed yet — that is Task 4, not this one — so isPermission still only
// recognises "sales.tickets.view", never "crmSales.tickets.view". An earlier
// draft of this suite asserted the MAPPED key directly (eff.has("crmSales.
// tickets.view") === true), which cannot pass today no matter how resolve.ts
// is written, and which would only have been made to pass by mapping every
// stored key forward UNCONDITIONALLY — exactly the change that empties every
// role the moment THIS file lands, one task earlier than the incident this
// task exists to prevent. resolve.ts checks the raw string first and falls
// back to the mapped one only when the raw string is no longer recognised
// (see its comment), so what these assert instead is: (a) today, nothing
// regresses — old-vintage grants still resolve to themselves, exactly as
// before this task touched the file, and (b) the fallback this task adds is
// wired to the exact function Task 4's rename will make necessary — proven by
// asserting mapPermissionKey's own contract, which is the one thing resolve.ts
// consumes and the one thing that changes what gets held once Task 4 lands.

export async function testAnOldStoredGrantStillResolves(t) {
  // A role holds "sales.tickets.view" under TODAY's catalogue, before the
  // rename. It must still resolve to itself — this is the regression this
  // task must not cause. (It becomes the guard against the OTHER incident:
  // if resolve.ts mapped every key forward unconditionally instead of
  // trying the raw string first, this would fail today, because
  // "crmSales.tickets.view" is not yet an area isPermission recognises.)
  const roles = [{ id: "r1", permissions: ["sales.tickets.view", "sales.tickets.create"], scopes: {} }];
  const eff = effectivePermissions({ collaborator: { roleIds: ["r1"] }, roles });
  t.equal(eff.has("sales.tickets.view"), true, "an old-vintage grant still resolves under today's catalogue");
  t.equal(eff.has("sales.tickets.create"), true, "every verb still carries across");

  // The dependency this task consumes: once Task 4 renames the area, this is
  // the value resolve.ts's fallback will start returning for the same stored
  // string, with no further change to resolve.ts needed.
  t.equal(mapPermissionKey("sales.tickets.view"), "crmSales.tickets.view", "the map this task falls back to already names the post-rename key");
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
  // product is silently discarded the moment the rename lands. Both sides are
  // exercised against TODAY's catalogue, for the same reason given above.
  const roles = [{ id: "r1", permissions: ["sales.tickets.view"], scopes: {} }];

  // Allow: the role doesn't hold clients, but a personal exception adds it.
  const withAllow = effectivePermissions({
    collaborator: { roleIds: ["r1"], overrides: { allow: ["sales.clients.view"], deny: [] } },
    roles,
  });
  t.equal(withAllow.has("sales.clients.view"), true, "a personal allow still grants under today's catalogue");

  // Deny: the role holds tickets.view, but a personal exception removes it.
  // Both sides run through the SAME resolveGrant as the role list, which is
  // what will let a deny written pre-rename still find and remove a grant
  // that by then resolves to its mapped, post-rename form.
  const withDeny = effectivePermissions({
    collaborator: { roleIds: ["r1"], overrides: { allow: [], deny: ["sales.tickets.view"] } },
    roles,
  });
  t.equal(withDeny.has("sales.tickets.view"), false, "a personal deny still removes under today's catalogue");

  // The two facts that together guarantee this keeps working once Task 4
  // renames the areas: the map already names the post-rename target for both
  // the allow and the deny key used above.
  t.equal(mapPermissionKey("sales.clients.view"), "crmSales.clients.view", "the allow key's post-rename target is already in the map");
  t.equal(mapPermissionKey("sales.tickets.view"), "crmSales.tickets.view", "the deny key's post-rename target is already in the map");
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
// A NOTE ON WHAT THESE CAN OBSERVE TODAY, for the same reason given above
// testAnOldStoredGrantStillResolves: catalogue.ts has not been renamed yet, so
// isPermission("sales.tickets.view") is STILL true today, and both the fixed
// and the pre-fix code resolve that string to itself either way — there is no
// stored key for which raw resolution and mapped resolution currently disagree,
// so no assertion against the REAL catalogue can flip between "refused" and
// "allowed" depending on whether resolveGrant is wired in. (Verified by hand:
// reverting escalates() to the pre-fix `if (isPermission(k)) granting.add(k)`
// and re-running these produces the identical pass/fail result.) This is the
// same sequencing artifact already disclosed and accepted for the five
// effectivePermissions tests, arrived at again on the other door for the
// identical reason — not a new gap, and not something Task 4 gets to skip
// re-verifying. What these tests DO prove today: escalates() and
// effectivePermissions resolve the SAME stored key to the SAME held value
// (testEscalationAndEffectivePermissionsAgreeOnTheSameStoredKey), which is
// exactly the "same footing" property the fix depends on — and once Task 4
// renames the areas, that agreement is what makes the refusal actually fire.

export async function testEscalatesRefusesAStoredRoleTheActorDoesNotHold(t) {
  // The actor holds nothing relevant. The role being assigned (looked up by
  // id from the `roles` list — the exact path the gap was in, as opposed to
  // an inline `overrides.allow`) stores an old-vintage key.
  const roles = [{ id: "r_tickets", permissions: ["sales.tickets.view"], scopes: {} }];
  const actorAccess = effectivePermissions({ collaborator: { roleIds: [] }, roles: [] });
  const result = escalates(actorAccess, { roleIds: ["r_tickets"] }, roles);
  t.equal(result?.error, "escalation", "an actor holding nothing may not hand out a stored role's grant");
  t.equal(result?.keys?.includes("sales.tickets.view"), true, "the refused key is named");
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
  t.equal(actorAccess.has("sales.tickets.view"), true, "effectivePermissions resolves the stored key");
  t.equal(escalates(actorAccess, { roleIds: ["r_tickets"] }, roles), null, "escalates() resolves it to the same key, so granting what is already held is allowed");

  // The dependency both functions share: once Task 4 renames the area, this
  // is the value resolveGrant's fallback starts returning on BOTH sides at
  // once, keeping them in agreement without either function changing again.
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
