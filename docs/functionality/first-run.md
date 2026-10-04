# Finish setting up — the first-run checklist

The agreed order's step 3 (03/10/2026) kept registration short on purpose: "Not asked at
registration: … KPIs … Those belong in a first-run checklist inside the studio." This is that
checklist, on the front door (04/10/2026).

## What it shows

Four items, in the order a new owner would do them, each linking to where it is done:

| Item | Done when | Goes to |
|---|---|---|
| Your company details | the studio has a country **and** a currency | Studio settings |
| Your logo | a logo is uploaded | Studio settings |
| Invite your team | anybody besides the owner is in the studio | People |
| Your KPI targets | at least one KPI target is set (studio-wide or for a deal flow) | Studio settings → KPI targets |

## The rules

- **Derived, never stored** (`modules/main/firstRun.ts`, pure). Each item reads what the studio
  already holds, so it ticks itself the moment the thing is done, wherever it was done. There is
  no "completed" flag to disagree with the studio. A target later switched off un-ticks the item.
- **Only for somebody who can act on it**: the Main route (`/main`) sends it only to a reader
  holding `administration.settings.edit`, and only while something is left. Nobody else pays for
  the extra read of the studio's people.
- **Hide** is the viewer's own convenience, kept in their browser per studio
  (`FinishSetup.js`). A private window or blocked storage shows the list again.

`tests/first-run-model.mjs` holds the rules. **Opened in the sandbox 04/10/2026**: a studio with no country
and no logo, two people and a KPI target read "2 of 4 done" with team and targets ticked; Hide removed
it and it stayed hidden after a reload.

## Not built yet

- **No other items.** Approvals, numbering, the deal flows and payment methods are all things a
  new studio may want to look at; none is on the list, because none has a clear "done".
- **Hiding is per browser**, not per person: the same owner on another device sees it again.
