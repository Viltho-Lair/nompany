# Barcodes and pack sizes — what a scanner reads, and how many units it means (16/09/2026)

**Where:** Inventory → the item form (`/<slug>/inventory-items`). `modules/inventory/barcodes.ts`
(pure) holds the rules; the item routes store them.

## What it is

An item was counted in one unit and had no code a scanner could read, so a shop selling the
same thing by the piece and by the box — or a pharmacy by the tablet, the strip and the box —
could not be scanned at all.

- **A barcode** on the item is what a scanner reads for ONE of the item's own unit.
- **A pack** is a named multiple of that unit ("Box" = 20). It may carry its own barcode and
  its own price — a box is usually cheaper per unit than twenty singles.
- **Stock is still counted in the item's unit.** A pack is a way of selling the item, never a
  second stock level: scanning a box takes twenty units off the ledger.

## What it stores

On the item (`inventoryItems`): `barcode` (absent when none) and `packs` — up to ten of
`{ name, qty, barcode?, sellPrice? }`. A pack price is kept to four places, the rule for a
price as typed (`money.md`).

## What it does

- **A code is unique across the studio**, item and packs together, case-insensitively. A code
  another item carries is refused by name ("already belongs to Soap"), as is one used twice on
  the same item, one with a space or an odd character, a pack with no name, and a "pack" of one
  unit.
- **Codes are judged together on an edit**, against every other item, so moving a box code
  from one item to another in one edit is still one code on one item.
- **`findByBarcode`** answers what a scan means: which item, which pack (or none), how many
  units, and what one scan sells for — the pack's own price, else units × the item's price,
  else nothing, which a till must ask for rather than sell at zero.

`tests/barcode-model.mjs` is the coverage.

## Not built yet

- **Weighed and priced barcodes** (GS1 prefixes 20–29, which carry a weight or a price inside
  the code, printed by a shop's scale). A supermarket add-on.
- **GS1 DataMatrix** (a medicine's product number, serial, batch and expiry in one code). A
  pharmacy add-on; the batch and expiry it carries are not read from the scan.
- **No barcode search on the item grid**, and no label printing.
- **A pack has no stock of its own and no purchase unit**: receiving a box of twenty is still
  typed as twenty units.
- **Codes are not checked against a GS1 check digit** — a mistyped EAN is accepted if it is
  well-formed and unused.
