// THE STORE HALF OF ./einvoice — the queue of issued invoices the studio owes
// its tax authority, the file each one is submitted as, and what the authority
// answered.
//
// NOTHING HERE REACHES AN AUTHORITY (the owner's rule, 26/09/2026 — ./einvoice).
// Three acts, all inside the product:
//   the queue   — what is outstanding (`finance.tax.view`, the Tax screen)
//   prepare     — the official file for one invoice, to download and submit
//   record      — the authority's answer, as the studio received it
// Preparing and recording are acts on the invoice, so both answer to
// `finance.receivables.edit`.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { studioEInvoiceRules } from "@/shared/compliance/rules";
import { adapterFor, einvoiceStatusOf, needsAction, RECORDABLE_OUTCOMES } from "./einvoice";
import type { EInvoiceState } from "./einvoice";
import type { FinanceContext, Invoice } from "./types";

const Invoices = repo<Invoice & { einvoice?: EInvoiceState | null }>("invoices");
const cash = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.cashSection });
const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

/** The country's requirement, whether nompany can prepare its files, and the invoices still to act on. */
export async function einvoiceQueue(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.tax.view");
  if (denied) return denied;
  const rules = studioEInvoiceRules(ctx.studio);
  if (!rules) return { required: false as const };
  const invoices = await Invoices.find(cash(ctx));
  const queue = invoices
    .map((inv) => ({
      id: inv.id,
      reference: inv.reference,
      issueDate: inv.issueDate,
      clientName: inv.clientName,
      state: einvoiceStatusOf(inv, rules),
      message: inv.einvoice?.message || "",
      authorityReference: inv.einvoice?.uuid || "",
    }))
    .filter((r) => needsAction(r.state))
    .sort((a, b) => String(a.issueDate || "").localeCompare(String(b.issueDate || "")));
  return {
    required: true as const,
    authority: rules.authority, system: rules.system, mode: rules.mode, inForce: rules.inForce,
    // WHETHER NOMPANY CAN PREPARE THIS COUNTRY'S FILE. Without an adapter the
    // queue is still the studio's to-do list; it builds the file elsewhere.
    prepares: Boolean(adapterFor(rules)),
    queue,
    canAct: !requirePermission(ctx.access, "finance.receivables.edit"),
  };
}

async function required(ctx: FinanceContext, invoiceId: string) {
  const rules = studioEInvoiceRules(ctx.studio);
  if (!rules) return { error: "not-required" as const };
  const invoice = (await Invoices.find(cash(ctx))).find((i) => i.id === invoiceId);
  if (!invoice) return { error: "notfound" as const };
  const state = einvoiceStatusOf(invoice, rules);
  if (state === "not-required") return { error: "not-required" as const };
  return { rules, invoice, state };
}

/**
 * THE OFFICIAL FILE FOR ONE INVOICE, to download.
 *
 * PREPARED ONCE AND KEPT. The first request builds it and stores it on the
 * invoice; every later one hands back the same bytes. For Saudi Arabia that is
 * not a nicety: the file takes the studio's next counter and hash, and building
 * it twice would put one invoice in the chain twice. A file is built AGAIN only
 * after the studio recorded a rejection, because a refused invoice is
 * corrected and resubmitted as a new document.
 */
export async function prepareEInvoice(ctx: FinanceContext, invoiceId: string) {
  const denied = requirePermission(ctx.access, "finance.receivables.edit");
  if (denied) return denied;
  const found = await required(ctx, invoiceId);
  if ("error" in found) return found;
  const { rules, invoice, state } = found;
  const adapter = adapterFor(rules);
  if (!adapter) return { error: "no-adapter", system: rules.system };

  const kept = invoice.einvoice?.document;
  if (kept?.xml && state !== "rejected") return { document: kept };

  const out = await adapter.prepare({ invoice: invoice as Record<string, unknown>, studio: ctx.studio as Record<string, unknown>, rules });
  // WHAT THE STUDIO MUST FIX FIRST — named, and nothing written.
  if ("problem" in out) return { error: "einvoice-problem", detail: out.problem };

  const at = new Date().toISOString();
  const updated = await Invoices.update(cash(ctx), invoiceId, () => ({
    einvoice: {
      status: "prepared", adapter: adapter.key, at, document: out,
      // THE SELLER'S OWN QR, where the country has the seller build one, prints
      // from here; where the authority issues it, it arrives when recorded.
      ...(out.qr ? { qr: out.qr } : {}),
    } as EInvoiceState,
  }));
  return updated ? { document: out } : { error: "notfound" };
}

/**
 * WHAT THE AUTHORITY ANSWERED, as the studio received it through the official
 * channel: accepted or rejected, its reference for the invoice, the QR it
 * issued (Jordan's comes only from JoFotara), and its words. Recording keeps
 * the prepared file; recording ACCEPTED without a file is allowed, because a
 * studio may have issued the invoice in the authority's own portal.
 */
export async function recordEInvoice(ctx: FinanceContext, invoiceId: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.receivables.edit");
  if (denied) return denied;
  const outcome = str(body?.outcome, 20);
  if (!(RECORDABLE_OUTCOMES as readonly string[]).includes(outcome)) return { error: "outcome" };
  const found = await required(ctx, invoiceId);
  if ("error" in found) return found;
  const { rules, invoice } = found;

  const reference = str(body?.reference, 120);
  // AN ACCEPTANCE CARRIES THE AUTHORITY'S REFERENCE — it is what somebody quotes
  // back to the tax office, and an "accepted" with none is unverifiable.
  if (outcome === "accepted" && !reference) return { error: "reference-required" };
  const qr = str(body?.qr, 2000);
  const prior = invoice.einvoice || null;
  const updated = await Invoices.update(cash(ctx), invoiceId, () => ({
    einvoice: {
      ...(prior || {}),
      status: outcome,
      adapter: prior?.adapter || rules.adapter,
      at: new Date().toISOString(),
      uuid: reference,
      // A PASTED QR REPLACES OURS — the authority's is the one that counts.
      ...(qr ? { qr } : {}),
      message: str(body?.message, 300),
    } as EInvoiceState,
  }));
  return updated ? { invoice: updated } : { error: "notfound" };
}
