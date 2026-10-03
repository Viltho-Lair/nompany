# Master data

The studio's own reference records — the lists every section reads and no section owns.
`/<slug>/administration-master`, ten tabs: Locations, Departments, Numbering, Units,
Categories (the studio's word lists), Cost codes, Notices, API keys, Client tags, Item
categories. (This line said "four tabs" long
after the other four had landed, and "eight" the day the ninth arrived.)

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

**A default can be switched off instead** (the owner, 18/09/2026). The studio stores
`unitsOff`, the defaults it has switched off (`cleanUnitsOff` keeps only real default names),
and `unitsFor(studio.units, studio.unitsOff)` stops OFFERING them — to a new item, and to a
change of unit on an existing one. **Off takes the unit off nothing**: an item already
measured in rolls keeps "roll", `editItem` ignores a unit it no longer offers rather than
replacing it, and the item form shows the item's own unit beside the offered ones. A
studio's own unit has no switch — it is removed, as before. **At least one unit stays on**
(`unitsOffProblems`), checked against the units saved beside it, or a new item would have
nothing to be measured in.

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

### Client tags — a register, not a taxonomy (22/09/2026)

How a studio groups the people it sells to. A client carries `tagIds`; an offer's
eligibility carries `tagIds` (`promotions.md`); the register carries the names.

**A REGISTER RATHER THAN A TAXONOMY, and that is the whole design decision.** A taxonomy
(Categories, the tab beside it) is additions-only for a good reason: its values are stored
BY NAME on the records that use them, so renaming "Annual" would strand every leave request
naming it. A tag is stored BY ID, so the name is free to change and nothing follows it.
That is what makes the owner's instruction — "there can be default but can be
changed/renamed" — possible at all.

**Seeded on first read, never overwritten.** Six starter tags, each one a counter can act
on; `clientTagsSeededAt` is marked on the section in the same breath, so a studio that
clears the register on its first afternoon does not find it back the next morning. The
condition is "has never been written", not "is empty".

**Deleting a tag untags nobody.** The clients keep the id and stop resolving it — the same
containment a deleted cost code or a deleted milestone gets: a reader that attributes only
what it can see is safe against deletion in a way no write-time check is. Sweeping every
client on a delete would be a write across a collection this section does not own, and a
half-finished sweep is worse than an unresolved id.

### Item categories — and what they are NOT (22/09/2026)

What the studio calls its goods. An item carries `categoryId`; an offer's condition carries
category ids (`promotions.md`); the register carries the names. It **nests**, four levels,
through `shared/departments/tree` rather than a second copy of those walks.

**THE THING IT IS NOT IS THE INTERESTING PART.** An item already has a field that looks like
a category — `itemType` — and it is the chosen SUPPLIER's product line: the item form
populates that dropdown from the vendor's own `itemTypes` list and picking one fills the
lead time from the vendor's row. Two suppliers selling helmets produce two unrelated
strings, and an item with no vendor has no type at all.

So `itemType` is fine for procurement and poor for pricing an offer: "20% off Helmets"
written against it means *"20% off things whose supplier calls them Helmets"*, and silently
misses identical goods bought from somebody who typed it differently. **`itemType` is
therefore untouched** — a category is a NEW field beside it, and `deliveryWeeks` still
works.

**A register, not a taxonomy**, for the reason client tags give one tab along: a taxonomy
value is stored by NAME, so renaming one strands every record using it. A category is stored
by id, so a studio renames and re-nests freely.

**NOT SEEDED, and offered rather than imported.** A starter list would be a guess about a
trade. The studio already has an honest answer to "what do we sell" — the distinct
`itemType` values on its own items — and those are offered for a person to pick from.
Importing them automatically would be wrong rather than merely presumptuous: a supplier's
line is frequently not a category, and two spellings of one category would arrive as two.

**A category with children is refused deletion**, because a dangling parent reads as TOP
LEVEL (tree.ts), so deleting a middle row would quietly promote its whole subtree. Deleting a
leaf re-files nothing: the items keep the id and stop resolving it.

**An item may carry a price per subcategory (02/10/2026, the owner).** An item is filed under
one category and its Sell price is the price for that category. When the category has
subcategories, the item form shows one more Sell price box for each of them, optional, stored
on the item as `categoryPrices` keyed by the subcategory's id
(`modules/inventory/categoryPrices.ts`, pure). **The boxes are read from the register, not
stored on the item**, so a subcategory added later appears on every item already filed above
it with nothing re-saved. Only prices beneath the item's own category are kept: re-filing an
item drops the rest. A blank is unpriced and is not stored.

**And a quantity beside each price** (`categoryQuantities`, same key): how many of that
subcategory one of the item holds — a box of twenty slices says 20 against Slice. Optional,
kept apart from the price so either may be known without the other, three decimal places.

**STOCK IS THEN COUNTED IN PIECES — the owner, 02/10/2026.** An item with a subcategory
quantity is counted in the smallest thing it is sold as: on-hand, reorder level, what is
received and Unit cost are all per PIECE, so every figure is a whole number whatever the box
size. The till offers the item and, beneath it, each subcategory that has a quantity
("Chocolate — Slice") at its own price. Sold whole at the Sell price it takes the largest
quantity off stock (20); a subcategory holding q per item takes 20 / q (one for the
smallest). `piecesPerItem` and `sellingSizes` are the two functions, pure, and the server
reads the multiple from the item — a request names a subcategory, never a quantity. **A
subcategory with a price and no quantity is not offered**: what it would take off the shelf
is unknown, and guessing one would sell a slice and remove a box. The item form's margin
compares the Sell price with the cost of that many pieces, and says how many a whole sale
takes. This is per item; an item with no quantities is sold and counted as it always was.

**Re-filing such an item is asked about first.** Changing the category of an item that
carries subcategory prices or quantities resets them, so the form shows a warning that says
the stock count stays as it is and what one sale will take afterwards, with "Change and
reset" and "Keep the category". The server refuses the move without that confirmation
(`category-reset`), and an import never moves such an item: a file cannot be asked.

**SEALED BOXES AND LOOSE PIECES ARE COUNTED APART (the owner, 02/10/2026).** One on-hand
figure cannot tell a sealed box and seventeen loose pieces from thirty-seven loose ones, and
the difference is whether a box can be sold. `modules/inventory/sealedLoose.ts` (pure)
splits the count, **read from the ledger and never stored beside it**: a movement may say
how it changed the loose pieces (`loose`, signed), and the split is the item's movements
folded in the order they happened.

- **The till says what it sold.** A box takes a SEALED box and is refused (`no-sealed`) when
  none is left, however many loose pieces there are. A piece comes off the loose ones first
  and opens a sealed box only when they run out.
- **Every other movement is read by one rule**, so receipts, adjustments, delivery notes and
  returns needed no change: stock coming in arrives as whole boxes with the remainder loose;
  stock going out leaves as whole boxes with the remainder from the loose pieces.
- **The split always adds up to the on-hand.** A quantity changed on the item, or history
  from before it was counted this way, moves the difference into the loose pieces.
- The Items and Stock screens show it under the count: "1 sealed · 17 loose".

**Taking stock off by hand says what and why (02/10/2026).** The Stock screen's Adjust
dialog asks what is being done — Remove from stock, Add to stock, or Open a sealed box —
and a Reason: Damaged, Expired, Lost or stolen, Stock count, Other, with a free note. The
quantity is typed as a plain number; nobody types a minus. For an item counted in pieces
it also asks WHICH stock: loose pieces (counted in pieces) or sealed boxes (counted in
boxes), and `adjustSplit` works out what the ledger moves by. Removing more loose pieces
than there are is refused (`no-loose`), as is more sealed boxes than there are
(`no-sealed`). Opening a box moves nought on the ledger and its pieces become loose. The
reason is kept on the movement as `cause`. An adjustment above the studio's limit carries
its reason and its loose-or-sealed choice on the request, so the movement written when it
is approved is the one that was asked for.

**What was written off is a tab on the Stock screen (02/10/2026).** "Written off" totals
every adjustment that took stock away, for a period cut in the studio's own days: value
and count, by reason, by item, and each write-off with who recorded it. A sale, a delivery
note and a part issued are not write-offs. `modules/inventory/writeOffs.ts` (pure) decides
what counts; `/inventory/write-offs` serves it on `inventory.stock.view`, no new key.
**A write-off is valued at the cost a unit carried that day**, kept on the movement, so a
later repricing restates nothing. One recorded before that is valued at the item's cost
today and counted as an estimate; an item with no cost is unvalued and left out of the
total, never counted as nought. Both are said on the screen.

**Any dates, and an Excel file.** Beside the four named periods, Custom takes a From and a
To day (either may be left open; ends typed the wrong way round are swapped, never answered
with an empty report). **Export to Excel** writes a workbook of three sheets — Summary with
the totals by reason, By item, and every write-off — built in the browser by
`shared/xlsxWrite` from a second read that asks for EVERY row (`rows=all`), so the file adds
up to its own total. Money is written as numbers; an unvalued write-off is an empty cell.

## Not built yet

- **Only the till sells by subcategory.** Quotations, sales orders and delivery notes still
  sell the item at its one Sell price and take ONE of its stock unit — which, for an item
  counted in pieces, is one piece at the whole item's price. Do not put such an item on those
  documents until they learn the same arithmetic.
- **Receiving is in pieces too.** A purchase order or an adjustment for an item counted in
  pieces is entered as pieces (five boxes of twenty is 100); nothing converts a box count.
- **The write-off report's screen lists the newest 300.** The totals and the Excel export
  cover every write-off in the period.
- **Write-offs are not posted to the books.** The report is Inventory's own; Finance is not
  told what was lost.
- **Sealed and loose are per item, not per batch or bin.** A sale still takes its pieces
  from the earliest-expiring batch; which batch the sealed boxes are in is not known.
- **Changing an item's quantity re-reads its history at the new size**, so the split after
  such a change is the on-hand divided afresh rather than what was physically sealed.
- **No import column for a subcategory's price or quantity** (`item-import.md`).
- **A place inside a place.** There is no `parentId` on a location, so a site, its buildings
  and its rooms are unrelated rows. Maintenance needs it before an asset can be filed to a
  room; the departments register's `subtreeIds` is the shape to reuse.
- **Anything but locations on the map, and clustering.** Assets, open work and customer sites
  are not drawn. A customer's sites (`ClientSchema.locations`) and a job's or project's
  `location` are still free text with no coordinate.
- **Checking in by location.** Nothing compares where a technician is with where the site is.
  When it comes it is a studio setting, off by default, with recorded consent — Jordan's PDPL
  (Law No. 24 of 2023) names location as personal data.
- **Nothing lists which items carry a category**, and no bulk re-filing. Categorising a
  shelf of two hundred items is two hundred visits to the item form.
- **Reports, Inventory and Procurement do not read categories yet.** Only Promotions does.
  Stock value by category, and a purchase history by category, are the obvious next readers
  and neither exists.
- **Nothing lists which clients carry a tag.** The register says what the tags are; finding
  everybody wearing one means opening the clients list, and there is no filter for it.
- **A tag cannot be merged into another.** Two tags that turn out to mean the same thing are
  deleted one at a time, which leaves the clients carrying the dead id.
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
  items reading a unit the form no longer offers, with nothing saying it was retired.
- **Per-series counters visible on screen.** The editor shows a live example of the next
  reference, built from the values on screen; it does not show where the real counter has
  actually reached.
