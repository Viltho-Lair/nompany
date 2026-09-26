# The walkthrough

Nova shows a new person round — the account hub at `/{en,ar}/account`, and a studio. Built
26/09/2026.

## What it is

Two tours, `account` and `studio`. Each is a dimmed page with a lit window over one real
control at a time and Nova's card beside it: what the control is for, in her voice, in the
reader's language. **Skip tour**, **Back**, **Next** (the last step says **Got it**), Escape
to leave, and the arrow keys step — mirrored in Arabic, so "forward" is the way the page
reads. A **Don't show this again** box sits on every step; closing the tour any way at all
with it ticked turns that tour off.

- **Account tour:** welcome · the rail · Create a studio · Join a studio · Security · language
  and theme · the avatar menu, ending on where to turn the tour back on.
- **Studio tour:** welcome · the departments (or, on a phone, the menu button that opens
  them) · the Approvals and Administration marks · the bell · language and theme · the avatar
  menu · and **the last word points at Nova's launcher** — "if you need anything else, click
  me and ask". **A studio whose package has no Nova** gets the same step pointed at the EMPTY
  corner, drawn as a dashed circle where her launcher would sit, saying Nova is available
  from the Medium to Large packages and would be right there (the owner, 26/09/2026). There
  is no element to measure, so `cornerBox` works the place out from NovaLauncher's own
  classes — 64px, `bottom-4`/`bottom-20`, `end-5`/`end-24` — and the two must change
  together. A studio WITH Nova whose launcher is somehow not on screen ends on a plain close,
  never on the upsell.

## What it stores

Two facts, in two places, because they answer two different questions:

- **"Don't show this again" is the PERSON's** — `walkthroughOff` on the profile
  (`u:<id>:profile`), a map holding `true` per tour turned off. Turning one back on DELETES
  its key rather than writing `false`, so "never chose" and "chose to see it" are one state.
  It follows the person to every device. `savePersonalInfo`'s field list does not include it,
  so the profile PUT cannot touch it.
- **"Already shown" is the SIGN-IN's** — `toursSeen` on the session state
  (`ix:session-state:<digest>`), which expires with the session. That is what brings the tour
  back at the NEXT login and not on the next page. A browser store could not say this: a new
  tab is not a new sign-in, and a second device is one.

It is marked seen when the tour OPENS, not when it closes, so a tab shut halfway does not
replay it on every page of the same sign-in. A session minted before 18/09/2026 has no state
document; `markTourSeen` creates one first, or the tour would show on every load.

## What it does

`GET /api/identity/walkthrough` answers `{ account: { show, off }, studio: { show, off } }`.
`POST` takes `{ tour, action }` with `seen`, `off` or `on`; an unknown tour or action is a 400.
`auth: "user"` and nothing more — it is the person's preference about their own screens and
touches no studio.

- **Off wins; then once per sign-in; a till's session never** (`tourStatus`,
  `shared/walkthrough.ts`). A till is a counter cashiers share, and a tour over it mid-queue
  is a till nobody can sell on.
- **The account tour does not open when the person was sent to create a studio** (`?create=1`)
  — that screen replaces the one the tour is about — and not in a till's session.
- **Steps point at `[data-tour=…]` attributes on the real controls**, never at copies. A
  step whose control is not on screen is DROPPED, and an `unless` step stands in for one that
  was (`resolveSteps`): that is how the phone gets the menu button. A selector matching several elements lights one box round all of
  them (the two header marks). Resolved once, a tick after the tour mounts, so a caller that
  switches to the tour's screen in the same update ("Start now" jumps to Overview) is measured
  after that screen is in the document.
- **Turning it back on:** `/account` → Personal info → **Walkthroughs** has a switch per tour,
  and **Start now** for the account's. In a studio, the avatar menu's **Show the walkthrough**
  turns the studio tour back on and starts it there and then.
- **The tour component is a lazy chunk** (`next/dynamic` in both callers, which are client
  modules — a real boundary). It loads only when a tour opens; the always-loaded part is
  `useWalkthrough`, a few lines.

Files: `shared/walkthrough.ts` (the rules and both languages' words),
`platform/auth/walkthrough.ts`, `app/api/identity/walkthrough/route.ts`,
`components/walkthrough/{Walkthrough.jsx,useWalkthrough.js}`. Test:
`tests/walkthrough-model.mjs`.

## Not built yet

- **Only two tours.** Nothing walks a person through a department's own screens — a first
  quotation, a first payroll run. The engine takes a list of steps, so each is a list plus
  `data-tour` attributes, but none is written.
- **The steps do not follow the reader's role.** A member who cannot open Approvals or
  Administration simply gets no step for the marks (the control is absent, so it is dropped);
  nothing SAYS what they are missing or who could grant it.
- **Nothing counts it.** Whether people finish, skip or turn it off is not recorded anywhere,
  so there is no way to tell whether a step is confusing.
- **The console (`/super`) has no tour.**
- **Nova's own step was not seen on screen.** The sandbox studio's package has no Nova, so
  verification (26/09/2026) saw the empty-corner ending, in both languages; the Nova ending is
  covered by `resolveSteps`' test, and its target is one attribute on `NovaLauncher`.
- **The package names are words in the copy, not read from the catalogue.** "Medium to
  Large" is what the owner asked for; packages are defined in /super, so renaming one or
  moving Nova into Small leaves this sentence wrong until the copy changes.
