# Permits — one register (tier 5, 11/09/2026)

**Quality & HSE → Permits** (`/<slug>/quality-hse-permits`). The studio had two permit registers
that were not duplicates: Field Operations' (a **clock** — valid from/to, derived Valid, Expiring,
Expired; holders; a Master data location; a project; a PMT reference) and Quality & HSE's engine
"Permits to work" (a **workflow** — Requested → Issued → Closed/Cancelled — with no clock). The
owner chose **one register, moved by screen**: Field Operations' permits, shown in Quality & HSE,
given the workflow.

## Where the rows are

**They did not move.** Every permit stays on the `field-service` root section where it was
written; the new section `quality-hse-permits` is a **destination** that owns no collection, and
reads them as a foreign section (`permitsContext`, `modules/operations/operations.ts`). Moving the
rows would have meant planting a section in every studio, a migration and a verify pass on live
data; nothing about the register needed it.

## Where a permit stands, and whether it is in force

A permit carries a **`status`** beside its dates (`modules/operations/permitModel.ts`, pure):

- **Requested → Issued or Cancelled; Issued → Closed or Cancelled.** Closed and Cancelled go
  nowhere. A move is its own verb (`PATCH`), never a field on an edit.
- **A permit written before this has no status and reads as Issued** — the Field Operations
  register recorded permits an authority had already issued.
- New permits are **Requested**, or **Issued** when the form's *Already issued* is ticked (the
  default, since recording a permit somebody holds is what the register was used for).
- **Cancelled, never deleted** — the engine permit's rule, now enforced: only a Requested permit
  can be removed, as a mistake. **Every existing permit reads as Issued, so none of them can be
  deleted any more** — the change a studio will notice.
- A closed or cancelled permit cannot be edited: it is the record of what was authorised.
- **Only an issued permit's expiry is news**: the renewal banner, the daily expiry notice and
  Nova's permit insight all skip requests and finished permits.

## Who may act

Permits have **their own right, `qualityHse.permits`** (view/create/edit/delete) — they answered to
`fieldService.tracking`, which governs where people are. **Transitional:** the permit services also
accept Tracking's matching verb (`permitDenied`) until `scripts/migrate/grant-permits.mjs` has
given every role holding Tracking the permit right (dry-run by default, additive, never removes
Tracking; individual overrides are reported, not written). New studios' archetypes carry the new
right. The daily expiry notice reaches holders of either right and links to the register the
studio has.

## The Schedule screen's Permits tab

**One panel** (`components/studio2/PermitsPanel.js`) draws the register wherever it is reached.
Where the studio has the Quality & HSE register and the reader may open it, the tab says permits
are kept there and links to it; otherwise — a studio not yet planted, or somebody holding permits
only through Tracking — it still shows the register, so nobody loses the way to their permits in
between. `/operations/permits` keeps POST/PUT/PATCH/DELETE for that tab; `/quality/permits` is the
register's own route.

## What was fixed on the way

- The schema declared `kind`, which nothing wrote, and none of title, type, number, issuer,
  creator — so the insight named no permit and **the expiry notice read `p.label`, which does not
  exist, and named every permit by its TYPE** ("Hot work expires in 7 days"). It names the permit.
- **The engine permit type is no longer seeded** for new studios; existing studios keep theirs,
  readable — and **no longer deletable** (`removeRecord` refuses `permit`, and its register draws
  no Delete), which was that type's own declared rule.

## Rollout

Both scripts are dry-run by default and need `--allow-live` on the live store:
`scripts/migrate/plant-sections.mjs` (plants `quality-hse-permits` on existing studios), then
`scripts/migrate/grant-permits.mjs` (grants the right). Until then everything works as before
through the Schedule tab.

## Not built yet

- **Engine permits are not folded in.** A studio that recorded permits to work in the engine
  register keeps them there, readable and undeletable; folding them into the one register is
  lossy both ways (no location id, holders, issuer, number or project there) and was not asked.
- **The Tracking fallback is still in code.** Remove `permitDenied`'s second branch once every
  studio has been granted.
- **Task templates' *Permit request*** is still a free task linked to no permit.
- **No approval chain on issuing.** Issuing is an edit right, not a signature.
