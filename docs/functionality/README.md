# What each thing does — the index

**Read the one file you need. Do not read this whole folder, and do not re-derive
any of it from the code.** One file per system functionality, each answering the same
four questions: what it is, what it stores, what it does, and what is NOT built yet.

When you change behaviour, **update that one file in the same commit**. Rewrite the
section, or append the new fact — never leave the file describing an intention as if it
were behaviour. That mistake has already cost this project real time: `backend-db.md`
carried the clause "Deletion is the reverse", which read as a description of how the
system worked, while `detachRecord` had zero production callers for five increments.

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
| [calendar.md](calendar.md) | Connected calendars: the OAuth flow for both providers, the token lifecycle, the account panel and the console's one calendar |
| [customer-360.md](customer-360.md) | One client's page: the blocks each reader may see, how the totals move with them, and what is deliberately absent |
| [engagements.md](engagements.md) | The deal: one engagement, its stages, its client, lock and delete |
| [flows.md](flows.md) | Flow templates and industries: what a studio may edit, what is refused and why, and where the editor lives |
| [legal-pages.md](legal-pages.md) | The Terms and the Privacy Policy: one renderer, the Google disclosure shared by both, and what Google's OAuth verification requires |
| [language.md](language.md) | EN/AR and RTL: what decides which language, where the buttons are, what is translated |
| [list-tables.md](list-tables.md) | The department list tables: the shared Data Grid, and the search / filter / column controls above it |
| [media.md](media.md) | Uploaded files: Blob for the binary, Redis for the record, the membership check on private reads |
| [pricing.md](pricing.md) | What a quotation line is priced at: the customer's agreed rate, the studio's sell price, or cost — and how each is shown |
| [pipeline.md](pipeline.md) | The sales funnel: the stages a deal moves through, the moves that are refused, how long it has sat where it is, and why it ended |
| [pg-gateway.md](pg-gateway.md) | Reaching Cloud SQL from Vercel: the Cloud Run service, one call one transaction, and the guards re-run server-side |
| [sales-dashboard.md](sales-dashboard.md) | The CRM & Sales dashboard: what each widget answers, the one vocabulary it reads, and what it still cannot show |
| [studio-ownership.md](studio-ownership.md) | Who owns a studio and how many: two on the free package, unlimited on any other, and why there is no `ix:owner` |
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
architecture and audit notes, `docs/superpowers/specs/` the designs, and
`docs/superpowers/plans/` the task-by-task plans. `CLAUDE.md` holds the invariants and
outranks everything here.
