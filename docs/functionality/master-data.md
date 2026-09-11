# Master data

The studio's own reference records — the lists every section reads and no section owns.
`/<slug>/administration-master`, eight tabs: Locations, Departments, Numbering, Units,
Categories, Cost codes, Notices, API keys. (This line said "four tabs" long after the other
four had landed.)

## What it is

Locations and Departments are collections with their own rows (`docs/functionality/
departments.md` is the org chart's file). **Numbering and Units are fields of the STUDIO
record**, beside `currency`, `valuationMethod` and the approval chains, and both are
written through `PUT /api/studios/<slug>/settings` behind `administration.settings.edit`.

That split is deliberate. A location is a thing a studio has several of and files
against; a numbering policy and a unit list are one decision each, company-wide, and
giving each its own collection would be a collection whose row count is always one.

**Both tabs load from one fetch and save through one function.** They are fields of the
same record behind the same right; two calls would be two answers to one question.

### Locations — a pin, and the way there (11/09/2026)

A location carries a coordinate: `lat`, `lng`, `geoSource` (`gps` · `pin` · `link` ·
`typed`), `accuracyM` (a GPS fix only — a dropped pin or a typed pair has none, and a
number there would claim a precision nobody measured) and `directions`, a landmark note
the tenant types and nothing translates. `shared/places` is the whole of the logic, pure,
and read by both the dialog and `createLocation`/`editLocation`, so the form refuses
exactly what the route refuses. The model test is `tests/places-model.mjs`.

**Coordinates first, address second**, because that is how the region navigates: Amman
has had street names and building numbers since 2007 and people still go by landmark.

**Three ways in.** *Use my location* takes the device's fix, and above 50 m the form says
so rather than silently keeping another building. *Pick on map* is a click, then a drag.
Or a pasted pair or link — Google, Apple, Waze or `geo:`. A place link is read for its PIN
(`!3d…!4d…`), not its camera (`@…`), which is wherever the sharer had scrolled to. A pair
must be the WHOLE text: the numbers inside "Building 12, 45 Mecca Street" are not a
coordinate. The Arabic comma separates a pair. (0, 0) is refused as the tell of a default.

**A short `maps.app.goo.gl` link is followed by the server** (`modules/administration/
mapLinks`), because it carries no coordinate until then. Narrow on purpose — it is a
request our server makes on a tenant's say-so: two exact hosts over https, redirects never
followed automatically and only onto Google's own map hosts, a header read and never a
body, two hops at 2.5 s each. A link that cannot be read saves the location without a pin.

**No migration.** A location saved with only a map link is placed from the link on read
(`placeCoordinates`), and the next save through the form stores the pair. Emptying the pair
beside such a link stores the link's pin rather than "none", because the map would draw it
anyway and the row would disagree with the map.

**Nothing geocodes.** Turning an address into a pin is Google's Geocoding API, whose terms
forbid keeping the result beyond thirty days or showing it on anybody else's map. A pin read
from a link the tenant pasted, or captured on their own phone, is theirs outright.

**One way out: Navigate** — Google Maps, Waze, or Apple Maps on Apple hardware, plus copy
the pair. No API key, and nothing the tenant typed goes into the URL: those links are opened
on Google's, Waze's and Apple's servers. The map above the list shows every pinned place,
loads only when there is one, and draws through the app's single Google loader.

**The Maps key moved** from `operations/maps-key` to `/api/studios/<slug>/maps-key`, behind
membership alone. Under Operations it refused a key to every map but Tracking for anybody
without Field Operations, and a person who may edit the studio's places need hold no rota
rights. The key is the platform's and was never secret (it rides on a script tag); the
referrer restriction in Google Cloud Console is what protects it.

**Location access had been switched off for the whole app.** `next.config.mjs` sent
`Permissions-Policy: geolocation=()`, which refuses the location API to our own origin too
— so Tracking's *Share my location* was refused by the browser before anybody was asked.
It is `geolocation=(self)` now: our pages may ask, embedded frames still may not.

### Numbering

Seventeen series, measured rather than counted from prose — invoice, credit note, bill,
expense, journal, asset, project, site report, tender, order, requisition, RFQ,
subcontract, purchase order, goods receipt, delivery note, permit — each with a prefix, a
number width and a first number. **Quotations are not among them**: Technical has carried
its own per-sequence numbering since before this existed, and folding it in would be a
migration rather than a tab.
`seriesSetting(key, studio.numbering)` is what every `nextReference` call passes.

**Nineteen call sites minted a reference from a string literal** before this existed, so
a studio whose invoices have always been "SI" got "INV" and had no way round it.

**The catalogue was READ off those call sites, not guessed.** A first draft wrote `RFQ`
and `SR` where the product actually mints `SRQ` and `DSR`; shipping that would have
renamed every existing studio's documents on deploy, silently, because the prefix is what
`bumpCounter` is keyed on.

**A prefix is refused, never coerced.** `PREFIX_RE` is `/^[A-Z][A-Z0-9]{1,7}$/`: a hyphen
inside one makes `highestIssued` parse every existing reference as nought, and the next
create reissues a number a client is already holding — invariant 10 broken by
punctuation. Two series may not share a prefix, case-insensitively, for the same reason:
one counter, two document types, two documents with one name.

**Changing a prefix renumbers nothing.** It starts a new sequence from the first number;
documents already issued keep the name they were issued under. The screen says so before
anybody edits, because that is the question somebody asks and does not ask out loud.

**Defaults are never stored.** The editor sends only rows the studio changed plus rows it
had already set, so fourteen shipped defaults do not become fourteen explicit settings —
which would then never pick up a later change to a default.

**The invoice series carries a payment term — *days to pay*** (11/09/2026). A new invoice
with no due date typed gets its issue date plus that many days; 0 is no term, which is what
every studio had before. Only a series that declares `hasDueDays` takes one: a bill's due
date is the supplier's to set, so a term typed against bills is refused with the reason and
dropped if one is ever read back. `customer-documents.md` is where the payment term and a
quotation's validity are described together.

### Units

Eight units ship with the product: `pcs`, `box`, `m`, `m²`, `kg`, `L`, `set`, `roll`. A
studio adds whatever its trade uses — bags, tonnes, man hours — and `unitsFor(studio.units)`
is the list `createItem` and `editItem` accept and the item form offers.

**`UNITS` was those eight strings in `modules/inventory/inventory` and nothing else**, and
`createItem` silently replaced anything it did not recognise with the first of them. So a
merchant selling cement in bags got "pcs", a stockist counting tonnes got "pcs", and
neither was told: the item saved, looked right, and was wrong. Worse than a refusal.

**The defaults come first and cannot be removed.** A studio that stops using rolls leaves
the entry alone. Taking one out would orphan every item already measured in it, and an
item whose unit is not offered cannot be edited without changing something nobody meant to
change. A shipped default therefore has no remove button — absent rather than disabled,
because a control that is always refused should not be drawn.

**No commas and no quotes**, because the item list exports as CSV and a comma inside a unit
breaks the row. Internal spaces are fine ("sq ft" is a unit), a value is trimmed before it
is judged (a pasted " kg" is the kg it looks like), and twelve characters is the cap.

**Case-insensitively unique, and re-adding a default is a no-op.** "Kg" beside "kg" is a
choice nobody can make correctly and then divides every grouping in half; somebody typing
"kg" into a list that already shows it means the one that is there.

**Refused on write with the reasons named**, the way numbering is — `unitProblems` returns
every problem rather than the first, so the studio hears about its own edit while it is
still their edit. The screen keeps no copy of the rules: `modules/administration/units` is
pure, the server refuses on it, and the panel shows what came back.

## Not built yet

- **A place inside a place.** There is no `parentId` on a location, so a site, its buildings
  and its rooms are unrelated rows. Maintenance needs it before an asset can be filed to a
  room; the departments register's `subtreeIds` is the shape to reuse.
- **Anything but locations on the map, and clustering.** Assets, open work and customer sites
  are not drawn. A customer's sites (`ClientSchema.locations`) and a job's or project's
  `location` are still free text with no coordinate.
- **Checking in by location.** Nothing compares where a technician is with where the site is.
  When it comes it is a studio setting, off by default, with recorded consent — Jordan's PDPL
  (Law No. 24 of 2023) names location as personal data.
- **The report-only CSP lists two Google hosts.** Maps also loads from other `*.gstatic.com`
  and `*.googleapis.com` hosts; they need adding before the policy is enforced.
- **Tracking's own map copy** ("just now", "min ago", "last seen") is still hard-coded English.
- **Currencies.** The studio has `currency` and `favoriteCurrencies` and both are edited in
  Studio settings; they are not surfaced here, and moving a working screen is a visibility
  decision each time.
- **Cost codes, the industry taxonomy, flow templates, notification templates and
  integrations.** The blueprint puts all of them on this screen. Cost codes exist as a
  project's own breakdown (`docs/functionality/cost-codes.md`) rather than a studio-wide
  library; the rest have no records at all, and a tab promising an empty registry reads as
  a finished feature.
- **Unit conversion.** A unit is a label. Nothing knows that a box holds twelve, so nothing
  can convert a purchase in boxes into an issue in pieces.
- **Renaming or retiring a unit a studio added.** It can be removed, which leaves existing
  items reading a unit the form no longer offers — the same shape a retired service action
  handles properly and this does not.
- **Per-series counters visible on screen.** The editor shows a live example of the next
  reference, built from the values on screen; it does not show where the real counter has
  actually reached.
