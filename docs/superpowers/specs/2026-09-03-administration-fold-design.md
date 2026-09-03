# Administration & Settings becomes a real section — design

**Status:** approved in conversation (2026-09-03), ready for an implementation plan.
**Completes P0** for the one section the fifteen-section restructure did not finish.
**Splits off** the locations data move, which gets its own spec — see §8.

---

## 1. Problem

**Administration & Settings is declared as a section and renders as three loose nav items.**

`SECTION_DEFS` (keys.ts) gives it three children — `administration-members`,
`administration-master`, `administration-settings`. The sidebar shows none of them. Instead
`StudioFrame.js` hardcodes three entries of its own: People at `/people` (line 244, shown to
everyone), Access at `/access` (line 245, `canAdminister`), and Studio settings as a footer
link to `/administration-settings` (line 369). `page.js` special-cases all three by literal
key match.

So the studio's nav still reflects the arrangement from before the restructure, and the
section the blueprint calls §15 never appears at all.

**This was deliberate, not neglected, and the reason is written down.** `resolve.ts:305–326`
records why each of the four keys is in `NO_SCREEN_YET`:

- `administration-settings` is reached by the router's own literal match because **reading
  studio settings is open to any member** — `GET /settings` (route.ts:133) checks membership
  and nothing else. Ungated by design.
- `administration-members` is the People screen, reached at the pre-restructure key `people`,
  **shown to everyone**. That key has never had a route of its own.
- `administration-master` has no screen at all.
- `administration` itself is invisible as a *consequence* of its children being invisible.

**The mechanical blocker is one line that does not exist.** `SECTION_AREAS` has **no
`administration-*` entries**, though `administration.members` and `administration.settings`
are real areas in the catalogue. `sectionViewable` therefore answers false for all three, and
`NO_SCREEN_YET` is what stops a test failing over it.

**And one right is already dead.** `administration.settings.view` is grantable and enforces
nothing — the GET ignores it. A right that grants nothing is what the catalogue's own rule
forbids (invariant 16), and it has been true since the restructure.

## 2. Decisions taken

Put to the user on 03/09/2026 and answered. Recorded with the reasoning.

**D1 — Fold properly: each child is gated on its own area.** Not a nav rearrangement.
`administration.members.view` decides whether People shows; `administration.settings.view`
decides whether Studio settings does. The alternative — fold the nav and keep today's
visibility — was offered and rejected: it would leave two areas still deciding nothing, which
is the defect rather than a smaller version of the fix.

**The consequence is accepted deliberately:** a member who sees People today loses it unless
their role holds the right. D5 is what stops that being felt.

**D2 — Access gets a real area, `administration.access`.** It is admin-only today via
`canAdminister`, a mechanism nothing else in the nav uses. Giving it an area makes it
grantable like everything else, so a studio can let a trusted non-admin manage roles without
making them an admin. It also needs a **section row of its own** — there is no
`administration-access` in `SECTION_DEFS` at all — which is the one genuinely new seeded key
in this change.

`escalates()` continues to govern what a grant may contain, so widening *who* may open the
roles screen does not widen what any of them can hand out.

**D3 — `administration-master` stays in `NO_SCREEN_YET`.** The plan puts master data in P7,
and the one real screen that could fill it today (locations) arrives with the data move that
is split off in §8. A nav row that opens nothing is worse than an absent one.

**D4 — The settings GET starts enforcing `administration.settings.view`.** Gating the nav on
a right the API ignores would be theatre: the screen would vanish while the endpoint behind it
stayed open to any member. The check lands in the same commit as the gating.

**D5 — Existing studios are backfilled.** A guarded, idempotent, forward-only script grants
the new rights to the starter roles that already had the access in practice, modelled on
`scripts/migrate/plant-sections.mjs`. Nobody loses a screen they use today. Granting the
rights to *every* role was rejected: it hands out a right nobody chose, which is the opposite
of what gating is for.

**D6 — The locations move is a separate change.** Moving locations from Field Operations to
Administration master data rewrites records, because rows carry `sectionId`. That is the same
class of operation P0 called "the risk in P0", and it needs invariant 17's procedure. The
fold is nav and permissions and is testable on its own; keeping them apart means a failed
migration cannot take the fold down with it.

## 3. What changes

### 3.1 A new seeded section

`SECTION_DEFS`'s `administration` children become four, in nav order:

```
administration-members   People            (exists)
administration-access    Access            (NEW)
administration-master    Master data       (exists, stays unscreened)
administration-settings  Studio settings   (exists)
```

`administration-access` is a new seeded key, so studios created before it do not have the row.
`plantMissingSections` exists for exactly this and is idempotent, forward-only and safe to
re-run; it is run once through `scripts/migrate/plant-sections.mjs`.

### 3.2 One new area

`administration.access`, verbs `view` and `edit`, in the `Administration & Settings` group.
Two keys, taking the catalogue **124 → 126**.

No area is added for `administration-master` — D3.

### 3.3 The wiring that was missing

`SECTION_AREAS` gains three entries:

```
"administration-members":  ["administration.members"]
"administration-access":   ["administration.access"]
"administration-settings": ["administration.settings"]
```

and `NO_SCREEN_YET` loses four: `administration`, `administration-members`,
`administration-access` (never listed) and `administration-settings`. **`administration-master`
stays.** The parent becomes visible through `sectionViewable`'s existing rule — a section with
children is worth showing if any child is — rather than by a rule of its own.

`resolve.ts`'s long comment above `NO_SCREEN_YET` is rewritten in the same commit. It currently
explains why four administration keys are listed; three of them will no longer be, and a
comment describing the previous arrangement is worse than none.

### 3.4 Routing

| Path | Renders |
|---|---|
| `/administration-members` | `StudioPeople` |
| `/administration-access` | `StudioRoles` |
| `/administration-settings` | `StudioSettings` (already) |
| `/people` | **redirects** to `/administration-members` |
| `/access` | **redirects** to `/administration-access` |

The redirects are not politeness. Those URLs are in bookmarks, and — more importantly — in
notification payloads already delivered, which link to `/people`. A 404 there would break
records that are already out in the world.

`page.js`'s `isPeople` / `isAccess` / `isSettings` literal matches go, along with the
`isAccess && !admin → Denied` branch: the section mechanism now answers that question, the
same way it answers it for every other screen.

### 3.5 The nav

`StudioFrame.js` loses its three hardcoded entries. The rows come from the section tree, which
means they gain what every other section already has for free: the open-group behaviour, the
active-row highlight, the Arabic labels from `shared/studio/sections.ts`, and the permission
filtering that made this change necessary.

`shared/studio/sections.ts` needs an Arabic label for `administration-access`. A missing entry
renders the raw key.

### 3.6 The endpoint

`GET /api/studios/[slug]/settings` requires `administration.settings.view` (D4). `canManage`
continues to come from `administration.settings.edit`, unchanged.

## 4. The backfill

`scripts/migrate/grant-administration.mjs`, following `plant-sections.mjs`'s shape:

- **Idempotent and forward-only.** It adds rights; it never removes one. Re-running writes
  nothing when the roles already hold them.
- **By explicit role, not by predicate, and it does NOT restore today's reach.** People is
  shown to *everyone* today (`show: true`), so "the roles that could reach it" is every role —
  and granting it to every role is what D5 rejected. The backfill grants by JUDGEMENT instead,
  and the judgement is stated here so it can be argued with rather than discovered:

  | Starter role | `administration.members.view` | `administration.access.*` |
  |---|---|---|
  | Admin | — (wildcard; holds everything already) | — (wildcard) |
  | Manager | **granted** | not granted |
  | Team Lead | **granted** | not granted |
  | Member | not granted | not granted |
  | Viewer | not granted | not granted |

  **So Members and Viewers do lose the People screen**, and that is the change working rather
  than failing: seeing who else is in the studio, and their roles, is a management view. Admin
  is untouched because the wildcard already answers for it — writing keys onto a wildcard role
  would be the first place a future reader learned to distrust what `wildcard: true` means.

  A studio that disagrees grants the right; that is what making it a right was for.
- **Never a broad-prefix write.** Invariant 17's rule applies to writes as well as deletes:
  the script names the studios it touches from the registry and reports what it changed.
- Guarded the way the existing migrate scripts are, and run once.

Studios created after this change get the rights from their seeded roles instead, so the
script is a one-off rather than a permanent reconciliation.

## 5. What can actually break

None of these has a golden, and all four are the reason the acceptance test is a walk rather
than a suite:

- **A member sees an empty Administration heading.** `sectionViewable` returns true for a
  parent when any child is viewable; a member holding none of the three must see no section at
  all, not a heading with nothing under it.
- **Somebody loses People without it being intended.** Members and Viewers lose it BY DESIGN
  (§4). What must not happen is a Manager or Team Lead losing it because the backfill missed
  their role — and the symptom of that is a screen that quietly vanished rather than an error,
  which is why the script reports what it changed instead of running silently.
- **The redirect loops.** `/people` → `/administration-members` must not resolve back through
  a rule that sends it to `/people`.
- **An Arabic studio renders `administration-access` as a raw key.**

## 6. Contract movement

Stated ahead of time so none of it lands as a side effect:

- the permission matrix goes **124 → 126**; `tests/gate-a.mjs` hardcodes the count and its
  comment gains a line saying which right and why;
- `tests/goldens/owner.roles.json` re-records — the only golden carrying the catalogue's
  areas — **in its own commit with the reason stated**;
- any golden carrying the nav or the visible section list moves with it. **Measured, not
  assumed**: the record run is inspected before it is committed, and a golden that moves for a
  reason this spec did not predict stops the work rather than being recorded over.

## 7. Testing

**Pure**, in `tests/restructure.mjs` and `tests/access.test.mjs`, where the section-shape
assertions already live:

- every seeded key still has either a right behind it or a `NO_SCREEN_YET` entry — the existing
  assertion, which is what would have caught this being done by halves;
- `administration-master` is still declared, because it is still unscreened;
- `sectionViewable("administration")` is false for a person holding none of the three areas,
  true for a person holding any one;
- one key grants exactly itself — the existing matrix assertion, over 126 keys.

**Integration**, against real routes:

- a member with `administration.members.view` and nothing else sees People and no other child;
- an admin sees all three;
- `GET /settings` refuses somebody without `administration.settings.view` — the right that
  enforced nothing before this change;
- the roles screen opens for a non-admin holding `administration.access.view`, and
  `escalates()` still refuses them a grant they do not hold;
- `/people` and `/access` redirect rather than 404.

**The acceptance test is a walk**, in the sandbox, in both languages: a member with none of the
rights sees no Administration section; one with a single right sees the parent and only that
child; an owner sees all three with the group open and the active row highlighted.

## 8. Not in this change

Stated in words, because a silent gap reads as a finished feature.

- **Locations do not move.** They stay on the Field Operations screen that draws them.
  `administration-master` therefore stays unscreened and stays in `NO_SCREEN_YET`. Its own
  spec covers the record rewrite, under invariant 17's procedure.
- **No master-data screens.** Currencies, UoM, numbering series, cost codes, the industry
  taxonomy and the flow-template editor are P7. The flow editor exists but lives in Studio
  settings today and is not moved here.
- **No integrations, API, notification templates or print formats** — also P7.
- **`canAdminister` is not removed.** It remains the owner/admin shortcut inside the resolver
  and continues to short-circuit `effectivePermissions`; what changes is that the Access screen
  no longer depends on it alone.
- **The People screen itself is unchanged.** This moves where it is reached and who may reach
  it, not what it does.
