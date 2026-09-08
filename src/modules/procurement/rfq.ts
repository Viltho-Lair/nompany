// SUPPLIER RFQs — asking several suppliers what it costs, and choosing one.
//
// GUARDED BY `procurement.rfq`, whose `award` verb is an extra on the same area:
// assembling a request and typing in what came back is one job, and naming the
// supplier the money goes to is another.
//
// THE COMPARISON IS IN ./rfqModel, which is pure, so the screen ranks with the
// same function the server does — and refuses to recommend the same quotes.
import { requirePermission } from "@/platform/access";
import { seriesSetting } from "@/modules/administration/numbering";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { makeId } from "@/platform/db/keys";
import { listCollaborators } from "@/platform/auth/collaborators";
import {
  compareQuotes, rfqProblem, rfqEditable, quotesAccepted, rfqLineIsReal,
} from "./rfqModel";
import type { Rfq, RfqLine, SupplierQuote, QuoteLine } from "./rfqSchema";
import type { Requisition } from "./schema";
import type { ProcurementContext } from "./types";

const Rfqs = repo<Rfq>("supplierRfqs");
const Quotes = repo<SupplierQuote>("supplierQuotes");
const Requisitions = repo<Requisition>("requisitions");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => str(v, 10);
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
/** Nought is a price; a blank is a silence. See QuoteLineSchema. */
const priceOrBlank = (v: unknown): number | "" => {
  if (v === undefined || v === null || String(v).trim() === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
};
const now = () => new Date().toISOString();

/**
 * Line ids are minted and never re-derived from position: every quote
 * references a line by id, so inserting a line in the middle must not re-point
 * prices already recorded against the ones after it.
 *
 * THROUGH `makeId`, THE PRODUCT'S OWN MINTER, rather than a second one written
 * here. The hand-rolled version this replaced produced `rl_<8 chars>` — a
 * two-letter prefix and a short suffix, where every other id in the product is
 * three letters and fourteen. That is not cosmetic: the golden normaliser
 * rewrites ids by the pattern `([a-z]{3,4})_[a-z0-9]{10,}`, so ids shaped any
 * other way survive into the recorded response and the golden can never match
 * twice. Four goldens failed on nothing but a fresh timestamp.
 */
const mintLineId = () => makeId("rln");

function cleanLines(raw: unknown, existing: readonly RfqLine[] = []): RfqLine[] {
  const known = new Set(existing.map((l) => l.id));
  return (Array.isArray(raw) ? raw : [])
    .filter(rfqLineIsReal)
    .map((l) => {
      const sent = str((l as RfqLine).id, 40);
      return {
        // AN ID THE CALLER SENT IS HONOURED ONLY IF IT IS ALREADY OURS.
        // Otherwise a crafted body could point a new line at an id some quote
        // has already priced, and inherit that price by collision.
        id: sent && known.has(sent) ? sent : mintLineId(),
        description: str((l as RfqLine).description, 400),
        unit: str((l as RfqLine).unit, 40),
        qty: num((l as RfqLine).qty),
        itemId: str((l as RfqLine).itemId, 60),
      };
    });
}

function cleanQuoteLines(raw: unknown, rfq: Rfq): QuoteLine[] {
  const known = new Set((rfq.lines || []).map((l) => l.id));
  return (Array.isArray(raw) ? raw : [])
    .map((l) => ({
      rfqLineId: str((l as QuoteLine).rfqLineId, 40),
      unitPrice: priceOrBlank((l as QuoteLine).unitPrice),
      leadWeeks: priceOrBlank((l as QuoteLine).leadWeeks),
    }))
    // A PRICE AGAINST A LINE THIS REQUEST DOES NOT HAVE is dropped rather than
    // stored: it would be invisible on every screen and would still be counted
    // by nothing, which is the worst of both.
    .filter((l) => known.has(l.rfqLineId));
}

export async function listRfqs(ctx: ProcurementContext) {
  const denied = requirePermission(ctx.access, "procurement.rfq.view");
  if (denied) return denied;

  const { studio, rfqSection } = ctx;
  const [rows, quotes, people] = await Promise.all([
    Rfqs.find({ studio, section: rfqSection }),
    Quotes.find({ studio, section: rfqSection }),
    listCollaborators(studio.id),
  ]);
  const aliasOf = new Map(
    (people as { id?: unknown; alias?: unknown }[])
      .map((c) => [String(c?.id ?? ""), String(c?.alias ?? "")] as const),
  );

  // WHEN THIS ANSWER WAS TRUE. Expiry is a comparison against an instant and it
  // is this one, so the screen never reads its own clock and the same request
  // cannot disagree with itself about which quotes are live.
  const asOf = now();
  const byRfq = new Map<string, SupplierQuote[]>();
  for (const q of quotes) {
    const list = byRfq.get(q.rfqId) || [];
    list.push(q);
    byRfq.set(q.rfqId, list);
  }

  const rfqs = [...rows]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .map((r) => {
      const mine = byRfq.get(r.id) || [];
      return {
        ...r,
        quotes: mine,
        comparison: compareQuotes(r.lines, mine, asOf.slice(0, 10)),
        createdByAlias: aliasOf.get(String(r.createdByCollaboratorId || "")) || "",
        awardedByAlias: aliasOf.get(String(r.awardedByCollaboratorId || "")) || "",
      };
    });

  return {
    rfqs,
    asOf,
    canCreate: !requirePermission(ctx.access, "procurement.rfq.create"),
    canEdit: !requirePermission(ctx.access, "procurement.rfq.edit"),
    canDelete: !requirePermission(ctx.access, "procurement.rfq.delete"),
    canAward: !requirePermission(ctx.access, "procurement.rfq.award"),
  };
}

export async function createRfq(ctx: ProcurementContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "procurement.rfq.create");
  if (denied) return denied;

  const { studio, rfqSection, requisitionsSection, collaborator } = ctx;
  const title = str(body?.title, 200);
  if (!title) return { error: "title" };

  // RAISED FROM A REQUISITION, WHERE THERE IS ONE, and the lines come across
  // rather than being retyped. This is the join the section was missing: a
  // requisition says what is needed and an RFQ asks what it costs, and making
  // somebody type the list twice is how the two stop matching.
  const requisitionId = str(body?.requisitionId, 60);
  let seeded: RfqLine[] = [];
  let projectId = str(body?.projectId, 60);
  if (requisitionId) {
    const req = await Requisitions.byId({ studio, section: requisitionsSection }, requisitionId);
    if (!req) return { error: "requisition" };
    seeded = cleanLines((req.lines || []).map((l) => ({
      description: l.description, unit: l.unit, qty: l.qty, itemId: l.itemId,
    })));
    projectId = projectId || String(req.projectId || "");
  }

  const lines = Array.isArray(body?.lines) && (body.lines as unknown[]).length
    ? cleanLines(body.lines)
    : seeded;

  const rows = await Rfqs.find({ studio, section: rfqSection });
  const at = now();
  return {
    rfq: await Rfqs.create({ studio, section: rfqSection }, {
      // SRQ, not RFQ — see the note on RfqSchema.reference.
      reference: await nextReference(studio.id, { rows, field: "reference", ...seriesSetting("rfq", studio.numbering) }),
      title,
      requisitionId,
      projectId,
      vendorIds: (Array.isArray(body?.vendorIds) ? body.vendorIds : [])
        .map((v) => str(v, 60)).filter(Boolean),
      lines,
      // BORN A DRAFT: sending is its own verb, because sending is what freezes
      // the line list against the suppliers who are about to quote it.
      status: "Draft",
      dueBy: day(body?.dueBy),
      notes: str(body?.notes, 2000),
      createdByCollaboratorId: collaborator.id,
      createdAt: at,
      updatedAt: at,
    }),
  };
}

export async function editRfq(
  ctx: ProcurementContext, id: string, body: Record<string, unknown>,
) {
  const denied = requirePermission(ctx.access, "procurement.rfq.edit");
  if (denied) return denied;

  const { studio, rfqSection } = ctx;
  const current = await Rfqs.byId({ studio, section: rfqSection }, id);
  if (!current) return { error: "notfound" };

  const patch: Record<string, unknown> = {};
  if (body?.title !== undefined) {
    const v = str(body.title, 200);
    if (!v) return { error: "title" };
    patch.title = v;
  }
  // THE LINE LIST FREEZES WHEN IT GOES OUT. A supplier quoting three lines must
  // not find a fourth appearing afterwards — their quote would silently become
  // an answer to a question nobody asked them.
  if (body?.lines !== undefined) {
    if (!rfqEditable(current)) return { error: "not-draft" };
    patch.lines = cleanLines(body.lines, current.lines || []);
  }
  // WHO IT WENT TO stays editable after sending: a studio that thinks of a
  // fourth supplier on Tuesday should add them, and doing so changes nothing
  // anybody has already quoted against.
  if (body?.vendorIds !== undefined) {
    patch.vendorIds = (Array.isArray(body.vendorIds) ? body.vendorIds : [])
      .map((v) => str(v, 60)).filter(Boolean);
  }
  if (body?.dueBy !== undefined) patch.dueBy = day(body.dueBy);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 2000);
  if (body?.status !== undefined) return { error: "not-awardable" };
  patch.updatedAt = now();

  const rfq = await Rfqs.update({ studio, section: rfqSection }, id, patch);
  return rfq ? { rfq } : { error: "notfound" };
}

/** Send it, or withdraw it. The two moves that are not the award. */
export async function moveRfq(ctx: ProcurementContext, id: string, next: string) {
  const denied = requirePermission(ctx.access, "procurement.rfq.edit");
  if (denied) return denied;

  const { studio, rfqSection, collaborator } = ctx;
  const current = await Rfqs.byId({ studio, section: rfqSection }, id);
  if (!current) return { error: "notfound" };

  const problem = rfqProblem(current, next);
  if (problem) return { error: problem };

  const at = now();
  const patch: Record<string, unknown> = { status: next, updatedAt: at };
  if (next === "Sent") {
    patch.sentByCollaboratorId = collaborator.id;
    patch.sentAt = at;
  }

  const rfq = await Rfqs.update({ studio, section: rfqSection }, id, patch);
  return rfq ? { rfq } : { error: "notfound" };
}

export async function removeRfq(ctx: ProcurementContext, id: string) {
  const denied = requirePermission(ctx.access, "procurement.rfq.delete");
  if (denied) return denied;

  const { studio, rfqSection } = ctx;
  const current = await Rfqs.byId({ studio, section: rfqSection }, id);
  if (!current) return { error: "notfound" };
  // A SENT REQUEST IS A THING SUPPLIERS HAVE IN THEIR HANDS, and an awarded one
  // records a decision. Only a draft nobody has seen goes; everything else is
  // cancelled, which is a state it HAS.
  if (!rfqEditable(current)) return { error: "not-draft" };

  const gone = await Rfqs.remove({ studio, section: rfqSection }, id);
  return gone ? { ok: true } : { error: "notfound" };
}

/**
 * RECORD WHAT A SUPPLIER SAID. One quote per vendor per request — a second
 * submission from the same supplier REPLACES the first rather than sitting
 * beside it, because a comparison listing one vendor twice is a comparison
 * nobody can read.
 */
export async function recordQuote(ctx: ProcurementContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "procurement.rfq.edit");
  if (denied) return denied;

  const { studio, rfqSection, collaborator } = ctx;
  const rfqId = str(body?.rfqId, 60);
  const rfq = await Rfqs.byId({ studio, section: rfqSection }, rfqId);
  if (!rfq) return { error: "notfound" };
  // A DRAFT HAS BEEN SENT TO NOBODY, so a quote against it came from nowhere;
  // an awarded one has been decided, and a price arriving afterwards cannot
  // change a decision already recorded without erasing what it was made on.
  if (!quotesAccepted(rfq)) return { error: "not-sent" };

  const vendorId = str(body?.vendorId, 60);
  if (!vendorId) return { error: "vendor" };

  const at = now();
  const fields = {
    rfqId,
    vendorId,
    lines: cleanQuoteLines(body?.lines, rfq),
    leadWeeks: priceOrBlank(body?.leadWeeks),
    validUntil: day(body?.validUntil),
    notes: str(body?.notes, 2000),
    // WHEN IT ARRIVED, not when somebody got round to typing it in. Expiry is
    // judged against the studio's clock either way, but a quote recorded a week
    // late should not read as a week fresher than it is.
    receivedAt: day(body?.receivedAt) || at.slice(0, 10),
    recordedByCollaboratorId: collaborator.id,
    updatedAt: at,
  };

  const existing = (await Quotes.find({ studio, section: rfqSection }, { where: { rfqId } }))
    .find((q) => q.vendorId === vendorId);
  if (existing) {
    const updated = await Quotes.update({ studio, section: rfqSection }, existing.id, fields);
    return updated ? { quote: updated, replaced: true } : { error: "notfound" };
  }
  return {
    quote: await Quotes.create({ studio, section: rfqSection }, { ...fields, createdAt: at }),
    replaced: false,
  };
}

/**
 * CHOOSE A SUPPLIER.
 *
 * ITS OWN VERB AND ITS OWN RIGHT, never a status assignment: the award names a
 * quote, and a status edit reaching `Awarded` would record a decision with
 * nothing decided. `rfqProblem` refuses that move by name.
 *
 * THE REASON IS ASKED FOR WHEN THE CHOICE IS NOT THE CHEAPEST, and stored
 * either way. That is the whole audit value of this record: a studio that
 * bought on lead time or on a relationship had a reason, and six months later
 * the reason is the only thing anybody can check the decision against.
 */
export async function awardRfq(ctx: ProcurementContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "procurement.rfq.award");
  if (denied) return denied;

  const { studio, rfqSection, collaborator } = ctx;
  const rfq = await Rfqs.byId({ studio, section: rfqSection }, id);
  if (!rfq) return { error: "notfound" };
  // NOTHING TO AWARD UNTIL IT HAS GONE OUT, and nothing to award twice.
  if (String(rfq.status || "Draft") !== "Sent") return { error: "not-sent" };

  const quoteId = str(body?.quoteId, 60);
  if (!quoteId) return { error: "quote" };

  const quotes = await Quotes.find({ studio, section: rfqSection }, { where: { rfqId: id } });
  const chosen = quotes.find((q) => q.id === quoteId);
  if (!chosen) return { error: "quote" };

  const at = now();
  const comparison = compareQuotes(rfq.lines, quotes, at.slice(0, 10));
  const summary = comparison.quotes.find((q) => q.id === quoteId);

  // A PART-PRICED QUOTE IS NOT AN OFFER and cannot be awarded. Its total is a
  // number and it is not what that supplier said the job costs; awarding it
  // commits the studio to a figure that is going to change. The same rule a
  // part-priced bill of quantities refuses a signature on.
  if (!summary?.complete) return { error: "quote-incomplete" };
  // AND A LAPSED PRICE IS NOT ONE ANYBODY IS HOLDING.
  if (summary.expired) return { error: "quote-expired" };

  const reason = str(body?.reason, 1000);
  // THE REASON IS REQUIRED ONLY WHERE THE CHOICE NEEDS ONE. Awarding the
  // cheapest comparable quote explains itself; awarding anything else is the
  // decision somebody will ask about, so it must say why at the moment it is
  // made rather than being reconstructed later.
  if (comparison.cheapestId && quoteId !== comparison.cheapestId && !reason) {
    return { error: "reason-required" };
  }

  const updated = await Rfqs.update({ studio, section: rfqSection }, id, {
    status: "Awarded",
    awardedQuoteId: quoteId,
    awardedByCollaboratorId: collaborator.id,
    awardedAt: at,
    awardReason: reason,
    updatedAt: at,
  });
  return updated ? { rfq: updated, quote: chosen } : { error: "notfound" };
}
