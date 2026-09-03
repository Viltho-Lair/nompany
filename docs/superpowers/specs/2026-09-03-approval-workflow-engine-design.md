# The approval-workflow engine — design

**Status:** approved in conversation (2026-09-03), ready for an implementation plan.
**Supersedes nothing.** Implements the approval-engine bullet of
`2026-08-30-erp-multi-industry-program-design.md` §P2, which reads in full:

> **Approval-workflow engine**: configurable chains with value limits per document type,
> reviewer ≠ approver enforced at the transition (invariant 7), `escalates()` semantics
> reused, generalised from the working quality-document review chain.

---

## 1. Problem

**Every approval in the product is a single step, and a single step cannot express a limit.**

Three approval mechanisms are on `main` and none of them is configurable:

| Where | Shape | Configurable? |
|---|---|---|
| Controlled documents (`modules/technical/signables.ts`) | `moveSignable`, a table of transitions: draft → review → approval → approved → effective | No — the table is a constant |
| Change orders, timesheets (`modules/sales/changeOrders.ts` and siblings) | `submit` then `answer(approve/reject)` | No |
| Bills, vacations | A flat `approve` right: hold it, approve anything | No |

The third is the one that hurts. `approveBill` requires `finance.payables.approve`, checks
that the approver is not the raiser, and sets `status: "Approved"`. A 200 currency-unit
stationery bill and a 2,000,000 subcontractor bill take exactly the same path, and the only
way a studio can express "the FD sees the big ones" is to withhold the right from everybody
who handles the small ones — which is not a control, it is a bottleneck.

**A studio cannot change any of this without a release.** Law 2 of the ERP program says the
things a tenant configures are stored data, not code. Flow templates and industries already
moved (`platform/db/flows.ts`); approval limits have not.

## 2. Decisions taken

Each was put to the user on 03/09/2026 and answered. Recorded with the reasoning so they
are not silently revisited.

**D1 — Additive, not a migration.** The engine governs **bills only** in this phase. The
document ladder and the submit/answer pairs are untouched. Their records and routes shipped
recently and their responses are pinned by goldens; proving the engine on a record whose
approval already exists but cannot express a limit is a smaller and more honest first test
than rewriting three working workflows at once. Migration is a later commit, if it earns
itself.

**D2 — A step names a permission key**, not a role and not a person. This reuses the whole
existing access model: `escalates()` applies unchanged, `requirePermission` is the check,
and no new identity concept enters the product. A role id would be a tenant-authored row
whose referential integrity must then be maintained as roles are deleted; a named person
blocks every chain naming them the day they leave.

**D3 — Amounts convert to the studio's own currency**, using the existing daily FX snapshot
(`lib/data/exchangeRates.ts`, `crossRate` in `shared/currencies.ts`). One threshold per
document type regardless of the currency a bill arrives in.

The objection to this was raised and overruled deliberately: a rate that moves overnight
could re-route a bill. §5 answers it — the plan is resolved once and **stored on the bill**,
with the rate and its `asOf`, so what routed a bill is a fact about that bill rather than a
recomputation. The alternative considered and rejected was per-currency thresholds, which
needs no rates but makes a two-currency studio maintain two chains that must be kept in
step by hand.

**D4 — The studio's currency becomes mandatory *for approval*.** It is optional today —
every reader is `studio.currency || ""` — and the user's reason for requiring it is that it
is what a studio is billed against. Making it mandatory product-wide is a live-tenant
migration over a field months-old studios were never asked for. So the engine refuses, with
a message naming the setting and who can change it, and nothing else in the product changes.
Studios that have never set a currency keep working everywhere they work today; only bill
approval stops, which is exactly where an unknown amount actually matters.

**D5 — The second step is a new right, `finance.payables.approveHigh`.** One `extra` entry
beside the existing `approve` and `pay`, on a section that already owns the record.
Reusing `finance.settings.edit` as the senior right was rejected: configuring the rule and
clearing a payment under it are the two acts invariant 7 exists to keep apart. Letting the
studio name any catalogue key per step was rejected as this phase's scope — it needs an
"is this chain satisfiable by anyone?" warning to be safe, and that is a feature of its own.

**D6 — Thresholds are edited in Finance & Accounting settings**, not in Administration.
The user placed them there and the code agrees: `finance-settings` already has a `settings`
object, a writer (`saveFinanceSettings`) and a guard (`finance.settings.edit`).

**D7 — Somebody who signed one step may not sign a later one on the same record.** Decided,
not asked: invariant 7 is about the record, not about the pair of rights, and a second step
that the first signer can also clear is not a second step.

**D8 — Editing a chain does not re-plan bills already in flight.** A bill carries the plan
it was routed under. Changing the threshold changes what happens next, not what already
happened — the same reasoning that freezes a revision's page setup when the paper changes.

## 3. What a chain is

`src/platform/approval/chains.ts` — **pure, no I/O**, so a client component may import it
and the settings screen validates with the same function the server refuses with. This is
the `platform/engagement/templates.ts` pattern and it exists for the reason stated there: a
second copy of the rules is free to disagree with the first.

```ts
export type ApprovalStep = {
  permission: string;  // a catalogue key — D2
  from: number;        // the amount AT OR ABOVE which this step applies, in studio currency
  label: string;       // what the studio calls this step
};

export type ApprovalChain = {
  type: string;              // "bill" — keyed by document type from day one
  steps: ApprovalStep[];     // in the order they must be walked
};
```

The seeded bill chain, which is what the user described — the FD sees everything, the
second step is the studio's dial:

```ts
{ type: "bill", steps: [
  { permission: "finance.payables.approve",     from: 0,     label: "Finance" },
  { permission: "finance.payables.approveHigh", from: 50000, label: "Above the limit" },
] }
```

`from: 0` means "always". A chain whose steps are all `from: 0` is an ordered list with no
value logic at all, so the simple case costs nothing to express — which is the reason
thresholds live ON steps rather than selecting between whole chains by band. "Who signs a
60k bill" is answered by reading one list.

**`chainProblems(chain, knownKeys)` refuses on write**, returning actionable strings rather
than a boolean, exactly as `templateProblems` does:

- a `permission` that is not a catalogue key — the step can never be satisfied;
- thresholds not ascending — a later step reachable at a lower amount than an earlier one is
  an ordering nobody can read;
- no step with `from: 0` — an amount below the lowest threshold would need no approval at
  all, which is a hole rather than a policy;
- a duplicate permission across steps — D7 makes such a chain unwalkable by one person and
  confusing to everyone;
- an empty chain.

Validated on write, never on read, for `flows.ts`'s stated reason: a studio hears about its
own edit while it is still their edit, rather than discovering it on somebody else's screen
at the worst moment.

## 4. Where a studio's chains live

**Not a new collection and not a new key builder** (invariant 1 is about where keys are
built; the cheaper answer here is not to need one). The `finance-settings` sub-section's
`settings` object gains:

```
settings.approvalChains = { bill: ApprovalChain }
```

Read and written through the existing `readFinanceSettings` / `saveFinanceSettings`, guarded
by `finance.settings.view` / `.edit` — D6.

**Stored as an override, merged over the seed** — the `flows.ts` `merge()` rule. A studio
that changes its bill threshold stores that chain and nothing else, so a later correction to
the seeded chain still reaches every studio that never touched it, and a studio's stored data
is what it changed rather than a snapshot of everything that existed the day it first opened
the screen.

Keyed by document type from the first commit so a second type is a key rather than a
rewrite. **The move point is stated in the file:** a chain governing a record outside Finance
does not belong in Finance's settings, and that is the commit where this becomes its own
store.

## 5. Resolving a plan, and freezing it

```ts
resolveApprovalPlan({ chain, amount, currency, studioCurrency, rates })
  => { ok: true,  steps: ApprovalStep[], amountInBase: number, rate: number | null,
       asOf: string, stale: boolean }
   | { ok: false, reason: "no-studio-currency" | "unquoted" | "no-chain", detail: string }
```

The refusal shape mirrors `landedUnitCost`, which already answers this exact question for
inventory and already distinguishes its reasons — "your studio has no currency" is fixed in
Settings and "EUR→SAR is not quoted today" is not, and the two send whoever hits them to
different places.

- **no studio currency → refuse.** D4. The detail names the setting and that an owner or
  admin sets it.
- **rate missing for the pair → refuse**, naming the pair.
- **stale snapshot with a real rate → route, flagged.** Yesterday's rate with an honest
  `asOf` beats blocking every foreign bill because a fetch failed. Only a *missing* rate
  refuses. `getExchangeSnapshot()` already returns `stale` and its own `asOf`.
- **same currency as the studio → no conversion**, no rate needed, `rate: null`. A studio
  that never deals in foreign currency never touches FX at all.
- **no chain configured for this type → refuse.** It cannot arise for bills, whose chain is
  seeded and whose empty form is refused on write (§3) — but the engine is keyed by document
  type, so a caller naming a type nothing has configured gets a reason rather than an
  approval that silently requires nobody.

**The resolved plan is stored on the bill** — steps, `amountInBase`, `rate`, `asOf` — and
**re-derived whenever the bill's amount or currency changes**, which `updateBill` already
permits only while the bill is open (it refuses edits once `Approved` or `Paid`). This is
what answers the D3 objection: the routing of a bill is a recorded fact carrying the rate
that decided it, not a number recomputed on every read that can quietly differ tomorrow.

## 6. How a bill walks it

The bill gains one field:

```ts
approvals: { permission: string; byCollaboratorId: string; byAlias: string; at: string }[]
approvalPlan: { steps: ApprovalStep[]; amountInBase: number; rate: number | null;
                asOf: string; stale: boolean } | null
```

**`status` does not change, and `BILL_STATUSES` does not gain a value.** `Approved` is
written only when the last required step is signed. Everything deriving from status —
`statusFor`, `overdue`, the edit lock, `recordBillPayment`'s "not-approved" refusal —
continues to read what it reads today. This follows the codebase's own habit: `documentState`
derives rather than stores, and P2's Law 5 says a deal has no status column for the same
reason. A stored second answer agrees with the first only until something writes one and not
the other.

`approveBill(ctx, id)` becomes a walk:

1. Resolve the plan (§5). Refuse with its reason if it cannot be resolved.
2. Find the **first unsigned step**. If there is none, the bill is already approved.
3. `requirePermission` **that step's** key — not a fixed one.
4. Refuse `same-signer` if this collaborator raised the bill (unchanged), **or has already
   signed an earlier step of this bill** (D7).
5. Append the signature. If that was the last step, also set `status: "Approved"`,
   `approvedByCollaboratorId` and `approvedAt` — which stay as the *final* approver, so
   every existing reader of those two fields keeps its meaning.

`availableApproval(bill, holds)` — which step, if any, this person could sign right now —
so the screen draws the button only where pressing it would succeed, computed from the same
plan the walk enforces. This is `availableMoves`'s job in `signables.ts` and exists for the
same reason.

## 7. The new right

`finance.payables.approveHigh`, one `extra` beside `approve` and `pay` in
`platform/access/catalogue.ts`. It is grantable, it is exercised by step 2 of the seeded
chain, and `escalates()` covers it with no change — so it does not become the dead capability
the catalogue's own rule forbids (invariant 16).

**Two contract changes, both deliberate, both in their own commit with the reason stated:**

- the permission matrix goes **123 → 124** keys (`tests/gate-a.mjs` asserts the count);
- the bill response gains `approvals`, `approvalPlan` and the available-step field, so the
  payables goldens are re-recorded.

`NOMPANY_RECORD_GOLDENS` is never set in CI, and a golden that changes as a side effect of a
feature commit is a contract nobody can check. These land separately from the behaviour.

## 8. Testing

**Pure, no I/O** — the engine is a function over values, which is the whole reason it is
shaped this way:

- threshold boundaries: exactly `from`, one under, one over;
- a single-step chain, and a chain where every step is `from: 0`;
- step ordering preserved when several apply;
- each of the four refusal reasons, by the reason it names rather than by "it failed";
- `chainProblems` on each of its five refusals;
- an amount in the studio's own currency needing no rate at all.

**Integration, real routes and real store**, one assertion per thing that can actually go
wrong:

- a bill under the threshold needs one signature and is `Approved` after it;
- a bill over it needs two, and is **not** `Approved` after the first — the defect this whole
  feature exists to prevent;
- the same person cannot sign both steps though they hold both rights (D7);
- the raiser cannot sign at all (unchanged invariant 7);
- approval refuses with `no-studio-currency` when the studio has none (D4);
- a bill edited from under the threshold to over it re-derives its plan and needs a second
  signature;
- a bill already mid-chain keeps its plan when the studio edits the threshold (D8).

## 9. Not in this phase

Stated in words, because a silent gap reads as a finished feature.

- **Only bills.** Invoices, expenses, change orders, timesheets, vacations and controlled
  documents keep the approval they have.
- **No parallel steps, no delegation, no out-of-office reassignment,** and no reminder
  escalation on a step that has waited. Each is a real requirement of a mature approval
  system and none is needed to express a value limit.
- **No approval inbox.** "What is waiting for me" is a screen, and this phase gives it the
  data (`availableApproval`) without building it.
- **Conditions other than amount** — supplier, cost code, deal — are not expressible. That
  is a predicate language, and the spec asks for value limits.
- **The studio's currency is not made mandatory product-wide** (D4).
