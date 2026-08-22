# nompany ERP — Architecture Review

**Surveyed 2026-08-20 · commit `166300f` · 61,890 LOC · 97 API routes · 12 departments**

A full-system audit and forward plan. Every claim is verified against the source; every latency figure is measured against the live Redis instance with read-only commands; bundle figures come from a clean production build.

---

## The documents

| | What it answers |
|---|---|
| **[execution-plan.md](./execution-plan.md)** | Who does what, in what order, and what must be true before the next thing starts. Six waves, two gates, every finding assigned. **Start here.** |
| **[recommendations.md](./recommendations.md)** | What is wrong, ranked. 6 critical, 11 high, 14 medium, 9 low, plus a gap analysis of what nobody asked for and is missing anyway. |
| **[system_architecture.md](./system_architecture.md)** | What the system is. Every surface, identity, key, permission, department, workflow and invariant — as built. |
| **[procedure-flow.html](./procedure-flow.html)** | The same, drawn. Six diagrams: request cost, authorisation, order-to-cash, storage, real-time, notifications. Published at **https://claude.ai/code/artifact/40e501a7-c7a8-42b6-b802-24e3fe78c070** |
| **[performance-audit.md](./performance-audit.md)** | Where the time goes, measured, and the fetching/caching plan that removes it. |
| **[refactoring-strategy.md](./refactoring-strategy.md)** | How to rewrite for speed and correctness at exact functional parity — and how parity is *proved*, not asserted. |
| **[typescript-modularization.md](./typescript-modularization.md)** | The move to TypeScript, structured by departmental module with lint-enforced cross-references. |
| **[database-migration-mssql.md](./database-migration-mssql.md)** | Redis → SQL Server: full schema mapping, dual-write migration, verification, rollback. |
| **[ui-ux-overhaul.md](./ui-ux-overhaul.md)** | The frontend redesign, mapped item-for-item to `UIDesignSystem_Checklist.pdf`. |
| **[security-and-notifications.md](./security-and-notifications.md)** | Access-control audit with threat model, plus the notification producers and UI that do not exist yet. |

---

## The three numbers

| | |
|---|---|
| **1421 ms** | measured p50 for `GET /api/studios/<slug>/sales` — eight dependent Redis round trips |
| **180 ms** | the same fifteen keys read in one batch. **7.9× available with no schema change.** |
| **76%** | share of the live dataset held by unreclaimed base64 media blobs |

## The one thing to fix today

`sweepOrphans()` (`src/platform/db/cascade.ts:196`) repairs keys through the prefixed builders and reaps them through bare string literals. Run once with `NOMPANY_KEY_PREFIX` set — which `tests/integration.test.mjs:19` sets unconditionally — it reads empty registries, classifies every real user and studio subtree as orphaned, and prefix-deletes the production database. It is on a weekly cron. The fix is ten lines.

Detail: [recommendations.md § C-1](./recommendations.md).

---

## Reading order

**If you have ten minutes** — `execution-plan.md` §0 and §10, then the diagrams in `procedure-flow.html`.

**If you are deciding what to build next** — `execution-plan.md` §8 (finding → wave), then the document for whichever wave you are in.

**If you are new to the codebase** — `system_architecture.md` end to end, then §14, which lists the thirteen properties any rewrite must preserve. Each was arrived at by fixing a real failure.

---

## Method and limits

- **Verification.** Every finding cites a file and line. Nothing is inferred from naming.
- **Measurement.** Two read-only probes (`PING`/`GET`/`STRLEN`/`TYPE`/`SCAN`/`MEMORY USAGE`/`INFO`) against the live instance. No writes, no admin commands, no `FLUSHDB`, no `SCRIPT FLUSH`.
- **Latency caveat.** The 164 ms baseline RTT is this workstation's distance to AWS, not production's. In-region it would be single-digit milliseconds. **The ratios and the hop counts are the findings**; the absolute numbers are what a developer, or a user in a distant region, experiences today.
- **Not covered.** No penetration test was performed, no load test was run, and production traffic patterns were not observed — the dataset surveyed is small (163 keys, 3 studios, 5 users), so scaling claims are projections from the algorithms, not from measured load.
- **A local static server** was added to `.claude/launch.json` (`docs-static`, port 8099) to render and verify `procedure-flow.html`. Remove it if you don't want it.
