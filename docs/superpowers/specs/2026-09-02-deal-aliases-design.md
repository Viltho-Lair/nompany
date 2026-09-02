# Deal aliases — design

**Status:** approved in conversation (2026-09-02), ready for an implementation plan.
**Supersedes nothing.** Corrects shipped Phase 1b behaviour in the engagement spine
(`src/platform/db/engagement.ts`, `src/platform/engagement/backfill.ts`).
Implements Law 3 of `2026-08-30-erp-multi-industry-program-design.md` §P2, and builds on
`2026-08-26-engagement-storage-model-design.md` §3.4 (deterministic engagement ids).

---

## 1. Problem

**A deal's identity is derived, and a derivation can change.**

`engagementIdForLineage` picks a head from a record's lineage in a fixed order — ticket,
then quotation, then project — and `deterministicEngId` hashes it into `eng_<12 hex>`.
That id is the deal. It is what `applyDescriptor` writes the root at, what `recEng`
points to, and what the engagements view lists.

Law 3 says a deal must be enterable at any point, which means the record that opens it
mints an identity that never moves. A derived identity cannot promise that: the moment a
"more important" record arrives — a sales ticket raised after the project it belongs
to — the derivation yields a different id for the same work. Every record that resolved
through the old one now belongs to a deal that, from the layer's point of view, is not
the same deal. Nothing records that it moved, because nothing moved it: the answer to
"which deal is this?" simply changed.

**The mechanism to fix it is already built and does nothing.** `ENG.alias`
(`src/platform/db/keys.ts`), `resolveDealId` and `setDealAlias`
(`src/platform/db/engagement.ts`) all exist, with the repoint refusal that makes an alias
safe, and `tests/deal-store.mjs` asserts resolution, attach-through-alias and
contribute-through-alias. Five of P2's new stage types — `timesheets`, `inspections`,
`changeOrders`, `jobs`, `payments` — already call `resolveDealId` on the way in.

But **nothing calls `setDealAlias`**, and `createEngagement` — the only function that
mints a permanent id — is used by tests alone. Every live path still goes through
`applyDescriptor` with a derived id, so in production `resolveDealId` is the identity
function and the alias table is empty. This is the shape invariant 16 forbids: a
mechanism that exists, is tested, and exercises nothing.

**There is no live trigger today, and that is why this is the right moment.** A project's
lineage is fixed at creation (`openProject` takes a quotation or nothing), and no path
attaches a ticket to an existing project or quotation afterwards. So no deal is being
re-rooted right now. The exposure is that derived ids are already in the wild — in
`recEng` pointers, in the backfill's output, in the engagements view — and P2 will add
records that arrive out of order. Correcting the structure before the trigger exists
costs one design; correcting it afterwards costs a migration of live deals whose records
have already moved.

## 2. Goal

**Identity is minted once and never derived again — but the derivation keeps working, as
a lookup helper.**

- A deal opened from now on carries a minted `ID.engagement()` id.
- The id its lineage derives is written as an **alias** pointing at it.
- Every place that derives an id resolves it through the alias before using it.
- Deals that already exist keep the derived id they have. It is still an id that never
  moves, so it is still correct — see §5.

Delivered as a **compatibility layer, not a rewrite**, in the program spec's own words: no
existing dual-write is removed, no live data is touched, and `deterministicEngId` is
unchanged byte for byte.

## 3. Where identity is minted

The three spine entry points — `attachTicketEngagement`, `attachQuotationEngagement`,
`attachProjectEngagement` — hand `descriptor.engId` straight to `applyDescriptor` today.
Each gains one resolution step in front of it. In order, because the order is the whole
correctness argument:

1. **Derive** exactly as today, so the clustering a live create produces and the
   clustering the backfill produces stay identical. Nothing about `buildEngagements`
   changes.
2. **Resolve the derived id through the alias.** A hit means this deal already exists and
   was minted earlier — apply the descriptor at the resolved id and mint nothing. This is
   what makes a re-entry, a retry and a reconcile pass all land on one deal.
3. **Otherwise, read the root at the derived id.** A root there means a deal created
   before this change, whose derived id *is* its real id. Use it. Write no alias: an
   alias from an id to itself is refused by `setDealAlias` and would be meaningless
   anyway.
4. **Otherwise this is a new deal.** Mint `ID.engagement()`, apply the descriptor at the
   minted id, and write `setDealAlias(derived → minted)`.

Step 3 is what makes "no migration" honest rather than a deferral. The two id spaces
coexist permanently: pre-change deals answer to their derived id, post-change deals
answer to a minted one with the derivation aliased onto it. Neither is ever rewritten,
and `resolveDealId` returns its input for the first kind — which is exactly what it is
documented to do for a caller already holding a real deal id.

### 3.1 The alias write is not swallowed inside the mint — the callers around it are

`applyAsDeal` — the function that mints, writes the alias and applies the descriptor — lets
`setDealAlias` throw. Nothing inside it catches the refusal. That much is true today and is
worth keeping true: a minted deal whose derived id resolves to nothing is worse than either
alternative, because the deal exists, the lineage points at empty space, and the next create
for the same chain mints a **second** deal.

But `applyAsDeal` is not the create. It is called from inside `attachTicketEngagement`,
`attachQuotationEngagement` and `attachProjectEngagement`, and every one of THOSE is called
from its own `try { … } catch { /* best-effort */ }` at the call site — the same shape every
other dual-write on this spine uses, because they are additive to a record that already
stands on its own and must never fail the create they are riding on. This one rides on a
create too, so it is wrapped the same way, and a failure inside `applyAsDeal` propagates
straight into that catch. **The create still succeeds when the alias write fails.** What
does not happen is the half-written state the paragraph above warns about: because the
alias is written before the root (§3.2), a failure at any point before `applyDescriptor`
returns leaves **nothing** — no root, no alias, no deal a lineage could resolve to and
disagree with later. That is the ordinary best-effort outcome this spine already lives with
everywhere else: the create succeeds, the deal is never minted, and the next attempt for the
same chain — a retry, a reconcile pass, the backfill — starts from the same "nothing exists
yet" state and mints cleanly. It is §3.2's ordering that makes this safe, not a throw
reaching the caller: the throw never reaches past the best-effort wrapper, and it does not
need to, because there is nothing left half-built for it to protect.

### 3.2 The alias is written before the root, and the order is load-bearing

Mint, then `setDealAlias`, then `applyDescriptor` at the minted id.

Written the other way round — root first, alias second — a failure between the two leaves a
deal that exists and cannot be found by derivation, so the retry falls through step 2 and
step 3 and **mints a second deal for the same chain**. That is the exact failure the alias
exists to prevent, reached by writing it late.

In this order a failure between the two leaves an alias pointing at a root that does not
exist yet, and the retry resolves through it (step 2) and applies the descriptor there.
The partial state converges instead of forking, which is the only property worth having
from an ordering.

## 4. Where identity is read

| Call site | Today | After |
|---|---|---|
| `attachRecord` | **already resolves** | unchanged |
| `attachToTicketEngagement` | derives, calls `attachRecord` | unchanged — it inherits that resolve |
| `detachRecord` | edits `ENG.root(engId)` directly, no resolve | **resolves**, symmetric with `attachRecord` |
| `engagementIdFor` | reverse index, falling back to derivation | unchanged — `detachRecord` resolves what it returns |
| `engagementIdForLineage` | pure derivation | unchanged — it stays pure, callers resolve |
| the five new stage types | already call `resolveDealId` | unchanged |

**Only one read-side change is needed, and it is not the one this section first claimed.**
`attachRecord` has resolved through the alias since it was written, so every attach path
above it already lands on the right deal. `detachRecord` does not, and that asymmetry is
the bug: given a derived id for a minted deal it would edit a root that does not exist and
take the "no root → nothing to clear" branch — a silent no-op on a detach, which is the
worst available outcome, because the record stays a member of a deal it has left.

So detach resolves the way attach does. Every caller stays unchanged, including
`engagementIdFor`'s derivation fallback, which is free to keep returning a derived id.

**The hop cost is zero on the attach path** (the read is already paid inside `attachRecord`)
and **one read on detach**. The ceilings Gate A pins are on GET routes — studio ≤3 waves,
sales ≤4, technical ≤6 — and none of them attach or detach.

`engagementIdForLineage` stays pure and synchronous. It is imported by code that cannot
await, and turning a pure derivation into an I/O call is how a helper ends up doing a
database read inside a loop somebody wrote assuming it was arithmetic.

## 5. Why an unaliased derived id is still correct

A pre-change deal's root sits at `eng_<sha1(head)>` and no alias points at it.
`resolveDealId` returns the input unchanged, the root is found, and everything works.

The id is derived, but it is also **already fixed**: the head record that produced it
exists, its lineage is not editable through any path in the product, and the derivation is
deterministic. What Law 3 forbids is an identity that *can* change, and for these deals it
cannot — there is no path that would re-derive them differently. They are grandfathered by
fact, not by exception.

If P2 later adds a path that edits a record's lineage, that path is what must write the
alias, and `setDealAlias` is waiting for it.

## 6. Backfill and reconcile idempotence

**This is the hazard the design exists around.**

`applyDescriptor` writes the root at `d.engId`, which the backfill computes by derivation.
Once a deal has been minted, a backfill re-run over the same chain would write a **second**
root at the derived id, strand the alias pointing past it, and leave two deals where the
whole point was one.

So `applyDescriptor` resolves `d.engId` through the alias before it does anything else, and
writes at the resolved id. Every other property it holds today — the provenance ranks it
must not destroy, the `locked` fail-safe, ZADD idempotence, the reverse index — is
unchanged and now applies to the right root.

This makes the alias the single point of truth about which deal a chain is. The reconciler,
the CLI (`scripts/migrate/backfill-engagements.mjs`) and the live create paths all ask the
same question of the same table and get the same answer.

## 7. Testing

Written before the implementation, in `tests/engagement-spine.mjs` — the spine's own suite.
`tests/deal-store.mjs` already covers the store primitives and needs nothing.

- **A ticket mints a permanent id.** Creating a ticket produces a deal whose id is not
  `deterministicEngId("ticket", ticketId)`.
- **The derived id resolves to it.** `resolveDealId(derived)` returns the minted id, so
  anything holding a derived id — a `recEng` pointer, a caller that derived one — lands on
  the deal.
- **A second create for the same chain is idempotent.** No second root, no second alias,
  and the repoint refusal is never reached because step 2 answered first.
- **A backfill re-run over a minted deal creates no second root.** Assert the root at the
  derived id is absent and the minted root still holds its members.
- **A pre-change deal resolves to itself.** Write a root at a derived id with no alias, the
  way a deal created before this change looks, and assert every path finds it.
- **`applyAsDeal` does not swallow a failed alias write.** Assert the refusal reaches
  `applyAsDeal`'s own caller rather than being caught inside it. That caller — one of the
  three best-effort wrappers on the spine — is what actually decides the create's fate (see
  §3.1), so this test is a guard on `applyAsDeal`'s shape, not a claim about whether a create
  can fail: the ordering in §3.2 is what keeps a swallowed failure from stranding a deal.

Golden responses are untouched. `main.engagements.list.json` and
`main.engagements.block.json` are the only two carrying an engagement id, and both redact
it as `<eng_ID>` — verified before this spec was written, because a golden change would
have made this a different piece of work.

## 8. Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **The `deals` container.** No `template_id`, no `industry_id`, no nine context facts with
  the contribution rule. `contributeContext` exists and is tested; wiring the facts to the
  create paths is its own P2 item.
- **`deal_members`.** Membership is still derived clustering. Cardinality and `onDelete`
  from the registry, per template, are the next item after this one.
- **No late-arrival path.** This makes the structure safe for a record that arrives out of
  order; it does not add one. Attaching a ticket to an existing project is still not
  possible in the product.
- **No migration.** The engagements already live keep their derived ids forever. Converging
  the two id spaces was considered and declined: it touches live data under invariant 17
  for no behavioural gain.
- **No merge.** `setDealAlias` refuses to repoint, and nothing implements the deliberate
  merge a repoint would require.
