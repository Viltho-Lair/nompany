// THE STORE HALF OF ./budgets. Budgets are the first rows `finance-budgets`
// owns (`budgets`); the actual side is read from the journal under the ledger.
//
// `finance.budgets` — view reads every budget and its variance; create, edit
// and delete are the budget itself. Reading the variance needs no ledger right
// of its own: the figures are the P&L's, which Reports already shows to a
// reader of `finance.reports`, and a budget holder who could not see what the
// budget is measured against would be holding a list of numbers.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { ledgerAccounts } from "./ledger";
import { projectRows } from "./finance";
import { cleanBudget, budgetVsActual, budgetMonths } from "./budgets";
import { DIMENSIONS } from "./statements";
import type { Budget } from "./budgets";
import type { FinanceContext, JournalEntry } from "./types";

type BudgetRecord = Budget & { id: string; createdAt: string; createdByCollaboratorId: string };

const Budgets = repo<BudgetRecord>("budgets");
const Entries = repo<JournalEntry>("journalEntries");
const scope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.budgetsSection });

/** Every budget, each with its variance to this month (or its last, once it is over). */
export async function budgetsView(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.budgets.view");
  if (denied) return denied;
  const [budgets, entries, chart, projects] = await Promise.all([
    Budgets.find(scope(ctx)),
    Entries.find({ studio: ctx.studio, section: ctx.ledgerSection }),
    ledgerAccounts(ctx),
    projectRows(ctx),
  ]);
  const now = new Date().toISOString().slice(0, 7);
  // THE VALUES THE LEDGER HAS ACTUALLY POSTED, per dimension — what a budget
  // can be cut by and still have something to be measured against. A project
  // reads as its number and name; the rest show as the ledger holds them.
  const seen: Record<string, Set<string>> = Object.fromEntries(DIMENSIONS.map((d) => [d, new Set<string>()]));
  for (const e of entries) for (const l of e.lines || []) {
    for (const d of DIMENSIONS) { const v = String((l as Record<string, unknown>)[d] || ""); if (v) seen[d].add(v); }
  }
  for (const p of projects) seen.projectId.add(String(p.id));
  const projectLabel = Object.fromEntries(projects.map((p) => [String(p.id), [p.number, p.name].filter(Boolean).join(" ")]));
  const dimensionValues = Object.fromEntries(DIMENSIONS.map((d) => [d, [...seen[d]].map((v) => ({
    value: v, label: d === "projectId" ? projectLabel[v] || v : v,
  }))]));

  return {
    budgets: budgets
      .sort((a, b) => b.from.localeCompare(a.from) || a.name.localeCompare(b.name))
      .map((b) => {
        const months = budgetMonths(b.from);
        const through = months.includes(now) ? now : months[now < months[0] ? 0 : 11];
        return { ...b, report: budgetVsActual(b, entries, chart, { through, currency: ctx.studio.currency }) };
      }),
    accounts: chart.filter((a) => (a.type === "income" || a.type === "expense") && a.active !== false)
      .map((a) => ({ id: a.id, code: a.code, name: a.name, type: a.type })),
    dimensionValues,
    canCreate: !requirePermission(ctx.access, "finance.budgets.create"),
    canEdit: !requirePermission(ctx.access, "finance.budgets.edit"),
    canDelete: !requirePermission(ctx.access, "finance.budgets.delete"),
  };
}

/** Create a budget, or replace one's name, window, cut and lines. */
export async function saveBudget(ctx: FinanceContext, body: Record<string, unknown>) {
  const id = String(body?.id ?? "").trim();
  const denied = requirePermission(ctx.access, id ? "finance.budgets.edit" : "finance.budgets.create");
  if (denied) return denied;
  const cleaned = cleanBudget(body, await ledgerAccounts(ctx));
  if ("problems" in cleaned) return { error: "refused" as const, detail: cleaned.problems.join("; ") };
  if (id) {
    const updated = await Budgets.update(scope(ctx), id, () => ({ ...cleaned.budget }));
    return updated ? { budget: updated } : { error: "notfound" };
  }
  return {
    budget: await Budgets.create(scope(ctx), {
      ...cleaned.budget, createdAt: new Date().toISOString(), createdByCollaboratorId: ctx.collaborator.id,
    }),
  };
}

export async function removeBudget(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.budgets.delete");
  if (denied) return denied;
  return (await Budgets.remove(scope(ctx), id)) ? { removed: id } : { error: "notfound" };
}
