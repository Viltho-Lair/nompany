# The approval-workflow engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A studio can say "bills over X need a second signature", set X itself, and have the product enforce it — where today `finance.payables.approve` approves any amount.

**Architecture:** A pure engine (`src/platform/approval/`) that is a function over values: a chain, an amount, a currency, a rate table. A studio's chains are stored as overrides merged over a seed, in the `finance-settings` sub-section's own `settings` object. A bill gains a currency and stores the plan it was routed under, and `approveBill` becomes a walk over that plan's steps instead of a single `requirePermission`.

**Tech Stack:** Next.js 16.2.10, React 19, TypeScript (`noImplicitAny`, plus `tsconfig.strict.json` for converted folders), Postgres via `src/platform/db/repo` under `PG_TRANSPORT=gateway`, Zod schemas per module.

**Spec:** `docs/superpowers/specs/2026-09-03-approval-workflow-engine-design.md` — read it first. The nine decisions in §2 are the argument for everything below; this plan does not restate them.

---

## READ THIS BEFORE TASK 1 — the live behaviour change

**`createStudio` has never set a currency.** Nothing in `src/modules/main/studios.ts` writes one, and every reader in the product is `studio.currency || ""`. So **every existing studio has none**, test fixtures included.

Spec D4 says approval refuses when there is no studio currency. Taken together that means: **the day this ships, bill approval stops for every studio that has not set a currency, until an owner or admin sets one.** That is the decision as taken — the user's reason is that a studio's currency is what it is billed against — but it is a live behaviour change and not a quiet default, so:

- the refusal must name the setting and who can change it (Task 3), not merely fail;
- the payables screen must show it as a fixable state rather than a broken button (Task 7);
- **Task 8 must not be skipped**: the rollout note in `CLAUDE.md` is how anybody else learns this.

It also means Task 6 has to set a currency on the test fixture, or the existing AP assertions in `tests/suite.mjs:2452` go red for a reason that has nothing to do with what they test.

---

## Global Constraints

Copied from `CLAUDE.md` and the spec. Every task's requirements implicitly include these.

- **Keys are built only in `src/platform/db/keys.ts`** (invariant 1). This feature deliberately adds **no** key builder — chains live inside an existing section's `settings` blob. If you find yourself writing a key, stop: that is a design change, not an implementation detail.
- **Access is resolved once**, in `effectivePermissions` (invariant 3). `approveBill` asks `requirePermission` with a key chosen at runtime — it does not re-resolve access.
- **Default deny** (invariant 4). A chain step whose key nobody holds blocks the bill. That is correct behaviour, not a bug.
- **Reviewer ≠ approver** (invariant 7), and per spec D7 this extends between steps: one person may not sign two steps of one bill.
- **`updateRow` takes a FUNCTION patch** (invariant 8). `approveBill` already calls `Bills.update` with `() => ({...})` — keep it, and capture `new Date().toISOString()` OUTSIDE the closure. The existing comment there explains why: a CAS retry or a `NOMPANY_DB=parity` double-invoke would otherwise disagree with itself.
- **A right nothing can exercise is a bug** (invariant 16). `finance.payables.approveHigh` must be exercised by the seeded chain in the same push that declares it.
- **Golden responses are the contract.** `NOMPANY_RECORD_GOLDENS` is never set in CI. Exactly one existing golden moves (`tests/goldens/owner.roles.json`) and it is re-recorded in **its own commit with the reason stated**.
- **Hop counts are part of the contract.** Fetch the FX snapshot only when the bill's currency differs from the studio's — a domestic bill must add zero reads.
- **Files here are CRLF on disk.** Match the file you are editing.
- **Two sessions cannot share a test namespace.** Run as `NOMPANY_TEST_SESSION=approvals npm test`.
- **Comments explain why.** When you change commented code, update the reason — do not delete it.
- **Commit subjects are declarative sentences** describing the state after the change, never conventional-commit prefixes. End each with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/platform/approval/chains.ts` | What a chain IS: types, the seeded bill chain, `chainProblems` | **New** |
| `src/platform/approval/resolve.ts` | Amount → which steps apply; the four refusals; `firstUnsignedStep` | **New** |
| `tests/approval-model.mjs` | The pure half — no store, no server, milliseconds | **New** |
| `package.json` | Register the pure suite in `npm test` | Modify — one line |
| `src/platform/access/catalogue.ts:216` | `finance.payables` gains `approveHigh` | Modify |
| `src/shared/studio/access.ts` | Its Arabic label | Modify |
| `tests/gate-a.mjs:251` | The hardcoded key count 123 → 124, and why | Modify |
| `tests/goldens/owner.roles.json` | The only golden carrying the catalogue | Re-record — own commit |
| `src/modules/finance/schema.ts` | `BillSchema` gains `currency`, `approvals`, `approvalPlan` | Modify |
| `src/modules/finance/finance.ts` | `readApprovalChains`; `saveFinanceSettings` accepts chains | Modify |
| `src/modules/finance/types.ts` | `FinanceContext` gains `approvalChains` | Modify |
| `src/modules/finance/payables.ts` | Currency on create/edit; `planFor`; `approveBill` walks | Modify — heavy |
| `src/app/api/studios/[slug]/finance/bills/route.ts` | Surface the plan and the outstanding step | Modify |
| `src/components/studio2/StudioFinance.js` | Payables draws the chain; settings edits the threshold | Modify |
| `src/shared/studio/finance.ts` | New strings, EN and AR | Modify |
| `tests/suite.mjs` | The walk, against real modules and real store | Modify |
| `tests/goldens.mjs` + a new golden | AP gets the golden it never had | Modify + new |
| `docs/functionality/approvals.md` | What approval means in this product | **New** |
| `CLAUDE.md` | Current state, and the rollout note | Modify |

**Why two files in `platform/approval/`:** `chains.ts` is vocabulary the settings screen imports to validate an edit; `resolve.ts` reads a rate table. Keeping them apart is what lets the browser import the first without the second — the `templates.ts` / `registry.ts` split, for the same reason.

**Where the tests actually live.** `tests/integration.test.mjs` is only a bootstrap; the assertions are in **`tests/suite.mjs`**, which already imports `financeContext`, `createBill`, `editBill`, `approveBill` and friends (line 77) and builds a context as `await financeContext(owner, slug)` (line 881). The existing AP block is at **line 2452**. Add beside it; do not invent a new harness.

---

### Task 1: A chain is a list of steps, and five shapes of it are refused

**Files:**
- Create: `src/platform/approval/chains.ts`
- Create: `tests/approval-model.mjs`
- Modify: `package.json` (the `test` script)

**Interfaces:**
- Consumes: `ALL_PERMISSIONS` from `@/platform/access`.
- Produces: `ApprovalStep`, `ApprovalChain`, `SEEDED_CHAINS`, `chainProblems(chain, knownKeys): string[]`.

- [ ] **Step 1: Write the failing test**

Create `tests/approval-model.mjs`. The loader preamble is copied from `tests/access.test.mjs:17-23` — it registers the `@/` resolver and is what lets a `.mjs` test import a `.ts` module.

```js
// THE APPROVAL ENGINE, PURELY. No store, no server, no fixtures: a chain is a
// list of values and resolving one is arithmetic, so this runs in milliseconds
// beside tests/access.test.mjs rather than inside the seven-minute suite.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { SEEDED_CHAINS, chainProblems } = await import("@/platform/approval/chains");
const { ALL_PERMISSIONS } = await import("@/platform/access");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== a chain's shape");

// THE SEED MUST BE VALID BY ITS OWN RULES. A seeded chain its own validator
// refuses is the one failure no studio can catch, because no studio writes it.
// RED UNTIL TASK 3 lands finance.payables.approveHigh — deliberately; see that
// task's note on why the two ship in one push.
ok("the seeded bill chain passes its own validator",
  chainProblems(SEEDED_CHAINS.bill, ALL_PERMISSIONS).length === 0,
  JSON.stringify(chainProblems(SEEDED_CHAINS.bill, ALL_PERMISSIONS)));

ok("the seeded bill chain has two steps", SEEDED_CHAINS.bill.steps.length === 2);
ok("...the first of which always applies", SEEDED_CHAINS.bill.steps[0].from === 0);

const problem = (steps) => chainProblems({ type: "bill", steps }, ALL_PERMISSIONS);

ok("an empty chain is refused", problem([]).length === 1, JSON.stringify(problem([])));

ok("a step naming an unknown permission is refused",
  problem([{ permission: "finance.payables.nuke", from: 0, label: "x" }])
    .some((p) => p.includes("finance.payables.nuke")));

ok("thresholds that do not ascend are refused",
  problem([
    { permission: "finance.payables.approve", from: 500, label: "a" },
    { permission: "finance.payables.pay", from: 100, label: "b" },
  ]).some((p) => p.includes("ascend")));

ok("a chain with no always-on step is refused",
  problem([{ permission: "finance.payables.approve", from: 100, label: "a" }])
    .some((p) => p.includes("from: 0")));

ok("the same permission twice is refused",
  problem([
    { permission: "finance.payables.approve", from: 0, label: "a" },
    { permission: "finance.payables.approve", from: 100, label: "b" },
  ]).some((p) => p.includes("twice")));

// A REFUSAL IS A SENTENCE SOMEBODY READS. Asserted because the whole reason
// chainProblems returns strings rather than a boolean is that a studio is shown
// them, and a message naming nothing actionable is a boolean with extra steps.
ok("every refusal names what is wrong, not that something is",
  problem([{ permission: "nope.nope.nope", from: 5, label: "a" }])
    .every((p) => p.length > 20 && /[a-z]/.test(p)));

console.log(fails ? `\n${fails} FAILED\n` : "\napproval model: all passed\n");
process.exit(fails ? 1 : 0);
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
node tests/approval-model.mjs
```

Expected: throws `Cannot find module '@/platform/approval/chains'`. That is the correct failure.

- [ ] **Step 3: Write the implementation**

Create `src/platform/approval/chains.ts`:

```ts
// WHAT AN APPROVAL CHAIN IS — the vocabulary, the seeds, and what makes one
// impossible. Spec: docs/superpowers/specs/2026-09-03-approval-workflow-engine-design.md
//
// PURE, AND THAT IS THE POINT. Nothing here touches the store, so the settings
// screen imports this file and validates a studio's edit with THE SAME function
// the server refuses it with. A second copy of the rules is free to disagree
// with the first, and the copy is what goes stale — the same reasoning that
// keeps templateProblems in platform/engagement/templates.ts.

/** One step: who may clear it, and the amount at which it starts applying. */
export type ApprovalStep = {
  /** A permission catalogue key. Not a role and not a person — spec D2. */
  permission: string;
  /**
   * The amount AT OR ABOVE which this step applies, in the STUDIO's currency.
   * `0` means "always". A chain whose steps are all 0 is an ordered list with
   * no value logic at all, which is why thresholds live on steps rather than
   * selecting between whole chains by band: the simple case stays simple, and
   * "who signs a 60k bill" is answered by reading one list.
   */
  from: number;
  /** What the studio calls this step. Tenant-authored, so never translated. */
  label: string;
};

export type ApprovalChain = {
  /** The document type this governs. "bill" is the only one built — spec D1. */
  type: string;
  /** In the order they must be walked. */
  steps: ApprovalStep[];
};

// THE BUILT-IN, WHICH A STUDIO OVERRIDES RATHER THAN FORKS. Finance sees every
// bill; the second step is the studio's own dial and 50000 is only where it
// starts. Stored overrides merge OVER this (modules/finance/finance.ts), so a
// correction here still reaches every studio that never touched it.
export const SEEDED_CHAINS: Record<string, ApprovalChain> = {
  bill: {
    type: "bill",
    steps: [
      { permission: "finance.payables.approve", from: 0, label: "Finance" },
      { permission: "finance.payables.approveHigh", from: 50000, label: "Above the limit" },
    ],
  },
};

/**
 * WHY A CHAIN COULD NOT WORK — actionable sentences, never a boolean.
 *
 * Refused ON WRITE, never on read, for flows.ts's stated reason: a studio hears
 * about its own edit while it is still their edit and in words about the edit,
 * rather than discovering it on somebody else's screen at the worst moment.
 *
 * Each of these is invisible at runtime and none of them throws, which is
 * exactly why they are checked here.
 */
export function chainProblems(
  chain: ApprovalChain | null | undefined,
  knownKeys: readonly string[],
): string[] {
  const out: string[] = [];
  const steps = chain?.steps || [];

  if (!steps.length) {
    out.push("An approval chain needs at least one step; an empty one would approve nothing.");
    return out;
  }

  const known = new Set(knownKeys);
  const seen = new Set<string>();
  let previousFrom = -1;

  for (const [i, step] of steps.entries()) {
    const at = `Step ${i + 1}`;

    if (!known.has(step.permission)) {
      // A step nobody can ever satisfy blocks every record that reaches it,
      // silently and forever. This is the refusal most worth having.
      out.push(`${at} names "${step.permission}", which is not a permission this product has.`);
    }
    if (seen.has(step.permission)) {
      out.push(`${at} names "${step.permission}" twice. One person may not sign two steps of one record, so a repeated right makes the chain unwalkable.`);
    }
    seen.add(step.permission);

    if (!Number.isFinite(step.from) || step.from < 0) {
      out.push(`${at} has no usable threshold. Use 0 for a step that always applies.`);
    } else if (step.from < previousFrom) {
      out.push(`${at} starts at ${step.from}, below the step before it (${previousFrom}). Thresholds must ascend, or the order is one nobody can read.`);
    } else {
      previousFrom = step.from;
    }
  }

  if (!steps.some((s) => s.from === 0)) {
    // Without one, an amount below the lowest threshold needs no approval at
    // all — a hole rather than a policy, and one nobody would notice until a
    // small bill sailed through.
    out.push("No step has `from: 0`, so an amount below the lowest threshold would need no approval at all.");
  }

  return out;
}
```

The `ascend` refusal contains the word "ascend" and the always-on refusal contains the literal `from: 0` — the test greps for both, so do not reword them without changing the test.

- [ ] **Step 4: Run it**

```bash
node tests/approval-model.mjs
```

Expected: every assertion `ok` **except** `the seeded bill chain passes its own validator`, which stays red until Task 3. Its `extra` will read `["Step 2 names \"finance.payables.approveHigh\", which is not a permission this product has."]` — confirm that is the message, because it proves the validator works rather than that something else is broken.

- [ ] **Step 5: Register it in the suite**

In `package.json`'s `test` script, insert `node tests/approval-model.mjs && ` immediately after `node tests/access.test.mjs && `. It belongs there because it is pure and fast: CI should learn about a broken chain before spending seven minutes on the store.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

```bash
git add src/platform/approval/chains.ts tests/approval-model.mjs package.json
git commit
```

Subject: `An approval chain is data, and five shapes of it are refused`
Body must say the seed assertion is red until the right exists, and why that is better than seeding a chain that names nothing.

---

### Task 2: An amount decides which steps apply, and four things stop it

**Files:**
- Create: `src/platform/approval/resolve.ts`
- Modify: `tests/approval-model.mjs` (append before the final `console.log`)

**Interfaces:**
- Consumes: `ApprovalChain`, `ApprovalStep` from `./chains`; `crossRate` from `@/shared/currencies`.
- Produces: `resolveApprovalPlan(input): ResolvedPlan | PlanRefusal`, `firstUnsignedStep(plan, signatures)`, `planSatisfied(plan, signatures)`, types `ResolvedPlan`, `PlanRefusal`, `PlanInput`, `ApprovalSignature`.

**Note on the FX stamp:** `getExchangeSnapshot()` returns `updatedAt`, **a unix number** (`Snapshot` in `src/lib/data/exchangeRates.ts:49`), not an `asOf` string. The plan carries `updatedAt: number`.

- [ ] **Step 1: Write the failing test**

Append to `tests/approval-model.mjs`:

```js
const { resolveApprovalPlan, firstUnsignedStep } = await import("@/platform/approval/resolve");

console.log("\n== resolving a plan");

const CHAIN = SEEDED_CHAINS.bill;
// A rate table in the shape shared/currencies expects: every code against USD.
const RATES = { USD: 1, SAR: 3.75, EUR: 0.92 };
const base = (amount, currency = "SAR") => resolveApprovalPlan({
  chain: CHAIN, amount, currency, studioCurrency: "SAR",
  rates: RATES, updatedAt: 1756800000000, stale: false,
});

ok("an amount under the threshold needs one step", base(10000).ok && base(10000).steps.length === 1);
ok("an amount over it needs two", base(200000).steps.length === 2);
// THE BOUNDARY IS INCLUSIVE, asserted because "over 50000" and "at 50000" are
// the two readings of one sentence and only one of them is the code.
ok("exactly the threshold needs two — `from` is at-or-above", base(50000).steps.length === 2);
ok("one unit under it needs one", base(49999).steps.length === 1);

ok("the studio's own currency needs no rate at all", base(10000).rate === null);

const foreign = resolveApprovalPlan({
  chain: CHAIN, amount: 20000, currency: "EUR", studioCurrency: "SAR",
  rates: RATES, updatedAt: 1756800000000, stale: false,
});
// 20000 EUR at 3.75/0.92 ≈ 81522 SAR — over the threshold though the raw
// number is under it. This is the whole reason conversion exists.
ok("a foreign amount is judged converted, not raw", foreign.ok && foreign.steps.length === 2,
  String(foreign.amountInBase));
ok("...and the rate that decided it is carried on the plan", foreign.rate !== null);

console.log("\n== the four refusals");

const refusal = (over) => resolveApprovalPlan({
  chain: CHAIN, amount: 20000, currency: "EUR", studioCurrency: "SAR",
  rates: RATES, updatedAt: 1756800000000, stale: false, ...over,
});

ok("no studio currency refuses by that name",
  refusal({ studioCurrency: "" }).reason === "no-studio-currency");
// AND NAMES THE FIX. "your studio has no currency" is fixed in Settings and
// "EUR→SAR is not quoted" is not; the two send whoever hits them to different
// places, so the detail has to distinguish them.
ok("...and its detail names the setting",
  /settings/i.test(refusal({ studioCurrency: "" }).detail));

ok("an unquoted pair refuses by that name",
  refusal({ rates: { USD: 1, SAR: 3.75 } }).reason === "unquoted");
ok("...and its detail names the pair",
  refusal({ rates: { USD: 1, SAR: 3.75 } }).detail.includes("EUR"));

ok("no chain refuses by that name",
  resolveApprovalPlan({ chain: null, amount: 10, currency: "SAR", studioCurrency: "SAR",
    rates: RATES, updatedAt: 0, stale: false }).reason === "no-chain");

// A STALE SNAPSHOT WITH A REAL RATE STILL ROUTES. Yesterday's rate with an
// honest stamp beats blocking every foreign bill because one fetch failed —
// only a MISSING rate refuses.
const stale = refusal({ stale: true });
ok("a stale but real rate routes, flagged", stale.ok === true && stale.stale === true);

console.log("\n== walking a plan");

const plan = base(200000);
const sig = (permission) => ({ permission, byCollaboratorId: "col_1", byAlias: "A", at: "2026-09-03T00:00:00.000Z" });

ok("nothing signed yet → the first step",
  firstUnsignedStep(plan, []).permission === "finance.payables.approve");
ok("first signed → the second step",
  firstUnsignedStep(plan, [sig("finance.payables.approve")]).permission === "finance.payables.approveHigh");
ok("both signed → nothing left",
  firstUnsignedStep(plan, [sig("finance.payables.approve"), sig("finance.payables.approveHigh")]) === null);
// A SIGNATURE FOR A STEP THIS PLAN NO LONGER HAS is not a signature for the
// step that IS next. A bill re-planned across the threshold must not credit an
// old signature to a step it was never given for.
ok("a signature naming a step this plan does not have counts for nothing",
  firstUnsignedStep(base(10000), [sig("finance.payables.approveHigh")]).permission
    === "finance.payables.approve");
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
node tests/approval-model.mjs
```

Expected: throws `Cannot find module '@/platform/approval/resolve'`.

- [ ] **Step 3: Write the implementation**

Create `src/platform/approval/resolve.ts`:

```ts
// WHICH STEPS AN AMOUNT ACTUALLY NEEDS, and the four things that stop the
// question being answerable.
//
// PURE: it is HANDED a rate table rather than fetching one. Two reasons, and
// the second is the operational one — it stays testable as arithmetic, and the
// caller decides whether an FX read is worth making at all, so a bill already
// in the studio's currency adds no round trip (hop counts are part of this
// repo's contract).

import { crossRate } from "@/shared/currencies";
import type { ApprovalChain, ApprovalStep } from "./chains";

/** One person's signature on one step. */
export type ApprovalSignature = {
  permission: string;
  byCollaboratorId: string;
  byAlias: string;
  at: string;
};

/**
 * WHAT ROUTED THIS RECORD, stored on the record itself.
 *
 * The rate and its stamp are part of the plan rather than looked up again on
 * read, and that is the whole answer to the objection against converting at
 * all: a rate that moves overnight cannot re-route a bill already mid-chain,
 * because the routing is a recorded fact about that bill and you can see which
 * rate decided it.
 *
 * `updatedAt` is the PROVIDER's stamp for the rate table, a unix number — the
 * field getExchangeSnapshot actually returns. Not a date string, and not ours
 * for the fetch.
 */
export type ResolvedPlan = {
  ok: true;
  steps: ApprovalStep[];
  amountInBase: number;
  /** null when no conversion happened — the record was already in studio currency. */
  rate: number | null;
  updatedAt: number;
  stale: boolean;
};

export type PlanRefusal = {
  ok: false;
  reason: "no-chain" | "no-studio-currency" | "unquoted";
  detail: string;
};

export type PlanInput = {
  chain: ApprovalChain | null | undefined;
  amount: number;
  currency: string;
  studioCurrency: string;
  rates: Record<string, number> | null | undefined;
  updatedAt: number;
  stale: boolean;
};

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function resolveApprovalPlan(input: PlanInput): ResolvedPlan | PlanRefusal {
  const chain = input.chain;
  if (!chain?.steps?.length) {
    // Cannot arise for bills, whose chain is seeded and whose empty form is
    // refused on write — but the engine is keyed by document type, so a caller
    // naming a type nothing has configured gets a reason rather than an
    // approval that silently requires nobody.
    return { ok: false, reason: "no-chain", detail: "No approval chain is configured for this record type." };
  }

  const from = String(input.currency || "").trim().toUpperCase();
  const to = String(input.studioCurrency || "").trim().toUpperCase();
  const amount = Number(input.amount) || 0;

  if (!to) {
    // THE MANDATORY-CURRENCY RULE, scoped to approval (spec D4). createStudio
    // has never set a currency, so this is every studio until somebody does —
    // which is why the detail names the fix rather than merely refusing.
    return {
      ok: false,
      reason: "no-studio-currency",
      detail: "This studio has not set its own currency, so an amount cannot be judged against an approval limit. An owner or admin sets it in Studio settings.",
    };
  }

  let amountInBase = round(amount);
  let rate: number | null = null;

  if (from && from !== to) {
    const r = crossRate(input.rates, from, to);
    if (r == null) {
      return {
        ok: false,
        reason: "unquoted",
        detail: `Today's exchange rates do not quote ${from} to ${to}, so this amount cannot be judged against an approval limit.`,
      };
    }
    rate = r;
    amountInBase = round(amount * r);
  }

  // AT OR ABOVE, not above. "Bills over 50000 need the FD" and "bills at 50000
  // need the FD" are the two readings of one sentence; this takes the safer.
  const steps = chain.steps.filter((s) => amountInBase >= (Number(s.from) || 0));

  return { ok: true, steps, amountInBase, rate, updatedAt: Number(input.updatedAt) || 0, stale: !!input.stale };
}

/**
 * The next step somebody has to clear, or null when the record is done.
 *
 * MATCHED AGAINST THIS PLAN'S STEPS, not against the signature list alone. A
 * bill edited across its threshold is re-planned, and a signature naming a step
 * the new plan does not contain must not be credited to the step that is now
 * next — it was given for a different question.
 */
export function firstUnsignedStep(
  plan: ResolvedPlan | PlanRefusal | null | undefined,
  signatures: readonly ApprovalSignature[] = [],
): ApprovalStep | null {
  if (!plan || plan.ok !== true) return null;
  const signed = new Set(signatures.map((s) => s.permission));
  return plan.steps.find((s) => !signed.has(s.permission)) || null;
}

/** Has every step this plan requires been signed? */
export const planSatisfied = (
  plan: ResolvedPlan | PlanRefusal | null | undefined,
  signatures: readonly ApprovalSignature[] = [],
): boolean => Boolean(plan && plan.ok === true) && firstUnsignedStep(plan, signatures) === null;
```

- [ ] **Step 4: Run it**

```bash
node tests/approval-model.mjs
```

Expected: everything `ok` except Task 1's seed assertion, still red until Task 3.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

```bash
git add src/platform/approval/resolve.ts tests/approval-model.mjs
git commit
```

Subject: `An amount decides which approvals it needs, and says when it cannot`

---

### Task 3: The right that step two names

**Files:**
- Modify: `src/platform/access/catalogue.ts:216-218`
- Modify: `src/shared/studio/access.ts`
- Modify: `tests/gate-a.mjs:251` and its comment
- Re-record: `tests/goldens/owner.roles.json` — **its own commit**

**Interfaces:**
- Produces: the key `finance.payables.approveHigh`, which Task 1's seed already names. **Tasks 1–3 ship in one push:** the alternative is either a right nothing exercises (invariant 16) or a seed naming nothing.

- [ ] **Step 1: Add the right**

`src/platform/access/catalogue.ts` currently reads:

```ts
  { key: "finance.payables", group: "Finance & Accounting", label: "Payables", verbs: ["view", "create", "edit", "delete"],
    extra: [{ key: "approve", label: "Approve bills" }, { key: "pay", label: "Record payments" }] },
```

Extend the entry and its comment — the existing comment explains why `approve` and `pay` are separate, and this adds a third reason:

```ts
  // Raising a bill and AUTHORISING it are two acts (invariant 7: raiser ≠
  // approver), and paying is a third — so approve and pay are extra powers
  // outside the view/create/edit/delete ladder.
  //
  // `approveHigh` is a FOURTH, and it exists because `approve` could not
  // express an amount: one right meant a 200-unit stationery bill and a
  // 2,000,000 subcontractor bill took the same path, so the only way a studio
  // could say "the FD sees the big ones" was to withhold approval from
  // everybody who handles the small ones — a bottleneck, not a control. WHICH
  // amount is high is the STUDIO's to set (Finance settings); this key is only
  // who may clear a bill once it is.
  { key: "finance.payables", group: "Finance & Accounting", label: "Payables", verbs: ["view", "create", "edit", "delete"],
    extra: [
      { key: "approve", label: "Approve bills" },
      { key: "pay", label: "Record payments" },
      { key: "approveHigh", label: "Approve bills above the limit" },
    ] },
```

- [ ] **Step 2: Add its Arabic label**

`src/shared/studio/access.ts` maps keys to Arabic. Find the `finance.payables` entries, read the neighbouring ones, and add the matching entry in their exact form. A missing entry renders the raw key on an Arabic studio's access grid.

- [ ] **Step 3: Update the hardcoded key count**

`tests/gate-a.mjs:251` asserts `ALL_PERMISSIONS.length === 123` → `124`. The comment above it narrates every previous move (104, 103, 102, 105, 115, 117, 121, 122, 124, 123); append:

```
  // 124 again, and this time an addition rather than the restructure's
  // subtraction: finance.payables.approveHigh, the second step of the bill
  // approval chain. Deliberately its own right rather than a reuse of
  // finance.settings.edit — configuring the limit and clearing a payment under
  // it are the two acts invariant 7 exists to keep apart.
```

- [ ] **Step 4: Run the pure suites**

```bash
node tests/access.test.mjs && node tests/approval-model.mjs
```

Expected: both fully green. `the seeded bill chain passes its own validator` goes green here for the first time — that transition is the point of this task.

- [ ] **Step 5: Commit the right**

```bash
git add src/platform/access/catalogue.ts src/shared/studio/access.ts tests/gate-a.mjs
git commit
```

Subject: `A bill above the studio's limit answers to a right of its own`

- [ ] **Step 6: Re-record the one golden that moves — SEPARATE commit**

Confirm the blast radius is still one file before recording:

```bash
grep -rl "Approve bills" tests/goldens/
```

Expected: exactly `tests/goldens/owner.roles.json`, the only one of the 153 carrying the catalogue's areas and their `extra` lists. **If anything else appears, stop** — the radius is larger than measured, and that is worth saying rather than recording over.

```bash
NOMPANY_TEST_SESSION=approvals NOMPANY_RECORD_GOLDENS=1 node tests/gate-a.test.mjs > /tmp/rec.log 2>&1; echo "EXIT=$?"
git diff --stat tests/goldens/
```

Expected: one file changed; the diff is one added `extra` entry and nothing else.

```bash
git add tests/goldens/owner.roles.json
git commit
```

Subject: `The roles golden records the new payables right`
Body: what changed, why, and that it is a deliberate re-record — `NOMPANY_RECORD_GOLDENS` is never set in CI, so a golden moving as a side effect of a feature commit is a contract nobody can check.

---

### Task 4: A bill has a currency, like its three siblings

**Files:**
- Modify: `src/modules/finance/schema.ts` (`BillSchema`)
- Modify: `src/modules/finance/payables.ts` (`createBill`, `editBill`)
- Modify: `tests/suite.mjs` (the AP block at line 2452)

**Interfaces:**
- Produces: `bill.currency: string`, which Task 6's `planFor` reads.

**Why this task exists:** spec D9. `BillSchema` has no currency, so D3's conversion had no input and the FX half of the engine would have been unreachable code. `contractSchema` declares `currency: z.string().max(8)`, and `contracts.ts`, `payments.ts` and `changeOrders.ts` all default it identically — a bill is the odd one out, so this follows the pattern rather than inventing one.

- [ ] **Step 1: Write the failing test**

In `tests/suite.mjs`, inside the existing AP block (after the `totalling like an invoice` assertion at ~line 2467):

```js
  // D9: a bill carries the currency it was billed in. Defaulted to the
  // studio's, exactly as a contract, a payment and a change order already do —
  // a bill was simply the one that never got the field.
  ok("a bill defaults to the studio's own currency",
    bill.bill.currency === (studio.currency || ""), JSON.stringify(bill.bill.currency));

  const eur = await createBill(fin, {
    vendorName: "Bremen GmbH", currency: "EUR",
    lines: [{ description: "Valves", qty: 1, unitPrice: 100 }],
  });
  ok("...and a foreign supplier invoice keeps its own", eur.bill.currency === "EUR", JSON.stringify(eur.bill.currency));
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
NOMPANY_TEST_SESSION=approvals node tests/integration.test.mjs > /tmp/it.log 2>&1; echo "EXIT=$?"; grep -n "FAIL" /tmp/it.log | head
```

Expected: FAIL on the currency assertions — `bill.currency` is `undefined`.

- [ ] **Step 3: Write the implementation**

`src/modules/finance/schema.ts`, in `BillSchema` beside `vatRate`:

```ts
  // THE CURRENCY THIS WAS BILLED IN — a foreign supplier invoice is ordinary,
  // and until this existed every bill was implicitly in the studio's own money.
  // Same shape and same default as contractSchema's, so AP stops being the one
  // record of its family without one. It is what the approval engine converts
  // to judge a bill against the studio's limit; it does NOT revalue the aging
  // report, which still sums raw totals until P3.
  currency: z.string().max(8).optional(),
```

Optional, because every bill already in the live database predates it.

In `createBill`, beside the other defaulted fields — the exact expression the three siblings use:

```ts
    currency: str(body?.currency, 8) || studio.currency || "",
```

In `editBill`, allow it to change while the bill is open, alongside the other editable fields. It must be editable: a currency typed wrong at entry is exactly the kind of thing corrected before approval, and Task 6 re-plans on edit.

- [ ] **Step 4: Run it**

```bash
NOMPANY_TEST_SESSION=approvals node tests/integration.test.mjs > /tmp/it.log 2>&1; echo "EXIT=$?"
```

Expected: EXIT=0.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

```bash
git add src/modules/finance/schema.ts src/modules/finance/payables.ts tests/suite.mjs
git commit
```

Subject: `A bill records the currency it was billed in`

---

### Task 5: A studio's chains, seeded and overridable, in Finance settings

**Files:**
- Modify: `src/modules/finance/finance.ts`
- Modify: `src/modules/finance/types.ts`
- Modify: `tests/suite.mjs`

**Interfaces:**
- Consumes: `SEEDED_CHAINS`, `chainProblems`, `ApprovalChain`; `ALL_PERMISSIONS`.
- Produces: `readApprovalChains(settingsSection)`, and `ctx.approvalChains` on `FinanceContext`.

- [ ] **Step 1: Write the failing test**

In `tests/suite.mjs`, a new block after the AP one:

```js
console.log("\n== bill approval chains: seeded, overridable, validated on write");
{
  const fin = await financeContext(owner, slug);

  // A STUDIO THAT HAS NEVER TOUCHED THEM STILL HAS THEM. The seed is the
  // answer, not an empty object — a studio with no chain would approve
  // nothing, which is the hole the validator refuses on write.
  ok("a fresh studio has the seeded bill chain",
    fin.approvalChains?.bill?.steps?.length === 2, JSON.stringify(fin.approvalChains?.bill));

  // AN OVERRIDE STORES ONLY WHAT CHANGED, so a later correction to the built-in
  // still reaches this studio.
  const saved = await saveFinanceSettings(fin, {
    approvalChains: { bill: { type: "bill", steps: [
      { permission: "finance.payables.approve", from: 0, label: "Finance" },
      { permission: "finance.payables.approveHigh", from: 5000, label: "Director" },
    ] } },
  });
  ok("a studio can move its own threshold",
    saved.approvalChains?.bill?.steps?.[1]?.from === 5000, JSON.stringify(saved.error ?? saved.approvalChains?.bill));

  // REFUSED ON WRITE, IN WORDS ABOUT THE EDIT — the whole reason chainProblems
  // returns sentences is that this refusal is shown to somebody.
  const bad = await saveFinanceSettings(fin, {
    approvalChains: { bill: { type: "bill", steps: [
      { permission: "finance.payables.approveHigh", from: 100, label: "only one" },
    ] } },
  });
  ok("a chain with no always-on step is refused", bad.error === "refused", JSON.stringify(bad));
  ok("...and the refusal says what to fix", /from: 0/.test(bad.detail || ""), bad.detail);

  // AND THE REFUSAL DID NOT WRITE. A validator that refuses and saves anyway is
  // worse than no validator.
  const after = await financeContext(owner, slug);
  ok("a refused chain was not stored",
    after.approvalChains?.bill?.steps?.[1]?.from === 5000, JSON.stringify(after.approvalChains?.bill));
}
```

`saveFinanceSettings` must be added to the import from `@/modules/finance/finance` at the top of `tests/suite.mjs` (line 74) if it is not already there.

- [ ] **Step 2: Run it to confirm it fails**

```bash
NOMPANY_TEST_SESSION=approvals node tests/integration.test.mjs > /tmp/it.log 2>&1; echo "EXIT=$?"; grep -n "FAIL" /tmp/it.log | head
```

Expected: FAIL on `a fresh studio has the seeded bill chain` — `fin.approvalChains` is `undefined`.

- [ ] **Step 3: Write the implementation**

In `src/modules/finance/finance.ts`, beside `readCashCategories`:

```ts
/**
 * THE APPROVAL CHAINS THIS STUDIO USES — the seeds, as it has edited them.
 *
 * STORED AS OVERRIDES, NEVER AS A FULL COPY, which is flows.ts's rule and is
 * here for the same two reasons: a later correction to a built-in still reaches
 * every studio that never touched it, and a studio's stored data is exactly
 * what it changed rather than a snapshot of everything that existed the day it
 * first opened the screen.
 *
 * KEYED BY DOCUMENT TYPE from the first commit, so a second type is a key
 * rather than a rewrite. IT LIVES IN FINANCE'S SETTINGS because bills are the
 * only type — THE MOVE POINT is a chain governing a record outside Finance,
 * and that is the commit where this becomes a store of its own rather than a
 * blob on one section.
 */
export function readApprovalChains(
  settingsSection: { settings?: Record<string, unknown> } | null | undefined,
): Record<string, ApprovalChain> {
  const raw = settingsSection?.settings?.approvalChains;
  const overrides = (raw && typeof raw === "object" ? raw : {}) as Record<string, ApprovalChain>;
  const out: Record<string, ApprovalChain> = { ...SEEDED_CHAINS };
  for (const [type, chain] of Object.entries(overrides)) {
    if (chain?.steps?.length) out[type] = chain;
  }
  return out;
}
```

In `financeContext`'s `extend`, beside `cashCategories`:

```ts
    approvalChains: readApprovalChains(settingsSection as { settings?: Record<string, unknown> }),
```

In `src/modules/finance/types.ts`, add `approvalChains: Record<string, ApprovalChain>;` to `FinanceContext`.

In `saveFinanceSettings`, after the `cashCategories` branch and **before** `updateSection`:

```ts
  if (body?.approvalChains !== undefined) {
    // VALIDATED HERE, NOT ON READ. A chain naming a permission that does not
    // exist blocks every bill reaching that step — silently, forever, on a
    // screen nobody thinks to doubt. Refusing at the door means the studio
    // hears about it while it is still their edit.
    const incoming = (body.approvalChains || {}) as Record<string, ApprovalChain>;
    const problems: string[] = [];
    for (const chain of Object.values(incoming)) problems.push(...chainProblems(chain, ALL_PERMISSIONS));
    if (problems.length) return { error: "refused" as const, detail: problems.join("; ") };
    next.approvalChains = incoming;
  }
```

and add `approvalChains: readApprovalChains({ settings: next })` to the returned object.

**Ordering matters:** build `next`, validate, and only then `updateSection`. The last assertion in Step 1 exists to catch getting this backwards.

- [ ] **Step 4: Run it**

```bash
NOMPANY_TEST_SESSION=approvals node tests/integration.test.mjs > /tmp/it.log 2>&1; echo "EXIT=$?"
```

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

```bash
git add src/modules/finance/finance.ts src/modules/finance/types.ts tests/suite.mjs
git commit
```

Subject: `A studio sets the amount above which a bill needs a second signature`

---

### Task 6: A bill carries the plan it was routed under, and approval walks it

**Files:**
- Modify: `src/modules/finance/schema.ts`
- Modify: `src/modules/finance/payables.ts`
- Modify: `tests/suite.mjs`

**Interfaces:**
- Consumes: `resolveApprovalPlan`, `firstUnsignedStep`, `planSatisfied`, `ResolvedPlan`, `PlanRefusal`, `ApprovalSignature`; `ctx.approvalChains`; `getExchangeSnapshot` from `@/lib/data/exchangeRates`.
- Produces: `availableApproval(bill, plan, holds): ApprovalStep | null` for Task 7.

- [ ] **Step 1: Extend the schema**

In `BillSchema`, beside Task 4's `currency`:

```ts
  // ---- approval, spec 2026-09-03 -------------------------------------------
  // OPTIONAL BECAUSE EVERY EXISTING BILL PREDATES THEM. A bill with no plan is
  // one raised before chains existed; it resolves one on its next approval
  // attempt rather than being migrated, because a plan is cheap to derive and a
  // backfill over live rows is not.
  approvals: z.array(z.object({
    permission: z.string(),
    byCollaboratorId: z.string(),
    byAlias: z.string(),
    at: z.string(),
  })).optional(),
  approvalPlan: z.object({
    steps: z.array(z.object({ permission: z.string(), from: z.number(), label: z.string() })),
    amountInBase: z.number(),
    rate: z.number().nullable(),
    updatedAt: z.number(),
    stale: z.boolean(),
  }).nullable().optional(),
```

- [ ] **Step 2: Give the fixture studio a currency**

**Do this before writing the walk, or the existing AP assertions go red for the wrong reason.** `createStudio` never sets a currency, so the test studio has none and every `approveBill` would refuse `no-studio-currency`.

In `tests/suite.mjs`, at the top of the AP block (line ~2458), before the first `createBill`:

```js
  // THE STUDIO NEEDS A CURRENCY OF ITS OWN before a bill can be judged against
  // a limit — spec D4, and createStudio has never set one. Set here rather than
  // in the fixture bootstrap so the block reads self-contained, and so the
  // no-currency refusal below can still be proved on a studio without one.
  await updateStudio(studio.id, { currency: "SAR" });
```

`updateStudio` is already imported at line 23.

- [ ] **Step 3: Write the failing test**

Append a new block after the chains block:

```js
console.log("\n== a bill over the studio's limit needs two signatures");
{
  // Threshold is 5000 from the chains block above. Three people, because
  // invariant 7 needs two and spec D7 needs three to prove itself.
  //
  // BOTH APPROVERS ARE ADMINS, and that is load-bearing rather than lazy.
  // "Admin" is the seeded wildcard role (roles.ts:84), so approverA HOLDS
  // finance.payables.approveHigh — which is the only way the D7 assertion
  // below proves what it claims. Give approverA the junior right alone and the
  // second attempt would refuse for want of a permission, and the test would
  // pass while proving nothing about signing twice.
  const approverAPerson = await person("ApproverA", "Admin");
  const approverBPerson = await person("ApproverB", "Admin");
  const raiser = await financeContext(owner, slug);
  const approverA = await financeContext(approverAPerson.user, slug);
  const approverB = await financeContext(approverBPerson.user, slug);

  const small = await createBill(raiser, { vendorName: "V", lines: [{ description: "x", qty: 1, unitPrice: 1000 }] });
  const a1 = await approveBill(approverA, small.bill.id);
  ok("a bill under the limit is Approved after one signature",
    a1.bill?.status === "Approved", JSON.stringify(a1.error ?? a1.bill?.status));

  const big = await createBill(raiser, { vendorName: "V", lines: [{ description: "x", qty: 1, unitPrice: 90000 }] });
  const b1 = await approveBill(approverA, big.bill.id);
  // THE DEFECT THIS FEATURE EXISTS TO PREVENT. One signature on a large bill
  // used to be the whole approval.
  ok("a bill over the limit is NOT Approved after one signature",
    b1.bill?.status !== "Approved", JSON.stringify(b1.error ?? b1.bill?.status));
  ok("...and one signature is recorded", b1.bill?.approvals?.length === 1, JSON.stringify(b1.bill?.approvals));

  // SPEC D7. Holding both rights is legitimate; using both on one bill is not,
  // and a second step the first signer can clear is not a second step.
  // approverA is a wildcard Admin, so this is a refusal ABOUT THE RECORD rather
  // than about a right they lack — which is the whole distinction D7 draws.
  const sameAgain = await approveBill(approverA, big.bill.id);
  ok("the same person cannot sign the second step", sameAgain.error === "same-signer", JSON.stringify(sameAgain));

  const b2 = await approveBill(approverB, big.bill.id);
  ok("a second person completes it", b2.bill?.status === "Approved", JSON.stringify(b2.error ?? b2.bill?.status));
  ok("...and approvedByCollaboratorId is the FINAL approver",
    b2.bill?.approvedByCollaboratorId === approverB.collaborator.id, JSON.stringify(b2.bill?.approvedByCollaboratorId));

  // UNCHANGED INVARIANT 7, re-asserted because the walk rewrote the function
  // that used to enforce it.
  const own = await createBill(raiser, { vendorName: "V", lines: [{ description: "x", qty: 1, unitPrice: 100 }] });
  const byRaiser = await approveBill(raiser, own.bill.id);
  ok("the raiser still cannot approve their own bill", byRaiser.error === "same-signer", JSON.stringify(byRaiser));
}

console.log("\n== a bill edited across the limit is re-planned");
{
  const raiser = await financeContext(owner, slug);
  const made = await createBill(raiser, { vendorName: "V", lines: [{ description: "x", qty: 1, unitPrice: 1000 }] });
  ok("it starts needing one step", made.bill?.approvalPlan?.steps?.length === 1, JSON.stringify(made.bill?.approvalPlan?.steps));
  const edited = await editBill(raiser, made.bill.id, { lines: [{ description: "x", qty: 1, unitPrice: 90000 }] });
  ok("editing it over the limit re-derives the plan",
    edited.bill?.approvalPlan?.steps?.length === 2, JSON.stringify(edited.bill?.approvalPlan?.steps));
}

console.log("\n== approval refuses when the studio has no currency of its own");
{
  // D4, and this is the state EVERY studio is in until somebody sets one —
  // createStudio has never written the field. Everything else about this studio
  // keeps working; only the act where an unknown amount matters stops.
  const bare = await createStudio({ ownerUserId: owner.id, name: "No Currency", slug: `${slug}-nc`, ownerAlias: "Owner" });
  const bareFin = await financeContext(owner, `${slug}-nc`);
  const bill = await createBill(bareFin, { vendorName: "V", lines: [{ description: "x", qty: 1, unitPrice: 100 }] });
  ok("a bill is still RAISED without a studio currency", !!bill.bill, JSON.stringify(bill.error ?? "raised"));
  const denied = await approveBill(bareFin, bill.bill.id);
  ok("but approving it refuses by name", denied.error === "no-studio-currency", JSON.stringify(denied));
  ok("...and says where to fix it", /settings/i.test(denied.detail || ""), denied.detail);
}
```

Note the first assertion of the last block: **a bill is still raised.** Recording an obligation that already exists must not depend on a rate; only authorising payment does.

- [ ] **Step 4: Run it to confirm it fails**

```bash
NOMPANY_TEST_SESSION=approvals node tests/integration.test.mjs > /tmp/it.log 2>&1; echo "EXIT=$?"; grep -n "FAIL" /tmp/it.log | head
```

Expected: FAIL on `a bill over the limit is NOT Approved after one signature` — today one signature approves anything.

- [ ] **Step 5: Write the implementation**

In `src/modules/finance/payables.ts`:

```ts
/**
 * THE PLAN THIS BILL IS ROUTED UNDER, resolved from its own total.
 *
 * FX IS FETCHED ONLY WHEN IT IS NEEDED. A bill in the studio's own currency —
 * most of them — adds zero reads, because hop counts are part of this repo's
 * contract and a conversion nobody needs is a round trip nobody asked for.
 */
async function planFor(ctx: FinanceContext, bill: Bill): Promise<ResolvedPlan | PlanRefusal> {
  const { total } = billTotals(bill);
  const studioCurrency = ctx.studio.currency || "";
  const billCurrency = String(bill.currency || studioCurrency || "").toUpperCase();

  let rates: Record<string, number> | null = null;
  let updatedAt = 0;
  let stale = false;
  if (billCurrency && studioCurrency && billCurrency !== studioCurrency.toUpperCase()) {
    const snapshot = await getExchangeSnapshot();
    rates = snapshot.rates ?? null;
    updatedAt = Number(snapshot.updatedAt) || 0;
    stale = !!snapshot.stale;
  }

  return resolveApprovalPlan({
    chain: ctx.approvalChains.bill, amount: total, currency: billCurrency,
    studioCurrency, rates, updatedAt, stale,
  });
}
```

In `createBill` and `editBill`, after the row is built, derive the plan and store it — `approvalPlan: plan.ok ? plan : null`. **A bill is raised even when it cannot be routed**; only approving refuses, for the reason the test asserts.

`approveBill` becomes:

```ts
export async function approveBill(ctx: FinanceContext, id: string) {
  const { studio, payablesSection, collaborator } = ctx;
  const current = (await Bills.find({ studio, section: payablesSection })).find((b) => b.id === id);
  if (!current) return { error: "notfound" };
  if (current.status === "Approved" || current.status === "Paid") return { error: "already", status: current.status };
  if (current.status === "Cancelled") return { error: "cancelled" };
  // UNCHANGED: the raiser never signs. Invariant 7's original half.
  if (current.createdByCollaboratorId === collaborator.id) return { error: "same-signer" };

  // RE-RESOLVED RATHER THAN READ OFF THE ROW: a bill raised before chains
  // existed has no plan, and one whose amount changed has a stale one. Deriving
  // it here is at most one FX read and removes the whole class of "the stored
  // plan disagrees with the stored amount".
  const plan = await planFor(ctx, current);
  if (!plan.ok) return { error: plan.reason, detail: plan.detail };

  const signatures = current.approvals || [];
  // SPEC D7. Somebody who signed an earlier step may not sign a later one:
  // invariant 7 is about the RECORD, not about the pair of rights.
  if (signatures.some((s) => s.byCollaboratorId === collaborator.id)) return { error: "same-signer" };

  const step = firstUnsignedStep(plan, signatures);
  if (!step) return { error: "already", status: current.status };

  // THE KEY IS CHOSEN AT RUNTIME — that is the whole feature. Access is still
  // resolved once (invariant 3); this asks a different question of the set that
  // was already resolved.
  const denied = requirePermission(ctx.access, step.permission as PermissionKey);
  if (denied) return denied;

  // Captured once, outside the closure — updateRow takes a function patch
  // (invariant 8) and may invoke it more than once under CAS retry or
  // NOMPANY_DB=parity; a fresh toISOString inside would disagree with itself.
  const at = new Date().toISOString();
  const next = [...signatures, {
    permission: step.permission, byCollaboratorId: collaborator.id,
    byAlias: collaborator.alias || "", at,
  }];
  const done = planSatisfied(plan, next);

  const bill = await Bills.update({ studio, section: payablesSection }, id, () => ({
    approvals: next,
    approvalPlan: plan,
    // STATUS ONLY ON THE LAST STEP. BILL_STATUSES gains no value, and
    // everything deriving from status — statusFor, overdue, the edit lock,
    // recordBillPayment's not-approved refusal — keeps reading what it reads
    // today. A stored second answer agrees with the first only until something
    // writes one and not the other.
    ...(done ? { status: "Approved", approvedByCollaboratorId: collaborator.id, approvedAt: at } : {}),
  }));
  return bill ? { bill: { ...bill, ...billTotals(bill) } } : { error: "notfound" };
}

/**
 * Which step this person could sign right now, or null. Read by the screen so a
 * button is drawn only where pressing it would succeed — computed from the same
 * plan the walk enforces, so the two cannot disagree. This is availableMoves's
 * job in modules/technical/signables.ts, and it is here for the same reason.
 */
export function availableApproval(
  bill: Bill,
  plan: ResolvedPlan | PlanRefusal | null,
  holds: (permission: string) => boolean,
): ApprovalStep | null {
  const step = firstUnsignedStep(plan, bill.approvals || []);
  return step && holds(step.permission) ? step : null;
}
```

- [ ] **Step 6: Run it**

```bash
NOMPANY_TEST_SESSION=approvals node tests/integration.test.mjs > /tmp/it.log 2>&1; echo "EXIT=$?"
```

Expected: EXIT=0, **including the pre-existing AP assertions at line 2452** — they use a 1150 bill against a 5000 threshold, so they stay single-step and must not have changed meaning.

- [ ] **Step 7: Typecheck and commit**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

```bash
git add src/modules/finance/schema.ts src/modules/finance/payables.ts tests/suite.mjs
git commit
```

Subject: `A bill above the limit is not approved until two people have signed it`

---

### Task 7: The route and the screen say which signature is outstanding

**Files:**
- Modify: `src/app/api/studios/[slug]/finance/bills/route.ts`
- Modify: `src/components/studio2/StudioFinance.js` (`Payables`, ~line 679)
- Modify: `src/shared/studio/finance.ts`

- [ ] **Step 1: Widen the GET**

Each listed bill gains what the screen needs to draw the truth: `approvals`, `approvalPlan`, and the step **this viewer** could sign — computed with `availableApproval` and `fin.access`, never with a second copy of the rule. Also return `approvalChains: fin.approvalChains` so the settings screen can show and edit the threshold.

- [ ] **Step 2: Draw it**

In `Payables`, the Approve button currently appears whenever `canManage`. Replace that with the route's per-bill answer, so somebody who cannot sign the **outstanding** step is not offered a button that would refuse. Where a bill is part-signed, show which step is outstanding and who signed the ones before it — a workflow that waits silently waits forever.

Render the `no-studio-currency` state as a fixable one, naming Studio settings. Per the note at the top of this plan, that is **every studio** until an admin sets a currency, so it must not read as a broken button.

- [ ] **Step 3: Add the strings, both languages**

Every new string goes in `src/shared/studio/finance.ts` in **both** `en` and `ar`. A step's `label` is tenant-authored data and is never translated — the same rule that leaves section names, client names and service actions alone.

`StudioFinance.js` is already `"use client"`; read strings through the existing `tr` binding. **An unbound `tr` is a runtime ReferenceError that neither `tsc` nor `next build` catches** — `no-undef` is on for these files, so lint.

- [ ] **Step 4: Verify in the browser — not optional**

```bash
npm run dev:sandbox
```

**Front the tab** — a hidden pane never takes the auth cookie. Then: set the studio's currency, raise a bill over the limit, approve as one person, and confirm the screen says a second signature is outstanding rather than showing it approved. Switch the studio to Arabic and confirm the block mirrors.

- [ ] **Step 5: Lint, typecheck, build, budget, commit**

```bash
npm run lint && npx tsc --noEmit && npx next build && node scripts/bundle-budget.mjs
```

The largest chunk (158 KB gz) must not move — the Finance screen is already `nextDynamic()`. Note the total in the commit body whatever it does; `CLAUDE.md`'s budget line is updated in Task 8 with the measured number.

```bash
git add "src/app/api/studios/[slug]/finance/bills/route.ts" src/components/studio2/StudioFinance.js src/shared/studio/finance.ts
git commit
```

Subject: `The payables screen says which signature a bill is still waiting for`

---

### Task 8: AP gets the golden it never had, and approval is written down

**Files:**
- Modify: `tests/goldens.mjs`
- Create: `tests/goldens/finance.bill.partly-approved.json` (recorded, never hand-written)
- Create: `docs/functionality/approvals.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the golden case**

Nothing in `tests/goldens.mjs` calls the bills route — AP has no golden at all, which is a gap rather than a licence. Add one case that raises a bill over the limit and approves it once, so the pinned body is a bill **mid-chain**: one signature recorded, `status` still `Received`, the plan and its rate visible. That is the state most worth pinning, because it is the one this feature introduced.

Follow the file's existing case shape exactly, including how it redacts ids and timestamps (`<std_ID>`, `<timestamp>`) — an unredacted id makes the golden fail on the next run rather than on the next regression.

- [ ] **Step 2: Record it**

```bash
NOMPANY_TEST_SESSION=approvals NOMPANY_RECORD_GOLDENS=1 node tests/gate-a.test.mjs > /tmp/rec.log 2>&1; echo "EXIT=$?"
git status --short tests/goldens/
```

Expected: **one new file, nothing modified.** `owner.roles.json` already moved in Task 3. If an existing golden changed, stop and find out why before recording over it.

- [ ] **Step 3: Read the recorded golden**

Open it. A golden nobody read is a snapshot of whatever the code did, including whatever it did wrong. Confirm the numbers are what the arithmetic says, and that no live id or real timestamp leaked in.

- [ ] **Step 4: Write the functionality doc**

Create `docs/functionality/approvals.md`. `CLAUDE.md` says one file per system functionality, and every file ends with "Not built yet" stated in words. Cover:

- what a chain is, and that a step names a permission rather than a person or a role;
- that thresholds are the studio's, set in Finance & Accounting settings, stored as overrides so a corrected seed still reaches studios that never edited theirs;
- that amounts convert to the studio's currency through the daily FX snapshot, that the rate which decided a routing is stored on the bill, and what each of the four refusals means;
- **that a studio with no currency cannot approve a bill, and that this is every studio until an owner or admin sets one** — the single most surprising consequence of this feature;
- that one person may not sign two steps of one record, which is broader than "the raiser may not approve";
- **Not built yet**, from spec §9: bills only; no parallel steps, delegation, reassignment or reminders; no approval inbox; no condition other than amount; the studio's currency is not mandatory product-wide; AP aging still sums raw totals.

- [ ] **Step 5: Update `CLAUDE.md`**

In "Current state": P2's approval engine is built for bills; the document ladder and the submit/answer pairs are untouched. **State the rollout consequence plainly** — approval now requires a studio currency, and no studio has one by default. If the bundle total moved, update the budget line with the **measured** number and the reason, following that paragraph's existing running narrative. A stale number in the invariants file is worse than none.

- [ ] **Step 6: Full verification**

```bash
NOMPANY_TEST_SESSION=approvals npm test > /tmp/test.log 2>&1; echo "EXIT=$?"; tail -20 /tmp/test.log
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.strict.json
npx next build
node scripts/bundle-budget.mjs
npm run lint
```

All six. **Check the exit code, not the tail of a pipe** — see the trap below.

- [ ] **Step 7: Commit and push**

```bash
git add tests/goldens.mjs tests/goldens/finance.bill.partly-approved.json docs/functionality/approvals.md CLAUDE.md
git commit
git push origin main
```

Subject: `Accounts payable has a golden, and approval is written down`

---

## Verification — every change, no exceptions

```bash
NOMPANY_TEST_SESSION=approvals npm test
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.strict.json
npx next build
node scripts/bundle-budget.mjs
npm run lint
```

**Three failure modes specific to this work, none of which a suite catches on its own:**

- **The seeded chain and the catalogue can disagree.** Between Tasks 1 and 3 they deliberately do, and `tests/approval-model.mjs`'s first assertion is what says so. Ship Tasks 1–3 in one push.
- **Every studio lacks a currency**, so `approveBill` refuses for all of them until one is set. Task 6 Step 2 fixes the fixture; Task 7 makes it legible on screen; Task 8 writes it down. Skipping any of the three ships a product where approving a bill silently stopped working.
- **`useStudioLocale` from a Server Component, or an unbound `tr` in a `.js` screen**, throws on the first request and is caught by neither `tsc` nor `next build`. Task 7 says to open the screen. Open the screen.

**And one process trap this session already hit:** `npm test | tail` reports `tail`'s exit code, not the suite's. A run that died mid-way on a dropped Postgres connection looked like a pass, twice. Redirect to a file and echo `$?`.
