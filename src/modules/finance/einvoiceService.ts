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
//
// TWO KINDS OF SALE (04/10/2026): Finance's INVOICES, and the till's RECEIPTS,
// which ZATCA treats as the simplified invoices they are. A receipt is read as
// an invoice-shaped VIEW — its number as the reference, the day it was sold in
// the studio's zone as the issue date — and every write lands on its own row.
// Preparing, submitting and recording are acts on the invoice, so all three
// answer to `finance.receivables.edit`; onboarding is the studio's standing
// arrangement with its tax authority, and answers to `finance.settings.edit`.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { claim, release } from "@/platform/db/store";
import { S } from "@/platform/db/keys";
import { randomUUID } from "node:crypto";
import { studioEInvoiceRules } from "@/shared/compliance/rules";
import type { EInvoiceRules } from "@/shared/compliance/definition";
import { adapterFor, einvoiceStatusOf, needsAction, RECORDABLE_OUTCOMES } from "./einvoice";
import type { EInvoiceDocument, EInvoiceState } from "./einvoice";
import type { FinanceContext, Invoice } from "./types";
import { zatcaSeller } from "./zatca";
import { onboardZatcaUnit, renewZatcaUnit, setZatcaTiming, zatcaUnitSummary } from "./zatcaUnit";
import { dayIn, studioTimezone } from "@/shared/timezone";

type EInvoiced = Invoice & { einvoice?: EInvoiceState | null };
const Invoices = repo<EInvoiced>("invoices");
const Receipts = repo<Record<string, unknown> & { id: string; einvoice?: EInvoiceState | null }>("posReceipts");

/** Which kind of sale an act is on. */
export const EINVOICE_KINDS = ["invoice", "receipt"] as const;
export type EInvoiceKind = (typeof EINVOICE_KINDS)[number];
export const cleanKind = (v: unknown): EInvoiceKind => (v === "receipt" ? "receipt" : "invoice");

/**
 * WHERE A STUDIO'S SALES ARE — what every act here needs, and all the nightly
 * job has: no person, no access, just the studio, its cash section (invoices)
 * and its till's section (receipts — null for a studio with no till).
 */
export type EInvoiceTarget = Pick<FinanceContext, "studio" | "cashSection"> & { posSection?: FinanceContext["posSection"] | null };
const cash = (t: EInvoiceTarget) => ({ studio: t.studio, section: t.cashSection });

/** A receipt as the invoice-shaped thing every act here reads. */
function receiptView(r: Record<string, unknown> & { id: string }, timezone: string): EInvoiced {
  return {
    ...r,
    reference: String(r.number || ""),
    issueDate: r.at ? dayIn(String(r.at), timezone) : "",
    createdAt: String(r.at || ""),
    clientName: "",
  } as unknown as EInvoiced;
}

/** Every sale of one kind, as the acts here read them. */
async function rowsOf(t: EInvoiceTarget, kind: EInvoiceKind): Promise<EInvoiced[]> {
  if (kind === "invoice") return Invoices.find(cash(t));
  if (!t.posSection) return [];
  const tz = studioTimezone(t.studio as { timezone?: unknown });
  return (await Receipts.find({ studio: t.studio, section: t.posSection })).map((r) => receiptView(r, tz));
}

/** Write one sale's e-invoice state onto its own row, under a function patch (invariant 8). */
async function writeState(t: EInvoiceTarget, kind: EInvoiceKind, id: string, next: (prior: EInvoiceState | null) => EInvoiceState | null) {
  if (kind === "invoice") {
    const u = await Invoices.update(cash(t), id, (cur) => ({ einvoice: next(cur.einvoice || null) }));
    return u ? (u.einvoice || null) : undefined;
  }
  if (!t.posSection) return undefined;
  const u = await Receipts.update({ studio: t.studio, section: t.posSection }, id, (cur) => ({ einvoice: next(cur.einvoice || null) }));
  return u ? (u.einvoice || null) : undefined;
}
const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const studioOf = (t: EInvoiceTarget) => t.studio as unknown as Record<string, unknown>;

/** The country's requirement, whether nompany prepares and submits its files, and the invoices still to act on. */
export async function einvoiceQueue(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.tax.view");
  if (denied) return denied;
  const rules = studioEInvoiceRules(ctx.studio);
  if (!rules) return { required: false as const };
  const adapter = adapterFor(rules);
  // THE TILL'S RECEIPTS JOIN THE QUEUE only where nompany submits them — a
  // country whose files the studio submits itself has no receipt file here.
  const kinds: EInvoiceKind[] = adapter?.submit ? ["invoice", "receipt"] : ["invoice"];
  const rows = await Promise.all(kinds.map(async (kind) => (await rowsOf(ctx, kind)).map((inv) => ({ kind, inv }))));
  const queue = rows.flat()
    .map(({ kind, inv }) => ({
      kind,
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

async function required(t: EInvoiceTarget, invoiceId: string, kind: EInvoiceKind = "invoice") {
  const rules = studioEInvoiceRules(t.studio);
  if (!rules) return { error: "not-required" as const };
  const invoice = (await rowsOf(t, kind)).find((i) => i.id === invoiceId);
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
type Prepared = { document: EInvoiceDocument } | { error: string; system?: string; detail?: string };
async function prepareFor(t: EInvoiceTarget, invoice: EInvoiced, rules: EInvoiceRules, state: string, fresh = false, kind: EInvoiceKind = "invoice"): Promise<Prepared> {
  const adapter = adapterFor(rules);
  if (!adapter) return { error: "no-adapter", system: rules.system };
  const kept = invoice.einvoice?.document;
  if (kept?.xml && state !== "rejected" && !fresh) return { document: kept };

  const out = await adapter.prepare({ invoice: invoice as Record<string, unknown>, studio: studioOf(t), rules, source: kind });
  // WHAT THE STUDIO MUST FIX FIRST — named, and nothing written.
  if ("problem" in out) return { error: "einvoice-problem", detail: out.problem };

  const written = await writeState(t, kind, invoice.id, () => ({
    status: "prepared", adapter: adapter.key, at: new Date().toISOString(), document: out,
    // THE QR THAT PRINTS, where the seller builds one; where the authority
    // issues it, it arrives when recorded.
    ...(out.qr ? { qr: out.qr } : {}),
  } as EInvoiceState));
  return written !== undefined ? { document: out } : { error: "notfound" };
}

/**
 * ONE ACT ON ONE INVOICE AT A TIME. Preparing takes a link in the studio's
 * chain, so two acts racing on the same unprepared invoice — an issue and the
 * nightly batch, two people at the button — would each take one, and one link
 * would point at a document nobody ever submitted. A short lease (a claim with
 * a TTL, so a crashed holder cannot lock the invoice for ever) serialises them,
 * and the invoice is READ AGAIN once the lease is held, so the second act sees
 * what the first one did. The loser is told `einvoice-busy` rather than kept
 * waiting: a person can press again, and the batch comes back tomorrow.
 */
const LEASE_SEC = 120;
async function leased<R>(t: EInvoiceTarget, invoiceId: string, op: (found: Exclude<Awaited<ReturnType<typeof required>>, { error: string }>) => Promise<R>, kind: EInvoiceKind = "invoice") {
  const key = S.einvoiceLease(t.studio.id, invoiceId);
  if (!(await claim(key, randomUUID(), LEASE_SEC))) return { error: "einvoice-busy" as const };
  try {
    const found = await required(t, invoiceId, kind);
    if ("error" in found) return found;
    return await op(found);
  } finally {
    await release(key);
  }
}

/** THE OFFICIAL FILE FOR ONE INVOICE, to download. */
export async function prepareEInvoice(ctx: FinanceContext, invoiceId: string, kind: EInvoiceKind = "invoice") {
  const denied = requirePermission(ctx.access, "finance.receivables.edit");
  if (denied) return denied;
  return leased(ctx, invoiceId, (found) => prepareFor(ctx, found.invoice, found.rules, found.state, false, kind), kind);
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
async function submitFor(t: EInvoiceTarget, invoice: EInvoiced, rules: EInvoiceRules, state: string, kind: EInvoiceKind = "invoice") {
  const adapter = adapterFor(rules);
  if (!adapter?.submit) return { error: "no-submit" as const };
  let prepared = await prepareFor(t, invoice, rules, state, false, kind);
  if ("error" in prepared) return prepared;
  let answer = await adapter.submit({ studio: studioOf(t), document: prepared.document as EInvoiceDocument });
  // KEPT FROM BEFORE THE STUDIO'S UNIT — or signed by one it has replaced. It
  // was never submitted by nompany, so it is prepared again under the unit
  // that can submit it, taking a link in that unit's chain.
  if (answer.outcome === "unreached" && answer.message === "unsigned") {
    prepared = await prepareFor(t, invoice, rules, state, true, kind);
    if ("error" in prepared) return prepared;
    answer = await adapter.submit({ studio: studioOf(t), document: prepared.document as EInvoiceDocument });
  }
  // THE AUTHORITY'S OWN COPY, where it handed one back (a cleared invoice).
  const document = { ...(prepared.document as EInvoiceDocument), ...(answer.outcome === "accepted" && answer.document ? answer.document : {}) };
  const at = new Date().toISOString();
  const written = await writeState(t, kind, invoice.id, (prior) => ({
    ...(prior || {}),
    adapter: adapter.key,
    at,
    document,
    ...(document.qr ? { qr: document.qr } : {}),
    message: answer.message,
    ...(answer.outcome === "unreached"
      ? { status: "prepared", attempts: (Number(prior?.attempts) || 0) + 1 }
      : { status: answer.outcome, submitted: true, uuid: document.uuid || "", attempts: (Number(prior?.attempts) || 0) + 1 }),
  } as EInvoiceState));
  if (written === undefined) return { error: "notfound" as const };
  return { outcome: answer.outcome, message: answer.message, einvoice: written };
}

/** SUBMIT, because somebody pressed the button — any outstanding sale, whatever its date. */
export async function submitEInvoice(ctx: FinanceContext, invoiceId: string, kind: EInvoiceKind = "invoice") {
  const denied = requirePermission(ctx.access, "finance.receivables.edit");
  if (denied) return denied;
  return leased(ctx, invoiceId, async (found) => {
    if (found.state === "accepted") return { error: "already-accepted" as const };
    return submitFor(ctx, found.invoice, found.rules, found.state, kind);
  }, kind);
}

/**
 * THE MOMENT AN INVOICE IS ISSUED, OR A TILL SALE IS MADE — for a studio that
 * chose to submit each as it goes. BEST-EFFORT, BY THE SAME RULE AS POSTING IT: the invoice was issued
 * and that happened; an authority being down must not undo it. What happened
 * travels back beside the invoice, and an invoice not reached is the nightly
 * job's to retry.
 */
export async function submitOnIssue(t: EInvoiceTarget, invoiceId: string, kind: EInvoiceKind = "invoice") {
  try {
    const rules = studioEInvoiceRules(t.studio);
    const adapter = adapterFor(rules);
    if (!rules || !adapter?.submit || !adapter.submission) return null;
    const when = await adapter.submission(studioOf(t));
    if (!when || when.timing !== "immediate") return null;
    const out = await leased(t, invoiceId, async (found) => {
      // CLEARED BEFORE IT WAS ISSUED (a business invoice — clearBeforeIssue).
      if (found.state === "accepted") return null;
      if (String(found.invoice.issueDate || "") < when.since) return null;
      return submitFor(t, found.invoice, found.rules, found.state, kind);
    }, kind);
    // BUSY IS NOT AN ANSWER TO SHOW: somebody else is already submitting it.
    return out && "error" in out ? null : out;
  } catch {
    return { outcome: "unreached" as const, message: "einvoice-error" };
  }
}

/**
 * A TILL SALE IS STAMPED AS IT IS MADE (04/10/2026). A Saudi simplified
 * invoice carries its stamped QR on the slip the customer takes away, so the
 * receipt is PREPARED — signed, a chain link taken — before the sale answers,
 * which is local work and fast. REPORTING it needs ZATCA and waits for nobody:
 * the till hands it to `submitOnIssue` after the response, or the nightly batch
 * takes it. Only for a studio that is connected — an unconnected one would take
 * a chain link per sale for a file nothing submits. Best-effort: a sale is never
 * refused because its stamp could not be made; the batch prepares it later.
 */
export async function stampOnSale(t: EInvoiceTarget, receiptId: string): Promise<EInvoiceState | null> {
  try {
    const rules = studioEInvoiceRules(t.studio);
    const adapter = adapterFor(rules);
    if (!rules || !adapter?.submit || !adapter.submission) return null;
    if (!(await adapter.submission(studioOf(t)))) return null;
    let document: EInvoiceDocument | null = null;
    await leased(t, receiptId, async (found) => {
      const prepared = await prepareFor(t, found.invoice, found.rules, found.state, false, "receipt");
      if (!("error" in prepared)) document = prepared.document;
      return null;
    }, "receipt");
    const doc = document as EInvoiceDocument | null;
    if (!doc) return null;
    return { status: "prepared", adapter: adapter.key, at: new Date().toISOString(), document: doc, ...(doc.qr ? { qr: doc.qr } : {}) } as EInvoiceState;
  } catch {
    return null;
  }
}

/**
 * A BUSINESS INVOICE IS CLEARED BEFORE IT IS ISSUED — the owner's decision A,
 * 03/10/2026: "B2B cleared at issue". ZATCA's clearance is what makes a Saudi
 * standard invoice VALID, so issuing one first and clearing it after would hand
 * a client a document that is not yet an invoice. Called by `editInvoice` on
 * the Draft → Sent move, BEFORE the move is written, with the invoice as it is
 * about to be issued:
 *
 *   null              — nothing to clear: no submitting adapter, the studio is
 *                       not connected (it issues as before and submits itself),
 *                       or this is not a business invoice
 *   { einvoice }      — cleared; the move goes ahead and ZATCA's copy is kept
 *   { error, detail } — refused or not reached; the move is REFUSED and the
 *                       invoice stays a draft, with ZATCA's words
 *
 * A refusal still took a chain link (ZATCA counts every document the unit
 * makes), and the next attempt prepares a new document — the state on the
 * draft says `rejected`, which is what tells `prepareFor` to.
 */
export async function clearBeforeIssue(t: EInvoiceTarget, invoiceId: string, issuing: Record<string, unknown>) {
  const rules = studioEInvoiceRules(t.studio);
  const adapter = adapterFor(rules);
  if (!rules || !adapter?.submit || !adapter.submission || !adapter.clearsAtIssue?.(issuing)) return null;
  if (!(await adapter.submission(studioOf(t)))) return null;
  const key = S.einvoiceLease(t.studio.id, invoiceId);
  if (!(await claim(key, randomUUID(), LEASE_SEC))) return { error: "einvoice-busy" as const };
  try {
    const fresh = (await Invoices.find(cash(t))).find((i) => i.id === invoiceId);
    if (!fresh) return { error: "notfound" as const };
    const invoice = { ...fresh, ...issuing, id: fresh.id, einvoice: fresh.einvoice, status: "Sent" } as EInvoiced;
    const state = einvoiceStatusOf(invoice, rules);
    // BEFORE THE MANDATE: nothing to clear.
    if (state === "not-required") return null;
    if (state === "accepted") return { einvoice: fresh.einvoice };
    const out = await submitFor(t, invoice, rules, state);
    if ("error" in out) return out;
    if (out.outcome === "accepted") return { einvoice: out.einvoice };
    return { error: out.outcome === "rejected" ? "einvoice-not-cleared" as const : "einvoice-unreached" as const, detail: out.message };
  } finally {
    await release(key);
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
  // INVOICES AND THE TILL'S RECEIPTS TOGETHER, in the order they were made —
  // one chain, and its order is the order ZATCA sees.
  const due = (await Promise.all(EINVOICE_KINDS.map(async (kind) => (await rowsOf(t, kind))
    .filter((inv) => dueForBatch(inv, einvoiceStatusOf(inv, rules), when.since))
    .map((inv) => ({ kind, inv })))))
    .flat()
    .sort((a, b) => String(a.inv.issueDate || "").localeCompare(String(b.inv.issueDate || "")) || String(a.inv.createdAt || "").localeCompare(String(b.inv.createdAt || "")));
  let accepted = 0;
  for (const { kind, inv } of due) {
    // READ AGAIN UNDER THE LEASE: the list above may be minutes old by the
    // time the loop reaches this one, and somebody may have submitted it since.
    const out = await leased(t, inv.id, async (found) =>
      dueForBatch(found.invoice, found.state, when.since) ? submitFor(t, found.invoice, found.rules, found.state, kind) : null, kind);
    if (out && "outcome" in out && out.outcome === "accepted") accepted += 1;
  }
  return { submitted: due.length, accepted };
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

/** RENEW THE STUDIO'S ZATCA CERTIFICATE with a fresh OTP — the same unit, the same chain. */
export async function renewZatca(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.settings.edit");
  if (denied) return denied;
  const rules = studioEInvoiceRules(ctx.studio);
  if (rules?.adapter !== "zatca") return { error: "not-required" };
  return renewZatcaUnit({
    studio: ctx.studio as unknown as { id: string; fieldOfWork?: unknown },
    seller: zatcaSeller(ctx.studio as unknown as Parameters<typeof zatcaSeller>[0]),
    otp: body?.otp,
  });
}

/** When the studio's invoices are reported: as each is issued, or nightly. */
export async function setZatcaReporting(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.settings.edit");
  if (denied) return denied;
  return setZatcaTiming(ctx.studio.id, body?.timing);
}
