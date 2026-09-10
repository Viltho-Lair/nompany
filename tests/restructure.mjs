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
const { SECTION_DEFS, ALL_SECTION_KEYS, SECTION_COLLECTIONS,
  SYSTEM_SECTION_KEYS, PRODUCT_SECTION_KEYS, isSystemSection } = await import("../src/platform/db/keys.ts");
const { REQUIRED_SECTIONS } = await import("../src/platform/db/sections.ts");
const { ARCHETYPES, permissionsFor } = await import("../src/modules/people/archetypes.ts");
const { engineSectionKey } = await import("../src/platform/access/catalogue.ts");
const { INDUSTRIES, industryByField } = await import("../src/platform/engagement/industries.ts");
const { FIELD_ACTION_MATRIX, SERVICE_ACTIONS, actionsForField } = await import("../src/shared/fieldsOfWork.ts");
const { ACTION_SECTION, UNIVERSAL_SECTION_KEYS, NEVER_GATED_KEYS, rootSectionsForTrade, sectionEnabledForTrade }
  = await import("../src/shared/tradeSections.ts");
const { FLOW_TEMPLATES } = await import("../src/platform/engagement/templates.ts");
const { STAGE_REGISTRY } = await import("../src/platform/engagement/registry.ts");
// Dynamic for the same reason as every import in this file — see above.
const { departmentOf } = await import("../src/shared/studio/insights.ts");
const { AREAS } = await import("../src/platform/access/index.ts");
const { effectivePermissions, scopeFor, escalates, sectionViewable, SECTION_AREAS, NO_SCREEN_YET } = await import("../src/platform/access/resolve.ts");
const { sectionName } = await import("../src/shared/studio/sections.ts");
const { BUILTIN_TYPES } = await import("../src/platform/engine/builtins.ts");

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
  //
  // WHICH ONES ARE CHILDREN IS READ FROM SECTION_DEFS, never guessed from
  // punctuation. This filtered `!key.includes("-")` and therefore skipped
  // `quality-hse` — a real top-level section with no screen, which is exactly
  // what this assertion exists to check. It was testing three of four and
  // saying nothing. `crm-sales`, `engineering-docs` and `field-service` are
  // hyphenated top-level sections too, so any of them entering the list would
  // have gone unchecked the same way.
  //
  // The identical heuristic bit `assignableSectionKeys` in
  // modules/administration/departments.ts, where it silently dropped those
  // three from the org chart's picker. A dash means nothing about depth.
  const children = new Set(
    SECTION_DEFS.flatMap((d) => (d.children || []).map((c) => c.key)),
  );
  const empty = NO_SCREEN_YET.filter((key) => !children.has(key));
  // AN EMPTY LIST IS THE CORRECT STATE NOW, not a broken test. This asserted
  // `empty.length > 0` — a guard against the list being silently emptied by a
  // filter bug — and it went red on 08/09/2026 when Reports & BI, the last
  // entry, got its exports screen. The guard it was really making is that the
  // FILTER still works, so it is made against the unfiltered list instead: if
  // NO_SCREEN_YET gains an entry, at least one of them must survive `children`.
  t.equal(NO_SCREEN_YET.length === 0 || empty.length > 0, true,
    "the screenless list is either empty or has something to check");
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
  // THE MARKETING SITE'S ENQUIRY MAILBOX, which is a WHO-to-email and not a
  // section: mailboxFor() answers "sales" or "support", the contact route picks
  // CONTACT.sales or CONTACT.support from it, and the view prints the address it
  // resolved. Three files, one token, and no section anywhere near it — the
  // landing pages have no section tree at all.
  "src/app/api/contact/route.ts": [
    { value: "sales", reason: "enquiry.ts's mailbox code — which address a contact form goes to" },
  ],
  "src/components/landing/views/ContactView.js": [
    { value: "sales", reason: "the same mailbox code, printed as the address it resolves to" },
  ],
  "src/shared/marketing/enquiry.ts": [
    { value: "sales", reason: "where the mailbox code is defined and returned" },
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
  // THE MAILBOX, NOT THE SECTION. The contact form routes an enquiry to one of
  // two addresses by team size — sales@ for the larger ones, support@ for the
  // rest — and `mailboxFor` returns the literal "sales" as that choice. It is
  // never resolved against SECTION_KEY_MAP, SECTION_DEFS or getSectionByKey;
  // checked in all three files before being listed here, the same way the eight
  // above were. The collision is only that a mailbox and a retired section were
  // given the same English word.
  "src/shared/marketing/enquiry.ts": [
    { value: "sales", reason: "the mailbox mailboxFor() picks, sales@ vs support@" },
    { value: "support", reason: "the other half of the same return type" },
  ],
  "src/app/api/contact/route.ts": [
    { value: "sales", reason: "same mailbox choice, read back to select the address" },
  ],
  "src/components/landing/views/ContactView.js": [
    { value: "sales", reason: "same mailbox choice, shown to the sender as a mailto fallback" },
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

export async function testNoNativeSelectSurvivesInSource(t) {
  // AN ARCHITECTURAL ASSERTION FOR A BUG THAT SHIPPED. A native <select> hands
  // its option list to the operating system, and the OPEN list cannot be
  // themed. That is not cosmetic: every control in this product sets the
  // theme's text colour (--geex-ink in the studio, --ad-foreground in the
  // console), <option> INHERITS it, and in dark mode that is near-white ink
  // painted onto the white popup the browser still believes it should draw.
  // The list rendered as a blank rectangle — a dark studio could not read its
  // own Department dropdown, and nothing failed anywhere.
  //
  // Every one of them is `SelectMenu` now (src/components/fields/SelectMenu.jsx,
  // docs/functionality/dropdowns.md). Nothing about a new <select> would fail
  // either, in any test or either compiler, so grep is the only thing that
  // finds one — the same reason the two key assertions around this one exist.
  //
  // ONE EXEMPTION, deliberate and narrow: `cell-format-dialog.tsx` uses Radix's
  // Select, which paints its own themed popup and never reaches the platform
  // control. It is matched by `<Select`, not `<select`, so nothing here excuses
  // it — the pattern below is lower-case and git grep is case-sensitive.
  //
  // execFileSync, not execSync + a shell string, for the Windows reason
  // documented at length on the two assertions either side of this one.
  //
  // git grep searches TRACKED files only, so a brand-new screen holding a
  // <select> is invisible to this until it is `git add`ed. CLAUDE.md says the
  // same thing about believing a green suite; it applies here first.
  const { execFileSync } = await import("node:child_process");
  let files;
  try {
    files = execFileSync(
      "git",
      ["grep", "-l", "--", "<select", "src"],
      { encoding: "utf8" },
    ).trim().split("\n").filter(Boolean);
  } catch (e) {
    // Exit code 1 is git grep's "no match" — the good outcome, not an error.
    if (e.status === 1) files = [];
    else throw e;
  }
  // A PROSE MENTION IS NOT A CONTROL. Five files explain in comments why the
  // native one was abandoned — this file included — and deleting that reasoning
  // to satisfy a grep would throw away the only record of why the product draws
  // its own. So the comments come OUT before the search, rather than the search
  // trying to recognise one line at a time: these are multi-line block comments
  // whose continuation lines carry no marker of their own, and a per-line test
  // reads those as code.
  //
  // The `[^:]` guard on the line-comment strip is for `https://…` in a string,
  // which is not the start of a comment. `<select` must then be followed by
  // something that can END a tag name, so the word "selection" is not a match.
  const { readFileSync } = await import("node:fs");
  const bad = [];
  for (const file of files) {
    const stripped = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    stripped.split("\n").forEach((text, i) => {
      // OR THE END OF THE LINE, and that alternative is not cosmetic: without it
      // a `<select` whose attributes start on the NEXT line is invisible, which
      // is the ordinary way a multi-attribute tag is written. The console's
      // provider picker sat native and unreported behind exactly that hole from
      // the day this assertion was written until 09/09/2026, when moving the
      // credential form into its own component surfaced it.
      if (/<select([\s>/]|$)/.test(text)) bad.push(`${file}:${i + 1}: ${text.trim()}`);
    });
  }
  t.equal(bad.join("\n"), "", `no source file renders a native <select> — use SelectMenu\n${bad.join("\n")}`);
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
  // THE PUBLIC MARKETING SURFACE IS EXCLUDED TOO, and the reason is structural
  // rather than convenient. A retired key matters because `getSectionByKey`
  // returns null for it and every call site reads that as "no section" — an
  // empty screen with no error. Looking a section up needs a STUDIO, and the
  // marketing site has none: no tenant, no section rows, no lookup to go wrong.
  // A literal there cannot cause the defect this guard exists to catch.
  //
  // It became necessary because one retired key, `sales`, is an ordinary English
  // word. The contact form routes an enquiry to the sales@ or support@ mailbox
  // and `mailboxFor` returns exactly that pair — correct English that happens to
  // spell a key the restructure retired. The COMPOUND keys (`sales-tickets`,
  // `sales-clients`) are unambiguous and stay checked everywhere, here included.
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
        ["grep", "-l", "--", `"${key}"`, "src",
          ":!src/platform/db/restructure.ts",
          ":!src/shared/marketing", ":!src/components/landing", ":!src/app/api/contact"],
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
  // A person holding an unrelated narrow right (crmSales.tickets.view — not
  // admin, not wildcard) must not see a heading with nothing behind it:
  // sectionViewable's "a heading with nothing to protect stays" fallthrough
  // used to answer `true` for every such heading, Main included, which would
  // have rendered a nav row that opens nothing. See the fix and comment on
  // sectionViewable in platform/access/resolve.ts.
  //
  // THE LIST WAS FOUR KEYS AND IS NOW READ FROM NO_SCREEN_YET, which is one.
  // It said "tendering, manufacturing, assets and reports" and every one of
  // those but the last has since shipped screens — tendering its register,
  // and the other two their engine registers. A hand-typed copy of that list
  // is what left testNoAreaExistsForASectionWithNoScreen red for a whole
  // slice, asserting that a section which had just shipped must hold no
  // rights, and this is the same list one file over.
  const access = new Set(["crmSales.tickets.view"]);
  for (const key of NO_SCREEN_YET) {
    t.equal(sectionViewable(access, key, ALL_SECTION_KEYS), false,
      `${key} has nothing to open and does not render`);
  }

  // THE MIRROR, and it is what makes the three removals real rather than a
  // list getting shorter. An engine register is planted as `engine-<typeKey>`
  // under a parent it shares no key prefix with, so a heading over five of
  // them is invisible to a prefix-only walk — which is exactly the answer
  // above, taken with no parent map. Given the map the rows actually carry,
  // the same heading renders for somebody holding the child's right and only
  // that right.
  const parents = [...new Set(BUILTIN_TYPES.map((d) => d.parentSectionKey))];
  t.equal(parents.length > 0, true, "some section is an engine register's parent");
  for (const parent of parents) {
    const type = BUILTIN_TYPES.find((d) => d.parentSectionKey === parent);
    const childKey = `engine-${type.key}`;
    const narrow = new Set([`engine.${type.key}.view`]);
    const keys = [...ALL_SECTION_KEYS, childKey];
    const parentOf = { [childKey]: parent };
    t.equal(sectionViewable(narrow, parent, keys, parentOf), true,
      `${parent} renders for somebody holding engine.${type.key}.view`);
    // Without the map the same person sees the register and not the heading
    // over it, which is the bug the map exists to fix rather than a rule.
    t.equal(sectionViewable(narrow, childKey, keys), true,
      `engine-${type.key} renders on its own right either way`);
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
  // A THIRD WAY TO BE ACCOUNTED FOR, and it is why three keys left
  // NO_SCREEN_YET. A built-in record type plants `engine-<typeKey>` under the
  // section it names, and its rights are `engine.<typeKey>.*` — structural,
  // minted from a row, and therefore absent from SECTION_AREAS by construction
  // (see WildcardPermissions in platform/access). So Quality & HSE has five
  // real screens under it, every one of them grantable, and both checks above
  // answer false: no area of its own, and `engine-ncr` shares no key prefix
  // with `quality-hse` to be found as a descendant.
  //
  // READ FROM BUILTIN_TYPES rather than listed here, for the reason
  // testNoAreaExistsForASectionWithNoScreen learned the hard way: a hand-kept
  // copy is a second answer free to disagree with the one the product resolves
  // against, and it disagrees silently.
  const engineParents = new Set(BUILTIN_TYPES.map((d) => d.parentSectionKey));
  for (const key of ALL_SECTION_KEYS) {
    const accounted = key === "main" || hasOwnArea(key) || hasAreaBearingDescendant(key)
      || engineParents.has(key) || NO_SCREEN_YET.includes(key);
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
// SETTINGS JOINS THEM, 09/09/2026, and it is the newest for the clearest
// reason: `/‹slug›/settings` is the surface Administration became when it
// stopped being a section. It is deliberately NOT a section key — that is the
// whole change — so a literal naming it is correct, and it belongs here beside
// the other four rather than being made a key to satisfy this assertion.
const NON_SECTION_TARGETS = ["people", "access", "documentation", "engagements", "settings"];
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

// A TEST FILE NOTHING RUNS IS NOT A TEST, and this repo has paid for that twice.
// tests/restructure.mjs — this file — was orphaned for weeks while CLAUDE.md
// credited it with enforcing six architectural assertions; one of them sat RED
// the whole time. Then tests/roles-model.mjs shipped with nine passing
// assertions that nothing invoked and nothing imported.
//
// Both failures look identical from outside: a green suite, a file full of
// assertions, and no connection between them. Nobody notices, because the
// evidence of the bug is an ABSENCE — a test name that never appears in the
// output — and nobody reads a passing log for names that are missing.
//
// The rule is the naming convention, so it needs no list to maintain:
// "*-model.mjs" is what this repo calls a pure model test, and every one of
// them must appear in the `test` script. A helper imported by another test is
// not named that way, so nothing legitimate is caught by accident.
/**
 * A ROUTE MUST NOT HAND ITS WHOLE BODY TO A FUNCTION THAT WANTS ONE VALUE.
 *
 * THIS HAS COST TWICE, in opposite ways, and neither was reachable by the
 * compiler — a route handler's `body` is not statically typed:
 *
 *  - `answerChangeOrder(ctx, id, body)` where the third parameter is a BOOLEAN.
 *    An object is truthy, so `{ action: "reject" }` APPROVED the variation it
 *    was rejecting and added its value to the contract. Silent, and wrong.
 *  - `setJobStatus(ctx, id, body)` where the third parameter is a STRING.
 *    `isStatus(next)` answered false for every call, so no job in the product
 *    could leave `scheduled` — `completedAt` was never stamped and Template D's
 *    signoff billing trigger could never fire. Loud, and dead.
 *
 * So: for every call in a route file whose LAST argument is a bare `<x>.body`,
 * find the callee's declaration under `src/modules` or `src/platform` and
 * refuse it when that parameter is declared a string, boolean or number.
 * Passing a body to a parameter that IS a body is the normal case and is left
 * alone.
 */
export async function testNoRouteHandsItsBodyToAScalarParameter(t) {
  const { readFileSync } = await import("node:fs");
  const { execSync } = await import("node:child_process");

  const list = (pattern) =>
    execSync(`git ls-files ${pattern}`, { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);

  const routes = list('"src/app/api/**/route.ts"');
  // Every module and platform source, so a callee is found wherever it lives.
  const sources = list('"src/modules/**/*.ts" "src/platform/**/*.ts"')
    .map((f) => readFileSync(f, "utf8")).join("\n");

  const SCALAR = /^(string|boolean|number)\b/;
  const CALL = /\b([A-Za-z_$][\w$]*)\s*\(([^()]*?),\s*(\w+)\.body\s*\)/g;

  for (const file of routes) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(CALL)) {
      const callee = m[1];
      const decl = sources.match(
        new RegExp(`export (?:async )?function ${callee}\\(([^)]*)\\)`, "s"));
      if (!decl) continue;
      const params = decl[1].split(",").map((p) => p.trim()).filter(Boolean);
      const last = params[params.length - 1] || "";
      const type = (last.split(":")[1] || "").trim();
      // An untyped or unfound parameter says nothing either way, and asserting
      // on it would print a passing line per call in every route file.
      if (!type) continue;
      t.equal(
        SCALAR.test(type), false,
        `${file}: ${callee}() is handed a whole request body where its last parameter is \`${type}\` — `
        + "narrow it at the route (see the PATCH in operations/jobs for the two incidents this guards)");
    }
  }
}

export async function testEveryModelTestIsActuallyRun(t) {
  const { readdirSync, readFileSync } = await import("node:fs");
  const script = JSON.parse(readFileSync("package.json", "utf8")).scripts.test;
  for (const file of readdirSync("tests").filter((f) => f.endsWith("-model.mjs"))) {
    t.equal(
      script.includes(`tests/${file}`),
      true,
      `tests/${file} is run by \`npm test\` — add it to the "test" script in package.json, or it asserts nothing`,
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

/**
 * EVERY THIRD SEGMENT A PROJECT HANDLES MUST BE EXEMPT FROM THE BOARD'S
 * FULL-SCREEN EARLY RETURN.
 *
 * THE BUG THIS GUARDS ALREADY HAPPENED. `/<slug>/projects-list/<id>` returns the
 * board BEFORE the framed screens are chosen, and the return is gated on the
 * third segment not being one of a hand-typed list. The cost breakdown shipped
 * with a branch further down that could never be reached: every request for
 * `/costs` rendered the board instead, which reads as a route that does not
 * exist rather than as a missing exemption. Nothing failed — not the build, not
 * a type, not a golden — because both halves were individually valid. Only
 * opening the screen showed it.
 *
 * READ FROM THE FILE, both halves, so a fourth segment cannot be added to one
 * list and forgotten in the other. That is the whole point: a hand-kept copy of
 * a list is the thing that goes stale, which is the same lesson
 * NO_SCREEN_YET taught this file two slices ago.
 */
export async function testProjectSegmentsAreExemptFromTheBoard(t) {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/app/studio/[[...segments]]/page.js", import.meta.url), "utf8");

  // THE PROJECT'S OWN third-segment branches, and only those. A ticket has one
  // too (`/crm-sales-tickets/<id>/quotations/<id>`) and it has nothing to do
  // with the board — matching every `segments[2] ===` in the file would demand
  // an exemption for a segment that never reaches this route.
  //
  // Two shapes, both anchored on the project: the `projectId && ...` form the
  // derived flags use, and the `requested === "projects-list" && ...` form the
  // full-screen plan return uses.
  const handled = new Set([
    ...[...src.matchAll(/projectId\s*&&\s*segments\[2\]\s*===\s*"([a-z-]+)"/g)].map((m) => m[1]),
    ...[...src.matchAll(/requested === "projects-list"[^;]*?segments\[2\]\s*===\s*"([a-z-]+)"/gs)].map((m) => m[1]),
  ]);
  // And the exemptions the board's early return lists: `segments[2] !== "<name>"`.
  const exempt = new Set(
    [...src.matchAll(/segments\[2\]\s*!==\s*"([a-z-]+)"/g)].map((m) => m[1]),
  );

  t.equal(handled.size > 0, true, "the page handles at least one third segment");
  t.equal(exempt.size > 0, true, "the board's early return exempts at least one");

  for (const segment of handled) {
    t.equal(exempt.has(segment), true,
      `/<slug>/projects-list/<id>/${segment} is handled, so the board's early return must exempt it — otherwise it silently renders the board`);
  }
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

// A LIVE WATCH THAT NOTHING WILL EVER FIRE, and both ways of getting one.
//
// `useLiveUpdates(slug, watch, onChange)` takes three arguments. NINETEEN boards
// called it with two — `useLiveUpdates(slug, reload)` — so the handler landed in
// `watch` and `onChange` was undefined. Every one of them was dead: subscribe()
// was handed a FUNCTION as a section key, which no event's key can equal. And
// nothing could report it. These are browser `.js` files, which `checkJs: false`
// exempts from tsc; a missing argument is legal JavaScript; and a board that
// never refreshes is indistinguishable from a board with nothing to refresh. It
// took building a twentieth screen to notice the first nineteen.
//
// THE SECOND WAY IS SUBTLER AND HAS THE SAME SYMPTOM: a key that is real and
// still unhearable. An event carries the key of the section the row was WRITTEN
// under, so a watch is only alive if some collection lives at that key or
// beneath it. `crm-sales-pipeline` is a real section, the board that draws it is
// real, and nothing is ever written there — the deals on it are salesTickets,
// under `crm-sales-tickets`. Same for `crm-sales-contracts`,
// `procurement-expediting` and `procurement-receiving`: destinations over
// somebody else's rows. SECTION_COLLECTIONS is the authority on which is which,
// so it is what this asks, rather than ALL_SECTION_KEYS — which would call every
// one of those correct.
//
// NO `git grep` HERE, unlike its neighbours. Those check for the SURVIVAL of a
// retired token, where a file the developer has not staged yet is a file whose
// old spelling is not in the tree either. This checks the SHAPE of new code, and
// a brand-new screen holding the broken shape is exactly the case that matters —
// which is the one `git grep` cannot see (CLAUDE.md: "git add a new file BEFORE
// you believe a green suite").
const LIVE_HOOKS = ["useLiveUpdates", "useLiveRows"];
// The hooks themselves: the only place the watch key is legitimately a variable,
// because a forwarder is handed one. Its own callers are checked like any other.
const LIVE_HOOK_FILES = ["useLiveUpdates.js", "useLiveRows.js"];

// Split a call's arguments at top-level commas. Quotes and every kind of bracket
// are tracked, so an object literal, a nested call or an inline arrow — all three
// appear at these call sites — count as ONE argument rather than as their own
// commas. Returns null for an unbalanced call, which cannot happen in a file
// that parses but is not worth asserting as an absence.
function callArguments(src, open) {
  const args = [];
  let depth = 0;
  let start = open + 1;
  let quote = "";
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (c === "(" || c === "[" || c === "{") { depth++; continue; }
    if (c === ")" || c === "]" || c === "}") {
      depth -= 1;
      if (depth === 0) { args.push(src.slice(start, i).trim()); return args; }
      continue;
    }
    if (c === "," && depth === 1) { args.push(src.slice(start, i).trim()); start = i + 1; }
  }
  return null;
}

// Is any collection written at this key, or under it? Under it counts because
// LiveProvider fans an event out to the watchers of every ancestor of its
// section — a board watching `finance` hears `finance-cash` — which is what the
// department roots rely on.
const somethingIsWrittenAt = (watch) => Object.keys(SECTION_COLLECTIONS)
  .some((k) => k === watch || k.startsWith(`${watch}-`));

export async function testEveryLiveWatchCanActuallyFire(t) {
  const { readdirSync, readFileSync, statSync } = await import("node:fs");

  const files = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const path = `${dir}/${entry}`;
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (/\.(js|jsx|ts|tsx)$/.test(entry)) files.push(path);
    }
  })("src/components");

  const bad = [];
  let checked = 0;

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const isHookItself = LIVE_HOOK_FILES.some((f) => file.endsWith(`/${f}`));
    for (const hook of LIVE_HOOKS) {
      const re = new RegExp(`(?<![A-Za-z0-9_$])${hook}\\s*\\(`, "g");
      let m;
      while ((m = re.exec(src))) {
        const open = src.indexOf("(", m.index);
        // The declaration, not a call.
        if (/function\s*$/.test(src.slice(Math.max(0, m.index - 20), m.index))) continue;
        // A mention inside a comment or a message string, of which the hook file
        // has several — the call it is describing is not this one.
        const lineStart = src.lastIndexOf("\n", m.index) + 1;
        const before = src.slice(lineStart, m.index);
        if (before.includes("//") || before.includes("*") || /["'`]/.test(before)) continue;

        const args = callArguments(src, open);
        const where = `${file}:${src.slice(0, m.index).split("\n").length}`;
        if (!args) { bad.push(`${where}: ${hook}(...) does not parse`); continue; }
        checked += 1;

        if (args.length < 3) {
          bad.push(`${where}: ${hook}(${args.join(", ")}) passes ${args.length} arguments, not 3`
            + " — the handler is landing in `watch` and will never be called");
          continue;
        }

        const watch = args[1];
        const literal = watch.match(/^"([^"]*)"$/);
        if (literal) {
          const key = literal[1];
          if (key === "people" || somethingIsWrittenAt(key)) continue;
          bad.push(`${where}: ${hook} watches "${key}", where no collection is written`
            + " — see SECTION_COLLECTIONS in platform/db/keys.ts for where the rows really live");
          continue;
        }
        // `engine-<typeKey>` — the record engine plants a section per type at
        // RUNTIME, so its key cannot be in a compile-time map and this is the
        // one shape that has to be named rather than looked up.
        if (/^`engine-\$\{/.test(watch)) continue;
        if (isHookItself && /^[A-Za-z_$][\w$]*$/.test(watch)) continue;
        bad.push(`${where}: ${hook}'s watch key is \`${watch}\` — a board must name its section as a literal`);
      }
    }
  }

  // The count is asserted so an accidentally-empty sweep cannot read as a pass:
  // this whole check is an ABSENCE, and a walk that matched nothing looks
  // identical to a codebase with nothing wrong.
  t.equal(checked > 40, true, `found ${checked} live-update call sites to check`);
  t.equal(bad.length, 0, `every live watch names a section something is written under\n${bad.join("\n")}`);
}

// THE OTHER HALF OF THE SAME BUG, and the half no source-level check can see: a
// call site can name the perfect key and still hear nothing if the fan-out does
// not carry the event to it.
//
// LiveProvider matched a listener's key against an event's section with `===`,
// which was correct while the section model was FLAT and stopped being correct
// the day the fifteen-section restructure moved every collection into a
// sub-section. `watchKeysFor` is that rule, extracted so it can be asserted
// here rather than read and believed.
export async function testAnEventReachesTheWatchersOfItsAncestors(t) {
  const { watchKeysFor } = await import("../src/platform/realtime/livePatch.ts");

  // The case that was dead for a fortnight: Main watches `crm-sales`, a ticket
  // is written under `crm-sales-tickets`.
  t.equal(watchKeysFor("crm-sales-tickets").includes("crm-sales"), true,
    "a ticket's event reaches a board watching the CRM & Sales root");
  t.equal(watchKeysFor("finance-cash").includes("finance"), true,
    "an invoice's event reaches a board watching the Finance root");
  t.equal(watchKeysFor("projects-list").includes("projects"), true,
    "a project's event reaches a board watching the Projects root");

  // The section itself always comes first, so a board naming the exact key is
  // told before anything else is considered.
  t.equal(watchKeysFor("tendering-register")[0], "tendering-register",
    "the section's own key is first");

  // THE PREFIX TRAP, asserted from both ends. `engine-` must not reach
  // `engineering-docs`, and `engineering-docs-rfq` must not reach `engine`.
  t.equal(watchKeysFor("engine-transmittal").includes("engineering-docs"), false,
    "the record engine's section does not reach Engineering & Documents");
  t.equal(watchKeysFor("engineering-docs-rfq").includes("engine"), false,
    "an RFQ's event does not reach a watcher of `engine`");
  t.equal(watchKeysFor("engineering-docs-rfq").includes("engineering-docs"), true,
    "...and does reach its real parent");

  // A SIBLING IS NOT AN ANCESTOR. This is the property that keeps the widening
  // honest: hearing a parent is not hearing everything under it.
  t.equal(watchKeysFor("finance-cash").includes("finance-payables"), false,
    "an invoice's event does not reach a board watching Payables");

  // "people" carries no section and no dash — it must survive unchanged, or
  // every membership and grant change stops reaching the People screen.
  t.equal(JSON.stringify(watchKeysFor("people")), JSON.stringify(["people"]),
    "a people-scoped event reaches exactly the people watchers");

  // An event whose section could not be resolved has an empty key. It must fan
  // out to NOTHING rather than to a listener that happens to be registered
  // under "" — the stream route sends `section: ""` when it cannot name one.
  t.equal(JSON.stringify(watchKeysFor("")), JSON.stringify([]), "an unnamed section reaches nobody");
  t.equal(JSON.stringify(watchKeysFor(null)), JSON.stringify([]), "...and so does a missing one");
}

// EVERY PATH THE CONSOLE BUILDS FROM `BASE` MUST BE A ROUTE THAT EXISTS.
//
// /super/dashboard was the template's dashboard index. It was deleted with the
// other seven demo dashboards (ae32da5), and the two doors INTO the console
// went on naming it: (full)/page.js redirects there when a session already
// exists, and SignIn.js sends you there after a successful post. So signing in
// landed on a 404, while every nav href, the sidebar logo and all twelve "Home"
// breadcrumbs pointed correctly at /dashboard/analytics — the one path nobody
// types. Nothing could report it: a `redirect()` to a dead path is legal
// JavaScript, the console's .js files are exempt from tsc (`checkJs: false`),
// and the deletion commit verified the NAV hrefs, which were never the broken
// half.
//
// It checks the literals rather than the nav table for exactly that reason —
// the table was right and the redirects were wrong. `${BASE}/...` is how this
// console names its own pages, so every one of them is a claim that a route is
// there. Route groups are stripped, because `(shell)` and `(full)` are chrome
// and not address.
export async function testEveryConsoleDestinationResolvesToARoute(t) {
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const root = "src/app/super";

  const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const full = `${dir}/${name}`;
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
  const files = walk(root);

  // A page file's route is its path with the group segments removed.
  const routes = new Set(
    files
      .filter((f) => /\/page\.(js|jsx|ts|tsx)$/.test(f))
      .map((f) => f.replace(/^src\/app/, "").replace(/\/page\.\w+$/, "").replace(/\/\([^/]+\)/g, "")),
  );

  const wanted = new Set();
  for (const f of files) {
    // THE CAPTURE STOPS AT A QUERY STRING, because a query never changes which
    // page answers. Settings moved its tabs into `?tab=` so every panel stays a
    // Server Component, and `${BASE}/settings?tab=security` is a real
    // destination — the route is `/super/settings` and the tab is the
    // page's own business. Without `?` in the class, every tab link reads as a
    // route that does not exist.
    // AND COMMENTS COME OUT FIRST, the treatment the icon and native-<select>
    // guards in this file already give their scans. A path in prose is not a
    // destination: a chrome comment once quoted the interpolated shape it
    // replaced, `${BASE}/pulse/${key}`, precisely to explain why the bar spells
    // its hrefs out — and a guard that failed on that sentence would push the
    // next person to delete the explanation rather than keep it.
    const code = readFileSync(f, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const [, path] of code.matchAll(/\$\{BASE\}([^`"'?]*)/g)) {
      wanted.add(`/super${path}`);
    }
  }

  t.equal(wanted.size > 0, true, "the console builds at least one path from BASE");
  for (const path of [...wanted].sort()) {
    t.equal(routes.has(path), true, `${path} resolves to a page`);
  }

  // The bug itself, named: this is where sign-in lands, and it must not 404.
  // SIGN-IN LANDS ON PULSE since 10/09/2026 — the owner's instruction — and both
  // doors (`(full)/page.js` and SignIn) name it. /super/dashboard is a real screen
  // now rather than the alias this used to check for.
  t.equal(routes.has("/super/pulse"), true, "sign-in lands on a page that exists — /super/pulse");
}

// ---- what Gate A used to hold, and nothing else did -------------------------
// SALVAGED WHEN GATE A WAS DELETED, and worth saying why rather than moving it
// quietly. Gate A was removed for its goldens — 379 recorded response bodies
// that cost twelve minutes and re-recorded sixteen files whenever a section was
// added. These four assertions were sitting in the same file and have nothing
// to do with goldens: they scan the SOURCE, need no database, and run in
// milliseconds. Deleting the file would have deleted them silently, which is
// the exact failure mode they each exist to prevent.
//
// They live here because this is already the file that reads lists out of the
// source rather than exercising them, and because it runs without Postgres.
async function sourceFiles() {
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const walk = (dir) => readdirSync(dir).flatMap((entry) => {
    const path = `${dir}/${entry}`;
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
  // Forward slashes whatever the platform: every match below is a path
  // pattern, and a Windows backslash would silently match nothing — which
  // reads as "all clear" rather than as a broken test.
  return walk("src")
    .filter((p) => /\.(js|jsx|ts|tsx)$/.test(p))
    .map((p) => ({ path: p.split("\\").join("/"), text: readFileSync(p, "utf8") }));
}

// An assertion that guards an identifier trips over the comment explaining why
// the identifier is banned. The role-library note below says "roleLibrary"
// three times and would match itself.
const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

export async function testMotionStaysInsideTheLanding(t) {
  // THE ONE THAT ACTUALLY COSTS MONEY. `motion/react` is ~30 KB gzipped and is
  // confined to components/landing/**, which is the only reason the studio's
  // chunk does not carry it. One `import { CountUp } from
  // "@/components/landing/ui/CountUp"` in a studio card and every tenant route
  // pays for the landing's animation library. The shared primitives in
  // components/motion are hand-driven for exactly this reason.
  const sources = await sourceFiles();
  t.equal(sources.length > 300, true, `there are sources to scan (${sources.length})`);

  const leaked = sources
    .filter((f) => f.text.includes('"motion/react"') || f.text.includes("'motion/react'"))
    .filter((f) => !f.path.startsWith("src/components/landing/"))
    .map((f) => f.path);
  t.equal(leaked.length, 0, `motion/react stays inside the landing: ${leaked.join(", ")}`);

  // ...and the scan can see it at all, or the line above passes on an empty set
  // for the wrong reason.
  const uses = sources.filter((f) => f.text.includes('"motion/react"')).length;
  t.equal(uses > 5, true, `the scan finds real imports of it (${uses})`);
}

export async function testTheRoleLibraryNeverReachesABrowser(t) {
  // ~3,000 job titles, a few hundred kilobytes, for a list a picker needs
  // twenty rows of. A client component importing it would fail NOTHING: the
  // build succeeds, every test passes, and a sixth of the bundle budget is
  // quietly spent. That is the shape of regression a ceiling catches only once
  // it has already been paid for.
  const clientFiles = (await sourceFiles()).filter((f) =>
    /^src\/components\//.test(f.path) || /"use client"/.test(f.text));
  t.equal(clientFiles.length > 50, true, `there are client files to scan (${clientFiles.length})`);

  const carries = clientFiles
    .filter((f) => /roleLibrary/.test(stripComments(f.text)))
    .map((f) => f.path);
  t.equal(carries.length, 0, `the role library never reaches a client component: ${carries.join(", ")}`);

  // And the archetypes with it: read only on the server, when a library role is
  // added or a department seeded. The screens show a role's PERMISSIONS, never
  // the shape that suggested them.
  const archetypes = clientFiles
    .filter((f) => /modules\/people\/archetypes/.test(stripComments(f.text)))
    .map((f) => f.path);
  t.equal(archetypes.length, 0, `...and neither do the archetypes: ${archetypes.join(", ")}`);
}

export async function testTheSharedChartKitUsesNoConsoleOnlyToken(t) {
  // `--ad-chart-*`, `--ad-muted*` and `--ad-border` are declared INSIDE
  // `.admindek`, and super.css is imported by /super/layout.js alone. A chart
  // carrying one of those into a studio screen renders every series with an
  // invalid colour — black, or nothing, depending on the property. It builds,
  // it deploys, and it is wrong.
  const kit = (await sourceFiles()).filter((f) => f.path.startsWith("src/components/charts/"));
  t.equal(kit.length > 0, true, `the chart kit is where the scan expects it (${kit.length})`);

  const consoleOnly = kit.flatMap((f) =>
    [...f.text.matchAll(/var\(--ad-[a-z0-9-]+\)/g)].map((m) => `${f.path.split("/").pop()}:${m[0]}`));
  t.equal(consoleOnly.length, 0,
    `the shared chart kit uses no console-only token: ${consoleOnly.join(", ")}`);
}

export async function testTheSharedTokensAreOnRoot(t) {
  const { readFileSync } = await import("node:fs");
  const globals = readFileSync("src/app/globals.css", "utf8");
  const superCss = readFileSync("src/app/super/super.css", "utf8");

  // EVERY `:root` RULE, NOT THE FIRST. globals.css has four (the brand scale,
  // the semantic layer, the studio surface, the doc tokens), and matching only
  // the first found nothing while the ramp sat in the fourth. Matched with a
  // regex rather than by scanning for a closing brace at the start of a line:
  // the file is CRLF on disk and read verbatim, so that scan would hunt for the
  // wrong two characters and quietly find nothing — which reads as "the ramp is
  // missing".
  const rootBlock = (globals.match(/:root\s*\{[^}]*}/g) || []).join("");
  const ramp = [1, 2, 3, 4, 5].filter((n) => rootBlock.includes(`--chart-${n}:`));
  t.equal(ramp.length, 5, `the five-series ramp is declared on :root (${ramp.length}/5)`);

  // The console ALIASES that ramp rather than restating it — one definition, so
  // a retuned series cannot mean two different things on two surfaces.
  t.equal(superCss.includes("--ad-chart-1-rgb: var(--chart-1)"), true,
    "/super aliases the shared ramp rather than redeclaring it");

  // `.num` and `.skel` were `.ad-num`/`.ad-skel` in super.css, and the kit's own
  // ChartSkeleton and BarList use them. Left behind, a studio skeleton is an
  // invisible box of the right size — a card that looks empty rather than
  // loading.
  t.equal(globals.includes(".num {") && globals.includes(".skel {"), true,
    "the number and skeleton utilities are global");
  t.equal(!superCss.includes(".num {") && !superCss.includes(".skel {"), true,
    "...and no longer in the console's own sheet");
  t.equal(globals.includes("@keyframes skel-sweep"), true,
    "...and the sweep keyframe moved with them");
}


// ADMINISTRATION IS NOT A SECTION, AND ITS ROWS MUST SURVIVE THAT.
//
// The owner's instruction on 09/09/2026 was to stop treating Administration &
// Settings as a section. The change is deliberately a PRESENTATION change: the
// sidebar tree and the marketing site's department list filter it out, and the
// section ROWS stay exactly where they were, because they are where records are
// physically filed.
//
// THIS TEST EXISTS FOR THE NEXT SESSION, not for this one. Reading "not a
// section any more" and reaching for `SECTION_DEFS` to delete the entry is the
// obvious next move and it is the destructive one: `administration-master` owns
// `locations`, `departments` and `costCodeLibrary`, `administration-settings`
// owns `recordTypes`, and seven modules resolve one or the other as a foreign
// section. Removing the def would stop new studios seeding the rows, strand
// every location and department already written in every live studio, and fail
// NOTHING — the same shape as the three tenders that went invisible in the
// sandbox, at the scale of the whole tenant base.
//
// So each half is asserted separately: the keys are gone from what the product

/* EVERY BUILT-IN RECORD TYPE GETS A MARK, NOT A DOT.
   ------------------------------------------------------------------
   A record type is a ROW and the section it plants is `engine-<typeKey>`, so
   those keys do not exist when StudioFrame is compiled — which is how all
   thirty-one built-in registers came to render `SECTION_ICONS[key] || "dot"`
   and nothing complained. Quality & HSE showed eight identical dots under one
   heading; the owner found it by looking at the sidebar.

   NOTHING ELSE CAN CATCH THIS. The fallback is legal, the build is green, and a
   register with no icon looks exactly like a register whose icon has not
   loaded. The next built-in type added to `builtins.ts` would repeat it
   silently, which is why the assertion reads BOTH files rather than keeping a
   list of its own.

   IT ASSERTS SIBLINGS DIFFER TOO. One dot per row was never the complaint —
   five IDENTICAL rows under one parent is, because a nav that cannot tell its
   own children apart is a list of nothing. Across parents a mark is reused
   deliberately and that is left alone. */
export async function testEveryBuiltinRecordTypeHasItsOwnIcon(t) {
  const { readFileSync } = await import("node:fs");

  const builtins = readFileSync("src/platform/engine/builtins.ts", "utf8");
  // BUILT AS A STRING, NOT A LITERAL. A `/…/` spanning a newline is a syntax
  // error, and this pattern has to cross one: a type declares its key on one
  // line and its label on the next.
  const TYPE_RE = new RegExp(
    'key:\\s*"([a-z0-9]+)",\\s*\\n\\s*label:\\s*"([^"]+)",'
    + '[\\s\\S]{0,200}?parentSectionKey:\\s*"([a-z0-9-]+)"',
    "g",
  );
  const types = [...builtins.matchAll(TYPE_RE)].map((m) => ({ key: m[1], parent: m[3] }));

  // A REGEX THAT MATCHED NOTHING WOULD PASS EVERY ASSERTION BELOW, which is the
  // failure mode of every source-scanning test in this file.
  t.equal(types.length > 20, true,
    `the built-in type scan found ${types.length} types — it should find dozens; the pattern has drifted from builtins.ts`);

  const frame = readFileSync("src/components/studio2/StudioFrame.js", "utf8");
  const body = frame.slice(frame.indexOf("const SECTION_ICONS = {"));
  const ENTRY_RE = new RegExp('^\\s*"?([a-zA-Z0-9-]+)"?\\s*:\\s*"([a-zA-Z0-9]+)"', "gm");
  const icons = Object.fromEntries(
    [...body.slice(0, body.indexOf("\n};")).matchAll(ENTRY_RE)].map((m) => [m[1], m[2]]),
  );

  const art = readFileSync("src/components/studio2/icons.art.js", "utf8");
  const names = new Set([...art.matchAll(/^\s{2}([a-zA-Z0-9_]+):/gm)].map((m) => m[1]));

  /* AND THE FALLBACK IS A MARK, NOT A DOT. The map can only name keys that exist
     when StudioFrame is compiled; a record type a studio invents this afternoon
     mints `engine-<typeKey>` with no commit between them and their own sidebar,
     so SOMETHING must answer for it. `sectionIcon` is that something, and these
     two assertions are what stop it quietly becoming a dot again — one for the
     name resolving, one for the shape, because `|| "dot"` reintroduced at any of
     the five call sites would fail nothing at runtime. */
  const fallback = /const FALLBACK_SECTION_ICON = "([a-zA-Z0-9]+)"/.exec(frame)?.[1] || "";
  t.equal(names.has(fallback), true,
    `the section fallback icon "${fallback}" is not in the set — every studio-made register would draw a dot`);
  // COMMENTS COME OUT FIRST. The prose above `SECTION_ICONS` explains what the
  // fallback USED to be, quoting `|| "dot"` — and deleting that reasoning to
  // satisfy a grep would throw away the only record of why the map exists. Same
  // treatment, and the same `[^:]` guard against `https://`, that the
  // native-<select> assertion in this file uses.
  const frameCode = frame
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  t.equal(/\|\|\s*"dot"/.test(frameCode), false,
    'StudioFrame still falls back to "dot" somewhere — route every call site through sectionIcon()');

  const byParent = {};
  for (const type of types) {
    const icon = icons[`engine-${type.key}`];
    t.equal(Boolean(icon), true,
      `engine-${type.key} (${type.parent}) has no entry in SECTION_ICONS — it renders a bare dot in the sidebar`);
    if (!icon) continue;
    // A NAME THAT DOES NOT RESOLVE IS A DOT BY ANOTHER ROUTE: Icon falls back to
    // ART.dot for an unknown name, so a typo here is invisible at runtime.
    t.equal(names.has(icon), true,
      `engine-${type.key} asks for the icon "${icon}", which is not in the set — Icon would draw a dot`);
    (byParent[type.parent] ||= []).push(`${type.key}=${icon}`);
  }

  for (const [parent, rows] of Object.entries(byParent)) {
    const used = rows.map((r) => r.split("=")[1]);
    const dupes = [...new Set(used.filter((v, i) => used.indexOf(v) !== i))];
    t.equal(dupes.join(", "), "",
      `two registers under ${parent} share a mark (${dupes.join(", ")}) — siblings must be told apart: ${rows.join("  ")}`);
  }
}

// PRESENTS, and present in what the product STORES.
export async function testAdministrationIsNotASectionButItsRowsSurvive(t) {
  // -- the keys are real. A typo here would silently exempt nothing.
  for (const key of SYSTEM_SECTION_KEYS) {
    t.equal(ALL_SECTION_KEYS.includes(key), true,
      `${key} is a real declared key — SYSTEM_SECTION_KEYS must name keys that exist`);
  }

  // -- the split is total: every key is exactly one of product or system.
  t.equal(PRODUCT_SECTION_KEYS.length + SYSTEM_SECTION_KEYS.length, ALL_SECTION_KEYS.length,
    "every declared key is either a product section or system configuration, and none is both");
  for (const key of PRODUCT_SECTION_KEYS) {
    t.equal(isSystemSection(key), false, `${key} is a product section`);
  }

  // -- THE ROWS STILL SEED. `REQUIRED_SECTIONS` is what a studio may not switch
  // off, and administration is on it because the settings screens are the only
  // way to switch anything back on. Not being a section did not change that.
  t.equal(REQUIRED_SECTIONS.includes("administration"), true,
    "the administration row is still required — it holds the screen that turns things back on");
  t.equal(REQUIRED_SECTIONS.includes("administration-settings"), true,
    "...and so is its settings child");

  // -- THE COLLECTIONS DID NOT MOVE. This is the assertion that protects live
  // data: four collections are filed under two administration keys, and if a
  // later change re-homes or drops them, every row already written is stranded
  // under a section nothing reads.
  const master = SECTION_COLLECTIONS["administration-master"] || [];
  for (const col of ["locations", "departments", "costCodeLibrary"]) {
    t.equal(master.includes(col), true,
      `${col} is still filed under administration-master — moving it strands every row already written`);
  }
  t.equal((SECTION_COLLECTIONS["administration-settings"] || []).includes("recordTypes"), true,
    "recordTypes is still filed under administration-settings");

  // -- THE RIGHTS STILL BITE. Four areas gate the four screens, and a screen
  // reached off the section nav is still a screen somebody must be granted.
  // Invariant 16 read the other way: these rights must go on being exercisable.
  for (const key of ["administration-members", "administration-access", "administration-master", "administration-settings"]) {
    t.equal((SECTION_AREAS[key] || []).length > 0, true,
      `${key} still answers to an area — leaving the nav must not leave it ungated`);
  }
}


// A SECTION WITH A SCREEN MUST BE REACHABLE BY SOME SEEDED ROLE — the mirror of
// testNoAreaExistsForASectionWithNoScreen, and CLAUDE.md has been asking for it
// by name.
//
// THE DEFECT HAS SHIPPED THREE TIMES, each found by somebody tripping over it:
// the contracts register, then the tender register, then the whole of
// Procurement — a section whose own Manager could not open it. Nothing asserted
// the property, which is exactly why it kept happening: every one of those
// shipped a correct catalogue entry, a correct SECTION_AREAS line and a screen
// that worked, and simply nobody who could reach it.
//
// A COUNT, NOT AN EXEMPTION LIST, deliberately — CLAUDE.md specifies the shape.
// An exemption list would need a line for every section somebody decided to
// leave owner-only, and each of those lines is a place to hide the next
// oversight. Zero is the only number that needs no explanation.
//
// MEASURED AGAINST A REAL STUDIO'S SECTION LIST, which is the part that took a
// wrong answer to get right. `ALL_SECTION_KEYS` alone reports `quality-hse`
// unreachable, and it is not: its eight registers are engine sections planted
// at runtime, absent from the declared list, and `sectionViewable` finds a
// section's children BY KEY PREFIX unless it is handed the stored parent map
// (invariant 14's other half). So the keys and the parent map are both built
// from BUILTIN_TYPES here, the way a seeded studio actually holds them.
export async function testEverySectionWithAScreenIsReachableBySomeSeededRole(t) {
  const types = BUILTIN_TYPES.map((x) => ({ key: x.key, parentSectionKey: x.parentSectionKey }));
  const engineKeys = types.map((x) => engineSectionKey(x.key));
  const allKeys = [...ALL_SECTION_KEYS, ...engineKeys];
  const parentOf = Object.fromEntries(types.map((x) => [engineSectionKey(x.key), x.parentSectionKey]));

  // Every role a studio can be seeded with: the eleven archetypes the whole
  // ~3,000-title library resolves to. Admin is deliberately NOT among them —
  // it is the one wildcard and would make this assertion vacuous.
  const seeded = ARCHETYPES.map((a) => ({ id: a.id, access: new Set(permissionsFor(a.id, types)) }));

  const unreachable = allKeys.filter((key) => {
    if (isSystemSection(key)) return false;      // settings, not a section
    if (NO_SCREEN_YET.includes(key)) return false; // declared, renders nothing, hidden
    return !seeded.some((r) => sectionViewable(r.access, key, allKeys, parentOf));
  });

  t.equal(unreachable.length, 0,
    `every section with a screen is openable by at least one seeded role — unreachable: ${unreachable.join(", ")}`);
}


// TWO LISTS OF THE SAME TWENTY-FIVE TRADES, HELD AS ONE.
//
// `INDUSTRIES` (platform/engagement) keys by slug and answers which flow
// template a deal starts on. `FIELD_ACTION_MATRIX` (shared/fieldsOfWork) keys by
// DISPLAY NAME and is what a studio actually stores in `fieldOfWork` — what
// seeds its service actions and its departments. They describe the same
// twenty-five trades and were joined by nothing at all, with four spelled
// differently between them: "Energy & Utilities" against "Energy & Utilities
// (Electricity, Gas)", "Waste Mgmt" against "Waste Management", and two more.
//
// WHAT THAT COST: a studio's own stored trade could not be resolved to its own
// flow. Nothing failed — `industryKeyOf` simply answered "" and every deal fell
// back to Template A — so a manufacturer and a consultancy ran the contracting
// flow and nobody could see why.
//
// `IndustryEntry.field` is the join, and this holds it 1:1 IN BOTH DIRECTIONS.
// One direction is not enough: a name that stops matching would leave an
// industry pointing at a trade that no longer exists, and a trade added to the
// matrix with no industry beside it would silently get no flow.
export async function testTheTwoIndustryListsAreOneList(t) {
  const fields = Object.keys(FIELD_ACTION_MATRIX);

  t.equal(INDUSTRIES.length, fields.length,
    `the two industry lists are the same length (${INDUSTRIES.length} vs ${fields.length})`);

  // -> every industry names a real trade
  const orphans = INDUSTRIES.filter((i) => !fields.includes(i.field)).map((i) => i.key);
  t.equal(orphans.length, 0,
    `every industry's \`field\` is a key of FIELD_ACTION_MATRIX — orphans: ${orphans.join(", ")}`);

  // <- every trade has an industry
  const named = new Set(INDUSTRIES.map((i) => i.field));
  const unclaimed = fields.filter((f) => !named.has(f));
  t.equal(unclaimed.length, 0,
    `every trade in FIELD_ACTION_MATRIX has an industry — unclaimed: ${unclaimed.join(", ")}`);

  // and the join is a function, not a relation: no two industries share a trade.
  t.equal(named.size, INDUSTRIES.length,
    "no two industries claim the same trade");

  // THE DOOR WORKS FROM THE SIDE A STUDIO ACTUALLY USES. `fieldOfWork` holds a
  // display name, so this is the lookup every caller will make.
  for (const f of fields) {
    t.equal(Boolean(industryByField(f)), true, `industryByField resolves ${f}`);
  }
}


// A TRADE ONLY EVER SWITCHES OFF A SECTION IT DOES NOT USE.
//
// `rootSectionsForTrade` decides which of the fourteen a new studio starts with,
// from its actions (Field x Action Matrix) plus its own deal flow's stages. The
// gate is applied ONCE, at creation, and a studio can switch anything back on —
// so the cost of being wrong is a section somebody has to go and find, and the
// cost of being wrong in the other direction is clutter. This holds the floor.
export async function testNoTradeSwitchesOffASectionItActuallyUses(t) {
  const rootOf = new Map();
  for (const d of SECTION_DEFS) {
    rootOf.set(d.key, d.key);
    for (const c of d.children || []) rootOf.set(c.key, d.key);
  }
  const spineFor = (field) => {
    const ind = industryByField(field);
    if (!ind) return [];
    const out = new Set();
    for (const id of [ind.primary, ind.secondary].filter(Boolean)) {
      const tpl = FLOW_TEMPLATES.find((x) => x.id === id);
      for (const st of tpl?.stages || []) {
        const e = STAGE_REGISTRY[st];
        if (e) out.add(rootOf.get(e.sectionKey) || e.sectionKey);
      }
    }
    return [...out];
  };

  // -- the map names real sections, and covers every action.
  const roots = new Set(SECTION_DEFS.map((d) => d.key));
  const strays = Object.entries(ACTION_SECTION).filter(([, v]) => !roots.has(v));
  t.equal(strays.length, 0,
    `every ACTION_SECTION target is a real root section — strays: ${strays.map(([k, v]) => `${k}->${v}`).join(", ")}`);

  const uncovered = SERVICE_ACTIONS.filter((a) => !ACTION_SECTION[a]);
  t.equal(uncovered.length, 0,
    `every one of the twenty service actions maps to a section — uncovered: ${uncovered.join(", ")}`);

  for (const k of [...UNIVERSAL_SECTION_KEYS, ...NEVER_GATED_KEYS]) {
    t.equal(roots.has(k), true, `${k} is a real root section key`);
  }

  // -- THE FLOOR: nothing a trade's own flow needs is ever switched off, and
  // nothing universal is either. A future edit that drops the spine from
  // `rootSectionsForTrade` would leave a contractor without Inventory while the
  // flow it was seeded with writes project sheets there — a section that owns
  // records the studio is actively creating, hidden from the people creating
  // them.
  for (const field of Object.keys(FIELD_ACTION_MATRIX)) {
    const on = rootSectionsForTrade(actionsForField(field), spineFor(field));
    for (const k of spineFor(field)) {
      t.equal(on.has(k), true, `${field}: its own flow needs ${k}, so ${k} stays on`);
    }
    for (const k of [...UNIVERSAL_SECTION_KEYS, ...NEVER_GATED_KEYS]) {
      t.equal(on.has(k), true, `${field}: ${k} is never gated`);
    }
  }

  // -- SYSTEM ROWS ARE NEVER GATED. One of them holds the screen that switches
  // things back on; gating it would be a studio locked out of its own settings.
  const nothingOn = new Set();
  for (const key of ALL_SECTION_KEYS.filter((k) => isSystemSection(k))) {
    t.equal(sectionEnabledForTrade(key, key, nothingOn, isSystemSection), true,
      `${key} is a settings row and survives an empty gate`);
  }

  // -- AND IT DISCRIMINATES. A gate that is on for everybody is not a gate: this
  // was true of the first draft, which read the blueprint sheet naively and left
  // thirteen of fourteen on for almost every trade.
  const counts = Object.keys(FIELD_ACTION_MATRIX).map((f) =>
    rootSectionsForTrade(actionsForField(f), spineFor(f)).size);
  t.equal(Math.min(...counts) < Math.max(...counts), true,
    `the gate tells trades apart (${Math.min(...counts)}..${Math.max(...counts)} sections on)`);

  // Two spot checks, because a range says nothing about whether the right ones
  // are on. A contractor uses the whole product; a consultancy does not buy
  // materials, make anything, run a fleet or own plant.
  const contractor = rootSectionsForTrade(
    actionsForField("Construction & Contracting"), spineFor("Construction & Contracting"));
  for (const k of ["projects", "inventory", "procurement", "quality-hse", "assets", "logistics"]) {
    t.equal(contractor.has(k), true, `a contractor starts with ${k}`);
  }
  const consultancy = rootSectionsForTrade(
    actionsForField("Management Consulting"), spineFor("Management Consulting"));
  for (const k of ["manufacturing", "assets", "logistics"]) {
    t.equal(consultancy.has(k), false, `a consultancy does not start with ${k}`);
  }
  t.equal(consultancy.has("projects"), true, "...but it does start with Projects");

  // AN ENGINE REGISTER IS PLANTED WITH ITS PARENT'S STATE, not switched on.
  //
  // `seedBuiltinTypes` runs AFTER the section array is written, so a hardcoded
  // `enabled: true` here left a consultancy with Manufacturing off and its
  // four registers on — and StudioFrame promotes a visible child whose parent
  // is hidden, so they would have appeared loose at the top of the nav.
  // Eighteen such rows, measured in the sandbox before the fix.
  //
  // A SOURCE CHECK, because the behaviour needs a database and this file has
  // none. It is the shape the other assertions here use for the same reason.
  const { readFileSync: readSrc } = await import("node:fs");
  // COMMENTS STRIPPED FIRST, the same way testNoNativeSelectSurvivesInSource
  // does: the fix's own comment quotes the bug it replaced ("It read
  // `enabled: true`"), and a grep over raw source would match that and fail on
  // the explanation rather than on the code.
  const planter = readSrc("src/platform/engine/sections.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  t.equal(/enabled:\s*parent\.enabled\s*!==\s*false/.test(planter), true,
    "plantTypeSection inherits its parent's enabled state");
  t.equal(/enabled:\s*true/.test(planter), false,
    "...and never hardcodes a register on");
}


// A LINK BETWEEN TWO REGISTERS POINTS AT A REGISTER THAT EXISTS.
//
// `reference` has been a declared field kind since the engine shipped and
// NOTHING EVER READ IT: the server returned the stored string, the register drew
// it in a text box, so a link was a hand-typed id nobody could follow. It is
// resolved now — one read per referenced type, gated on the reader's own right
// over the target — and four built-in registers use it.
//
// WHAT THIS CATCHES: a refType naming a type that does not exist. Nothing else
// would. `typeProblem` only checks the SHAPE of the key (KEY_RE), the resolver
// treats an unresolvable target as an unreadable one, and the screen degrades to
// a text box — so a typo would ship as a field that silently never resolves,
// which is exactly the state this whole engine was in before today.
export async function testEveryBuiltinLinkPointsAtARealRegister(t) {
  const keys = new Set(BUILTIN_TYPES.map((x) => x.key));
  const links = BUILTIN_TYPES.flatMap((x) =>
    (x.fields || []).filter((f) => f.kind === "reference").map((f) => ({ from: x.key, field: f.key, to: f.refType })));

  t.equal(links.length > 0, true, "the built-in registers declare at least one link");
  for (const l of links) {
    t.equal(keys.has(l.to), true, `${l.from}.${l.field} points at the real register ${l.to}`);
    // A REGISTER THAT NAMES ITSELF is a form that offers the row being edited as
    // its own parent. Nothing downstream refuses it.
    t.equal(l.to === l.from, false, `${l.from}.${l.field} does not point at its own register`);
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
      testEveryDeclaredMoveIsListed,
      testNoAreaExistsForASectionWithNoScreen,
      testEveryAreaGroupIsARealSectionLabel,
      testNoRetiredPermissionKeySurvivesInSource,
      testNoNativeSelectSurvivesInSource,
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
      testMotionStaysInsideTheLanding,
      testTheRoleLibraryNeverReachesABrowser,
      testTheSharedChartKitUsesNoConsoleOnlyToken,
      testTheSharedTokensAreOnRoot,
      testAdministrationIsNotASectionButItsRowsSurvive,
      testEveryBuiltinRecordTypeHasItsOwnIcon,
      testEverySectionWithAScreenIsReachableBySomeSeededRole,
      testTheTwoIndustryListsAreOneList,
      testNoTradeSwitchesOffASectionItActuallyUses,
      testEveryBuiltinLinkPointsAtARealRegister,
      testAdministrationFollowsItsChildren,
      testProjectSegmentsAreExemptFromTheBoard,
      testEveryContextualSectionKeyLiteralExists,
      testEveryLiveWatchCanActuallyFire,
      testAnEventReachesTheWatchersOfItsAncestors,
      testCompoundRootsCoversEveryDashedRoot,
      testEveryConsoleDestinationResolvesToARoute,
      testEveryModelTestIsActuallyRun,
      testNoRouteHandsItsBodyToAScalarParameter,
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
