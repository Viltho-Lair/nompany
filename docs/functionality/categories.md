# Categories — the classification lists a studio can change

A tab on Master data (`/<slug>/administration-master`), stored on the studio
record beside `currency`, `numbering`, `units` and the approval chains. **No new
permission key** — it reads and writes through Studio settings'
`administration.settings.*`, exactly as numbering and units do.

## What it is

**Six lists were hard-coded in five modules and no studio could change any of
them:**

| Axis | Was | Where it is used |
|---|---|---|
| Client industries | 34 in `modules/sales/tickets.ts` | clients, deals, quotations |
| Expense categories | 11 in `modules/finance/finance.ts` | petty cash expenses |
| Payment methods | 5 in `modules/finance/finance.ts` | invoice and bill payments |
| Leave types | 5 in `modules/hr/hr.ts` | leave requests |
| Location kinds | 4 in `modules/operations/operations.ts` | places the studio works from |
| Permit types | 7 in `modules/operations/operations.ts` | permits to work |

A haulier could not add "Freight forwarding"; a studio with study leave had
nowhere to put it; a hospital group filing a location as "Ward" got "Site".

**And every service silently replaced what it did not recognise** with the first
entry or with "Other" — which is worse than a refusal, because the record saved,
looked right, and was wrong. That is the same defect `UNITS` had before
`administration/units` existed, six times over.

## The rules

**The defaults MOVED rather than being copied.** `tickets.ts`, `finance.ts`,
`hr.ts`, `operations.ts` and `master.ts` import their list back from
`modules/administration/taxonomy`, so there is one list per axis and no second
copy free to disagree. That is the units precedent exactly.

**A studio adds; it does not replace.** The shipped values stay, because records
already carry them: a studio that could delete "Annual" would leave every
approved leave request naming a type the product no longer admits.

**Removing the studio's own addition is allowed and rewrites nothing.** The
value is stored ON the record, so a permit filed as "Diving" still reads as
"Diving" — it simply stops being offered. A register that refused every removal
would accumulate every typo a studio ever made.

**Shipped values come first in the list.** Several services take `[0]` as their
fallback, so a dropdown whose first entry moved because somebody added a value
would quietly re-default every form on the screen.

**The register returns the product's spelling, not the caller's.** A studio
typing "annual" gets "Annual". These values are what every grouping and every
report counts by, so one list splitting into two on case alone is the whole
failure — the cost code library's rule, and it matters more here.

**An unrecognised value still falls back rather than throwing**, so this is a
widening of what each service accepts rather than a change to what it does. The
record still saves.

**Axes cannot be added at runtime.** Each is a list some service validates
against, so an axis nothing reads would be a right nothing can exercise at the
vocabulary level — invariant 16 one layer down. Adding one means adding its
reader in the same change. An unknown axis in a submitted map is dropped.

**No commas or quotes, 48 characters, 80 additions per axis.** Every one of
these lists is a candidate CSV column. Internal spaces are the point — "Client
premises" and "Confined space" are both shipped values.

**One save carries all six**, because they are one field of one document.
Saving per axis would be six writes to the studio record, which under contention
is six chances for the last one to win. Each refusal names WHICH list is wrong,
since "that is listed twice" is unactionable without it.

## Not built yet

- **No translation of a studio's own value.** The axis names are bilingual; the
  values are not, because a value a studio typed is data — the same rule that
  leaves client and section names alone. The shipped values are English on an
  Arabic studio.
- **Nothing renames in place.** Changing a value means removing it and adding the
  new one, and records naming the old one keep the old spelling. There is no
  merge and no re-code.
- **No usage count.** The screen cannot say how many records name a value, so
  removing one is done without knowing what it was used for.
- **Six axes, and several closed lists are still closed.** `JOB_KINDS`,
  `INSPECTION_KINDS`, `MOVEMENT_KINDS`, `SHEET_KINDS` and the tender document
  kinds are structural — code branches on them — so opening those is a different
  kind of change, not more of this one. `ISO_STARTER_TYPES` is already
  studio-editable through Quality's own screen.
- **No per-axis permission.** Whoever may edit Studio settings may edit all six.
- **No import or export.**
