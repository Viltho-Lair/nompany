# Importing a vendor list

Getting a whole supplier list into Inventory from a file, instead of typing it one vendor
at a time into the Add-vendor form.

## What it is

An **Import** button on `/<slug>/inventory-vendors`, sitting immediately left of **Add
vendor** and shown on the same condition. It opens a dialog with four things in it: a
prompt to copy, an attach-file control, Import, and Cancel.

The pieces:

| Where | What it does |
|---|---|
| `src/shared/csv.ts` | `parseCsv` / `readCsvTable` — a dependency-free CSV reader |
| `src/modules/inventory/vendorCsv.ts` | `readVendorCsv` — CSV text to vendor rows; pure, imported by the browser |
| `src/components/studio2/StudioInventory.js` | `VendorImport` — the dialog |
| `src/app/api/studios/[slug]/inventory/vendors/import/route.ts` | `POST`, the bulk create |
| `src/modules/inventory/inventory.ts` | `importVendors` — validation, de-duplication, one write |
| `src/platform/db/sections.ts` | `addRows` — many rows, one compare-and-set |
| `src/platform/db/repo.ts` | `createMany` — the repository's door onto it |

**The format is CSV**, five columns:

```
Name,Contact Name,Email,Phone,Item Types
Gulf AV Supply,Sara Haddad,sara@gulfav.example,+971 4 555 0100,"Microphones:4; Speakers:6"
Delta Steel,,omar@deltasteel.example,,"Steel sections:8; Fixings"
```

Item types are `Type:weeks`, several separated by `;`. The weeks are optional — `Fixings`
alone stores a blank lead time, which is **not** the same as a lead time of zero and is not
flattened into one anywhere along the path. Headers are matched case- and space-insensitively
against a list of alternatives per field (`Vendor`, `Phone Number`, `Supplies`, and the
Arabic spellings), so a file whose columns were named by somebody who had never seen ours
still imports. Column order does not matter, and an unrecognised extra column is ignored
rather than refused.

**Chosen over XLSX and JSON** for two reasons. XLSX would need the `xlsx` package, roughly
400 KB gzipped, against a largest-chunk ceiling of 250 KB that every studio route pays.
JSON represents the nested item types natively but cannot be opened in a spreadsheet and
dies whole on one stray comma. CSV parses in eighty lines with no dependency.

**The Copy button is the answer to "I don't have a file".** Most people asked for a CSV have
no idea how to produce one, so the dialog carries the exact words to hand an AI along with
whatever list they do have — in the studio's own language, from the dictionary. If the
clipboard is blocked (an insecure origin, a browser policy) the prompt is revealed in a
read-only box to be taken by hand, rather than the button failing silently.

## What it stores

**Ordinary vendor rows, indistinguishable from typed ones.** Same collection
(`inventoryVendors` under the vendors sub-section), same fields in the same key order, same
`createdAt`. Nothing records that a vendor arrived by import, because nothing would read it.

The import itself is **not** stored: no file is kept, no upload is retained, no history of
past imports exists.

## What it does

**In the browser.** The attached file is read with `File.text()` and parsed locally — it is
already here, and sending it away to be parsed would add a round trip and a multipart body
for an answer that can be worked out on the spot. Attaching reports what the file holds
(`12 vendors ready · 1 row will be skipped`) **before** anything is sent, so nobody imports
two hundred rows blind. A file with no readable Name column, or no rows at all, says so
instead of claiming zero vendors were found. What goes up is JSON.

**Rows with no name are sent, not filtered out locally.** Dropping them in the browser looks
tidier and quietly loses them: the report of what was refused comes from the server, so a row
it never received is a row missing from that report — "3 imported" with no mention of the
fourth line, which is the silent drop the reporting exists to prevent. One rule decides, in
`importVendors`. The pre-flight count is the only thing the browser judges for itself, and it
only ever warns earlier about the same rows.

**On the server.** `importVendors` re-cleans every field through the same `str` and
`cleanItemTypes` helpers the single-vendor form goes through, so a hand-made request cannot
get past what a parsed file cannot. It asks `inventory.vendors.create` — importing *is*
creating, and a right of its own would be one somebody could hold without being able to add
a vendor.

**Two rules, and only two:**

- **Name is mandatory.** Every other field is optional and stored as given. The point of an
  import is to get the list in; the details are edited afterwards on a screen built for it.
- **A name already taken is skipped, never overwritten** — checked against the studio's
  existing vendors *and* against the rows already accepted from this same file, so a list
  that names a vendor twice creates it once.

Everything else lands. Refused rows come back with their **line number in the file** and a
reason, and are shown in the dialog after the run:

```json
{ "ok": true, "created": 12,
  "skipped": [ { "line": 4, "reason": "name" },
               { "line": 9, "reason": "duplicate", "name": "Delta Steel" } ] }
```

**One write, whatever the length.** `addRows` appends the whole batch inside a single
`editArr`, so an import of two hundred vendors is one compare-and-set, not two hundred — and
other writers to that collection are not queued behind the whole run. It emits **one**
`row.created` event carrying no `rowId`, which is the honest shape: it says the collection
changed, not which row. Every consumer reads the collection back, so naming one row out of
two hundred would be a detail nobody could use.

Gate A pins this by cost rather than by inspection: batches of 3, 6 and 24 must cost the
same number of Redis commands. A loop would grow by one per row.

**Refusals.** An empty list is `400 empty` — "0 imported" would read as though the file had
been understood. More than **500 rows** is `400 too-many` — counted over every row in the file, nameless ones included, since those are sent too.

## Not built yet

- **No preview table.** The dialog reports counts, not rows. You cannot see or correct the
  parsed values before importing; a wrong file is imported and then edited or deleted.
- **No update-on-duplicate.** A vendor already on the list is always skipped. Re-importing a
  corrected sheet adds nothing and changes nothing, so corrections are made by hand.
- **No undo.** There is no "delete everything that came in with this import" — the rows carry
  no batch id, and each must be deleted individually (and only when no item or order points
  at it, which `removeVendor` already enforces).
- **No export.** Nothing writes a CSV *out*, so there is no round trip: you cannot download
  the current vendor list, edit it, and put it back.
- **Vendors only.** Items, clients and every other list are still one-at-a-time. `addRows`
  and `repo.createMany` are department-neutral and ready for the next one; `readCsvTable`
  takes its field map as an argument for the same reason.
- **No XLSX.** A spreadsheet must be saved as CSV first. See the bundle-budget reason above.
