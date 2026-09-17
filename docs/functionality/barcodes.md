# Barcodes — what a scanner reads (16/09/2026; packs removed 17/09/2026)

**Where:** Inventory → the item form (`/<slug>/inventory-items`). `modules/inventory/barcodes.ts`
(pure) holds the rules; the item routes store them.

## What it is

An item had no code a scanner could read. **A barcode** on the item is what a scanner reads for
ONE of the item's own unit, and a till scan adds one of that unit to the basket.

**Packs were removed on the owner's instruction, 17/09/2026.** They let one item be sold by the
piece and by the box under separate codes and prices. The item's **unit** says how it is sold,
and a studio names its own units (Administration → Units), so an item sold by the box is an item
whose unit is the box. Past receipts keep what they printed ("Soap — Box") and the units they
took. `scripts/migrate/remove-packs.mjs` clears the `packs` field items still carry (two
confirmations); saving an item also drops it.

## What it stores

On the item (`inventoryItems`): `barcode`, absent when none.

## What it does

- **A code is unique across the studio**, case-insensitively. A code another item carries is
  refused by name ("already belongs to Soap"), as is one with a space or an odd character.
- **An item keeps its own code on an edit**; a new code is judged against every other item.
- **`findByBarcode`** answers what a scan means: which item, and what it sells for — the item's
  price, or nothing, which a till must ask for rather than sell at zero.

`tests/barcode-model.mjs` is the coverage.

## Not built yet

- **Weighed and priced barcodes** (GS1 prefixes 20–29, which carry a weight or a price inside
  the code, printed by a shop's scale). A supermarket add-on.
- **GS1 DataMatrix** (a medicine's product number, serial, batch and expiry in one code). A
  pharmacy add-on; the batch and expiry it carries are not read from the scan.
- **No barcode search on the item grid**, and no label printing.
- **One code per item**: a product with two printed codes (an old and a new pack) answers to one.
- **Codes are not checked against a GS1 check digit** — a mistyped EAN is accepted if it is
  well-formed and unused.
