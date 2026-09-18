// THE STORE HALF OF ./einvoice — the queue of issued invoices that should reach
// the studio's tax authority, and the one act that sends one.
//
// Reading answers to `finance.tax.view` (the Tax screen); submitting to
// `finance.receivables.edit`, because it is an act on the invoice. With no
// adapter for the studio's country, a submission is refused by name
// (`no-adapter`) and NOTHING IS WRITTEN — a stored failure would read as an
// attempt that happened.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { studioEInvoiceRules } from "@/shared/compliance/rules";
import { adapterFor, einvoiceStatusOf, needsAction } from "./einvoice";
import type { EInvoiceState } from "./einvoice";
import type { FinanceContext, Invoice } from "./types";

const Invoices = repo<Invoice & { einvoice?: EInvoiceState | null }>("invoices");
const cash = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.cashSection });

/** The country's requirement, whether an adapter exists, and the invoices still to act on. */
export async function einvoiceQueue(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.tax.view");
  if (denied) return denied;
  const rules = studioEInvoiceRules(ctx.studio);
  if (!rules) return { required: false as const };
  const invoices = await Invoices.find(cash(ctx));
  const queue = invoices
    .map((inv) => ({ id: inv.id, reference: inv.reference, issueDate: inv.issueDate, clientName: inv.clientName, state: einvoiceStatusOf(inv, rules), message: inv.einvoice?.message || "" }))
    .filter((r) => needsAction(r.state))
    .sort((a, b) => String(a.issueDate || "").localeCompare(String(b.issueDate || "")));
  return {
    required: true as const,
    authority: rules.authority, system: rules.system, mode: rules.mode, inForce: rules.inForce,
    connected: Boolean(adapterFor(rules)),
    queue,
    canSubmit: !requirePermission(ctx.access, "finance.receivables.edit"),
  };
}

/** SEND ONE INVOICE through the country's adapter, and keep the answer on the invoice. */
export async function submitEInvoice(ctx: FinanceContext, invoiceId: string) {
  const denied = requirePermission(ctx.access, "finance.receivables.edit");
  if (denied) return denied;
  const rules = studioEInvoiceRules(ctx.studio);
  if (!rules) return { error: "not-required" };
  const adapter = adapterFor(rules);
  if (!adapter) return { error: "no-adapter", system: rules.system };

  const invoice = (await Invoices.find(cash(ctx))).find((i) => i.id === invoiceId);
  if (!invoice) return { error: "notfound" };
  const state = einvoiceStatusOf(invoice, rules);
  if (!needsAction(state)) return { error: "not-pending", state };

  const attempts = (invoice.einvoice?.attempts || 0) + 1;
  let answer: Awaited<ReturnType<typeof adapter.submit>>;
  try {
    answer = await adapter.submit({ invoice: invoice as Record<string, unknown>, studio: ctx.studio as Record<string, unknown>, rules });
  } catch (err) {
    // THE TRANSPORT FAILED, not the invoice: kept as `failed` with the reason,
    // so the queue shows it and a retry is the obvious next act.
    answer = { status: "failed", message: String((err as Error)?.message || err).slice(0, 300) };
  }
  const at = new Date().toISOString();
  const updated = await Invoices.update(cash(ctx), invoiceId, () => ({
    einvoice: { adapter: adapter.key, attempts, at, ...answer } as EInvoiceState,
  }));
  return updated ? { invoice: updated } : { error: "notfound" };
}
