# The record engine — a type declared as a row, and the engine supplies the rest

**Where:** `/<slug>/engine-<typeKey>`, behind `engine.<typeKey>.<verb>`.
**The pure model:** `src/platform/engine/types.ts` — no imports at all.
**The schemas:** `schema.ts`. **The sections:** `sections.ts`. **The seed:** `builtins.ts`.
**The service:** `records.ts`. **The context:** `context.ts`.
**The route:** `/api/studios/<slug>/records/<typeKey>` — one, for every type.
**The screen:** `src/components/studio2/StudioRecords.js` — one, for every type.
**The backfill:** `scripts/migrate/seed-builtin-types.mjs`.

## What it is

Every section built so far was built the same way: a schema, a service, a route, a
screen, a permission area, a Gate A block. Roughly fifty of the programme's remaining
subsections are the same shape wearing different labels — a register of things, each
with fields, a status, a reference and a few legal moves between statuses.

The record engine is the shape itself, extracted. **A record type is a ROW** —
`recordTypes` holds its label, its fields, its list columns, its statuses and its
transitions — and the engine supplies the list, the form, the reference, the moves and
the permission gate from that declaration. Adding a type is a write, not a deploy.

**This is P4b phase 1: one built-in type end to end.** It is the abstraction the five
hand-built P4a sections were built to produce, extracted from them rather than guessed at
in advance.

## Why runtime, and the two costs it buys

The alternative was code generation — a type declared in TypeScript, the screens built at
build time. That keeps `tsc` in the loop, and it makes every new type a deploy. Phase 3's
whole point is that a **studio** declares its own types, and a tenant cannot deploy.

So the declaration is data, and two things are given up. Both are real and neither is
hidden:

**`tsc` cannot see a tenant's shape.** A record's `values` is `Record<string, unknown>`
and nothing narrows it — the compiler cannot know that `transmittal` has a `recipient`.
`src/platform/engine/types.ts` is the whole guard in its place, which is why the field
kinds are a **closed set** (`FIELD_KINDS`) rather than free-form: a schema built out of
arbitrary input is not a schema. That file has **zero imports**, deliberately and by
assertion, so the type editor phase 3 ships will refuse exactly what the server refuses,
with one implementation between them rather than two that agree until they do not.

**Gate A pins the ENGINE, never a tenant's records.** Seven goldens cover the built-in
type end to end — empty list, create, populated list, edit, move, a refused move, a
refused read. A golden over a type some studio declared would pin a contract nobody
agreed to and would break the day that studio edited its own declaration. The engine's
behaviour is the contract; what a tenant does with it is not.

## Who may do what

**The permission is `engine.<typeKey>.<verb>`**, with the four ordinary verbs — view,
create, edit, delete. A record type is a row, so its key cannot be in `ALL_PERMISSIONS`,
which is built at compile time. The catalogue is **unchanged at 177** and stays there
however many types a studio declares.

**It fixed a silent drop.** `cleanPermissions` filtered on `KNOWN.has(key)`, so an engine
grant was discarded on its way to being stored — no error, no log, a right that simply
never arrived. `isEnginePermission` (`ENGINE_KEY_RE`) is the one place the catalogue stops
being a closed set, and it is deliberately narrow: **one segment and one of four verbs**,
so `engine.a.b.view` does not pass and the route's single URL segment always resolves the
same type the key names.

**The namespace IS the containment, and it rests on two prefixes being the engine's
alone.** No declared area key begins `engine.` and no declared section key begins
`engine-`. `engineeringDocs.*` and `engineering-docs` are adjacent and distinct precisely
because the prefix carries the dot and the hyphen — which is why the inverse is a regex
and not a `startsWith("engine")`. **A future section root or permission area named
`engine` would collapse the whole scheme**, and nothing in the build would complain.

**The wildcards had to learn the shape.** `effectivePermissions` short-circuits the owner
and any wildcard role onto `new Set(ALL_PERMISSIONS)`, which answers `false` for every
engine key — so the two identities that exist precisely so nobody can be locked out were
the two that could not open a seeded built-in type. It bit twice and in opposite
directions: the owner was refused a GET of their own studio's transmittals, and
`escalates()` refused the owner **granting** `engine.x.view` to anybody, because an engine
key was something the actor provably did not hold. `WildcardPermissions` answers the
question rather than listing the answers — **`has` is the authority and `size` is not**,
along with `[...access]`, `forEach` and `JSON.stringify`, all of which report the declared
catalogue alone. Nothing in `src/` enumerates a `PermissionSet` today; the day something
does it must ask `has` per key or filter with `isEnginePermission` beside it.

## What it stores

**Two collections and no more.** `recordTypes` holds the declarations; `engineRecords`
holds every instance of every type, discriminated by `typeKey`.

**One collection for every instance is FORCED, not chosen.** `COLLECTION_TABLE` and the
collection lists in `keys.ts` are compile-time, so a collection per type would need a
deploy per type — which is the exact thing runtime was chosen to avoid.

Both live under `administration-settings`, which here is **storage rather than a screen
anybody opens**: one scope addresses types and instances alike, and `engineContext`
refuses `no-section` when it is missing, the same answer every other context gives when
the rows cannot be addressed at all.

## The section, planted in the same write

A type declares a `parentSectionKey`, and `plantTypeSection` writes `engine-<typeKey>`
under it **in the same write as the type row, before it**, never lazily on first use.

**The tender register paid for the other order.** A sub-section falls back to its ROOT
when absent, so rows written before the section exists land under the parent where nothing
reads them — not deleted, not corrupted, invisible. Three tenders were created before
`tendering-register` was planted and zero were visible afterwards; only invariant 10 kept
that from being worse, by refusing to reissue the references.

**A type whose parent section is absent is skipped whole**, and `plantTypeSection` answers
null for exactly that case. Planting an orphan at the root would render in no nav at all,
which is harder to find than a refusal.

**And the nav had to be taught the namespace.** `SECTION_AREAS` is compile-time, so an
engine section can never have an entry in it — with no areas and no children it fell
through to `sectionKey === "main"`, which is false, so the section the engine planted at
studio creation rendered in **no nav, for nobody, the owner included**. The type existed,
its rights were grantable, and the screen was unreachable; the design's claim that
planting "reuses `SECTION_AREAS` so the sidebar needs no special case" was true of
`listSections` and false here, and the acceptance criterion naming a nav entry passed
vacuously. `sectionViewable` and `sectionManageable` answer an engine section from
`engine.<typeKey>.view` (and create/edit/delete) and **return on it** rather than falling
through — which is the same fix as the wildcard, from the other end.

## What the engine supplies

**One route**, `/api/studios/<slug>/records/<typeKey>`. The type comes from the URL
segment and **never from the body**, which is what makes `engine.<typeKey>.<verb>` mean
anything: a request cannot name a type it is not addressed to. The segment is the one Next
already resolved (`params`), not the URL parsed a second time.

**One screen**, generic. The GET hands back the declaration beside the rows, because a
generic screen has no other way to know what columns to draw or what moves to offer.

**A reference per record**, minted through `nextReference`, so invariant 10 holds — a
deleted record does not let the next create reissue its number.

**A record is born in the first declared status.** One born outside the chain could never
move, because every transition names a `from`.

**A move is its own act**, its own branch and its own verb — never a status written
through the edit path. `editRecord` takes the declared fields off the body and nothing
else, so a status cannot arrive that way even if somebody sends one; the branch is what
makes the rule visible rather than incidental. That shape is the one that let a rejected
change order approve itself for a fortnight.

**Two refusals on a move, and they are worth different statuses. An unknown VALUE is
stale; an unknown PAIR is a different ask.** `wrong-state` (409) is a status the type does
not declare at all — the declaration the caller worked from named it and the current one
does not, so re-reading the type is the entire repair. `not-allowed` (400) is both
statuses declared and the move between them not: no refresh makes an undeclared move
legal, so the caller has to ask for something else.

**`notfound` is answered before `forbidden`**, and not for the reason the code first gave.
It does not conceal which type keys a studio has — it makes them enumerable by probing, in
that a member holding no engine right gets 404 for an absent type and 403 for a present
one. That costs nothing, because **membership is the boundary** invariant 2 draws and a
member is already handed the studio's whole section list. What the order buys is that a
type that does not exist is not a permission question: `forbidden` would send the caller
off to ask for a right that would not have helped, and 404 tells them to fix the URL.

## Versioning — a removed field is not rendered and not deleted

A type carries a `version`; a record carries the `typeVersion` it was last written under.

**`coerceRecord` reads a stored row through the type AS IT IS NOW.** A field the type no
longer declares is not returned and not removed from the store: it stays because it is the
only record of what the row said when somebody acted on it, and it stops being rendered
because the type no longer declares it. That is what makes a version change harmless — the
reader coerces, exactly as `normalizeTask` and `planProgress` already do at their own
boundaries.

**That is true of the READ, and the next EDIT drops it.** `editRecord` rebuilds `values`
from the declaration (`valuesFrom`), so a field the type no longer names does not survive
a write of the record that holds it. Nothing exercises that today — a studio cannot remove
a field in phase 1 because no route edits a type at all — but it is stated rather than
left for somebody to find. The day the type editor ships, whether an edit preserves values
the declaration has dropped is a decision that has to be made on purpose, not inherited
from `valuesFrom` naming only the fields it knows about.

**NULL rather than nought** for a number nobody filled in. Nought is a real answer and an
empty field is not, and a list column showing `0` for both is a bug this product has fixed
a dozen times elsewhere.

## Rollout — existing studios need the script

`seedBuiltinTypes` runs inside `createStudio` and **nowhere else**, which is the one way
it differs from the two seeds beside it. Sections catch up on read and the departments
register seeds on read, so a studio predating either repairs itself the next time somebody
opens it. **A studio created before this shipped gets nothing.**

**And a read-path catch-up could not rescue it.** Every engine read is gated on
`engine.<typeKey>.view`, a key no existing studio's roles carry, so the request that would
trigger the catch-up is the request that is refused first — the seed would be waiting on a
door only the seed can open.

`scripts/migrate/seed-builtin-types.mjs` is the way in: dry-run by default, additive,
idempotent, refusing the live namespace without `--allow-live`, and **calling
`seedBuiltinTypes` rather than reimplementing it** — a second copy of the seed is free to
disagree with the first. **Run `plant-sections.mjs` first on an old studio**: a studio
missing `engineering-docs` or `administration-settings` is reported and skipped whole
rather than seeded into nothing.

**No starter role holds an engine right.** That has been the defect three sections shipped
with — contracts, tendering and procurement each shipped a section whose own Manager could
not open it — and it is stated here rather than discovered: a studio grants
`engine.transmittal.view` to a role deliberately, and until it does, only the owner and
Admin can open transmittals.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

**Tenant self-service is phase 3, and it is the whole point of the engine.** There is no
type editor: `origin: "builtin"` is what stops a studio editing a seeded type, and no
route creates, edits or deletes a `recordTypes` row at all. A type is added by shipping
code today.

**Only ONE built-in type exists** — `transmittal`, seeded at studio creation under
Engineering & Documents. Everything the engine claims about "every declared type" is
demonstrated by one.

**`listRecordTypes` is reached by no route.** It is the catalogue reader phase 3's type
management needs, filtered to the rights the caller holds, written alongside and not wired
up — the same posture the engagement layer already takes.

**`collaborator` and `reference` fields render as plain text inputs.** Both kinds are
declarable, validated and stored; the screen has no people picker and no record picker for
them yet. An honest text box rather than an absent field, and it means nothing checks that
a `reference` value names a record that exists.

**The reference prefix is the type key's first three letters.** `transmittal` mints
`TRA-0001`. Two type keys sharing three leading letters — `transmittal` and `transfer` —
would both mint `TRA-`, and their numbers would interleave in one counter. **No reference
is ever reissued, so invariant 10 still holds**; the failure mode is a confusing shared
prefix, not a repeated number. **A second type sharing a prefix with an existing one is
the trigger** to give the type row its own stored prefix instead of deriving one from the
key.

**No attachments, no comments, no audit trail.** The design lists all three among what the
engine should eventually supply; phase 1 is defined as one built-in type end to end and
none of them is in it. A record carries who created it and when it was last written, and
nothing else about its history.

**No field-level permissions.** The gate is per type and per verb: somebody who may view a
type views every field of it. There is no equivalent of `hr.employees.salary`, which is
the shape a record type would need to hide one column from a reader entitled to the rest.

**No cross-type queries and no joins.** Every read is one `typeKey` at a time. A
`reference` field stores a key and an id and nothing resolves it, so a screen cannot show
"every transmittal on this project" and a report cannot span two types.

**Nothing lists a studio's types to a person.** With no type-management screen and no
route onto `listRecordTypes`, a member discovers a type by finding its section in the
sidebar.

**No orphaned-key report.** Deleting a type would strand `engine.<typeKey>.*` grants on
roles that hold them. No type can be deleted in phase 1, so the report is deferred with
phase 3 — which is when deletion arrives, and when the two must land together.
