# Studio ownership — how many studios one person may own

## What it is

A studio is a tenant. **Owning one is not a permission, it is a fact on the registry
row** — `ownerUserId` — and it is what `effectivePermissions` short-circuits on to give
the owner every right without writing any of them down.

One person may own **more than one studio**. The cap is on the free ones:

| Package | How many one person may own |
|---|---|
| The default package (`Free`) | **2** — `FREE_STUDIO_LIMIT`, `modules/main/studios.ts` |
| Any other package | Unlimited |

Every studio is **born on the default package**, so reaching a third *paid* studio means
upgrading as you go: create, upgrade in `/super`, create again. What cannot happen is a
third studio sitting on the free package.

## What it stores

Nothing of its own. Ownership is **derived** from `ownerUserId` on the row in
`g:studios`, and the package it counts is `packageId` on that same row.

There used to be an `ix:owner:<UserID>` claim — a `SET NX` that made a second create
fail at the repository layer. **It is gone.** A cap of "two, unless the package says
otherwise" cannot be expressed as a uniqueness claim, and the registry read the cap
needs was the read the lookup already did, so the index had become a second round trip
answering strictly less. Removing it also took a per-user hop out of
`listUsersForConsole`, which held the whole registry and still asked.

`SWEEP_SCOPES` in `platform/db/cascade.ts` still scans `ix:owner:` — that is deliberate.
Nothing writes those keys any more, which makes every one of them an orphan by
definition, and reaping orphans is that function's whole job.

## What it does

**Creating** (`createStudio`, `modules/main/studios.ts`) counts twice:

1. A **cheap refusal** before anything is claimed — one registry read, so a person who
   is already at the ceiling is told so without a slug being taken or a section written.
2. The **authoritative** count, inside the `editArr(REG.studios)` compare-and-set. The
   rows it counts are the rows the write lands against, so two creates racing produce
   one winner and one refusal rather than a third free studio. This is what the `SET NX`
   used to provide for free.

If the second check refuses, the seeded prefix is deleted and the slug claim released —
not left for the orphan sweep, because an unreleased slug burns a public address nobody
owns. Deliberately **not** `cascadeDeleteStudio`: that reads the registry looking for a
row that was never written, and would emit a "studio deleted" the console should never
see.

The refusal is `free-studio-limit` (409), and it carries `limit` so the dialog can state
the ceiling instead of hardcoding a number that would drift.

**Counting** is `countFreeStudios(rows, userId, defaultPackageId)` — pure, so it can be
asserted without a database and so the authoritative check can run where the rows are
already in hand. An **absent** `packageId` counts as free: that is the direction that
cannot be exploited, and it agrees with `planForStudio`, which falls back to
`DEFAULT_PACKAGE` for the same row.

**Reading** is `listOwnedStudios(userId)` — one registry read, newest first.
`studiosForUser` ranks them most-opened first and subtracts **all** owned ids from the
collaboration list (the owner holds a Collaborator row in each of their own studios, so
subtracting only the first would list their other studios as places somebody let them
into).

**Deleting a user** cascades **every** studio they own, in sequence. Deleting one and
leaving the rest would strand studios whose owner does not exist — rows nobody can
reach, since ownership is what grants the owner role.

## Two studios owned by one person share nothing

Owning both changes the tenant boundary not at all, and the suite asserts it
(`== two studios owned by one person share nothing`):

- The two studios seed the **same section keys and no shared section ids** — every
  collection key is `SEC.col(studioId, sectionId, name)`, so a shared `SectionID` would
  be the one way two studios could name the same bucket.
- The owner is a **different CollaboratorID in each** (invariant 6), so notifications,
  signatures and assignments cannot cross.
- A row written in one is absent from the other.
- `studioContext` resolves from the slug every time; there is no per-user shortcut that
  could reuse one studio's context for another.

## API shape

`GET /api/studios` → `{ owned: Studio[], collaborations: Studio[] }`.
`GET /api/identity/me` → `{ …, studios: Studio[], collaborations: Studio[] }`.

Both were singular (`owned: Studio | null`, `studio: Studio | null`) and were changed
rather than joined by a plural sibling — two names for one fact is how the account
screen and the API come to disagree about which studio is "theirs". Their goldens were
re-recorded deliberately.

## Not built yet

- **The cap is only checked at creation.** `/super` changing a studio's package back to
  the default does not re-check it, so an operator can leave somebody holding three free
  studios. The console operator is trusted; enforcing it at downgrade is not built.
- **A `packageId` that is set but no longer names a catalogue item counts as paid**
  here, while `planForStudio` displays it as free. Closing that would mean reading the
  package catalogue on every create to learn something only `/super` deleting a live
  package can cause. Not built.
- **Ownership cannot be transferred.** `updateStudio` treats `ownerUserId` as immutable
  and there is no route that changes it; the only way a studio changes hands is not
  built.
- **No per-user plan.** The cap is a constant, not something a package or tier sets.
  Making it plan-driven would need a concept the platform does not have — plans attach
  to studios, not to people.
