// THE STORE HALF OF ./allocations — the rules, filed under the ledger
// (`allocationRules`). Reading is `finance.ledger.view`; writing a rule and
// running one post to the books, and answer to `finance.ledger.post`.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { ledgerAccounts, allocationFor, postAllocation } from "./ledger";
import { projectRows } from "./finance";
import { dimensionValuesFor } from "./budgetService";
import { cleanRule } from "./allocations";
import type { AllocationRule } from "./allocations";
import type { FinanceContext, JournalEntry } from "./types";

type RuleRecord = AllocationRule & { id: string; createdAt: string };

const Rules = repo<RuleRecord>("allocationRules");
const Entries = repo<JournalEntry>("journalEntries");
const scope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.ledgerSection });
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function allocationsView(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.ledger.view");
  if (denied) return denied;
  const [rules, entries, chart, projects] = await Promise.all([
    Rules.find(scope(ctx)), Entries.find(scope(ctx)), ledgerAccounts(ctx), projectRows(ctx),
  ]);
  return {
    rules: rules.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    accounts: chart.filter((a) => (a.type === "income" || a.type === "expense") && a.active !== false)
      .map((a) => ({ id: a.id, code: a.code, name: a.name, type: a.type })),
    dimensionValues: dimensionValuesFor(entries, projects),
    canPost: !requirePermission(ctx.access, "finance.ledger.post"),
  };
}

export async function saveAllocationRule(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.ledger.post");
  if (denied) return denied;
  const cleaned = cleanRule(body, await ledgerAccounts(ctx));
  if ("problems" in cleaned) return { error: "refused" as const, detail: cleaned.problems.join("; ") };
  const id = String(body?.id ?? "").trim();
  if (id) {
    const updated = await Rules.update(scope(ctx), id, () => ({ ...cleaned.rule }));
    return updated ? { rule: updated } : { error: "notfound" };
  }
  return { rule: await Rules.create(scope(ctx), { ...cleaned.rule, createdAt: new Date().toISOString() }) };
}

export async function removeAllocationRule(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.ledger.post");
  if (denied) return denied;
  return (await Rules.remove(scope(ctx), id)) ? { removed: id } : { error: "notfound" };
}

/** Every rule's month — what it would share, or share it. */
export async function runAllocations(ctx: FinanceContext, body: Record<string, unknown>) {
  const post = body?.post === true;
  const denied = requirePermission(ctx.access, post ? "finance.ledger.post" : "finance.ledger.view");
  if (denied) return denied;
  const period = String(body?.period ?? "");
  if (!PERIOD_RE.test(period)) return { error: "period" };
  const rules = await Rules.find(scope(ctx));
  const out: { ruleId: string; name: string; pool: number; split: { value: string; amount: number }[]; state: string }[] = [];
  for (const r of rules) {
    const a = await allocationFor(ctx, `${r.id}:${period}`);
    if (a.error !== undefined) { out.push({ ruleId: r.id, name: r.name, pool: 0, split: [], state: a.error }); continue; }
    const posted = a.entries.some((e) => e.source?.kind === "allocation" && e.source?.id === `${r.id}:${period}` && !e.reversedByEntryId);
    let state = posted ? "already-posted" : a.split.length ? "due" : a.pool > 0 ? "no-basis" : "nothing-to-share";
    if (post && state === "due") {
      const p = await postAllocation(ctx, `${r.id}:${period}`) as { error?: string };
      state = p?.error ? p.error : "posted";
    }
    out.push({ ruleId: r.id, name: r.name, pool: a.pool, split: a.split, state });
  }
  return { period, rows: out };
}
