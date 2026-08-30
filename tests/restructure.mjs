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
