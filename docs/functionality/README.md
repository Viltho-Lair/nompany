# What each thing does — the index

**Read the one file you need. Do not read this whole folder, and do not re-derive
any of it from the code.** One file per system functionality, each answering the same
four questions: what it is, what it stores, what it does, and what is NOT built yet.

When you change behaviour, **update that one file in the same commit**. Rewrite the
section, or append the new fact — never leave the file describing an intention as if it
were behaviour. That mistake has already cost this project real time: one of the old
agent briefs carried the clause "Deletion is the reverse", which read as a description
of how the system worked, while `detachRecord` had zero production callers for five
increments.

Three rules that keep this folder worth reading:

1. **State what is NOT built, in words.** A silent gap is worse than a written one. Every
   file ends with "Not built yet"; if that section is empty, say "nothing" — never leave it
   blank, because a blank section and a complete feature look identical.
2. **The code wins.** Where a file and the code disagree, the code is right and the file is
   a bug — fix it in the same commit that finds it.
3. **A create path and its delete path are one feature.** Never describe one without the
   other. If only half is built, the other half belongs under "Not built yet".

| File | Covers |
|---|---|
| [approvals.md](approvals.md) | Who signs a bill and above what amount: chains, thresholds, the currency rule, and what is not covered |
| [barcodes.md](barcodes.md) | What a scanner reads and how many units it means: an item's barcode, its packs, and why a code is unique across the studio |
| [bid-documents.md](bid-documents.md) | The tender pack and the clarification log: why a reissued document does not overwrite the one before it, and what tells an estimator something arrived after they priced |
| [bid-review.md](bid-review.md) | Who signs a bid and above what value: why pricing the work and committing the company to it are different rights, and why a part-priced bill cannot be signed |
| [billing-milestones.md](billing-milestones.md) | What a project may bill and when: absolute amounts rather than percentages, why there is no Invoiced status, and retention |
| [broadcast.md](broadcast.md) | The band across the top of every studio: automated messages the AI writes daily against the platform key, written ones you type, why several share one box, and why a colour is a hex literal |
| [boq.md](boq.md) | The bill of quantities and the rate library: what makes a total the bid, and why a rate is copied rather than referenced |
| [calendar.md](calendar.md) | Connected calendars: the OAuth flow for both providers, the token lifecycle, the account panel and the console's one calendar |
| [closure.md](closure.md) | Closing out: the punch list, practical completion, and the support clock |
| [cost-codes.md](cost-codes.md) | What a project is allowed to cost and what it has: the breakdown, why money nobody filed properly is still the project's, and why spend counts from Received |
| [customer-360.md](customer-360.md) | One client's page: the blocks each reader may see, how the totals move with them, and what is deliberately absent |
| [dashboards.md](dashboards.md) | What every section dashboard shares: the chart kit's shapes, the UTC time arithmetic, why a ranking folds its tail into Other, when a donut is allowed, and which widgets each section gained |
| [departments.md](departments.md) | A studio's own org chart: why a department is not a section, what `sectionKeys` does and does not grant, and how a scope reaches a subtree |
| [dropdowns.md](dropdowns.md) | Every option list in the product: one panel the product draws itself, why the browser's could not be themed, and what it still cannot do |
| [engagements.md](engagements.md) | The deal: one engagement, its stages, its client, lock and delete |
| [expediting.md](expediting.md) | What is late and who has been chased: the order lines behind a date, and the chase record |
| [flows.md](flows.md) | Flow templates and industries: what a studio may edit, what is refused and why, and where the editor lives |
| [handover.md](handover.md) | A won tender becomes a project: the third head of `openProject`, why the bill's total is the value, and why the bill then freezes |
| [item-import.md](item-import.md) | Items from an Excel or CSV file, Odoo exports included: the browser-side .xlsx reader, the checks that refuse rather than coerce, the likely-swap guard, resumable batches, and all-or-nothing undo |
| [language.md](language.md) | EN/AR and RTL: what decides which language, where the buttons are, what is translated |
| [ledger.md](ledger.md) | Double-entry bookkeeping and the statements it produces: the module that had no door at all, why income reads positive, and why the retained result is computed |
| [zakat.md](zakat.md) | A fiscal year's zakat for a studio whose country levies it: the ledger's figures, the accountant's adjustments, the floor and the ceiling, provision and payment |
| [einvoicing.md](einvoicing.md) | The e-invoicing framework: which countries require invoices to reach their authority, the adapter contract and its empty registry, and the queue on the Tax screen |
| [credit-control.md](credit-control.md) | Customer credit limits checked when an invoice is issued (with a recorded override), and payment reminders at the studio's levels |
| [payment-runs.md](payment-runs.md) | The approved bills due by a date, paid together from one money account, each through the bill's own pay door, with a record of every run |
| [expense-claims.md](expense-claims.md) | A person claims back what they spent, someone else approves it, and advances handed to staff are drawn down by their claims |
| [budgets.md](budgets.md) | A year's income and costs planned per account, for the studio or one project, deal, cost code or department, against the ledger's actuals |
| [deferral-schedules.md](deferral-schedules.md) | Revenue earned over time (IFRS 15) and prepaid costs, deferred on their day and recognised month by month |
| [leases.md](leases.md) | IFRS 16 leases: the right of use and the liability recognised at present value, then depreciation, interest and payment month by month |
| [allocations.md](allocations.md) | A shared cost's unowned part spread across projects, deals, cost codes or departments, by fixed shares or by what each earned |
| [groups.md](groups.md) | Several studios one person owns grouped, and their books read as one: translated, added by account code, intercompany balances eliminated |
| [legal-pages.md](legal-pages.md) | The Terms and the Privacy Policy: one renderer, the Google disclosure shared by both, and what Google's OAuth verification requires |
| [lifecycle.md](lifecycle.md) | Somebody's employment as against the person: the contract they are on, the six states it moves through, the effective-dated country pack behind probation and notice, and what the final settlement adds up to |
| [list-tables.md](list-tables.md) | The department list tables: the shared Data Grid, and the search / filter / column controls above it |
| [live-updates.md](live-updates.md) | How a board hears that somebody else changed a record: one connection per tab, what a watch key must name, and the two ways to write one that can never fire |
| [money.md](money.md) | Every amount rounds to its currency's own decimals (three for the dinar and the Omani rial): the three kinds of number, the one total every priced document uses, and the ledger's minor units |
| [device-intel.md](device-intel.md) | Fingerprint on the sign-in and sign-up pages: a trusted device bound to its browser, bots refused, failed passwords and new accounts counted per device, and why a Fingerprint outage changes nothing |
| [error-tracking.md](error-tracking.md) | Server errors and cron check-ins sent to Sentry: off until `SENTRY_DSN` is set, what is scrubbed before sending, and why nothing runs in the browser |
| [media.md](media.md) | Uploaded files: Blob for the binary, Redis for the record, the membership check on private reads |
| [nova-insights.md](nova-insights.md) | Nova's speech bubble: what it may say, where it reads from, and what it never volunteers |
| [official-values.md](official-values.md) | A country's registration, tax and address details: one definition file per country, the Owner-only country choice, validation and checksums, the resolver that prints a value only when selected, filled and applicable, the change history, and how to add a country |
| [pg-gateway.md](pg-gateway.md) | Reaching Cloud SQL from Vercel: the Cloud Run service, one call one transaction, and the guards re-run server-side |
| [pipeline.md](pipeline.md) | The sales funnel: the stages a deal moves through, the moves that are refused, how long it has sat where it is, and why it ended |
| [pos.md](pos.md) | The point of sale: tills, shifts and receipts, why the server prices the basket, tax taken out of a shelf price, stock by expiry, and the end-of-day report |
| [pricing.md](pricing.md) | What a quotation line is priced at: the customer's agreed rate, the studio's sell price, or cost — and how each is shown |
| [procurement-dashboard.md](procurement-dashboard.md) | What is waiting, what is late, and what does not add up |
| [projects.md](projects.md) | Where work is delivered: the register, the plan, and the sub-screens that have their own files |
| [questionnaires.md](questionnaires.md) | Forms authored in the console: the open answer map that replaced a whitelist, the branching the respondent never sees, and where the replies are filed for analysis |
| [receiving.md](receiving.md) | Ordered, received, billed: the three quantities and what a mismatch between them means |
| [record-engine.md](record-engine.md) | A record type declared as a row: the `engine.*` permission namespace, one collection for every instance, the section planted with the type, and why an existing studio needs a script to get one |
| [requisitions.md](requisitions.md) | The request that stands before an order: the approval chain, why Approved is not a move, and why a free-text request cannot become an order |
| [resource-planning.md](resource-planning.md) | Who is committed across every plan: why a summary row is not work, what an unknown capacity means, and the clash a day-sized unit can and cannot see |
| [roles.md](roles.md) | What a role is and who may grant it: the archetypes, the library copied on add, and why nobody grants what they do not hold |
| [sales-orders.md](sales-orders.md) | What a customer actually ordered: why a call-off against a framework contract had nowhere to go, the four statuses, and why a draft is deleted while a confirmed order is cancelled |
| [sales-dashboard.md](sales-dashboard.md) | The CRM & Sales dashboard: what each widget answers, the one vocabulary it reads, and what it still cannot show |
| [sections.md](sections.md) | The fifteen sections and their children: why records carry `sectionId` and never the key, and what a sub-section falls back to |
| [site-reports.md](site-reports.md) | What one day on one site actually was: weather, labour, plant, and what cannot be edited afterwards |
| [studio-ownership.md](studio-ownership.md) | Who owns a studio and how many: two on the free package, unlimited on any other, and why there is no `ix:owner` |
| [subcontracts.md](subcontracts.md) | A package valued period by period: the certificates, the retention, and what a period cannot do twice |
| [supplier-quotes.md](supplier-quotes.md) | What the market says it costs: the RFQ, the comparison, and what turns a quote into an order |
| [suppliers.md](suppliers.md) | Who the studio may buy from and how they performed |
| [tendering.md](tendering.md) | The tender register: the stages, why a tender cannot be won unless it was bid, and the four subsections that do not exist yet |
| [variations.md](variations.md) | Scope moving after signature: raise, submit, answer — and why only an approved variation moves the contract's value |
| [vendor-import.md](vendor-import.md) | Importing a supplier list into Inventory from a CSV: the format, the AI prompt, and the one-write bulk create |

*(Files are written as each area is next touched, not all at once — an unwritten file is
better than a stale one. Add the row when you add the file.)*

## Working in a git worktree

Several sessions share this repo. A worktree keeps them out of each other's checkout —
without one, a branch gets switched under a running agent and commits land somewhere
nobody meant. That happened three times in one day.

```bash
git worktree add ../nompany-<what> main
```

**A junctioned `node_modules` runs tsc, eslint and the test suites. It does NOT build.**
Turbopack refuses a symlink that points out of the project root:
`Symlink [project]/node_modules is invalid, it points out of the filesystem root`. So the
rule is *junction ⇒ typecheck and tests only* — not *worktree ⇒ no build*. A worktree with
its own real `npm ci` builds fine; run `next build` there, or in the shared checkout.

**And the trap that made this worth writing down:** `scripts/bundle-budget.mjs` measures
`.next/static`, which a failed build leaves behind EMPTY. It used to print
`0 KB across 0 chunks` and then `within budget`, exit 0 — a green CI line stating the
opposite of what happened. It now refuses a build that produced no chunks. Anything else
that reads build output should assume the same: the directory existing is not proof the
build succeeded.

**NEVER `rm -rf` a `node_modules` junction.** `rm -rf` follows a directory junction and
deletes the TARGET's contents — that is the shared checkout's `node_modules` gone, and every
session on this machine broken mid-task with no obvious cause. Use `cmd /c rmdir <path>`,
which removes the link only. Then count the target's contents before and after to prove it
survived, rather than assuming:

```bash
cmd /c rmdir "../nompany-<what>/node_modules"     # removes the link, not the target
```

Copy `.env.local` into the worktree, and give each test run its own namespace
(`NOMPANY_TEST_SESSION=<short>`) — two runs sharing one delete each other's fixtures, and
a killed run does not release its lock, so pick a fresh name rather than reusing one.

Deeper background, for when a summary is genuinely not enough: `docs/` holds the
architecture and audit notes, and `docs/superpowers/specs/` the designs. `CLAUDE.md`
holds the invariants and outranks everything here.

THE TASK-BY-TASK PLANS ARE GONE, deliberately. They were execution artifacts — the
steps for work that has since shipped — and once a slice lands, what it DOES is the
functionality file beside this one and WHY it is that way is the spec and the code's
own comments. A plan kept past its execution is a fourth account of the same slice,
free to disagree with the other three and read by nobody.
