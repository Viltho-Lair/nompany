# Holding back sections still being built

The owner, 03/10/2026: *"there should be a way in /super to lock these sections and their
subsections entirely for studio to not be able to see undergoing improvements."*

/super → **Sections** (`components/super/SectionLocks.js`, `/api/super/section-locks`) lists
every product section and sub-section with a switch. A held-back one is hidden from **every**
studio. Main, Approvals and Administration never appear in the list: they are where a member
lands and where a studio is configured, so they can never be held back.

## What a hold does

The rules are in `platform/db/releaseLocks.ts`, pure, and tested in `tests/release-locks-model.mjs`.

- **It reads as switched off.** `listSections`, the read every request makes, applies the holds
  to a **copy** of the studio's rows (`applyLocks`). So every rule that already honours the switch
  applies with nothing new:
  - the sidebar leaves the section out;
  - its API answers `section-off` (404) before the handler runs;
  - its dashboard widgets are absent;
  - Main's figures skip it.
- **It says so.** Studio settings → Sections shows "Being improved — coming soon" and will not
  switch it on. Both toggle routes refuse with `in-development`. Opening its address shows "This
  section is being improved", not an access refusal.
- **A section takes its sub-sections with it**, followed through the stored parent ids. That
  catches the engine registers planted under a root whose key they do not share, such as Quality
  & HSE's. A sub-section can also be held back on its own.
- **Nothing is stored on the studio, and nothing is moved.** The studio's own switch stays as it
  was underneath, so lifting a hold gives every studio back exactly what it had. Records filed
  under a held-back section stay where they are.
- **The create screen does not ask** about a held-back department or part
  (`studioSetupScreen`). `createStudio` decides a held-back department from the industry
  profile's suggestion, so the day the hold lifts the new studio meets what its industry would
  normally start with.
- **The website does not name it.** The home, platform and industry pages list departments
  through `releasedDepartments`.

**Preview studios** see through every hold: the owner's own studio, where a section can be tried on
real data before anybody else meets it.

**Timing.** The holds are one document (`REG.sectionLocks`), cached in each server instance for 30
seconds. A change reaches every studio within about half a minute. Saving in /super asks for an
explicit "Apply to every studio" first, because it changes what every customer sees.

## Which sections to hold back

On 03/10/2026 an evidence-based assessment of every section (the feature docs and the router, not
opened screens) recommended:

- **Whole sections:** Manufacturing, Logistics & Fleet, Assets & Equipment.
- **Sub-sections:**
  - sales orders (they do not invoice);
  - supplier quotes (an award raises no order);
  - subcontracts (certificates never reach Payables);
  - maintenance service contracts (no billing or SLA targets);
  - HR lifecycle (no documents, the settlement is never paid);
  - marketing audiences (no lists or segments);
  - shipments (air waybills only);
  - POS returns (no credit note).

**None of these was applied.** Holding back a section from live customers is the owner's decision,
made in /super. The list is recorded in `docs/progress.md`.

## Not built yet

- **No history of holds.** The audit log records who saved and when (`super/section-locks`), not
  what changed.
- **The departments count in page titles and claims** ("N departments on one data model") is
  computed from the code's list, not from released sections, so it still counts a held-back
  department.
- **Nova** (the assistant) is not told which sections are held back, and may mention one.
- **No per-country or per-package hold.** A hold is all-or-nothing, with a preview list.
- **The studio-creation screen was not opened with a hold on.** Everything else was, in the
  sandbox on 03/10/2026: holding Manufacturing back, saving through the confirmation, its page
  saying it is being improved, its API refusing with `section-off`, its link gone from the
  sidebar, and its Studio settings switch disabled with "Being improved — coming soon". That visit
  also found the console offering the FILED-ONLY storage rows (`crm-sales-pos`, the four old
  quotation rows, `projects-sla`), which are shown nowhere, so holding one back did nothing.
  They are no longer offered.
