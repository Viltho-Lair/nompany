# Deal aliases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deal opened from now on carries a minted permanent id, and the id its lineage derives becomes an alias pointing at it — so a record arriving out of order can never re-root a deal (Law 3).

**Architecture:** Three changes, each independently testable. `detachRecord` gains the alias resolve `attachRecord` has always had. `applyDescriptor` resolves the descriptor's derived id before writing, so a backfill re-run cannot fork a minted deal. The three spine entry points share one new helper that mints an id, writes the alias, and applies the descriptor at the minted id. Deals that already exist keep their derived id and are never touched.

**Tech Stack:** TypeScript (`noImplicitAny`), Node 24, Postgres via `src/platform/db/store`, `node:assert/strict` test suites run from `tests/suite.mjs`.

**Spec:** `docs/superpowers/specs/2026-09-02-deal-aliases-design.md`

## Global Constraints

Copied from `CLAUDE.md` and the spec. Every task's requirements implicitly include these.

- **Keys are built only in `src/platform/db/keys.ts`.** Never a literal, never a template at a call site. `ENG.alias(studioId, aliasId)` already exists — use it through `resolveDealId` / `setDealAlias`, never directly.
- **Writes go through `editArr`/`editJSON`** (compare-and-set, invariant 8). No blind whole-collection write.
- **Golden responses are the contract.** 153 responses must not change. `NOMPANY_RECORD_GOLDENS` is never set. The two goldens carrying an engagement id redact it as `<eng_ID>`, so a minted id is invisible to them — if a golden fails, something else broke.
- **`deterministicEngId` is unchanged, byte for byte.** It stays the derivation; it stops being identity.
- **No live data is touched.** No migration, no rewrite of the engagements already in production.
- **Two sessions cannot share a test namespace.** Run every suite as `NOMPANY_TEST_SESSION=dealalias npm run test:integration`. If `tests/exclusive.mjs` refuses, pick another name rather than debugging the failures.
- **Comments explain why**, especially where the obvious approach is wrong. When you change commented code, update the reason — do not delete it.
- **Files here are CRLF on disk.** Match the file you are editing.
- **Commit subjects are declarative sentences** describing the state after the change ("A document knows how many pages it has"), never conventional-commit prefixes. End each with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/platform/db/engagement.ts` | The engagement store: roots, members, aliases, descriptors | Modify — `detachRecord`, `applyDescriptor`, new `applyAsDeal`, three entry points |
| `tests/engagement-spine.mjs` | The spine's own suite, run from `tests/suite.mjs` | Modify — two assertions invert, four new ones added |
| `docs/functionality/engagements.md` | What the engagement layer does, in words | Modify — the "Ids are deterministic" paragraph is no longer true |

Nothing else changes. `src/platform/engagement/backfill.ts` keeps deriving; `keys.ts` already has every key this needs.

---

### Task 1: Detach resolves through the alias

`attachRecord` has resolved through the alias since it was written (`src/platform/db/engagement.ts:121`). `detachRecord` does not — it edits `ENG.root(studioId, engId)` directly. Given a derived id for a minted deal it edits a root that does not exist and takes the `if (!eng) return { result: undefined }` branch: a **silent no-op on a detach**, leaving a deleted record a member of the deal it has left.

This task is first because it is correct on its own, before anything mints: with no aliases in the store `resolveDealId` returns its input, so the behaviour is identical until Task 3 lands.

**Files:**
- Modify: `src/platform/db/engagement.ts:192` (`detachRecord`)
- Test: `tests/engagement-spine.mjs`

**Interfaces:**
- Consumes: `resolveDealId(studioId, anyId): Promise<string>` and `setDealAlias(studioId, aliasId, dealId): Promise<void>`, both already exported from `src/platform/db/engagement.ts`.
- Produces: nothing new. `detachRecord(studioId, engId, type, recId): Promise<void>` keeps its signature; only what `engId` may be widens.

- [ ] **Step 1: Write the failing test**

Add to `tests/engagement-spine.mjs`, and add `detachRecord`, `attachRecord`, `listMembers`, `createEngagement`, `setDealAlias` to the existing import block from `../src/platform/db/engagement.ts`:

```js
export async function testDetachResolvesThroughAlias() {
  const sid = `s_${Date.now().toString(36)}_da1`;

  // A minted deal with a derived id aliased onto it — the shape Task 3 creates.
  const deal = await createEngagement(sid, { ref: "ALIAS-DETACH" });
  const derived = deterministicEngId("ticket", "tk_detach");
  await setDealAlias(sid, derived, deal.id);

  await attachRecord(sid, derived, "rfq", "rfq_detach");
  assert.deepEqual(await listMembers(sid, deal.id, "rfq"), ["rfq_detach"],
    "attach already resolves, so the member lands on the minted deal");

  // THE BUG: detach given the same derived id must reach the same deal.
  await detachRecord(sid, derived, "rfq", "rfq_detach");
  assert.deepEqual(await listMembers(sid, deal.id, "rfq"), [],
    "detach through a derived id removes the member from the minted deal");
}
```

Register it in the standalone runner at the foot of the same file and in `tests/suite.mjs:4736`, both of which iterate a literal array:

```js
for (const t of [testSpineHelpers, testDetachResolvesThroughAlias]) {
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
NOMPANY_TEST_SESSION=dealalias npm run test:integration
```

Expected: FAIL on `detach through a derived id removes the member from the minted deal` — the member is still `["rfq_detach"]`, because `detachRecord` edited a root at `derived` that does not exist and silently did nothing.

- [ ] **Step 3: Write the minimal implementation**

In `detachRecord`, resolve before the first read. Put it above the existing step-1 comment:

```ts
export async function detachRecord(studioId: string, engId: string, type: string, recId: string): Promise<void> {
  // SYMMETRIC WITH attachRecord, and the asymmetry was the bug. Attach has
  // resolved through the alias since it was written; detach did not, so a
  // caller holding a derived id for a minted deal edited a root that does not
  // exist and took the "no root → nothing to clear" branch below. A detach that
  // silently succeeds is the worst outcome available here: the record is gone
  // and its membership survives it.
  const dealId = await resolveDealId(studioId, engId);
```

Then replace every remaining `engId` in the function body with `dealId`. There are several — the root edit, the members ZREM, the reverse-index delete and the has-stage bookkeeping. Read the whole function and change them all; leaving one is a half-detach that passes this test.

- [ ] **Step 4: Run the test to verify it passes**

```bash
NOMPANY_TEST_SESSION=dealalias npm run test:integration
```

Expected: PASS, and every pre-existing assertion in the suite still passes — with no aliases in the store `resolveDealId` is the identity function, so nothing else can have moved.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit -p tsconfig.strict.json
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/platform/db/engagement.ts tests/engagement-spine.mjs
git commit -m "A detach resolves the alias, the way an attach always has"
```

---

### Task 2: A descriptor is applied to the deal the alias names

`applyDescriptor` writes the root at `d.engId` — the derived id `buildEngagements` computed. Once Task 3 mints ids, a backfill re-run over the same chain would write a **second** root at the derived id, strand the alias pointing past it, and leave two deals where the whole point was one.

Independent of Task 3 and safe before it: with no aliases, resolving is the identity.

**Files:**
- Modify: `src/platform/db/engagement.ts:466` (`applyDescriptor`)
- Test: `tests/engagement-spine.mjs`

**Interfaces:**
- Consumes: `resolveDealId` (Task 1's import block already has it), `EngagementDescriptor` from `../engagement/backfill`.
- Produces: `applyDescriptor(studioId, d): Promise<void>` keeps its signature. It now writes at the resolved id rather than at `d.engId`.

- [ ] **Step 1: Write the failing test**

Add to `tests/engagement-spine.mjs`, importing `applyDescriptor` and `readEngagement` alongside the rest:

```js
export async function testDescriptorFollowsTheAlias() {
  const sid = `s_${Date.now().toString(36)}_da2`;

  const deal = await createEngagement(sid, { ref: "ALIAS-DESC" });
  const derived = deterministicEngId("ticket", "tk_desc");
  await setDealAlias(sid, derived, deal.id);

  // What a backfill re-run hands over: a descriptor still keyed by derivation.
  await applyDescriptor(sid, {
    engId: derived,
    ref: "ALIAS-DESC",
    context: { createdAt: "2026-09-02T00:00:00.000Z" },
    singletons: { ticket: "tk_desc", approvedQuotation: null, project: null },
    members: { ticket: ["tk_desc"] },
  });

  assert.equal(await readEngagement(sid, derived), null,
    "no second root is written at the derived id");
  const root = await readEngagement(sid, deal.id);
  assert.ok(root, "the minted deal still exists");
  assert.equal(root.singletons.ticket, "tk_desc",
    "the descriptor landed on the deal the alias names");
}
```

Register it in both runner arrays, as in Task 1.

- [ ] **Step 2: Run the test to verify it fails**

```bash
NOMPANY_TEST_SESSION=dealalias npm run test:integration
```

Expected: FAIL on `no second root is written at the derived id` — `readEngagement(sid, derived)` returns an object, because `applyDescriptor` wrote one there.

- [ ] **Step 3: Write the minimal implementation**

At the top of `applyDescriptor`, before the existing `const head = …` block:

```ts
export async function applyDescriptor(studioId: string, d: EngagementDescriptor): Promise<void> {
  // THE DESCRIPTOR IS KEYED BY DERIVATION; THE DEAL MAY NOT BE.
  //
  // buildEngagements computes engId by hashing the chain's head, which is what
  // makes the backfill idempotent. Once a deal has been minted (see applyAsDeal)
  // that derived id is an ALIAS, and writing here would put a second root under
  // it — two deals for one chain, with the alias pointing past both. Resolving
  // first is what keeps the reconciler, the CLI and the live create paths asking
  // one question and getting one answer.
  const engId = await resolveDealId(studioId, d.engId);
```

Then replace every `d.engId` in the rest of the function with `engId`. There are five: the `readEngagement` for `existing`, `ENG.root`, `id:` inside the root object, the `ENG.index` ZADD, and the members/singletons loops (`ENG.members`, `ENG.recEng`, `ENG.hasStage`). Read the whole function; a missed one writes an index entry pointing at a root that is not there.

- [ ] **Step 4: Run the test to verify it passes**

```bash
NOMPANY_TEST_SESSION=dealalias npm run test:integration
```

Expected: PASS, including `testSpineHelpers` and the engagement view's goldens, which exercise `applyDescriptor` on every ticket create.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit -p tsconfig.strict.json
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/platform/db/engagement.ts tests/engagement-spine.mjs
git commit -m "A descriptor is applied to the deal its alias names, not to the id it was keyed by"
```

---

### Task 3: A new deal mints its own id

The three spine entry points hand `descriptor.engId` straight to `applyDescriptor`. They share one new helper instead.

**This task inverts two assertions that currently pin the old behaviour** (`tests/engagement-spine.mjs:18` and `:32` assert the entry points return `deterministicEngId(...)`). That is not a test being bent to fit — those assertions encode the behaviour this plan exists to correct, and they are replaced by assertions that the derived id *resolves* to what is returned.

**Files:**
- Modify: `src/platform/db/engagement.ts:603-648` (the three entry points) and a new `applyAsDeal` above them
- Test: `tests/engagement-spine.mjs`

**Interfaces:**
- Consumes: `ID.engagement(): string` from `./keys` (already imported as `ID`), `resolveDealId`, `setDealAlias`, `readEngagement`, `applyDescriptor`, `EngagementDescriptor`.
- Produces: `applyAsDeal(studioId: string, d: EngagementDescriptor): Promise<string>` — module-private, returns the deal id the descriptor was applied at. The three entry points keep their signatures and return that id instead of `descriptor.engId`.

- [ ] **Step 1: Write the failing test**

Replace the two assertions in `testSpineHelpers` that pin the derived id. Line 18 becomes:

```js
  assert.notEqual(ticketEng, deterministicEngId("ticket", "tk_1"),
    "a deal opened now mints its own id rather than deriving one");
  assert.equal(await resolveDealId(sid, deterministicEngId("ticket", "tk_1")), ticketEng,
    "and the derived id resolves to it, so anything holding one lands on the deal");
```

and line 32 becomes:

```js
  assert.notEqual(engId, deterministicEngId("quotation", "quo_9"),
    "an internal quotation mints its own id too");
  assert.equal(await resolveDealId(sid, deterministicEngId("quotation", "quo_9")), engId,
    "and its derivation resolves to it");
```

Then add the two cases the entry points must also satisfy:

```js
export async function testMintingIsIdempotentAndGrandfathers() {
  const sid = `s_${Date.now().toString(36)}_da3`;
  const ticket = { id: "tk_m", clientId: "c1", clientName: "Acme", ref: "ACME-M" };

  // TWICE IS ONCE. A retry, a re-entry and a reconcile pass all land on one deal.
  const first = await attachTicketEngagement(sid, ticket, { id: "c1", name: "Acme" });
  const second = await attachTicketEngagement(sid, ticket, { id: "c1", name: "Acme" });
  assert.equal(second, first, "a second create for the same chain returns the same deal");

  // A DEAL FROM BEFORE THIS CHANGE: a root sitting at its derived id, no alias.
  const sid2 = `s_${Date.now().toString(36)}_da4`;
  const legacy = { id: "tk_old", clientId: "c2", clientName: "Old", ref: "OLD-1" };
  const derived = deterministicEngId("ticket", "tk_old");
  await applyDescriptor(sid2, {
    engId: derived, ref: "OLD-1", context: { createdAt: "2026-08-01T00:00:00.000Z" },
    singletons: { ticket: "tk_old", approvedQuotation: null, project: null },
    members: { ticket: ["tk_old"] },
  });

  const again = await attachTicketEngagement(sid2, legacy, { id: "c2", name: "Old" });
  assert.equal(again, derived, "a deal that already exists keeps the derived id it has");
  assert.equal(await resolveDealId(sid2, derived), derived, "and no alias is written for it");
}
```

Register it in both runner arrays and add `resolveDealId` to the import block.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
NOMPANY_TEST_SESSION=dealalias npm run test:integration
```

Expected: FAIL on `a deal opened now mints its own id rather than deriving one` — `attachTicketEngagement` still returns the derived id, so `notEqual` fails.

- [ ] **Step 3: Write the minimal implementation**

Add `applyAsDeal` immediately above `attachTicketEngagement` in `src/platform/db/engagement.ts`:

```ts
/**
 * APPLY A DESCRIPTOR AS A DEAL, MINTING AN IDENTITY THE FIRST TIME (Law 3).
 *
 * The descriptor is keyed by derivation, which is what makes the backfill
 * idempotent and what must stop being identity: the moment a more important
 * record arrives, a derivation yields a different id for the same work, and
 * every record that resolved through the old one belongs to a deal that is no
 * longer the same deal. Nothing recorded that it moved, because nothing moved
 * it — the answer simply changed.
 *
 * Four steps, in this order, because the order is the correctness argument:
 *
 *   1. the alias, if one exists → the deal was minted earlier; apply there
 *   2. a root at the derived id → a deal from before this change, whose derived
 *      id IS its identity and is already fixed (no path edits a lineage, so
 *      nothing can re-derive it). Grandfathered by fact, not by exception.
 *   3. otherwise mint, ALIAS FIRST, then apply
 *
 * THE ALIAS IS WRITTEN BEFORE THE ROOT. Written after, a failure between the two
 * leaves a deal that derivation cannot find, so the retry falls past both checks
 * and mints a SECOND deal for the same chain — the exact failure the alias
 * exists to prevent, reached by writing it late. In this order the same failure
 * leaves an alias pointing at a root that does not exist yet, and the retry
 * resolves through it and applies the descriptor there. It converges instead of
 * forking, which is the only property worth having from an ordering.
 */
async function applyAsDeal(studioId: string, d: EngagementDescriptor): Promise<string> {
  const derived = d.engId;

  const aliased = await resolveDealId(studioId, derived);
  if (aliased !== derived) {
    await applyDescriptor(studioId, d);          // resolves to `aliased` itself
    return aliased;
  }

  if (await readEngagement(studioId, derived)) {
    await applyDescriptor(studioId, d);
    return derived;
  }

  const dealId = ID.engagement();
  await setDealAlias(studioId, derived, dealId);
  await applyDescriptor(studioId, { ...d, engId: dealId });
  return dealId;
}
```

Then change the three entry points. Each currently ends `await applyDescriptor(studioId, descriptor); return descriptor.engId;`. Each becomes `return applyAsDeal(studioId, descriptor);`. For example:

```ts
export async function attachTicketEngagement(
  studioId: string, ticket: Record<string, unknown>, client: Record<string, unknown> | null,
): Promise<string> {
  const [descriptor] = buildEngagements({
    salesTickets: [ticket],
    salesClients: client ? [client] : [],
  });
  return applyAsDeal(studioId, descriptor);
}
```

Do the same for `attachQuotationEngagement` and `attachProjectEngagement`. Update each function's doc comment where it says the returned id is deterministic — the derivation still runs, it is no longer what comes back.

Also update the comment on `attachToTicketEngagement`, which currently sells the absence of a lookup as a feature:

```ts
// Attach a spine record (rfq, converted quotation, invoice, …) to the ticket
// engagement it belongs to. The ticket's derived id is enough to name it — no
// lookup here, because attachRecord resolves the alias itself, so a derived id
// and a minted one both land on the same deal.
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
NOMPANY_TEST_SESSION=dealalias npm run test:integration
```

Expected: PASS, and **the four engagement-view goldens must still pass** — they redact the id, so a minted one is invisible to them. If a golden fails here, the response shape changed and that is a real regression, not a re-record.

- [ ] **Step 5: Run the whole gate**

```bash
NOMPANY_TEST_SESSION=dealalias npm test
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.strict.json
npx next build
```

Expected: all pass, 153 goldens unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/platform/db/engagement.ts tests/engagement-spine.mjs
git commit -m "A deal mints its own identity, and its derivation becomes an alias"
```

---

### Task 4: The written record says so

`docs/functionality/engagements.md:52` states "**Ids are deterministic.**" That stops being true with Task 3, and CLAUDE.md requires the functionality file to change in the same commit as the behaviour. It did not, because Tasks 1–3 are one behaviour split across three commits — so it changes here, immediately after, rather than three times.

**Files:**
- Modify: `docs/functionality/engagements.md` (the ids paragraph, and the "Not built yet" list)

**Interfaces:** none — documentation only.

- [ ] **Step 1: Rewrite the ids paragraph**

Replace the paragraph beginning "**Ids are deterministic.**" with:

```markdown
**Ids are minted, and the derivation is a lookup helper.** A deal opened now carries an
`ID.engagement()` id that never moves, and `deterministicEngId(headType, headId)` — pure-JS
SHA-1, see the header of `src/platform/db/engagementId.ts` for why it is not node:crypto —
is written onto it as an ALIAS (`s:<sid>:eng-alias:<aliasId>`). Anything holding a derived
id resolves through `resolveDealId` and lands on the deal.

This is Law 3: a record arriving out of order attaches, it never re-roots. A derived
identity could not promise that, because the moment a more important record arrived the
derivation yielded a different id for the same work.

**Deals created before this change keep their derived id**, which is still an id that never
moves — no path in the product edits a record's lineage, so nothing can re-derive them.
They have no alias and `resolveDealId` returns them unchanged. The two id spaces coexist
permanently and neither is rewritten.
```

- [ ] **Step 2: Add the gap to "Not built yet"**

Append to the list under `## Not built yet — do not assume otherwise`:

```markdown
- **Nothing re-roots a deal, because nothing can.** The alias makes a late-arriving record
  safe; it does not add one. Attaching a ticket to an existing project is still not
  possible in the product, and `setDealAlias` refuses to repoint an alias — a merge is a
  deliberate operation with its own rules and nothing implements it.
```

- [ ] **Step 3: Verify the doc matches the code**

```bash
grep -n "deterministic" docs/functionality/engagements.md
```

Expected: no line still claims the id itself is deterministic. Mentions of `deterministicEngId` as the derivation are correct and stay.

- [ ] **Step 4: Commit and push**

```bash
git add docs/functionality/engagements.md
git commit -m "The engagement file says ids are minted, because they are"
git push origin main
```

---

## Self-Review

**Spec coverage.** §3 steps 1–4 → Task 3's `applyAsDeal`. §3.1 (alias write is not best-effort) → `setDealAlias` throws and `applyAsDeal` does not catch it, so the create fails; asserted by the repoint refusal already covered in `tests/deal-store.mjs`. §3.2 (order) → Task 3, stated in the helper's comment and enforced by the code sequence. §4 (read side) → Task 1, and the table's other rows are "unchanged" by design. §5 (grandfathering) → Task 3's `testMintingIsIdempotentAndGrandfathers`. §6 (backfill idempotence) → Task 2. §7 (tests) → Tasks 1–3, one test per bullet except "a failed alias write fails the create", which is `setDealAlias`'s existing refusal and is already asserted at store level. §8 (not built yet) → Task 4.

**Placeholders.** None. Every step names its file, its command and its expected output.

**Type consistency.** `applyAsDeal(studioId: string, d: EngagementDescriptor): Promise<string>` is used with that exact signature in all three entry points. `resolveDealId`, `setDealAlias`, `readEngagement`, `applyDescriptor` and `ID.engagement` are all pre-existing exports used with their current signatures. `detachRecord` and `applyDescriptor` keep their signatures; only the meaning of the id they accept widens.
