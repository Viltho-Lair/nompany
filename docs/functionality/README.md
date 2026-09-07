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
| [bid-documents.md](bid-documents.md) | The tender pack and the clarification log: why a reissued document does not overwrite the one before it, and what tells an estimator something arrived after they priced |
| [bid-review.md](bid-review.md) | Who signs a bid and above what value: why pricing the work and committing the company to it are different rights, and why a part-priced bill cannot be signed |
| [billing-milestones.md](billing-milestones.md) | What a project may bill and when: absolute amounts rather than percentages, why there is no Invoiced status, and retention |
| [boq.md](boq.md) | The bill of quantities and the rate library: what makes a total the bid, and why a rate is copied rather than referenced |
| [calendar.md](calendar.md) | Connected calendars: the OAuth flow for both providers, the token lifecycle, the account panel and the console's one calendar |
| [closure.md](closure.md) | Closing out: the punch list, practical completion, and the support clock |
| [cost-codes.md](cost-codes.md) | What a project is allowed to cost and what it has: the breakdown, why money nobody filed properly is still the project's, and why spend counts from Received |
| [customer-360.md](customer-360.md) | One client's page: the blocks each reader may see, how the totals move with them, and what is deliberately absent |
| [departments.md](departments.md) | A studio's own org chart: why a department is not a section, what `sectionKeys` does and does not grant, and how a scope reaches a subtree |
| [dropdowns.md](dropdowns.md) | Every option list in the product: one panel the product draws itself, why the browser's could not be themed, and what it still cannot do |
| [engagements.md](engagements.md) | The deal: one engagement, its stages, its client, lock and delete |
| [expediting.md](expediting.md) | What is late and who has been chased: the order lines behind a date, and the chase record |
| [flows.md](flows.md) | Flow templates and industries: what a studio may edit, what is refused and why, and where the editor lives |
| [handover.md](handover.md) | A won tender becomes a project: the third head of `openProject`, why the bill's total is the value, and why the bill then freezes |
| [language.md](language.md) | EN/AR and RTL: what decides which language, where the buttons are, what is translated |
| [legal-pages.md](legal-pages.md) | The Terms and the Privacy Policy: one renderer, the Google disclosure shared by both, and what Google's OAuth verification requires |
| [list-tables.md](list-tables.md) | The department list tables: the shared Data Grid, and the search / filter / column controls above it |
| [live-updates.md](live-updates.md) | How a board hears that somebody else changed a record: one connection per tab, what a watch key must name, and the two ways to write one that can never fire |
| [media.md](media.md) | Uploaded files: Blob for the binary, Redis for the record, the membership check on private reads |
| [nova-insights.md](nova-insights.md) | Nova's speech bubble: what it may say, where it reads from, and what it never volunteers |
| [pg-gateway.md](pg-gateway.md) | Reaching Cloud SQL from Vercel: the Cloud Run service, one call one transaction, and the guards re-run server-side |
| [pipeline.md](pipeline.md) | The sales funnel: the stages a deal moves through, the moves that are refused, how long it has sat where it is, and why it ended |
| [pricing.md](pricing.md) | What a quotation line is priced at: the customer's agreed rate, the studio's sell price, or cost — and how each is shown |
| [procurement-dashboard.md](procurement-dashboard.md) | What is waiting, what is late, and what does not add up |
| [projects.md](projects.md) | Where work is delivered: the register, the plan, and the sub-screens that have their own files |
| [receiving.md](receiving.md) | Ordered, received, billed: the three quantities and what a mismatch between them means |
| [record-engine.md](record-engine.md) | A record type declared as a row: the `engine.*` permission namespace, one collection for every instance, the section planted with the type, and why an existing studio needs a script to get one |
| [requisitions.md](requisitions.md) | The request that stands before an order: the approval chain, why Approved is not a move, and why a free-text request cannot become an order |
| [roles.md](roles.md) | What a role is and who may grant it: the archetypes, the library copied on add, and why nobody grants what they do not hold |
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
