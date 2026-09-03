# The studio shell stops being rebuilt on every click — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A section click re-renders the SCREEN, not the studio. The sidebar, the header, the plan tags and the section tree are resolved once by a real `layout.js` and stay mounted across navigations, so the per-click server cost falls to what the screen itself needs.

**Why this is fix #4 and not fix #1:** fixes 1–3 shipped on 03/09/2026 and took the *perceived* latency out (see "What already landed" below). This one takes out the *actual* work. It is bigger than the other three put together and it is the only one that touches routing, which is why it was separated.

**Tech Stack:** Next.js 16.2.10 App Router, React 19, TypeScript (`noImplicitAny`), Postgres via `src/platform/db/store` under `PG_TRANSPORT=gateway`.

**Spec:** none — this is a restructure of existing behaviour, not new behaviour. The measurements it is built on are in this document.

---

## The evidence this exists for

Measured in the sandbox on 02–03/09/2026, warm runs, against the real database through the local Cloud SQL proxy.

| What | Measured |
|---|---|
| One bare `SELECT 1` on this connection | **35 ms** |
| One section click's data, replayed | **10 SELECTs**, ~4–5 dependent waves, **~200 ms** |
| DOM change during a navigation, before fix #1 | **none** — `firstDomChange: null`, every navigation |
| URL movement after the click, before fix #1 | **767 ms** |

Under `PG_TRANSPORT=gateway` — which is what production runs — each of those 10 statements is **its own HTTPS POST to Cloud Run**. `src/platform/db/pgGateway.ts` says so in its header: *"ONE STATEMENT PER CALL, ALWAYS — there is no batching machinery here."* So ~200 ms measured through a local proxy is a **floor**, not an estimate of production.

Of those 10 statements, the ones this plan removes from a section click are the shell's: the section tree, the plan catalogues, the profile and the chat allowance. None of them can change between two clicks in the same studio, and all of them are re-read on every click today for one reason — **there is no `layout.js` under `src/app/studio/`, so the page IS the layout.**

## What already landed (fixes 1–3, 03/09/2026)

Do not redo these; this plan builds on them.

1. **`src/app/studio/loading.js`** — the loading boundary. `firstDomChange` went from `null` to **64 ms**; the URL now moves at 64 ms instead of 767 ms. It reproduces the whole shell's geometry because, with no layout, it replaces the whole shell.
2. **The duplicate `listSections` is gone.** `studioContext` already returned `sections`; the page discarded them and read again. One round trip per click.
3. **`withRequest` wraps the page render.** The page now gets the request cache, the command counter and a completion line, which all 96 API routes already had and the most-rendered surface in the product did not.

Two things fell out of doing them, both relevant here:

- **`ScreenSkeleton` had a 24 px layout shift.** `sr-only` was the first child of a `space-y-6` container, so the title bar took a 24 px top margin that collapsed out through `<main>`. Measured: `<main>` at y=112 under the skeleton, y=88 once the screen arrived — every screen in the studio settled upward by 24 px on load. Fixed at the source.
- **`withRequest` now treats `NEXT_REDIRECT` / `NEXT_HTTP_ERROR_FALLBACK` as outcomes, not failures.** A page redirects on its most ordinary paths (no session, not a member); without this, "request failed" would have become the most common line in the log.

---

## Global Constraints

Copied from `CLAUDE.md`. Every task's requirements implicitly include these.

- **Access is resolved once**, in `effectivePermissions`, and every module context is built on `studioContext` (invariant 3). A layout and a page both needing the studio must NOT become two resolutions — see Task 2, which is entirely about this.
- **Membership authorises; the URL never does** (invariant 2). The layout is a new place where a studio is resolved, so it is a new place that can get this wrong. A non-member must learn nothing about contents from the layout either — not a section, not a name, not a count.
- **Default deny** (invariant 4). A layout that renders the nav before the page refuses is a layout that can leak the nav.
- **Golden responses are the contract.** 153 responses must not change; `NOMPANY_RECORD_GOLDENS` is never set. Goldens cover API responses, not pages, so a green run is necessary but not sufficient here — see the verification section.
- **Hop counts are part of the contract.** This plan MOVES hops rather than only removing them; the ceilings must be re-measured deliberately and in their own commit, with the new numbers stated.
- **The bundle budget pins the regression, not the size.** Largest chunk 158 KB gz / 250 KB ceiling is the gate that matters. `StudioFrame` moving from page to layout should not move it — verify, do not assume.
- **`motion/react` may not be imported outside `src/components/landing/`.** Gate A holds this line.
- **A Server Component cannot read the locale.** `useStudioLocale` is a client hook; neither `tsc` nor `next build` catches a server call to it. Open the screen.
- **Two sessions cannot share a test namespace.** Run as `NOMPANY_TEST_SESSION=shelllayout npm test`.
- **Files here are CRLF on disk.** Match the file you are editing.
- **Comments explain why.** When you change commented code, update the reason — do not delete it.
- **Commit subjects are declarative sentences** describing the state after the change. End each with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

---

## The one hard problem: full-screen screens

**Read this before writing any code. It is the whole difficulty of the task and it has already sunk one obvious approach.**

A `layout.js` wraps EVERY route beneath it. But the studio has two kinds of screen, and `src/app/studio/[[...segments]]/page.js` switches between them at runtime:

- **In-frame** — the ordinary sections. Rendered inside `StudioFrame`.
- **Full-screen** — `documentation`, `crm-sales-live`, `engineering-docs-live`, `engagements`, `engineering-docs-register` (and `/<id>`), `projects-list/<id>` (the board), `projects-list/<id>/plans/<planId>`, `projects-planner` (and `/<planId>`, `/templates/<id>`). These `return` **before** the shell is built and render outside it.

They are all one catch-all route, so **route groups cannot separate them** — `(shell)` and `(full)` split by PATH, and every one of these paths resolves through the same `[[...segments]]`. Two catch-alls under two groups is a route conflict, not a solution. The `/super` console's `(full)` / `(shell)` split is NOT a precedent that transfers, because its routes are real distinct folders.

Three ways out, with the trade-offs:

### Option A — full-screen screens become `fixed inset-0` overlays *(recommended)*

The layout always renders the shell. `FullScreen` (already a helper in `page.js`) changes from "rendered instead of the shell" to `fixed inset-0 z-40 overflow-auto` — it covers the shell rather than replacing it.

- **Costs nothing extra in reads.** This is the part that decides it: `page.js` today fetches `sections`, the catalogues, the profile and the chat allowance BEFORE the full-screen early-returns. Full-screen routes already pay for the shell data. Moving that fetch into a layout changes their cost by zero.
- No proxy change, no route split, and **no second list of full-screen keys** to keep in step with the page's branches — which is exactly the "two lists that must agree" drift the fifteen-section restructure kept finding.
- **The cost:** the shell is in the accessibility tree behind the overlay. It must be `inert` (or `aria-hidden`) while an overlay stands, or a screen-reader user tabs into a sidebar they cannot see. This is a real requirement, not a nicety — put it in the task.

### Option B — the proxy rewrites full-screen paths to a second route

`/studio-full/…` with its own bare layout. Clean separation, but the edge would need to know that `projects-list/<id>` is full-screen while `projects-list` and `projects-list/<id>/quotation` are not. That is product routing knowledge at the edge, in a file whose own header says it "does not try to validate the slug — it just routes", and it is a second list that must agree with `page.js`. **Not recommended.**

### Option C — keep the shell in the page, move only the data

A layout cannot pass props to a page, and a Server Component page cannot read a client context from its layout. The only sharing mechanism is the request cache — which fix #3 already added, and which does **not** survive across a navigation. This option delivers nothing this plan is for. **Recorded so it is not re-proposed.**

**Take Option A unless something below proves it wrong.**

---

## The second problem: `activeKey`

`StudioFrame` takes `activeKey` and uses it in five places (`src/components/studio2/StudioFrame.js:139, 215, 229, 245, 542`): the open nav group, the active row highlight, the `<h1>` label, and Nova's `view`.

A layout does not receive `params`. So `activeKey` must be derived **client-side from `usePathname()`** rather than handed down from the server. That is a genuine behaviour change to think about, not a mechanical one:

- The section key is the first path segment after the slug — the same derivation `page.js` does with `segments[0]`, which makes it a candidate for a shared pure helper rather than a second copy.
- `people`, `access` and `administration-settings` are special-cased in `page.js` today; the client derivation must produce the same three answers.
- The `<h1>` label currently comes from the resolved section's NAME, which is tenant data the layout already has in `sections`. Deriving the key client-side and looking the name up in the same `sections` array keeps the label server-accurate.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/app/studio/layout.js` | Resolve the studio + shell data, render `StudioFrame` | **New** |
| `src/app/studio/[[...segments]]/page.js` | Resolve only what the SCREEN needs, render the screen | Modify — heavy |
| `src/app/studio/loading.js` | The pending UI | Modify — sheds the sidebar, the header and the direction guess |
| `src/components/studio2/StudioFrame.js` | The shell | Modify — `activeKey` from `usePathname()` |
| `src/lib/studios.ts` | `studioContext`, `visibleSections` | Possibly modify — a shell-only reader |
| `tests/gate-a.mjs` | Hop ceilings, architectural assertions | Modify — new ceilings, stated |

---

### Task 1: `activeKey` comes from the path, not from a prop

Do this FIRST and on its own. It is independently correct, it is testable without any routing change, and it is the piece most likely to produce subtle wrongness later if it is bundled with the move.

- [ ] Extract the "which section key does this path name" derivation into a pure function, exported from one place, and use it in BOTH `page.js` (replacing `segments[0]` plus the three special cases) and `StudioFrame`.
- [ ] `StudioFrame` derives `activeKey` from `usePathname()` when the prop is absent; the prop still wins while the page supplies it.
- [ ] Assert the pure function directly: every section key, the three special cases, a sub-section, a record id (`crm-sales-tickets/<id>` → `crm-sales-tickets`), and the root (`/<slug>` → Main).

**Verify:** `npm test`, and open the studio — the nav highlight, the open group and the `<h1>` must be unchanged on a section, a sub-section and a record page.

### Task 2: The layout resolves the studio once

- [ ] `src/app/studio/layout.js`: slug from `x-studio-slug`, `currentUser`, `needsQuestionnaire`, `studioContext`, catalogues, profile, chat allowance — everything the shell needs and nothing the screen needs.
- [ ] Render `StudioFrame` around `{children}`, wrapped in `withRequest("studio-layout", …)`.
- [ ] The refusals move WITH the data: `notFound()` for no slug, `NotAMember` for `forbidden`, the questionnaire and login redirects. The page must not be reachable with an unresolved studio.
- [ ] `page.js` drops every read the layout now owns and keeps only the screen switch.

**The trap to watch:** the layout and the page BOTH need `studio.slug` and `access`. The page must not re-run `studioContext` to get them — that would replace one duplicated read with another, which is the defect this plan exists to remove. The request cache (fix #3) makes a second call cheap **within one request**, so measure rather than assume: if `pgQueries` on a section click does not fall, this task did not work.

**Verify:** the probe from the investigation, re-run — `pgQueries` for a section click must fall from 9 to the screen's own reads. State the before and after numbers in the commit.

### Task 3: Full-screen screens overlay the shell (Option A)

- [ ] `FullScreen` becomes `fixed inset-0 z-40 overflow-auto` over the shell.
- [ ] The shell is `inert` while an overlay stands — a11y, not polish.
- [ ] Walk **every** full-screen destination listed above. This is where a regression will hide.

**Verify:** open each one. Check the back links still leave the overlay, and that the sidebar is not reachable by keyboard behind it.

### Task 4: The loading boundary sheds its scaffolding

Once the layout holds the shell, `loading.js` sits INSIDE it and should render only the screen skeleton.

- [ ] Delete the sidebar, the header and the `lang`/`dir` wrapper from `loading.js`. **The direction guess goes with them** — the layout has resolved the studio, so the boundary inherits the real `dir` and the residual "Arabic-default studio, member who never set a preference" wrong case disappears. Delete that comment too; it documents a problem that no longer exists.
- [ ] What remains is `<ScreenSkeleton />`.

**Verify:** with `lang=ar` set, click through sections and confirm the sidebar never moves. Before this task it flips for that one case; after it, it cannot.

### Task 5: Re-measure and re-pin the ceilings

- [ ] Re-run the probe; record statements and waves for a section click.
- [ ] Update the Gate A hop ceilings to the new numbers, **in their own commit, with the reason stated** — a ceiling that moves silently is a ceiling nobody can check.
- [ ] `scripts/bundle-budget.mjs`: confirm the largest chunk has not moved. Update the CLAUDE.md budget line with the measured number.
- [ ] Update `CLAUDE.md`'s "Current state" and the relevant `docs/functionality/` file in the same commit as the behaviour change.

---

## Verification — every change, no exceptions

```bash
NOMPANY_TEST_SESSION=shelllayout npm test
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.strict.json
npx next build
node scripts/bundle-budget.mjs
```

**Goldens are necessary but not sufficient here.** They pin API responses; this plan changes no API. The things that can actually break are all page-level and none of them has a golden:

- a non-member seeing shell chrome before the refusal (invariant 2)
- a section the person was not granted appearing in the nav (invariant 4)
- an Arabic studio's `dir` regressing — the shell declares it, not `<html>`, and a rule anchored to `html[dir="rtl"]` never fires
- a full-screen screen losing its way back, or the shell staying keyboard-reachable behind it
- `useStudioLocale` called from the new Server Component layout — neither `tsc` nor `next build` catches it; it throws on the first request

**So the acceptance test is a walk, not a suite:** `npm run dev:sandbox`, then open a section, a sub-section, a record page, one full-screen screen, and the studio as a non-member — in both languages.
