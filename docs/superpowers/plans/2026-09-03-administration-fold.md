# Administration & Settings becomes a real section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Administration & Settings renders as a section with People, Access and Studio settings beneath it, each gated on its own permission — where today they are three hardcoded nav items that bypass the section mechanism.

**Architecture:** The section machinery already exists and is not changed. What is missing is three `SECTION_AREAS` entries, one new area, one new seeded section key, and the removal of three `NO_SCREEN_YET` entries. The nav rows then come from the section tree the way every other section's do, and the router stops special-casing three literal keys.

**Tech Stack:** Next.js 16.2.10 App Router, React 19, TypeScript (`noImplicitAny`, plus `tsconfig.strict.json`), Postgres via `src/platform/db/repo` under `PG_TRANSPORT=gateway`.

**Spec:** `docs/superpowers/specs/2026-09-03-administration-fold-design.md` — read it first. Its six decisions are the argument for everything below and are not restated here.

---

## READ THIS BEFORE TASK 1

**This is a live visibility change, not a nav rearrangement.** Today People is shown to *everyone* (`StudioFrame.js:244`, `show: true`) and `GET /settings` checks membership only (`route.ts:133`). After this plan, both are gated.

**Members and Viewers lose the People screen. That is intended** (spec §4) — who else is in the studio, and with what roles, is a management view. Task 6's backfill grants the right to Manager and Team Lead only; Admin is a wildcard role and is deliberately left alone.

**`administration-master` stays in `NO_SCREEN_YET` throughout.** It has no screen, and the locations move that would give it one is a separate spec. Removing it here would create the nav row that opens nothing.

---

## Global Constraints

Copied from `CLAUDE.md` and the spec.

- **Keys are built only in `src/platform/db/keys.ts`** (invariant 1). `SECTION_DEFS` lives there; adding a section key is an edit to that file and nowhere else.
- **Access is resolved once**, in `effectivePermissions` (invariant 3). Nothing here re-derives it; the change is which areas map to which section.
- **Default deny** (invariant 4). A member holding none of the three areas must see no Administration section at all — not an empty heading.
- **Nobody grants what they do not hold** — `escalates()` (invariant 5). Widening *who* may open the roles screen must not widen what any of them can hand out.
- **A right nothing can exercise is a bug** (invariant 16). `administration.settings.view` is exactly that today; Task 4 is what fixes it.
- **Golden responses are the contract.** `NOMPANY_RECORD_GOLDENS` is never set in CI. The re-record lands in **its own commit with the reason stated**, and a golden that moves for an unpredicted reason **stops the work**.
- **Invariant 17 applies to writes, not only deletes.** Task 6's backfill names the studios it touches from the registry; never a broad-prefix write.
- **The repo is mixed CRLF/LF.** `catalogue.ts`, `resolve.ts`, `keys.ts` and `tests/*.mjs` are **LF**; several docs are CRLF. Detect per file rather than assuming — asserting the match count is what catches a wrong assumption.
- **A Server Component cannot read the locale**, and an unbound `tr` in a `.js` screen is a runtime ReferenceError neither `tsc` nor `next build` catches. Open the screen.
- **Two sessions cannot share a test namespace.** Run as `NOMPANY_TEST_SESSION=adminfold npm test`.
- **Commit subjects are declarative sentences.** End each with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/platform/db/keys.ts` | `SECTION_DEFS` gains `administration-access` | Modify |
| `src/platform/access/catalogue.ts` | The `administration.access` area | Modify |
| `src/platform/access/resolve.ts` | Three `SECTION_AREAS` entries; three `NO_SCREEN_YET` removals; the comment | Modify |
| `src/shared/studio/sections.ts` | Arabic label for `administration-access` | Modify |
| `src/shared/studio/access.ts` | Arabic labels for the two new keys | Modify |
| `src/app/api/studios/[slug]/settings/route.ts` | GET enforces `administration.settings.view` | Modify |
| `src/app/studio/[[...segments]]/page.js` | Route the three keys; drop the literal special-cases; redirect the old paths | Modify |
| `src/components/studio2/StudioFrame.js` | Drop three hardcoded nav entries | Modify |
| `scripts/migrate/grant-administration.mjs` | The one-off backfill | **New** |
| `tests/restructure.mjs` | Section-shape assertions | Modify |
| `tests/gate-a.mjs` | Key count 124 → 126 | Modify |
| `tests/suite.mjs` | The gating, against real routes | Modify |
| `docs/functionality/sections.md` | What Administration is now | Modify |
| `CLAUDE.md` | Current state | Modify |

---

### Task 1: Access becomes a declared section with a right of its own

**Files:**
- Modify: `src/platform/db/keys.ts` (`SECTION_DEFS`, the `administration` entry)
- Modify: `src/platform/access/catalogue.ts` (beside `administration.settings`, ~line 304)
- Modify: `src/shared/studio/sections.ts`, `src/shared/studio/access.ts` (Arabic)
- Modify: `tests/gate-a.mjs:251` (the hardcoded count)

**Interfaces:**
- Produces: the section key `administration-access` and the permission keys `administration.access.view` / `.edit`, which Tasks 2–5 wire up.

**Note:** after this task and before Task 2, `tests/restructure.mjs`'s `testEveryKeyWithNothingToShowIsDeclared` **fails** for `administration-access` — it is a declared key with no area mapping and no `NO_SCREEN_YET` entry. That is the test doing its job; Task 2 resolves it, and the two ship in one push.

- [ ] **Step 1: Add the section key**

In `src/platform/db/keys.ts`, the `administration` entry currently reads:

```js
  { key: "administration", name: "Administration & Settings", children: [
    { key: "administration-members", name: "People" },
    { key: "administration-master", name: "Master data" },
    { key: "administration-settings", name: "Studio settings" },
  ] },
```

Add Access as the second child, and record why it is arriving late:

```js
  { key: "administration", name: "Administration & Settings", children: [
    { key: "administration-members", name: "People" },
    // ACCESS ARRIVES LATE, and that is why it is the one new seeded key here.
    // The roles screen existed throughout the restructure but was never a
    // section: it was a hardcoded nav row gated on canAdminister, a mechanism
    // nothing else in the nav uses. Giving it a section and an area of its own
    // is what lets a studio hand role management to somebody without making
    // them an admin — escalates() still decides what they may grant.
    { key: "administration-access", name: "Access" },
    { key: "administration-master", name: "Master data" },
    { key: "administration-settings", name: "Studio settings" },
  ] },
```

- [ ] **Step 2: Add the area**

In `src/platform/access/catalogue.ts`, beside the existing two:

```ts
  { key: "administration.access", group: "Administration & Settings", label: "Roles and access", verbs: ["view", "edit"] },
```

- [ ] **Step 3: Add both Arabic labels**

`src/shared/studio/sections.ts` maps section keys to Arabic; add `"administration-access"` beside `"administration-master"`, following the neighbouring entries' form exactly.

`src/shared/studio/access.ts` maps permission keys; add entries for `administration.access.view` and `administration.access.edit`. A missing entry renders the raw key on an Arabic studio's access grid.

- [ ] **Step 4: Update the hardcoded key count**

`tests/gate-a.mjs:251` asserts `ALL_PERMISSIONS.length === 124` → `126`. Append to the running history in the comment above it:

```
  // 126 with administration.access (view + edit). The roles screen had no
  // area at all — it was admin-only via canAdminister, which is not a right
  // anybody can be granted. Making it one is what lets a studio delegate role
  // management without handing over everything else an admin can do.
```

- [ ] **Step 5: Run the pure suites and read the failure**

```bash
node tests/access.test.mjs && node tests/restructure.mjs
```

Expected: `access.test.mjs` passes. `restructure.mjs` FAILS on
`administration-access either has a permission behind it ... or is declared in NO_SCREEN_YET`.
**Confirm that is the failure**, and only that one — it proves the guard works and is what Task 2 clears.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

```bash
git add src/platform/db/keys.ts src/platform/access/catalogue.ts src/shared/studio/sections.ts src/shared/studio/access.ts tests/gate-a.mjs
git commit
```

Subject: `The roles screen is a section with a right of its own`

---

### Task 2: The section mechanism can finally see Administration

**Files:**
- Modify: `src/platform/access/resolve.ts` (`SECTION_AREAS`, `NO_SCREEN_YET`, and the comment above it)
- Modify: `tests/restructure.mjs`

**Interfaces:**
- Consumes: `administration.access` from Task 1.
- Produces: `sectionViewable` answering true for the four administration keys when the areas are held.

- [ ] **Step 1: Write the failing test**

In `tests/restructure.mjs`, beside `testEmptySectionsDoNotRender`:

```js
export async function testAdministrationFollowsItsChildren(t) {
  // THE PARENT IS VISIBLE AS A CONSEQUENCE, not by a rule of its own — the
  // same fallthrough every other parent uses. Before this change the four
  // administration keys were in NO_SCREEN_YET and SECTION_AREAS had no entry
  // for any of them, so sectionViewable answered false however much somebody
  // held; the screens were reached by routes that bypassed it on purpose.
  const nobody = new Set(["crmSales.tickets.view"]);
  for (const key of ["administration", "administration-members", "administration-access", "administration-settings"]) {
    t.equal(sectionViewable(nobody, key, ALL_SECTION_KEYS), false,
      `${key} stays hidden from somebody holding none of its rights`);
  }

  // ONE RIGHT OPENS ONE CHILD AND THE PARENT, and nothing else. A member given
  // People must not thereby see Access or Studio settings.
  const peopleOnly = new Set(["administration.members.view"]);
  t.equal(sectionViewable(peopleOnly, "administration", ALL_SECTION_KEYS), true,
    "the parent shows for somebody holding one child's right");
  t.equal(sectionViewable(peopleOnly, "administration-members", ALL_SECTION_KEYS), true,
    "...and that child shows");
  t.equal(sectionViewable(peopleOnly, "administration-access", ALL_SECTION_KEYS), false,
    "...and the other children do not");
  t.equal(sectionViewable(peopleOnly, "administration-settings", ALL_SECTION_KEYS), false,
    "...neither of them");

  // MASTER DATA STAYS ABSENT. It has no screen and no area; the locations
  // move that would give it one is a separate change. A nav row that opens
  // nothing is worse than an absent one.
  const everything = new Set([
    "administration.members.view", "administration.access.view", "administration.settings.view",
  ]);
  t.equal(sectionViewable(everything, "administration-master", ALL_SECTION_KEYS), false,
    "master data has no screen and stays hidden even from somebody holding every other right");
}
```

Register it wherever the file's other exported tests are collected — follow the existing pattern in `tests/restructure.mjs` rather than inventing a runner.

- [ ] **Step 2: Run it to confirm it fails**

```bash
node tests/restructure.mjs
```

Expected: the `peopleOnly` assertions FAIL (`sectionViewable` answers false — there is no `SECTION_AREAS` entry), and `testEveryKeyWithNothingToShowIsDeclared` still fails from Task 1.

- [ ] **Step 3: Wire the areas**

In `resolve.ts`'s `SECTION_AREAS`, after the `field-service-*` entries:

```ts
  // ADMINISTRATION, WIRED AT LAST. These three areas existed in the catalogue
  // throughout the restructure and mapped to nothing, which is why
  // sectionViewable answered false and why all four keys sat in NO_SCREEN_YET.
  // The screens were reached by routes that bypassed this mechanism on
  // purpose; they no longer are.
  //
  // NO ENTRY FOR "administration-master" — it has no screen and no area, and
  // stays in NO_SCREEN_YET until the locations move gives it one.
  "administration-members": ["administration.members"],
  "administration-access": ["administration.access"],
  "administration-settings": ["administration.settings"],
```

- [ ] **Step 4: Shorten `NO_SCREEN_YET` and rewrite its comment**

Remove `"administration"`, `"administration-members"` and `"administration-settings"`, keeping `"administration-master"`:

```ts
  "quality-hse",
  // ADMINISTRATION-MASTER IS THE LAST ONE STANDING. Its three siblings left
  // this list when the section was folded together: each has a SECTION_AREAS
  // entry now, and the parent follows its children the way every other parent
  // does. Master data does not, because it still has no screen — currencies,
  // UoM, numbering series and cost codes are a later phase, and the locations
  // screen that could fill it today moves in its own change.
  "administration-master",
```

Then rewrite the long comment above `NO_SCREEN_YET` (currently `resolve.ts:305–326`). It explains why four administration keys are listed and describes routes that no longer exist. Replace that portion with what is now true: four keys with no screen anywhere (`tendering`, `manufacturing`, `assets`, `reports`), `quality-hse`, and `administration-master`. **Do not delete the reasoning wholesale** — the note that a section with no area is invisible *by consequence* is still the mechanism, and the file's own rule is that changing commented code means updating the reason.

- [ ] **Step 5: Run it to confirm it passes**

```bash
node tests/restructure.mjs && node tests/access.test.mjs
```

Expected: both fully green, including `testEveryKeyWithNothingToShowIsDeclared` from Task 1.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

```bash
git add src/platform/access/resolve.ts tests/restructure.mjs
git commit
```

Subject: `Administration follows its children, like every other section`

---

### Task 3: The router serves the three keys, and the old paths redirect

**Files:**
- Modify: `src/app/studio/[[...segments]]/page.js`
- Modify: `tests/suite.mjs`

**Interfaces:**
- Consumes: the section keys from Tasks 1–2.
- Produces: `/administration-members`, `/administration-access`, `/administration-settings` as ordinary section routes.

- [ ] **Step 1: Write the failing test**

In `tests/suite.mjs`, a new block. `studioContext` and the section list are already imported there.

```js
console.log("\n== Administration is reached by its own keys, and the old paths still resolve");
{
  // The three screens were reached at `people`, `access` and a literal match on
  // `administration-settings` \u2014 all three listed in studioRoute.ts's
  // SCREEN_KEYS, which is what tells resolveActiveKey to return an address
  // WITHOUT looking it up in the section list. Two of those keys are
  // pre-restructure and are in bookmarks and in notification payloads already
  // delivered; a 404 there breaks records that are out in the world.
  const { resolveActiveKey, requestedKey, studioSegments } =
    await import("@/shared/studioRoute");
  const visible = [{ key: "main" }, { key: "administration" },
    { key: "administration-members" }, { key: "administration-access" },
    { key: "administration-settings" }];
  const keyFor = (path) => resolveActiveKey(requestedKey(studioSegments(path, slug)), visible);

  ok("the People key resolves to its own section",
    keyFor(`/${slug}/administration-members`) === "administration-members",
    keyFor(`/${slug}/administration-members`));
  ok("the Access key resolves to its own section",
    keyFor(`/${slug}/administration-access`) === "administration-access",
    keyFor(`/${slug}/administration-access`));

  // THE RETIRED ADDRESSES. Before this change resolveActiveKey returned
  // "people" unchanged, because SCREEN_KEYS short-circuits ahead of the
  // section lookup; now the alias resolves it to the section that screen
  // actually lives in, which is also what makes the nav highlight the right
  // row for somebody arriving on the old link.
  ok("the old People path resolves to the new key",
    keyFor(`/${slug}/people`) === "administration-members", keyFor(`/${slug}/people`));
  ok("the old Access path resolves to the new key",
    keyFor(`/${slug}/access`) === "administration-access", keyFor(`/${slug}/access`));

  // A SECTION SOMEBODY CANNOT SEE still falls back the way it always did \u2014
  // the alias must not turn a denied section into a resolved one.
  const noAdmin = [{ key: "main" }];
  ok("a retired address with no section granted falls back to Main",
    resolveActiveKey(requestedKey(studioSegments(`/${slug}/people`, slug)), noAdmin) === "main");
}
```

`resolveActiveKey`, `requestedKey` and `studioSegments` are the real exports of
`src/shared/studioRoute.ts` (lines 115, 39 and 28). Read that file before writing this:
**`SCREEN_KEYS` (line 51) is the list this task changes**, and its comment above it explains
why all three keys are there \u2014 that comment describes the arrangement being replaced and is
rewritten in Step 3, not deleted.

- [ ] **Step 2: Run it to confirm it fails**

```bash
NOMPANY_TEST_SESSION=adminfold node tests/integration.test.mjs > /tmp/it.log 2>&1; echo "EXIT=$?"; grep -n "FAIL" /tmp/it.log | head
```

Expected: the two old-path assertions FAIL — `people` currently resolves to itself, not to `administration-members`.

- [ ] **Step 3: Add the alias and the routes**

In `src/shared/studioRoute.ts`, **empty `SCREEN_KEYS`** \u2014 all three of its entries are real
section keys now, so the short-circuit that skipped the section lookup is exactly what has to
go. Keep the constant with a comment saying it is deliberately empty and what would belong in
it, or delete it and its use in `resolveActiveKey` together; do not leave a list that no longer
matches its own comment.

Then map the two retired addresses onto the new keys:

```ts
// THE TWO PRE-RESTRUCTURE ADDRESSES. `people` and `access` were the keys these
// screens lived at before Administration & Settings became a real section, and
// they are in bookmarks and in notification payloads ALREADY DELIVERED — a
// notification links to /people, and those records cannot be rewritten. So the
// old address keeps working and resolves to the new section, which also means
// the nav highlights the right row when somebody arrives on one.
const RETIRED_ADDRESSES: Record<string, string> = {
  people: "administration-members",
  access: "administration-access",
};
```

Apply it inside `resolveActiveKey`, before the section lookup, so the page and the shell both
get it from the one derivation \u2014 that shared-function argument is the whole reason
`studioRoute.ts` exists, and its header says so.

In `page.js`, delete `isPeople`, `isAccess`, `isSettings` and the `isAccess && !admin → Denied` branch, and add the three keys to the screen switch beside the others:

```js
        : active?.key === "administration-members" ? <StudioPeople slug={studio.slug} canAdminister={admin} myCollaboratorId={collaborator.id} />
        : active?.key === "administration-access" ? <StudioRoles slug={studio.slug} />
        : active?.key === "administration-settings" ? <StudioSettings slug={studio.slug} locale={locale} />
```

`active?.key`, not `screenKey` — `screenKey` collapses a child to its parent, and `administration` has no dashboard of its own. This is the same reason Procurement's Suppliers and Logistics's Shipments are matched by key in that switch; the comment there explains it.

The `deniedSection` path now covers refusal: somebody who asks for a section they were not granted is told so, instead of the special-cased `Denied`.

- [ ] **Step 4: Run it to confirm it passes**

```bash
NOMPANY_TEST_SESSION=adminfold node tests/integration.test.mjs > /tmp/it.log 2>&1; echo "EXIT=$?"
```

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

```bash
git add src/shared/studioRoute.ts "src/app/studio/[[...segments]]/page.js" tests/suite.mjs
git commit
```

Subject: `People and Access are reached at their own section keys`

---

### Task 4: Studio settings enforces the right it has always had

**Files:**
- Modify: `src/app/api/studios/[slug]/settings/route.ts` (the `GET`, line ~133)
- Modify: `tests/suite.mjs`

**Why:** `administration.settings.view` is grantable and enforces nothing. Gating the nav on it while the endpoint stays open to any member would hide the screen and leave the data reachable — theatre, and the dead-capability shape invariant 16 forbids.

- [ ] **Step 1: Write the failing test**

In `tests/suite.mjs`:

```js
console.log("\n== studio settings enforces the right that used to grant nothing");
{
  // administration.settings.view existed throughout the restructure and the
  // GET ignored it — membership was the whole check. A right that grants
  // nothing is the dead capability the catalogue's own rule forbids.
  const outsiderToSettings = await person("settingsless", null);
  const ctxNo = ctx({ slug });
  await signIn(outsiderToSettings.user.id);
  const denied = await capture(SETTINGS.GET, req(`/api/studios/${slug}/settings`), ctxNo);
  ok("a member without the right cannot read studio settings",
    denied.status === 403, `${denied.status} ${JSON.stringify(denied.body).slice(0, 80)}`);

  await signIn(owner.id);
  const allowed = await capture(SETTINGS.GET, req(`/api/studios/${slug}/settings`), ctxNo);
  ok("...and somebody holding it still can", allowed.status === 200, String(allowed.status));
}
```

`SETTINGS` is already imported at `tests/suite.mjs:33`. Use the file's existing `person` / `signIn` / `capture` / `req` helpers rather than new ones.

- [ ] **Step 2: Run it to confirm it fails**

```bash
NOMPANY_TEST_SESSION=adminfold node tests/integration.test.mjs > /tmp/it.log 2>&1; echo "EXIT=$?"; grep -n "FAIL" /tmp/it.log | head
```

Expected: FAIL on `a member without the right cannot read studio settings` — it returns 200 today.

- [ ] **Step 3: Add the check**

In the settings `GET`, after `studioContext` resolves and before the response is built:

```ts
  // ENFORCED AT LAST. This route checked membership and nothing else, so
  // administration.settings.view was grantable and granted nothing — for as
  // long as the section was reached by a route that bypassed the section
  // mechanism. Now that the nav gates on it, the endpoint has to as well, or
  // the screen would vanish while its data stayed open to any member.
  const denied = requirePermission(context.access, "administration.settings.view");
  if (denied) return Response.json(denied, { status: 403 });
```

`requirePermission` is already imported (line 1). `canManage` continues to come from `administration.settings.edit` and does not change.

- [ ] **Step 4: Run it to confirm it passes**

```bash
NOMPANY_TEST_SESSION=adminfold node tests/integration.test.mjs > /tmp/it.log 2>&1; echo "EXIT=$?"
```

Watch for **collateral failures**: anything else in the suite that read settings as a plain member now gets a 403. If one appears, it is a real finding — that caller was relying on the endpoint being open. Fix the fixture's grants rather than weakening the check.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

```bash
git add "src/app/api/studios/[slug]/settings/route.ts" tests/suite.mjs
git commit
```

Subject: `Reading studio settings asks for the right that names it`

---

### Task 5: The sidebar stops hardcoding three rows

**Files:**
- Modify: `src/components/studio2/StudioFrame.js` (lines ~244–245 and ~368–379)

- [ ] **Step 1: Remove the hardcoded entries**

Delete the two nav items:

```js
    { href: `/${studio.slug}/people`, key: "people", label: me.canAdminister ? tr.peopleAndRequests : tr.people, show: true },
    { href: `/${studio.slug}/access`, key: "access", label: tr.access, show: me.canAdminister },
```

and the Studio settings footer `<Link>` (~line 368–379). All three now arrive through the section tree.

**Keep the Documentation link** — it is a full-screen route, not a section, and is unaffected.

- [ ] **Step 2: Check what the labels lose**

The People row's label was conditional: `canAdminister ? tr.peopleAndRequests : tr.people` — "People & requests" for an admin, "People" otherwise. A section row takes the studio's stored section name instead, so that distinction disappears.

**Decide and record it in the commit:** either accept "People" for everyone (the section's name, consistent with every other row), or keep the conditional by special-casing the label for this key. Prefer accepting it — a nav label that changes per viewer is the kind of thing the section tree deliberately does not do, and the requests count is already surfaced on the screen itself.

- [ ] **Step 3: Confirm the icons still resolve**

`StudioFrame.js:63–64` maps `people` and `access` to icons by the OLD keys. The section rows come through with `administration-members` and `administration-access`, so both rows will render with no icon unless the map gains the new keys. Add them; keep the old keys too, harmlessly, or remove them if nothing else reads them — check before deleting.

- [ ] **Step 4: Verify in the browser — not optional**

```bash
npm run dev:sandbox
```

**Front the tab** — a hidden pane never takes the auth cookie. Confirm as the owner: Administration & Settings appears as a group with People, Access and Studio settings under it; the group opens; the active row highlights; and arriving at `/people` highlights the People row rather than nothing.

Then switch the studio to Arabic and confirm all four labels render as words rather than raw keys.

- [ ] **Step 5: Lint, build, budget, commit**

```bash
npm run lint && npx tsc --noEmit && npx next build && node scripts/bundle-budget.mjs
```

The largest chunk (158 KB gz) must not move. Note the total in the commit body.

```bash
git add src/components/studio2/StudioFrame.js
git commit
```

Subject: `The sidebar reads Administration from the section tree`

---

### Task 6: Nobody loses a screen they were using

**Files:**
- Create: `scripts/migrate/grant-administration.mjs`
- Modify: `src/modules/people/roles.ts` (the seeded starter roles)

**Interfaces:**
- Consumes: `administration.members` and `administration.access` from Task 1.

**The judgement, from spec §4** — stated here because the script encodes it:

| Starter role | `administration.members.view` | `administration.access.*` |
|---|---|---|
| Admin | — (wildcard, holds everything) | — (wildcard) |
| Manager | **granted** | not granted |
| Team Lead | **granted** | not granted |
| Member | not granted | not granted |
| Viewer | not granted | not granted |

Members and Viewers lose People. That is the change working.

- [ ] **Step 1: Seed it for new studios**

In `src/modules/people/roles.ts`, add `administration.members.view` to the Manager (`role_manager`, ~line 89) and Team Lead (`role_lead`, ~line 109) permission lists, with the reason:

```ts
      // Seeing who else is in the studio, and with what roles, is a management
      // view — it was visible to everybody before Administration became a real
      // section, and gating it is the point of that change rather than a side
      // effect of it.
      "administration.members.view",
```

**Do not touch Admin.** It is `wildcard: true` and already answers for everything; writing keys onto it would teach the next reader to distrust what the wildcard means.

- [ ] **Step 2: Write the backfill for existing studios**

`scripts/migrate/grant-administration.mjs`, following `scripts/migrate/plant-sections.mjs`'s shape exactly — read that file first and match its guards, its argument handling and its output.

Requirements, each of which is a rule rather than a preference:

- **Idempotent and forward-only.** It adds a key to a role's list when absent and writes nothing when present. Re-running is a no-op.
- **It never removes a permission.** Not one, not ever — a migration that can take a right away is a migration that can lock somebody out.
- **By explicit role id** — `role_manager` and `role_lead` — never by predicate, and never by name (a studio can rename a starter role).
- **It names the studios it touches** from the registry and reports what it changed per studio. Invariant 17's "explicit list, then prove it" applies to writes.
- **A `--dry-run` that is the default.** Writing requires an explicit flag.

- [ ] **Step 3: Run it dry against the sandbox**

```bash
NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/grant-administration.mjs
```

Expected: it lists the sandbox studio and the roles it *would* change, and writes nothing.

- [ ] **Step 4: Run it for real against the sandbox, then again**

```bash
NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/grant-administration.mjs --write
NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/grant-administration.mjs --write
```

The second run must report **zero changes**. That is the idempotence claim, tested rather than asserted.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate/grant-administration.mjs src/modules/people/roles.ts
git commit
```

Subject: `Managers and team leads keep the People screen they already had`

Body must state plainly that Members and Viewers lose it, and why that is intended.

**Running it against production is a separate, deliberate act** — not part of this commit, and it happens after the whole plan is verified and pushed.

---

### Task 7: The goldens move once, deliberately

**Files:**
- Re-record: `tests/goldens/owner.roles.json` and whatever else the run reports

- [ ] **Step 1: Measure the blast radius before recording**

```bash
NOMPANY_TEST_SESSION=adminfold npm test > /tmp/test.log 2>&1; echo "EXIT=$?"; grep -n " FAIL " /tmp/test.log
```

The failures are the goldens this change moves. **Read the list before recording anything.** Expected: `owner.roles.json` (the catalogue gained an area) and any golden carrying the visible section list.

**A golden that moves for a reason this plan did not predict stops the work.** Investigate it; do not record over it.

- [ ] **Step 2: Record**

```bash
NOMPANY_TEST_SESSION=adminfold NOMPANY_RECORD_GOLDENS=1 node tests/gate-a.test.mjs > /tmp/rec.log 2>&1; echo "EXIT=$?"
git status --short tests/goldens/
git diff tests/goldens/ | grep "^[+-]" | grep -v "^[+-][+-]"
```

- [ ] **Step 3: Read every changed line**

Confirm each is the new area, the new section, or a nav list gaining Administration — and nothing else.

- [ ] **Step 4: Commit, on its own**

```bash
git add tests/goldens/
git commit
```

Subject: `The goldens record Administration as a section`

Body: what moved, why, and that it is a deliberate re-record — `NOMPANY_RECORD_GOLDENS` is never set in CI, so a golden moving inside a feature commit is a contract nobody can check.

---

### Task 8: The docs say what Administration is now

**Files:**
- Modify: `docs/functionality/sections.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Correct `sections.md`**

Its table says *"Administration & Settings | People, studio settings | Partial — no master-data screen"*, and its "Sections that render nothing" section describes the old arrangement. Update:

- the row: People, **Access**, studio settings — still partial, because master data has no screen;
- the "renders nothing" list: five sections plus `administration-master`, which is a *child* rather than a section and is absent for that reason;
- **add the visibility change in words**: People is a granted screen now, Managers and Team Leads hold it by default, Members and Viewers do not, and reading Studio settings requires `administration.settings.view` where it used to require membership alone.

- [ ] **Step 2: Update `CLAUDE.md`**

In "Current state", say that the fifteen-section restructure is complete apart from master data, and state the rollout consequence plainly: **reading studio settings now needs a right that previously enforced nothing, and Members and Viewers no longer see People.** If the bundle moved, update the budget line with the measured number.

- [ ] **Step 3: Full verification**

```bash
NOMPANY_TEST_SESSION=adminfold npm test > /tmp/test.log 2>&1; echo "EXIT=$?"; tail -20 /tmp/test.log
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.strict.json
npx next build
node scripts/bundle-budget.mjs
npm run lint
```

All six. **Check the exit code, not the tail of a pipe.**

- [ ] **Step 4: Commit and push**

```bash
git add docs/functionality/sections.md CLAUDE.md
git commit
git push origin main
```

Subject: `Administration is a section, and the docs say who can see it`

---

## Verification — every change, no exceptions

```bash
NOMPANY_TEST_SESSION=adminfold npm test
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.strict.json
npx next build
node scripts/bundle-budget.mjs
npm run lint
```

**Four failure modes specific to this work:**

- **An empty Administration heading.** A member holding none of the three areas must see no section at all. Task 2's first assertion is the guard; the browser walk is the proof.
- **A silent loss.** If Task 6's backfill misses a role, the symptom is a screen that quietly vanished rather than an error. Run the script twice and read what it reports.
- **A redirect loop.** `/people` → `/administration-members` must not resolve back through a rule that sends it to `/people`.
- **Raw keys in Arabic.** `administration-access` and its two permission keys need entries in `shared/studio/sections.ts` and `shared/studio/access.ts`; neither `tsc` nor `next build` catches a missing one.

**The acceptance test is a walk**, in the sandbox, in both languages: no rights → no section; one right → the parent and exactly that child; owner → all three, group open, active row highlighted, and `/people` still landing on People.

**One process trap:** `npm test | tail` reports `tail`'s exit code, not the suite's. Redirect to a file and echo `$?`.
