# Connected calendars, Phase 2 — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inside a studio, a member chooses whether colleagues **there** may see when they are busy — and colleagues see busy blocks only, never what the meeting is.

**Architecture:** A per-studio list of CollaboratorIDs who have opted in (`s:<studioId>:calendarShare`), separate from the per-user connection so it cascades with the studio and leaves the person's connection alone. Colleagues are served by a **different provider endpoint** — Google's `freeBusy.query`, Microsoft's `getSchedule` read as `availabilityView` only — so a rendering bug cannot leak a title that was never fetched.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (`noImplicitAny`), the `route()` wrapper, `getJSON`/`editJSON` over Postgres, plain `fetch` against Google Calendar v3 and Microsoft Graph v1.0.

**Spec:** `docs/superpowers/specs/2026-09-03-connected-calendars-design.md` — read it first, especially §4.2, §5.1 item 4, §7.2, §7.3 and §8. Phase 1 is on `main`; this is §8.1's second phase.

## Global Constraints

- **Keys are built only in `src/platform/db/keys.ts`** (invariant 1).
- **Writes go through `editArr`/`editJSON`** (invariant 8) — no blind read-modify-write.
- **CollaboratorID is the identity inside a studio, never UserID** (invariant 6). The user id appears only where a token must be resolved, and never in anything a studio surface renders.
- **Membership authorises; the URL never does** (invariant 2).
- **No new permission key.** The opt-in is the control. A right that duplicated it would be a second gate free to disagree with the first, and a right nothing can exercise is a bug (invariant 16).
- **nompany stores credentials, never calendar content** (spec §7.3). Busy intervals are fetched on demand and discarded.
- **Microsoft's `getSchedule` can return `subject` and `location`.** Read **`availabilityView` only**; never map `scheduleItems`. On Google the guarantee is structural; on Microsoft it is a rule this code must keep, and the comment saying so is load-bearing.
- **`src/shared/**` is pure and client-safe** — zero imports in `src/shared/calendar.ts`; keep it that way.
- **No new npm dependency.** Bundle budget is a CI gate: largest chunk 158 KB gz / 250 KB, total 1589 KB gz / 1600 KB.
- Commit subjects are declarative sentences describing the state after the change. End each with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **The shared Cloud SQL is currently refusing direct connections (`ECONNRESET`).** Any step needing the live database may fail through no fault of the implementer. Where that happens: say so plainly with the error, state what could and could not be verified, and do **not** hand-edit a golden to compensate.

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `src/platform/db/keys.ts` | **Modify.** `S.calendarShare(studioId)`. | 1 |
| `src/platform/auth/calendarShare.ts` | **Create.** Who has opted in, in one studio. Opt in, opt out, read. | 1 |
| `src/shared/calendar.ts` | **Modify.** Pure busy-interval merge/normalise. Still zero imports. | 2 |
| `src/lib/data/calendarFreeBusy.ts` | **Create.** Both providers' free/busy calls. The only place `getSchedule` is touched. | 2 |
| `src/lib/data/studioAvailability.ts` | **Create.** Collaborator → user → connections, gated on membership and opt-in. Returns intervals only. | 3 |
| `src/app/api/studios/[slug]/calendar-share/route.ts` | **Create.** GET my setting, PUT to change it. | 4 |
| `src/app/api/studios/[slug]/availability/route.ts` | **Create.** GET the team's busy blocks for a range. | 4 |
| `src/components/planner/AvailabilityStrip.tsx` | **Create.** The colleague-facing view, and the toggle beside it. | 5 |
| `src/components/planner/PlannerShell.tsx` | **Modify.** Mount the strip. | 5 |
| `tests/connected-calendars.mjs` | **Modify.** Append; it is the pure-assertion file. | 1,2,3 |
| `tests/gate-a.mjs` | **Modify.** Two goldens. | 4 |
| `docs/functionality/calendar.md` | **Modify.** Phase 2 section; move sharing out of "Not built yet". | 6 |

---

### Task 1: Who has opted in, in this studio

**Files:** Modify `src/platform/db/keys.ts` (in `S`, after `settings`); create `src/platform/auth/calendarShare.ts`; modify `tests/connected-calendars.mjs`.

**Interfaces — Produces:**
```ts
export function listSharers(studioId: string): Promise<string[]>;              // CollaboratorIDs
export function isSharing(studioId: string, collaboratorId: string): Promise<boolean>;
export function setSharing(studioId: string, collaboratorId: string, on: boolean): Promise<string[]>;
export function cleanSharers(raw: unknown): string[];                          // pure, exported for tests
```

- [ ] **Step 1: Add the key**

In `keys.ts`, inside `S`, after `settings`:

```ts
  // WHO IN THIS STUDIO LETS COLLEAGUES SEE WHEN THEY ARE BUSY — CollaboratorIDs,
  // per invariant 6. A SEPARATE KEY from the person's calendar connection
  // (u:<id>:cal:<provider>) on purpose: cascade-by-prefix destroys this list with
  // its studio while leaving the connection alone, which is the right outcome for
  // somebody who leaves one studio and stays in another. A flag on the connection
  // could not express "shared here, not there" at all.
  calendarShare: (studioId: string) => `${P}s:${studioId}:calendarShare`,
```

- [ ] **Step 2: Write the failing test**

Append to `tests/connected-calendars.mjs`, before its closing failure count:

```js
const { cleanSharers } = await import("../src/platform/auth/calendarShare.ts");

console.log("\ncalendar share list");
{
  ok("a stored list of ids survives",
    JSON.stringify(cleanSharers(["col_a", "col_b"])) === JSON.stringify(["col_a", "col_b"]));
  // THE WRITE BOUNDARY. Anything that is not a non-empty string is dropped, so a
  // malformed body cannot put a null or an object into a list the availability
  // route later resolves to real people.
  ok("non-strings are dropped", JSON.stringify(cleanSharers(["col_a", null, 7, {}, ""])) === JSON.stringify(["col_a"]));
  ok("duplicates collapse", JSON.stringify(cleanSharers(["col_a", "col_a"])) === JSON.stringify(["col_a"]));
  ok("a non-array reads as nobody", JSON.stringify(cleanSharers("col_a")) === JSON.stringify([]));
  ok("absent reads as nobody", JSON.stringify(cleanSharers(undefined)) === JSON.stringify([]));
}
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node tests/connected-calendars.mjs` — expected FAIL, `Cannot find module .../calendarShare.ts`.

- [ ] **Step 4: Implement**

`setSharing` uses **`editJSON` with a function patch** (invariant 8) — two people toggling at once must not lose one another's entry. The header must state that this list holds no calendar data, only who has consented, so a reader does not mistake it for a cache.

- [ ] **Step 5: Verify and commit**

Run: `node tests/connected-calendars.mjs && npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json`
Then: `NOMPANY_TEST_SESSION=p2a npm run test:gate-a` — Gate A asserts every builder in `keys.ts` is namespaced and covers a new one automatically. **If it dies with `ECONNRESET`, that is the known Cloud SQL fault — report it, do not work around it.**

```bash
git add src/platform/db/keys.ts src/platform/auth/calendarShare.ts tests/connected-calendars.mjs
git commit -m "$(cat <<'EOF'
A studio records who lets colleagues see when they are busy

CollaboratorIDs, in their own key rather than a flag on the person's calendar
connection. Cascade-by-prefix destroys this list with its studio and leaves the
connection alone - the right outcome for somebody who leaves one studio and
stays in another, and the only shape that can express "shared here, not there".

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Free/busy from both providers

**Files:** Modify `src/shared/calendar.ts`; create `src/lib/data/calendarFreeBusy.ts`; modify `tests/connected-calendars.mjs`.

**Interfaces — Produces:**
```ts
// src/shared/calendar.ts — pure, still ZERO imports
export type BusyInterval = { start: string; end: string };            // both ISO instants
export function mergeBusy(intervals: BusyInterval[]): BusyInterval[]; // sorted, overlaps coalesced
export function availabilityViewToIntervals(view: string, fromISO: string, slotMinutes: number): BusyInterval[];
// src/lib/data/calendarFreeBusy.ts
export function busyFor(a: { userId: string; provider: CalendarProvider; from: string; to: string }): Promise<BusyInterval[]>;
```

**This is the task the spec singles out.** Google's `freeBusy.query` **cannot** return a title. Microsoft's `getSchedule` **can** — its `scheduleItems` carry `subject` and `location`. So the Microsoft path reads **`availabilityView`** and nothing else: a string of digits, one per slot, `0` free and `1`/`2`/`3` busy in some form. Mapping `scheduleItems` would leak exactly what this phase promises not to show.

- [ ] **Step 1: Write the failing test**

Append to `tests/connected-calendars.mjs`:

```js
const { mergeBusy, availabilityViewToIntervals } = await import("../src/shared/calendar.ts");

console.log("\nfree/busy");
{
  ok("overlapping intervals coalesce",
    JSON.stringify(mergeBusy([
      { start: "2026-09-03T09:00:00.000Z", end: "2026-09-03T10:00:00.000Z" },
      { start: "2026-09-03T09:30:00.000Z", end: "2026-09-03T11:00:00.000Z" },
    ])) === JSON.stringify([{ start: "2026-09-03T09:00:00.000Z", end: "2026-09-03T11:00:00.000Z" }]));

  ok("touching intervals coalesce",
    mergeBusy([
      { start: "2026-09-03T09:00:00.000Z", end: "2026-09-03T10:00:00.000Z" },
      { start: "2026-09-03T10:00:00.000Z", end: "2026-09-03T11:00:00.000Z" },
    ]).length === 1);

  ok("a gap is preserved",
    mergeBusy([
      { start: "2026-09-03T09:00:00.000Z", end: "2026-09-03T10:00:00.000Z" },
      { start: "2026-09-03T11:00:00.000Z", end: "2026-09-03T12:00:00.000Z" },
    ]).length === 2);

  ok("unsorted input still merges",
    mergeBusy([
      { start: "2026-09-03T11:00:00.000Z", end: "2026-09-03T12:00:00.000Z" },
      { start: "2026-09-03T09:00:00.000Z", end: "2026-09-03T11:00:00.000Z" },
    ]).length === 1);

  ok("nothing in, nothing out", mergeBusy([]).length === 0);

  // MICROSOFT'S availabilityView IS A STRING OF SLOT CODES: "0" free, anything
  // else busy. It is the ONLY field this codebase reads from getSchedule,
  // because scheduleItems carries subject and location and this phase promises
  // colleagues never see either.
  const iv = availabilityViewToIntervals("002200", "2026-09-03T09:00:00.000Z", 30);
  ok("free slots produce no interval, busy slots do", iv.length === 1, JSON.stringify(iv));
  ok("...spanning exactly the busy run",
    iv[0].start === "2026-09-03T10:00:00.000Z" && iv[0].end === "2026-09-03T11:00:00.000Z",
    JSON.stringify(iv[0]));
  ok("an all-free view is empty", availabilityViewToIntervals("0000", "2026-09-03T09:00:00.000Z", 30).length === 0);
  ok("an all-busy view is one interval", availabilityViewToIntervals("2222", "2026-09-03T09:00:00.000Z", 30).length === 1);
  ok("an empty view is empty", availabilityViewToIntervals("", "2026-09-03T09:00:00.000Z", 30).length === 0);
}
```

- [ ] **Step 2: Run it to verify it fails; then implement the pure half**

Run: `node tests/connected-calendars.mjs` — expected FAIL.

`mergeBusy` and `availabilityViewToIntervals` go in `src/shared/calendar.ts`, which must keep **zero imports**. All arithmetic in UTC, as the rest of that file already does.

- [ ] **Step 3: Implement the provider half**

`src/lib/data/calendarFreeBusy.ts`, taking its token only through `getCalendarAccessToken(userId, provider)`:

- **Google:** `POST https://www.googleapis.com/calendar/v3/freeBusy` with `{ timeMin, timeMax, items: [{ id: "primary" }] }`; read `calendars.primary.busy`.
- **Microsoft:** `POST https://graph.microsoft.com/v1.0/me/calendar/getSchedule` with `{ schedules: [<the account email>], startTime, endTime, availabilityViewInterval: 30 }`; read **`value[0].availabilityView`** and pass it to `availabilityViewToIntervals`. **Do not read `scheduleItems`.** Put the reason in a comment directly above the read, naming `subject` and `location` as what would leak.

Carry the provider's own error message on failure, as `calendarReads.ts` already does — and reuse its timeout constant rather than a third literal.

- [ ] **Step 4: Verify and commit**

Run: `node tests/connected-calendars.mjs && npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json`

```bash
git add src/shared/calendar.ts src/lib/data/calendarFreeBusy.ts tests/connected-calendars.mjs
git commit -m "$(cat <<'EOF'
A colleague's calendar answers when, and never what

Google's freeBusy cannot return a title. Microsoft's getSchedule can - its
scheduleItems carry subject and location - so the Microsoft path reads
availabilityView and nothing else. The privacy guarantee is structural on one
provider and a rule this code must keep on the other, which is why the comment
above that read names exactly what would leak.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Who may see whose availability

**Files:** Create `src/lib/data/studioAvailability.ts`; modify `tests/connected-calendars.mjs`.

**Interfaces:**
- Consumes: `listSharers` (Task 1), `busyFor` (Task 2), `mergeBusy` (Task 2), `getCollaboratorByUser`/the collaborators list from `@/platform/auth/collaborators`, `listConnections` from `@/platform/auth/calendarConnections`.
- Produces:
```ts
export type TeamAvailability = { collaboratorId: string; busy: BusyInterval[] }[];
export function teamAvailability(a: { studioId: string; from: string; to: string }): Promise<TeamAvailability>;
export function visibleSharers(sharers: string[], members: { id: string }[]): string[];   // pure
```

**The gate, and both halves are required:** a colleague's busy blocks are visible only if they are **a member of this studio** *and* **on this studio's share list**. `visibleSharers` is the pure intersection, exported so the rule is testable without a store — a stale id left on the list after somebody leaves must not resolve to anybody.

**Addressed by CollaboratorID throughout.** The user id is used only to reach `listConnections`, and must never appear in the returned shape.

- [ ] **Step 1: Write the failing test**

```js
const { visibleSharers } = await import("../src/lib/data/studioAvailability.ts");

console.log("\nwho is visible");
{
  const members = [{ id: "col_a" }, { id: "col_b" }];
  ok("a member who opted in is visible",
    JSON.stringify(visibleSharers(["col_a"], members)) === JSON.stringify(["col_a"]));
  ok("a member who did not opt in is not",
    JSON.stringify(visibleSharers([], members)) === JSON.stringify([]));
  // A STALE ID IS THE ONE THAT MATTERS. Somebody leaves the studio; their id can
  // linger on the share list. It must resolve to nobody rather than to a person
  // who is no longer a member.
  ok("an id left behind by somebody who left resolves to nobody",
    JSON.stringify(visibleSharers(["col_gone"], members)) === JSON.stringify([]));
  ok("order follows the member list, not the share list",
    JSON.stringify(visibleSharers(["col_b", "col_a"], members)) === JSON.stringify(["col_a", "col_b"]));
}
```

- [ ] **Step 2: Run it to verify it fails; implement; re-run**

Run: `node tests/connected-calendars.mjs` before and after — FAIL, then PASS.

`teamAvailability` resolves each visible sharer to their user, reads their connections, calls `busyFor` per provider, and merges. **A person with no connection contributes an empty `busy` array rather than being omitted** — the strip should show them as a row with nothing on it, not silently drop them.

- [ ] **Step 3: Typecheck and commit**

```bash
git add src/lib/data/studioAvailability.ts tests/connected-calendars.mjs
git commit -m "$(cat <<'EOF'
A colleague's availability needs both membership and their consent

Two conditions, and the intersection is a pure function so the rule is testable
without a store. The one that matters is a stale id: somebody leaves the studio
and their id lingers on the share list, and it must resolve to nobody rather
than to a person who is no longer a member.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: The two studio routes

**Files:** Create `src/app/api/studios/[slug]/calendar-share/route.ts` and `src/app/api/studios/[slug]/availability/route.ts`; modify `tests/gate-a.mjs`; create two goldens.

Both use `auth: "studio"` with the department context factory the other studio routes use — **read a neighbouring studio route first and follow it**; no route re-derives access (invariant 3).

- `GET /api/studios/[slug]/calendar-share` → `{ sharing: boolean }` for **the caller's own** collaborator.
- `PUT` with `{ sharing: boolean }` → sets it for **the caller's own** collaborator only. **A caller may never set another person's flag** — take the CollaboratorID from the resolved context, never from the body or the query.
- `GET /api/studios/[slug]/availability?from=&to=` → `{ people: TeamAvailability }`. `from`/`to` required, parsed, span bounded at 62 days — a wider window is not something a scheduling strip asks for.

**No new permission key** — membership plus the opt-in is the whole gate.

- [ ] **Step 1: Write both routes.**
- [ ] **Step 2: Add two goldens** in `tests/gate-a.mjs` — `studio.calendarshare.off` and `studio.availability.empty` — for a studio where nobody has opted in. Both must be network-free in that state: with an empty share list, no provider is called.
- [ ] **Step 3: Record, then compare**

Run: `NOMPANY_TEST_SESSION=p2b NOMPANY_RECORD_GOLDENS=1 npm run test:gate-a`
Then `git status --short tests/goldens/` — **exactly two new files, zero modified.** Any pre-existing golden appearing means STOP and report BLOCKED.
Then: `NOMPANY_TEST_SESSION=p2b npm run test:gate-a` without recording.

**If either run dies with `ECONNRESET`, that is the known Cloud SQL fault.** Report it, say the goldens are unrecorded, and do not hand-write them.

- [ ] **Step 4:** `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build`, then commit. Subject: `A studio member controls, and can see, who is busy`.

---

### Task 5: The strip, and the switch beside it

**Files:** Create `src/components/planner/AvailabilityStrip.tsx`; modify `src/components/planner/PlannerShell.tsx`.

Read `PlannerShell.tsx` and `GanttChart.tsx` first and match them — same timeline geometry, same date range, same styling idiom. Do not restructure the planner.

**The strip** renders one row per visible colleague across the planner's current range, with busy blocks shaded. **Never a title, a location or a guest** — there is nothing to render, because nothing was fetched.

**The toggle sits next to it**, labelled so the person can see exactly what they are turning on — "Let colleagues in this studio see when I'm busy" — with a line saying they see *when*, never *what*. Putting the switch beside the thing it controls is the point: somebody can see what they are sharing at the moment they decide to share it.

**Someone who has connected no calendar** sees the toggle explaining that connecting happens in their account settings, with a link. **Someone who has opted out** sees their own row as "not shared", not as free — the two are different and confusing them would make a private calendar look like an empty one.

Bilingual: strings in the dictionary the planner already reads; logical properties only (`ps-`/`pe-`/`ms-`/`me-`).

- [ ] **Step 1: Build the strip and the toggle.**
- [ ] **Step 2:** `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npm run lint && npx next build && node scripts/bundle-budget.mjs`

Lint must not gain warnings (147/0). If the bundle total moves, record the measured before and after in `CLAUDE.md`'s bundle bullet in the style of the entries there — **never raise a ceiling to make a number fit.**

- [ ] **Step 3:** Commit. Subject: `The planner shows when a colleague is busy, and never what they are doing`.

---

### Task 6: Docs and full verification

- [ ] **Step 1:** Rewrite `docs/functionality/calendar.md` — move free/busy sharing out of "Not built yet" into what ships, describe the two-condition gate, and state plainly that colleagues see intervals only. Keep a **"Not built yet"** section: writing to calendars, auto-scheduling from availability, push notifications, caching, providers beyond these two.
- [ ] **Step 2:** `NOMPANY_TEST_SESSION=p2c npm test`
- [ ] **Step 3:** `npm run test:gateway` — **not part of `npm test`**; must read `all passed (36 blocks)`.
- [ ] **Step 4:** `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build && node scripts/bundle-budget.mjs && npm run lint`
- [ ] **Step 5:** Report which gates ran and which were blocked by the Cloud SQL fault. **Do not report the feature as verified if the suite could not run.**

---

## Self-review

**Spec coverage.** §4.2 → Task 1. §5.1 item 4 (Microsoft's leaky free/busy) → Task 2. §5.2 → Task 2's pure half. §7.2 (both conditions, no permission key) → Tasks 3 and 4. §7.3 (no calendar content stored) → Task 2 fetches and discards; nothing persists. §8 (the toggle and the strip) → Task 5. §9 → Tasks 2 and 4 carry the provider's reason. §12 → Task 6's doc.

**Placeholder scan.** No TBDs; every code step carries real code or an exact instruction.

**Type consistency.** `BusyInterval`, `TeamAvailability` and `CalendarProvider` are each defined once and used under those names. `visibleSharers(sharers, members)` has the same argument order in Task 3's test and its interface block. `availabilityViewToIntervals(view, fromISO, slotMinutes)` matches its test.

**Recorded rather than hidden:** the shared Cloud SQL is refusing direct connections as this is written, so Tasks 1, 4 and 6 have steps that may be unrunnable. Every one of them says to report the fault rather than route around it, and no task's correctness depends on a golden being recorded.
