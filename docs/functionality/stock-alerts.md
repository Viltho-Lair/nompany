# Stock alerts — an item at its reorder level (17/09/2026)

The owner's instruction: a studio is told when stock runs low, the right to be told is managed on
the Access screen and held by the owner unless the owner gives it to somebody, and the dashboards
list what is low or close to it.

## What it does

- **The right**: `inventory.stock.alerts`, an extra on Inventory's Stock right ("Stock alerts
  (reorder level)"). The studio's owner holds it through the Admin role; no starter role is given
  it — the owner chooses who else is told.
- **The alert**: the moment an item FALLS to or below its reorder level, everybody holding the
  right gets a notification — "Stock at reorder level", naming the item, what is left and the
  level — linking to Stock. Warning tone, danger when nothing is left. Arabic and English
  (`modules/administration/notices`, type `stock.low`).
- **Once per fall.** A sale of an item already under its level sends nothing; after a restock
  above the level, the next fall is announced again.
- **Any way stock leaves** raises it: a till sale, an issue to a work order, a delivery note, a
  correction to a receipt, a negative adjustment (when it is applied). Inventory's movements all
  pass through `record()`; the till's through `createSale`. Both call `alertIfLow`
  (`modules/inventory/stockAlerts.ts`). It is best-effort: a failure to announce never fails the
  sale or the issue.
- **The list — "Stock to reorder"** — on the Inventory dashboard and the Point of Sale dashboard,
  for holders of the right: every item at or under its level, then every item within **20%**
  above it (`NEAR_MARGIN`), the emptiest first, with on hand, the level and a tag. Not
  plan-gated. The rules are `modules/inventory/stockLevels.ts`, pure and shared by the alert and
  both screens.
- An item with no reorder level is never listed and never alerts.

`tests/stock-alerts-model.mjs` covers the rules.

## Not built yet

- **No daily reminder** for items that stay low; the list is where they are seen.
- **The 20% margin is fixed**, not a studio setting, and there is no per-item alert level
  separate from the reorder level.
- **A reorder is not raised**: the alert says an item is low; it does not draft a requisition or
  a purchase order.
- **No email**: the alert is a bell notification.
- **Two sales at once** can each see the item above its level before either lands, so one fall
  can be announced twice, or — rarely — not at all.
