# Importing items

Getting a whole materials list into Inventory from a file (an Odoo export, another
system's, or a spreadsheet kept by hand) instead of typing it one item at a time.

## What it is

An **Import items** button on `/<slug>/inventory-items`, immediately left of **Add item**
and shown on the same condition. It opens a dialog in four steps, all visible to the
person: attach a file, match its columns, check what will happen, import in batches.

| Where | What it does |
|---|---|
| `src/shared/xlsx.ts` | `readXlsx`: reads an .xlsx in the browser with no library |
| `src/modules/inventory/itemImport.ts` | The column aliases, `itemRows`, `planItemImport` and the CSV writers; pure, shared by the screen and the server |
| `src/components/studio2/ItemImport.js` | The dialog, loaded only when the button is pressed |
| `src/shared/studio/itemImport.ts` | The dialog's words, English and Arabic |
| `src/app/api/studios/[slug]/inventory/items/import/route.ts` | `POST` one batch, `DELETE` undo a whole import |
| `src/modules/inventory/inventory.ts` | `importItems`, `undoItemImport` |
| `src/platform/db/repo.ts` | `updateMany` and `removeMany`, the batch counterparts of `createMany` |

## Reading the file

**Excel (.xlsx) and CSV, both read in the browser.** The file is already there, and
sending it to the server would mean sending its rows back, which a platform response cap
(4.5 MB on Vercel) would limit. So there is **no row limit and no file-size limit**
beyond the browser's memory. The .xlsx reader is ~150 lines rather than the `xlsx`
package (~400 KB gzipped, the reason `vendor-import.md` refused Excel), and ships only in
the dialog's own chunk.

- A **CSV that is not UTF-8** is read as windows-1256, the Arabic Windows code page, which
  is what Excel's plain "CSV" option writes on an Arabic machine. Read as UTF-8, every
  Arabic name would arrive as question marks.
- **Old .xls files** are recognised by their signature and refused by name ("save it as
  .xlsx or CSV"), rather than read as garbage.
- A workbook with **several sheets** offers a sheet picker.
- **Row numbers are Excel's own**: an empty row stays in the grid, so "Line 7" in a
  refusal is row 7 on screen.

## Matching the columns

Headers are matched against aliases per field: Odoo's labels ("Internal Reference",
"Sales Price", "Vendors/Vendor"), its import-compatible technical names ("default_code",
"list_price", "seller_ids/partner_id"), and Arabic. Everything is then the person's to
change. A header row is detected when two of its cells name a field, and can be toggled.

**Odoo's "Product Type" is not the item type.** It says storable, consumable or service.
The item type is Odoo's *category*, and "All / Saleable / Cables" means "Cables".

**An Odoo continuation row**, with a product's second supplier on a row of its own and the
product columns blank, is folded into the product above rather than refused as a nameless
item. It is counted and said: an item holds one supplier today (see Not built yet).

## What is checked before anything is written

`planItemImport` runs over the whole file in the dialog, and again over every batch on the
server against what is stored by then. **Nothing is coerced:**

- **A number that is not a number is refused and named**, never written as nought. Numbers
  are read as people write them (`1,234.50`, `1.234,50`, Arabic-Indic digits), through
  the BOQ importer's `parseNumber`.
- **A unit the studio does not count in is refused and named**, never replaced by "pcs".
  `createItem` coerces a unit because its form can only offer valid ones; a file can say
  anything. Common spellings map onto a studio's own units only when the studio offers
  them ("Units" → pcs, "metre" → m, "kgs" → kg).
- **A foreign-currency item must carry its shipping and customs charges**, as the form
  insists. The studio's own currency is stored blank, as the form stores it.
- **SKUs**: a SKU already registered is skipped and said so, unless **Update** is on. A SKU
  named twice in the file is created once. A blank SKU gets the next free ITM number.
  **A row with no SKU is recognised by its name and supplier together**: re-importing a
  file must not register the same material again under a fresh number. The same name
  from another supplier is a different item.
- **Codes are read digit for digit.** A barcode, SKU or model number that Excel wrote in
  scientific form (`6.251600002251E12`) is written back out in full (`6251600002251`),
  in the .xlsx reader and in the plan alike. One Excel SHORTENED (`6.2516E+12`, the form
  its CSV saves) has lost its digits, and is refused with "format the column as Text":
  guessing would store another product's code. **This reached a live studio on
  18/09/2026**: an imported barcode read `6.251600002251E12` and no scanner could find
  the item.
- **Barcodes** must be well formed and not already another item's.
- **A supplier the studio does not have** refuses the row unless the person ticks "Add the
  N suppliers this file names". Those are created before the items and tagged with the
  import. Nothing is created silently.

**A likely swap of Cost and Sales price has to be confirmed.** Both are numbers, so no type
check can see it, and swapped, every item is quoted at cost. When at least five rows are
priced and half or more sell below cost, the Import button is disabled until the person
ticks "The prices are right as they are". A single loss-leader is only a row warning.

The dialog shows the counts (to add, to update, already registered, cannot import), the
refused rows with their line and reason, the unknown units, and a **preview of the first
rows exactly as they will be stored**.

## Updating

With **Update items whose SKU is already registered** on, a matching row changes **only
the fields the file carried**. A column the file lacks, or a blank cell, leaves the item as
it is. So a price list of SKU and Sales Price, with no names, is a valid update file:
**an update needs no name**, only a row that would create an item does.

**A row with no SKU updates the ONE item with its name and supplier.** That is how a
file with no SKUs corrects what an earlier import of it stored: its items were numbered
ITM-…, so they can only be found by name. Two items sharing a name and supplier is a
guess, and the row is refused.

## Running it

The browser sends **250 rows per request** and shows `Importing… 500 of 1200` with a
progress bar. Measured on the sandbox through the local proxy: 1,200 new items in 5
seconds; 300 price updates in 23 (updates are one compare-and-set per row).

**Sending a batch twice creates nothing twice.** Every item carries `importId` and
`importLine`; the server mints the id on the first batch, and a line already written under
it is counted rather than written again. So a dropped connection or a closed tab is a
**Continue**, never a clean-up. The import id and progress are kept in this browser's
storage against the file's name and row count; re-attaching the same file offers to
continue where it stopped. Closing the dialog is refused while a batch is in flight, and
leaving the page asks first.

**One live event per batch, never per row.** Creates were already one event per batch
(`createMany`). Updates were per row, and every event makes an open Items screen reload
the whole register: a 300-line price list was 300 reloads of 1,200 items, queued behind
the import and exhausting the connection pool (seen as 500s on the sandbox). `updateMany`
and `removeMany` announce once.

After the run: counts added, updated, suppliers added, and **Download the rows that weren't
imported**, a CSV of those rows exactly as they were in the file plus a Reason column,
with a BOM so Excel opens Arabic correctly. Fix them and import that file.

## Undo

Opening the dialog with no file attached lists **Recent imports** (date and item count),
counted from the items themselves. There is no import record to keep true.

**Undo removes every item the import created, or nothing.** If any of them has moved stock
or sits on an order or delivery note (the test `removeItem` applies to one item), the
whole undo is refused (409) and names up to five of them. Half an undo would leave part of
a file and no way to tell which part. Suppliers the import added are removed too, unless
something else still names them or the person may not delete suppliers; the answer says
how many stayed. **Items the import updated are not restored**: nothing recorded what they
held before, and the confirmation says so.

## Deleting many items at once (2026-09-18)

Not an import feature, but it is how an import's mistakes are most often cleared, so it is written
down here. The Items register has a checkbox per row (for whoever may manage items); ticking rows
shows "N selected · Clear · Delete selected", and a confirmation follows. `DELETE
/inventory/items` with `{ ids: [...] }` (at most 500, `REMOVE_ITEMS_MAX`) runs `removeItems`: the
same rule as deleting one — **an item with stock movements, orders or deliveries is KEPT** — applied
per item, so the free ones are removed in one write and the answer lists the kept ones with what
holds each. `{ id }` alone keeps its old answers (`in-use`, `notfound`). Asks
`inventory.items.delete`; no new permission key.

## Rights

Importing asks `inventory.items.create`. With Update on, also `inventory.items.edit`. Adding
suppliers, also `procurement.suppliers.create`. Undo asks `inventory.items.delete`, and
removing its suppliers `procurement.suppliers.delete`. No new permission key: importing is
creating.

## What it stores

Ordinary item rows, the same fields in the same order as `createItem` writes, plus
`importId` and `importLine`. Suppliers it adds carry `importId`. No file is kept.

## Not built yet

- **One supplier per item.** An Odoo product with several suppliers keeps the first; the
  rest are counted and left out. Several suppliers per item is its own change (decision
  ledger, `progress.md`).
- **Opening stock.** Odoo's "Quantity On Hand" is not imported. Stock is a ledger, so it
  needs an opening movement per item and, with several warehouses, a location for each.
- **Unknown units are refused, not added.** The person adds them under Settings → Units
  and imports again; the dialog names them.
- **An item type is stored as the file says it.** It is not added to the supplier's own
  list of types, except for a supplier the import itself creates.
- **Undo does not restore updated items**, and cannot undo an import whose items are in use.
- **The browser drives the batches.** Closing the tab pauses the import until the file is
  attached again. Running it on the server with the tab closed is its own decision-ledger row.
- **The resume record is per browser.** Another device does not offer to continue.
- **No import for clients, stock levels or price lists by customer.** Suppliers have their
  own CSV import (`vendor-import.md`).
- **Dates, formulas and formatting in a workbook are not read**, only each cell's value.
  Nothing an item carries is a date.
