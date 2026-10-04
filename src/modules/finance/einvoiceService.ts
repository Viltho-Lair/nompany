// THE STORE HALF OF ./einvoice — the queue of issued invoices the studio owes
// its tax authority, the file each one is submitted as, and what the authority
// answered.
//
// FOUR ACTS:
//   the queue   — what is outstanding (`finance.tax.view`, the Tax screen)
//   prepare     — the official file for one invoice, to download
//   submit      — nompany sends it, where the owner decided nompany submits
//                 (Saudi Arabia, 03/10/2026 — ./einvoice) and the studio has
//                 onboarded; as each invoice is issued or nightly, as the
//                 studio chose, or when somebody presses the button
//   record      — the authority's answer, as the studio received it, for a
//                 country where the studio submits itself
// Preparing, submitting and recording are acts on the invoice, so all three
// answer to `finance.receivables.edit`; onboarding is the studio's standing
// arrangement with its tax authority, and answers to `finance.settings.edit`.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { studioEInvoiceRules } from "@/shared/compliance/rules";
import type { EInvoiceRules } from "@/shared/compliance/definition";
import { adapterFor, einvoiceStatusOf, needsAction, RECORDABLE_OUTCOMES } from "./einvoice";
import type { EInvoiceDocument, EInvoiceState } from "./einvoice";
import type { FinanceContext, Invoice } from "./types";
import { zatcaSeller } from "./zatca";
import { onboardZatcaUnit, setZatcaTiming, zatcaUnitSummary } from "./zatcaUnit";

type EInvoiced = Invoice & { einvoice?: EInvoiceState | null };
const Invoices = repo<EInvoiced>("invoices");

/**
 * WHERE A STUDIO'S INVOICES ARE — what every act here needs, and all the
 * nightly job has: no person, no access, just the studio and its cash section.
 */
export type EInvoiceTarget = Pick<FinanceContext, "studio" | "cashSection">;
const cash = (t: EInvoiceTarget) => ({ studio: t.studio, section: t.cashSection });
const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const studioOf = (t: EInvoiceTarget) => t.studio as unknown as Record<string, unknown>;

/** The country's requirement, whether nompany prepares and submits its files, and the invoices still to act on. */
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
  const adapter = adapterFor(rules);
  return {
    required: true as const,
    authority: rules.authority, system: rules.system, mode: rules.mode, inForce: rules.inForce,
    // WHETHER NOMPANY CAN PREPARE THIS COUNTRY'S FILE. Without an adapter the
    // queue is still the studio's to-do list; it builds the file elsewhere.
    prepares: Boolean(adapter),
    // WHETHER NOMPANY SUBMITS FOR THIS COUNTRY, and — Saudi Arabia — the
    // studio's unit as a screen may see it: no key, no secret.
    submits: Boolean(adapter?.submit),
    zatca: rules.adapter === "zatca" ? await zatcaUnitSummary(ctx.studio.id) : null,
    queue,
    canAct: !requirePermission(ctx.access, "finance.receivables.edit"),
    canOnboard: !requirePermission(ctx.access, "finance.settings.edit"),
  };
}

async function required(t: EInvoiceTarget, invoiceId: string) {
  const rules = studioEInvoiceRules(t.studio);
  if (!rules) return { error: "not-required" as const };
  const invoice = (await Invoices.find(cash(t))).find((i) => i.id === invoiceId);
  if (!invoice) return { error: "notfound" as const };
  const state = einvoiceStatusOf(invoice, rules);
  if (state === "not-required") return { error: "not-required" as const };
  return { rules, invoice, state };
}

/**
 * THE FILE FOR ONE INVOICE, prepared once and kept. The first request builds
 * it and stores it on the invoice; every later one hands back the same bytes.
 * For Saudi Arabia that is not a nicety: the file takes the studio's next
 * counter and hash, and building it twice would put one invoice in the chain
 * twice. It is built AGAIN only after a rejection — a refused invoice is
 * corrected and resubmitted as a new document — or when `fresh` says the kept
 * one cannot be submitted (a unit that has since been replaced signed it).
 */
async function prepareFor(t: EInvoiceTarget, invoice: EInvoiced, rules: EInvoiceRules, state: string, fresh = false) {
  const adapter = adapterFor(rules);
  if (!adapter) return { error: "no-adapter", system: rules.system };
  const kept = invoice.einvoice?.document;
  if (kept?.xml && state !== "rejected" && !fresh) return { document: kept };

  const out = await adapter.prepare({ invoice: invoice as Record<string, unknown>, studio: studioOf(t), rules });
  // WHAT THE STUDIO MUST FIX FIRST — named, and nothing written.
  if ("problem" in out) return { error: "einvoice-problem", detail: out.problem };

  const updated = await Invoices.update(cash(t), invoice.id, () => ({
    einvoice: {
      status: "prepared", adapter: adapter.key, at: new Date().toISOString(), document: out,
      // THE QR THAT PRINTS, where the seller builds one; where the authority
      // issues it, it arrives when recorded.
      ...(out.qr ? { qr: out.qr } : {}),
    } as EInvoiceState,
  }));
  return updated ? { document: out } : { error: "notfound" };
}

/** THE OFFICIAL FILE FOR ONE INVOICE, to download. */
export async function prepareEInvoice(ctx: FinanceContext, invoiceId: string) {
  const denied = requirePermission(ctx.access, "finance.receivables.edit");
  if (denied) return denied;
  const found = await required(ctx, invoiceId);
  if ("error" in found) return found;
  return prepareFor(ctx, found.invoice, found.rules, found.state);
}

/**
 * SUBMIT ONE INVOICE: prepare it if it is not yet, send it, keep the answer.
 *
 * THREE ANSWERS, three different states on the invoice:
 *   accepted  — the authority accepted it; its QR is the one that prints
 *   rejected  — refused, with the authority's words; corrected and resubmitted
 *               it becomes a new document, so it is prepared again
 *   unreached — nobody judged it (an outage, no unit yet); it stays prepared,
 *               the attempt is counted, and the nightly job tries it again
 */
async function submitFor(t: EInvoiceTarget, invoice: EInvoiced, rules: EInvoiceRules, state: string) {
  const adapter = adapterFor(rules);
  if (!adapter?.submit) return { error: "no-submit" as const };
  let prepared = await prepareFor(t, invoice, rules, state);
  if ("error" in prepared) return prepared;
  let answer = await adapter.submit({ studio: studioOf(t), document: prepared.document as EInvoiceDocument });
  // KEPT FROM BEFORE THE STUDIO'S UNIT — or signed by one it has replaced. It
  // was never submitted by nompany, so it is prepared again under the unit
  // that can submit it, taking a link in that unit's chain.
  if (answer.outcome === "unreached" && answer.message === "unsigned") {
    prepared = await prepareFor(t, invoice, rules, state, true);
    if ("error" in prepared) return prepared;
    answer = await adapter.submit({ studio: studioOf(t), document: prepared.document as EInvoiceDocument });
  }
  const document = prepared.document as EInvoiceDocument;
  const at = new Date().toISOString();
  const updated = await Invoices.update(cash(t), invoice.id, (cur) => {
    const prior = cur.einvoice || null;
    return {
      einvoice: {
        ...(prior || {}),
        adapter: adapter.key,
        at,
        document,
        ...(document.qr ? { qr: document.qr } : {}),
        message: answer.message,
        ...(answer.outcome === "unreached"
          ? { status: "prepared", attempts: (Number(prior?.attempts) || 0) + 1 }
          : { status: answer.outcome, submitted: true, uuid: document.uuid || "", attempts: (Number(prior?.attempts) || 0) + 1 }),
      } as EInvoiceState,
    };
  });
  if (!updated) return { error: "notfound" as const };
  return { outcome: answer.outcome, message: answer.message, einvoice: updated.einvoice };
}

/** SUBMIT, because somebody pressed the button — any outstanding invoice, whatever its date. */
export async function submitEInvoice(ctx: FinanceContext, invoiceId: string) {
  const denied = requirePermission(ctx.access, "finance.receivables.edit");
  if (denied) return denied;
  const found = await required(ctx, invoiceId);
  if ("error" in found) return found;
  if (found.state === "accepted") return { error: "already-accepted" };
  return submitFor(ctx, found.invoice, found.rules, found.state);
}

/**
 * THE MOMENT AN INVOICE IS ISSUED — for a studio that chose to submit each as
 * it goes. BEST-EFFORT, BY THE SAME RULE AS POSTING IT: the invoice was issued
 * and that happened; an authority being down must not undo it. What happened
 * travels back beside the invoice, and an invoice not reached is the nightly
 * job's to retry.
 */
export async function submitOnIssue(t: EInvoiceTarget, invoiceId: string) {
  try {
    const rules = studioEInvoiceRules(t.studio);
    const adapter = adapterFor(rules);
    if (!rules || !adapter?.submit || !adapter.submission) return null;
    const when = await adapter.submission(studioOf(t));
    if (!when || when.timing !== "immediate") return null;
    const found = await required(t, invoiceId);
    if ("error" in found) return null;
    if (String(found.invoice.issueDate || "") < when.since) return null;
    return await submitFor(t, found.invoice, found.rules, found.state);
  } catch {
    return { outcome: "unreached" as const, message: "einvoice-error" };
  }
}

/** Whether the nightly job should submit this invoice for a studio that submits since `since`. */
export function dueForBatch(invoice: { issueDate?: unknown }, state: string, since: string): boolean {
  // REJECTED WAITS FOR A PERSON: the authority said what is wrong, and sending
  // the same thing again every night would only collect the same refusal.
  return (state === "unsubmitted" || state === "prepared") && String(invoice.issueDate || "") >= since;
}

/**
 * THE NIGHTLY BATCH, for one studio: every outstanding invoice issued since the
 * studio began submitting, oldest first — the studio's daily choice, and the
 * retry for everything an immediate submission did not reach. One at a time:
 * the chain is one sequence, and its order is the order ZATCA sees.
 */
export async function submitOutstanding(t: EInvoiceTarget) {
  const rules = studioEInvoiceRules(t.studio);
  const adapter = adapterFor(rules);
  if (!rules || !adapter?.submit || !adapter.submission) return { submitted: 0, accepted: 0 };
  const when = await adapter.submission(studioOf(t));
  if (!when) return { submitted: 0, accepted: 0 };
  const invoices = (await Invoices.find(cash(t)))
    .filter((inv) => dueForBatch(inv, einvoiceStatusOf(inv, rules), when.since))
    .sort((a, b) => String(a.issueDate || "").localeCompare(String(b.issueDate || "")) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  let accepted = 0;
  for (const inv of invoices) {
    const out = await submitFor(t, inv, rules, einvoiceStatusOf(inv, rules));
    if ("outcome" in out && out.outcome === "accepted") accepted += 1;
  }
  return { submitted: invoices.length, accepted };
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

// ---- Saudi Arabia: the studio's unit -----------------------------------------------------------

/** ONBOARD THE STUDIO'S ZATCA UNIT with the OTP somebody generated on ZATCA's Fatoora portal. */
export async function onboardZatca(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.settings.edit");
  if (denied) return denied;
  const rules = studioEInvoiceRules(ctx.studio);
  if (rules?.adapter !== "zatca") return { error: "not-required" };
  const studio = ctx.studio as unknown as { id: string; slug?: unknown; name?: unknown; fieldOfWork?: unknown; timezone?: unknown };
  return onboardZatcaUnit({
    studio,
    seller: zatcaSeller(ctx.studio as unknown as Parameters<typeof zatcaSeller>[0]),
    collaboratorId: ctx.collaborator.id,
    otp: body?.otp,
    environment: body?.environment,
  });
}

/** When the studio's invoices are reported: as each is issued, or nightly. */
export async function setZatcaReporting(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.settings.edit");
  if (denied) return denied;
  return setZatcaTiming(ctx.studio.id, body?.timing);
}
