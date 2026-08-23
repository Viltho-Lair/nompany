# Project Planner + Kanban board integration

Two external Next.js apps fold into the studio. Same stack family as nompany
(Next 16 · React 19 · MUI · Tailwind · zustand · shadcn/radix), so the port is
faithful: **the app cores are copied verbatim; only the seams that touch
nompany change** — persistence, theming, motion, access, and the shell.

- `project-planner/` → a full-screen app under **`/operations-planner`**. A back
  button per plan. MS-Project-style Gantt: scheduling engine, FS/SS/FF/SF
  dependencies, critical path, WBS, work calendar.
- `kanban-board/` → **becomes the project profile**. Full-screen, back button per
  board. The board is the main surface; the old project-profile information moves
  into a **right sidebar**, with immediate decisions on the **left**. Each project
  owns one board.

The rule from the brief: **no change to design, no change to code except what is
fit for this application.** Everything below is scoped to that seam.

---

## Architecture — the seam, not the core

Both apps persist a single normalised document through zustand `persist` into
`localStorage` (`kanban-board-v1`, `project-planner-v1`). nompany keeps the
**entire store logic byte-identical** and swaps only the storage adapter:

- A `StateStorage` adapter (`getItem`/`setItem`/`removeItem`) backed by a nompany
  route instead of `localStorage`. The board/plan is one JSON document per
  project, written through `editJSON` / the repository seam (invariant 8), keyed
  only in `src/platform/db/keys.ts` (invariant 1). Debounced save.
- `buildSeed()` for a new board emits the **same 4 columns** (Backlog / In
  Progress / In Review / Done, same accents + WIP) with **empty `taskIds`** and
  no tasks — the "fresh empty copy" default.
- Members are the project's **collaborators** (invariant 6: CollaboratorID is the
  identity inside a studio), not the demo `MEMBERS` seed.

One board document per project; one plan document per plan. Deletion of a project
cascades its board + plans children-first through `cascade.js` (invariant 11).

### The "Project plan" button

Inside the project profile, a **Project plan** button **immediately creates a new
plan** in the planner, carrying an **exact copy** of the project's info
(`ProjectMeta`: name, status, owner, start date, description → the plan header).
The plan is a **project-scoped resource**: viewable by anyone who can see the
project, even without Operations access. The full `/operations-planner` app stays
Operations-gated; the plan opened *from a project* rides the project's own view
grant. Access is still resolved once, in `effectivePermissions` (invariant 3).

---

## Stutter diagnosis (kanban)

The app is already expertly optimised — cards are `React.memo`'d, motion is
opacity-only so dnd-kit owns the transform, the board reads only `columnOrder`,
the ambient background is gradients-not-blur with transform-only drift, and cards
were deliberately moved off `backdrop-filter` (`.glass-flat`).

**Root cause:** `MeasuringStrategy.Always` (`board/board.tsx`) re-measures every
droppable on **every frame** of a drag. The **column** droppables still use
`.glass` = `backdrop-filter: blur(20px) saturate(160%)`. So each drag frame forces
the compositor to resample a full-column blur — the exact cost the author removed
from cards but left on columns. `.glass-strong` (blur 28px header/dialogs) adds to
it.

**Fix (faithful, minimal):** the board already toggles `body.dragging-none` on
drag start. Suspend backdrop-filter on glass surfaces for the duration of a drag
only — `.dragging-none .glass, .dragging-none .glass-strong { backdrop-filter:
none }`. The fill/border already read as glass; the blur (a near-uniform surface)
simply pauses for the ~½-second of a drag. Zero change at rest.

---

## Held decisions (per brief: build now, decide later)

1. **framer-motion → nompany motion/CSS.** nompany fences `motion/react`
   (== framer-motion) to `src/components/landing/` only; Gate A block 5 fails the
   build otherwise, and it is ~30 KB the studio chunk must not carry. Kanban's
   usage is light (opacity fades, one `layout`). Adapt to `tailwindcss-animate`
   (already a kanban dep) CSS classes + nompany's `src/components/motion`
   primitives. Look identical; satisfies the fence. **Resolved: adapt.**
2. **next-themes → nompany `.dark`.** nompany owns dark mode via the `.dark` class
   + MUI `colorSchemeSelector`. Drop the kanban `ThemeProvider`; inherit the
   shell. **Resolved: adapt.**
3. **Bundle.** dnd-kit + Gantt engine are heavy. Both screens load through
   `nextDynamic()` like every other department screen (largest chunk held at
   197 KB / 250 KB ceiling). Monitor the planner chunk. **Resolved: code-split.**
4. **Access model for a project-scoped plan** vs Operations-gated planner app —
   direction set above; exact permission keys to confirm with the access
   catalogue.
5. **id minting.** Apps mint client ids with `Date.now()/Math.random()`. The
   Redis-backed adapter accepts client ids for board internals (a private
   per-project doc, no cross-tenant key), consistent with the store staying
   verbatim. Server-minted ids only where a nompany reference number applies.
6. **Planner ↔ project data flow after the copy.** For now a one-time copy on
   button click (brief: "adapt later for key milestones and project progress").

---

## API contract (the seam both sides code against)

### Phase 1 — board (project-scoped, rides the `projects-list` grant)

- `GET  /api/studios/[slug]/projects/[projectId]/board`
  → `{ board: BoardDoc | null, canEdit: boolean, members: Member[] }`
  `board` is `null` until first save — the client then seeds the empty
  4-column board. `members` = the project's collaborators mapped to the kanban
  `Member` shape (`{ id: collaboratorId, name, initials, from, to }`).
- `PUT  /api/studios/[slug]/projects/[projectId]/board`
  body `{ board: BoardDoc }` → `{ ok: true }`. Requires projects-list manage.
  Whole-document set through `editJSON` (the client holds authoritative state).

`BoardDoc` = the kanban store's persisted payload verbatim: `{ boardName,
columnOrder, columns, tasks, members, memberOrder }`.

### Phase 2 — plans

- `GET/POST /api/studios/[slug]/operations/planner` — list / create (operations grant).
- `GET/PUT  /api/studios/[slug]/operations/planner/[planId]` — read / save.
- `POST /api/studios/[slug]/projects/[projectId]/plan` — create-from-project,
  carries `ProjectMeta`; rides the projects grant (no operations needed).
- One plan service, two access doors (projects grant for a project's own plans,
  operations grant for the whole app) — invariant 2/3, one resource.

## Storage & keys

- Board: one JSON doc per project via `editJSON`, key
  `PROJECT.board(studioId, projectId)` (new builder in `keys.ts`).
- Plan: one JSON doc per plan via `editJSON`, `PROJECT.plan(studioId, planId)`;
  plan summaries in an operations-owned `projectPlans` collection (listable +
  cascades with the section).
- Cascade: `removeProject` deletes the board doc + the project's plan docs
  (children-first, invariant 11).

## Build sequence

1. ✅ Gate B (repository write-seam) — committed + pushed.
2. ✅ **Phase 1 data layer** — `PROJECT.board` key; `readProjectBoard` /
   `saveProjectBoard` in `projects.ts` (view is section-gated, write re-checks
   `projects.list.edit`, whole-doc `editJSON` set, 1 MB cap); board cleanup in
   `removeProject`; GET/PUT `projects/[projectId]/board` route. No new permission
   keys → no golden / access-matrix change.
3. ✅ **Phase 1 frontend** — kanban ported to `src/components/kanban/**`
   (framer-motion + next-themes + `persist` removed; design system scoped to
   `.kanban-root`; Redis storage adapter; `emptySeed()` = same 4 columns empty;
   members from collaborators; stutter fix). `StudioProjectBoard.jsx` = back bar
   + left decisions rail + center board + right project-info sidebar.
   `StudioProjectInfo.jsx` extracted and shared (no duplication).
4. ✅ **Phase 1 wiring** — studio-route early-return renders the full-screen
   board (own `LiveProvider`); dead `StudioProjectProfile.js` deleted.
5. ✅ **Phase 1 RTL sweep** — the port kept the app's physical Tailwind
   utilities, tripping Gate A block 5 (RTL: 69 > 41). Converted physical → logical
   across the kanban `.tsx` (`pl→ps`, `pr→pe`, `ml→ms`, `left→start`, `right→end`,
   `text-left→text-start`), keeping only the radix dialog's `left-1/2` centring.
   Back to **41/41** — design-identical in LTR, now mirrors in RTL.

**Phase 2 (next):** planner at `/operations-planner`; back button per plan;
storage adapter; the "Project plan" button → create-plan-from-project (carried
`ProjectMeta` copy); verify; commit + push. **Two live constraints for Phase 2:**
(a) total bundle headroom is thin — **1491 / 1500 KB gz** after Phase 1 — and the
Gantt engine + `date-fns` will press it, so the planner chunk must be lean (or a
deliberate call to raise the ceiling); (b) the RTL ceiling is now **saturated at
41/41**, so the planner's physical utilities must be converted to logical the same
way (the planner also strips `Providers.tsx` / `<CssBaseline>`; it has no
framer-motion or next-themes).
