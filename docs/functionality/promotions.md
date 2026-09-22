# Promotions — what takes money off a sale at the till (22/09/2026)

**Where:** Point of Sale → Promotions (`pos-promotions`), behind `pos.promotions`.
`modules/sales/posPromotions.ts` (service), `components/studio2/StudioPosPromotions.js` (screen),
`/api/studios/<slug>/pos/promotions` (route), `shared/studio/posPromotions.ts` (words).
Numbered `PRM` (`administration/numbering`).

## What it is

An offer the till prices a basket with — by itself, or because a cashier chose it. It is the
shop's own decision to charge less, kept apart from the **cashier's** discount
(`pos.md`: a typed price, a line discount and a basket discount, all behind
`crmSales.pos.discount`), which stays exactly as it was.

**It owns its rows** (`pos-promotions`): `posPromotions`, `posCoupons`,
`posCouponRedemptions`, `posPromotionLog`. What an offer took off a SALE is frozen onto the
receipt when the sale is made, beside the till's own discount figures — a return reads the
receipt and never this register, so editing or ending an offer moves nothing already sold.

## Rights

`view` sees which offers are running; `create` and `edit` write them; there is **no delete** —
an offer that has priced a sale is archived, or every receipt naming it would name something
the product no longer admits. Two extras are the CASHIER's acts at the counter:
**`applyManual`** (choose an offer the till does not apply by itself) and **`removeAuto`**
(take off one it did). Both go with `crmSales.pos.discount`, because all three decide what the
customer pays. Existing roles reach the screen by catch-up (`modules/people/catchUps.ts`,
22/09/2026): whoever could see the till sees the offers, whoever manages it writes them, and
whoever may change a price may choose or remove one.

## Decisions taken with the owner (22/09/2026)

- **Scope is a TILL, not a branch.** The product has no branch: a till is the smallest place a
  sale happens, and multi-site is separate studios (`docs/progress.md`).
- **Schedules read the STUDIO's timezone**, a Studio setting rather than a POS one — the
  owner's rule: something several sections can use is not a section's setting.
- **Conditions name items, `itemType` and the vendor** until items have a real category axis
  (a future plan in `docs/progress.md`); the promotions module holds no industry knowledge.
- **Customer tags are a register**, not a fixed list: rows with ids the studio renames, so a
  rename re-tags nobody (`master-data.md`).
- **Consent is not re-modelled.** Marketing's append-only consent ledger is the one record of
  it (`audiences.md`).
- **Gating is sold in `/super`**, not judged in a section screen.

## Not built yet

**Everything except the registration and this screen.** As of 22/09/2026 the section exists,
the right exists, the screen lists what is stored, and nothing writes an offer yet. Arriving in
order: the model and its pure engine (`posPromotionsModel.ts`), the till's side, coupons, the
admin screens with their presets, and the reports.

- **No offer prices anything yet**, so the till is unchanged.
- **No coupons**, no redemptions, no usage counters.
- **Offline**: the till is online only (`pos.md`), so an offer is evaluated server-side and on
  the screen by the same pure function, never from a cached copy.
- **Emitting a promotion's discount as an e-invoice allowance** waits for the country packages
  — see `einvoicing.md`, which carries it beside ZATCA's own not-built list.
