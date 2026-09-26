# Regional pricing — what nompany's packages and tiers cost, where

nompany sells its packages and tiers the way Steam sells games: by region. A **region**
is a set of countries sharing one currency, and every package, headcount band and tier
has a price **fixed** in that currency. It is not today's exchange rate applied to one
global list. That is what the pricing page did until 23/09/2026, which made a displayed
price a guess the checkout would never have charged.

This is nompany selling to its customers. It has nothing to do with a studio's own
country pack (`official-values.md`), which is how a studio adapts to its country.

## What it stores

`g:priceRegions` holds one list of regions, read whole and written through `editJSON`:

| Field | Meaning |
|---|---|
| `name`, `nameAr` | What the pricing page calls the region |
| `currency` | ISO 4217. Every price in the region is in it |
| `countries` | ISO 3166 alpha-2 codes. **A country is in at most one region**; a clash is refused and names the region already holding it (`taken`) |
| `isDefault` | The catch-all for every country no region names. **Exactly one** region carries it, and it cannot be deleted (`default-required`) |
| `priceLevel` | Where a *suggestion* starts, as a percentage of the converted base price. 100 is parity, 60 is a 40% regional discount. It never changes a fixed price |
| `prices` | What a person fixed, keyed `pkg:<id>` (per-employee rate), `pkg:<id>:<bandId>` (a band's per-employee rate) or `tier:<id>` (a tier's cost) |

The catalogue settings (`g:catalogSettings`) gained `taxPercent`, default **16**. Prices
are **before tax**; this is the rate added on top.

Their `baseCurrency` is the currency every package and tier price is TYPED in, picked
from the currency list in Packages → Pricing settings (26/09/2026 — before that nothing
could set it and a hard-coded USD stood in). **It has no default**: unset is `""`, the
console asks for one, and Regional pricing suggests nothing until it is chosen. Both the Packages and Tiers tables print it
beside their figures. **Changing it renames the figures, it does not convert them**: a tier
at 50 reads as 50 of the new currency. Fixed regional prices are in their region's own
currency and do not move; suggestions re-derive from the new base.

## What it does

- **A price is fixed or suggested.** A fixed price is what the owner typed, and it
  doesn't move with exchange rates. An unfixed one is the base price × today's rate ×
  the price level, rounded to two significant figures and the currency's decimals
  (`nicePrice`). The exception is a region in the base currency at 100%, which keeps the
  base price exactly. `basis` travels with every amount.
- **With no rate and no fixed price, a figure cannot be priced**, and nothing guesses.
  The public page then falls back to the default region, then to the base list, and
  says so (`priced`: `region` / `default` / `base`).
- **Changing a region's currency clears its fixed prices**, because they were amounts in
  the old currency.
- **The public pricing page shows the visitor's region only.** The country comes from
  `x-vercel-ip-country`. There is no currency picker, deliberately: a picker is how a
  buyer shops for the cheapest region. The line above the cards says "Prices for
  Jordan, in JOD"; the default region says only its currency. A tax note under the cards
  gives the rate. The home page's structured data uses the default region.
- **Tiers are on the pricing page too**, under the package cards, in the same region's
  currency. **A tier's cost is per month, on top of the package** (the owner,
  23/09/2026). The monthly/yearly switch moves them with the cards, a tier costing
  nothing reads "Included", and its services are listed by name.
- **Nine regions are planted the first time the list is read** (the owner chose Steam's
  shape): Jordan (JOD), Saudi Arabia (SAR), UAE (AED), Qatar (QAR), Kuwait (KWD),
  Middle East & North Africa (USD), Europe (EUR, the euro area), United Kingdom (GBP) and
  Rest of world (USD, default). Every level is 100 and no price is fixed. Planting
  happens only when the list has never existed, never into one somebody emptied.
- **The console's Regional pricing screen** (`/super/regions`) edits regions and each
  region's price table: base, suggestion, the fixed price, the monthly total and whether
  it is fixed. "Fix all suggestions" copies every suggestion into its box, to be saved
  as fixed prices.

## The payment-method rule (Steam's)

`shared/priceRegions` holds the rule the checkout must call:

- `billingRegionFor(regions, paymentCountry)`: a payment is charged in the region of
  the country that **issued the payment method**, not the one the buyer browsed from.
- `ibanCountry(iban)`: a bank transfer's country is its IBAN's first two letters.
- `regionChangeProblem(...)`: a customer changes region at most once every
  `REGION_CHANGE_DAYS` (90).

## Not built yet

- **Nothing charges anybody.** There is no checkout, so the payment-method rule is
  tested and called by nothing, and no customer has a stored region.
- **No regional price has been fixed.** Until the owner fixes them in `/super/regions`,
  the live page shows rounded conversions in each region's currency.
- **Region names on the page are the stored words**, with no translation beyond `nameAr`.
- **A plan price change does not notify existing customers**, because there are none on
  a paid plan yet.
