// THE STORE HALF OF ./credit — customers' credit limits, and the dunning run.
//
// BOTH ARE FILED UNDER `finance-receivables`, the first rows that section
// owns: invoices stay where every studio wrote them (`finance-cash`), and these
// are new, so they go where the screen that reads them is.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listInvoices } from "./finance";
import {
  clientKey, exposures, creditProblem, cleanCredit, readDunningDays, dunningLevelDue, daysBetween,
} from "./credit";
import type { CreditRow } from "./credit";
import type { FinanceContext, Invoice } from "./types";

type CreditRecord = CreditRow & { id: string; createdAt?: string };
type Notice = { id: string; invoiceId: string; invoiceReference: string; level: number; sentOn: string; byCollaboratorId: string };

const Credit = repo<CreditRecord>("customerCredit");
const Notices = repo<Notice>("dunningNotices");

const scope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.receivablesSection });
const today = () => new Date().toISOString().slice(0, 10);

export const dunningDaysFor = (ctx: FinanceContext) =>
  readDunningDays((ctx.settingsSection?.settings as Record<string, unknown> | undefined)?.dunningDays);

/** Customers — what each owes and may owe — and the invoices a reminder is due on. */
export async function receivablesView(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.receivables.view");
  if (denied) return denied;

  const [invoices, rows, notices] = await Promise.all([
    listInvoices(ctx), Credit.find(scope(ctx)), Notices.find(scope(ctx)),
  ]);
  const owed = exposures(invoices);
  const byKey = new Map(rows.map((r) => [clientKey(r.clientName), r]));
  const keys = new Set([...owed.keys(), ...byKey.keys()]);
  const customers = [...keys].map((k) => {
    const e = owed.get(k);
    const r = byKey.get(k);
    const outstanding = e?.outstanding || 0;
    return {
      key: k,
      id: r?.id || "",
      // THE NAME AS THE INVOICES SPELL IT when there are any; the row's when not.
      clientName: e?.clientName || r?.clientName || k,
      limit: r?.limit ?? null,
      onHold: Boolean(r?.onHold),
      note: r?.note || "",
      outstanding,
      overdue: e?.overdue || 0,
      invoices: e?.invoices || 0,
      // HEADROOM IS NULL WITH NO LIMIT — "unlimited" and "nought left" must
      // not read the same.
      headroom: r?.limit === null || r?.limit === undefined ? null : Math.round((r.limit - outstanding) * 1000) / 1000,
    };
  }).sort((a, b) => b.outstanding - a.outstanding || a.clientName.localeCompare(b.clientName));

  const days = dunningDaysFor(ctx);
  const sentFor = new Map<string, Notice[]>();
  for (const n of notices) sentFor.set(n.invoiceId, [...(sentFor.get(n.invoiceId) || []), n]);
  const now = today();
  const overdue = invoices
    .filter((inv) => inv.overdue)
    .map((inv) => {
      const history = (sentFor.get(inv.id) || []).sort((a, b) => a.sentOn.localeCompare(b.sentOn));
      const sent = history.reduce((m, n) => Math.max(m, n.level), 0);
      return {
        id: inv.id,
        reference: inv.reference,
        clientName: inv.clientName,
        dueDate: inv.dueDate,
        daysLate: daysBetween(String(inv.dueDate), now),
        outstanding: inv.outstanding,
        currency: inv.currency || ctx.studio.currency || "",
        sent,
        lastSentOn: history.length ? history[history.length - 1].sentOn : "",
        levelDue: dunningLevelDue(inv, sent, days, now),
      };
    })
    .sort((a, b) => b.daysLate - a.daysLate);

  return {
    customers,
    overdue,
    dunningDays: days,
    canManage: !requirePermission(ctx.access, "finance.receivables.edit"),
  };
}

/** Set a customer's limit or hold. One row per customer, by name. */
export async function saveCredit(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.receivables.edit");
  if (denied) return denied;
  const cleaned = cleanCredit(body);
  if ("problems" in cleaned) return { error: "refused" as const, detail: cleaned.problems.join("; ") };
  const rows = await Credit.find(scope(ctx));
  const existing = rows.find((r) => clientKey(r.clientName) === clientKey(cleaned.row.clientName));
  if (existing) {
    const updated = await Credit.update(scope(ctx), existing.id, () => ({ ...cleaned.row }));
    return updated ? { credit: updated } : { error: "notfound" };
  }
  return { credit: await Credit.create(scope(ctx), { ...cleaned.row, createdAt: new Date().toISOString() }) };
}

export async function removeCredit(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.receivables.edit");
  if (denied) return denied;
  const ok = await Credit.remove(scope(ctx), id);
  return ok ? { removed: id } : { error: "notfound" };
}

/**
 * RECORD THAT REMINDERS WENT OUT — one notice per invoice at the level now
 * due. Nothing is sent from here: nompany holds no client's address, and a
 * letter the studio prints or emails itself is the honest shape until it does.
 * The record is what stops the next run proposing the same letter again.
 */
export async function recordDunning(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.receivables.edit");
  if (denied) return denied;
  const wanted = new Set((Array.isArray(body?.invoiceIds) ? body.invoiceIds : []).map((v) => String(v)));
  if (!wanted.size) return { error: "missing" };

  const view = await receivablesView(ctx);
  if ("error" in view) return view;
  const now = today();
  const recorded: Notice[] = [];
  for (const inv of view.overdue) {
    if (!wanted.has(inv.id) || !inv.levelDue) continue;
    recorded.push(await Notices.create(scope(ctx), {
      invoiceId: inv.id,
      invoiceReference: String(inv.reference || ""),
      level: inv.levelDue,
      sentOn: now,
      byCollaboratorId: ctx.collaborator.id,
    }));
  }
  return { recorded };
}

/**
 * THE CREDIT CHECK AT ISSUE. `invoice` is the draft about to be issued; what it
 * adds is what the customer will be expected to pay on it.
 */
export async function creditCheck(ctx: FinanceContext, invoice: Invoice) {
  const [invoices, rows] = await Promise.all([listInvoices(ctx), Credit.find(scope(ctx))]);
  const key = clientKey(invoice.clientName);
  const row = rows.find((r) => clientKey(r.clientName) === key);
  if (!row) return null;
  const others = invoices.filter((i) => i.id !== invoice.id);
  const owed = exposures(others).get(key)?.outstanding || 0;
  const self = invoices.find((i) => i.id === invoice.id);
  const adding = Number(self?.expected ?? self?.total) || 0;
  return creditProblem(row, owed, adding);
}
