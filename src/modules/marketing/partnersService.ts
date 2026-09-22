// PARTNERS, PR AND INFLUENCERS — the register, and what each of them brought.
//
// THE RULES ARE ./partners, which is pure, so the screen refuses exactly what
// the server refuses.
//
// THE FIGURES ARE COUNTED, NEVER TYPED IN. A partner owns the `utm_source` on
// the links they publish; a form records the tag it was arrived with
// (./arrival); the reply carries the Sales ticket it became. So the chain from
// "their newsletter" to "a won deal" is read end to end, and nobody has to
// maintain a spreadsheet beside it.
//
// AND IT READS FORM REPLIES WITHOUT EVER SHOWING ONE. What leaves this file is
// counts and money — the partner's own facts, the way an event's turnout is the
// event's — never a name, an address or an answer. Those are sealed and belong
// to `marketing.forms.view`.
import { requirePermission, type PermissionKey } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { isWon } from "@/modules/sales/pipeline";
import { quotedTotalFor, ticketValue } from "@/modules/sales/sales";
import type { SalesTicket } from "@/modules/sales/schema";
import type { Quotation } from "@/modules/technical/types";
import {
  PARTNER_KINDS, isPartnerKind, partnerProblem, partnerSource, sourceTaken,
  partnerResults, unclaimedSources, type ArrivalRow, type TicketOutcome,
} from "./partners";
import type { MarketingPartner, FormResponse } from "./schema";
import type { MarketingContext } from "./types";

const Partners = repo<MarketingPartner>("marketingPartners");
const Responses = repo<FormResponse>("marketingFormResponses");
const Tickets = repo<SalesTicket>("salesTickets");
const QuotationRows = repo<Quotation>("quotations");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();
const scope = (ctx: MarketingContext) => ({ studio: ctx.studio, section: ctx.partnersSection });
const may = (ctx: MarketingContext, key: PermissionKey) => !requirePermission(ctx.access, key);

type Person = { id: string; alias?: string };

function partnerFields(body: Record<string, unknown>) {
  const out: Partial<MarketingPartner> = {};
  const has = (k: string) => body?.[k] !== undefined;
  if (has("name")) out.name = str(body.name, 200);
  // AN UNKNOWN KIND IS KEPT so the rule can refuse it — the coercion must not
  // answer the question the rule asks, which is what let an unrecognised asset
  // kind through earlier today.
  if (has("kind")) out.kind = isPartnerKind(body.kind) ? String(body.kind) : str(body.kind, 20);
  if (has("source")) out.source = partnerSource(body.source);
  if (has("contactName")) out.contactName = str(body.contactName, 200);
  if (has("email")) out.email = str(body.email, 200);
  if (has("phone")) out.phone = str(body.phone, 60);
  if (has("website")) out.website = str(body.website, 500);
  if (has("terms")) out.terms = str(body.terms, 4000);
  if (has("notes")) out.notes = str(body.notes, 4000);
  if (has("active")) out.active = Boolean(body.active);
  if (has("ownerCollaboratorId")) out.ownerCollaboratorId = str(body.ownerCollaboratorId, 60);
  return out;
}

/**
 * EVERY FORM REPLY THAT SAID WHERE IT CAME FROM, reduced to the two fields a
 * partner's figures need.
 *
 * ONLY THE SOURCE AND THE TICKET LEAVE THE READ. The answers themselves are
 * sealed and are none of this section's business; taking two fields off each
 * row here is what lets the counts be honest without the register ever holding
 * a stranger's details.
 */
async function arrivalsFor(ctx: MarketingContext): Promise<ArrivalRow[]> {
  if (!ctx.formsSection || !ctx.on("marketing-forms")) return [];
  const rows = await Responses.find({ studio: ctx.studio, section: ctx.formsSection });
  return rows
    .filter((r) => String(r.arrival?.source || ""))
    .map((r) => ({ source: String(r.arrival?.source || ""), ticketId: String(r.ticketId || "") }));
}

/** Which of those leads were won, and for how much — Sales' own figures. */
async function outcomesFor(ctx: MarketingContext): Promise<Map<string, TicketOutcome>> {
  if (!ctx.ticketsSection) return new Map();
  const [tickets, quotations] = await Promise.all([
    Tickets.find({ studio: ctx.studio, section: ctx.ticketsSection }),
    ctx.quotationsSection
      ? QuotationRows.find({ studio: ctx.studio, section: ctx.quotationsSection })
      : Promise.resolve([] as Quotation[]),
  ]);
  return new Map(tickets.map((t) => [
    t.id,
    { won: isWon(t.status), value: ticketValue(t, quotedTotalFor(t.id, quotations)) },
  ]));
}

/**
 * THE REGISTER: active partners first, then by what they brought.
 *
 * SORTED BY LEADS RATHER THAN BY NAME, because the question somebody opens this
 * screen with is which of these arrangements is worth renewing. A partner with
 * no tag has no figures at all and sorts last — it cannot be judged, which is
 * the screen's own point.
 */
export async function listPartners(ctx: MarketingContext) {
  const denied = requirePermission(ctx.access, "marketing.partners.view");
  if (denied) return denied;

  const [partners, team, arrivals, outcomes] = await Promise.all([
    Partners.find(scope(ctx)),
    listCollaborators(ctx.studio.id) as Promise<Person[]>,
    arrivalsFor(ctx),
    outcomesFor(ctx),
  ]);
  const aliasOf = new Map(team.map((p) => [String(p.id), p.alias || ""]));

  const rows = partners.map((p) => ({
    ...p,
    ownerAlias: aliasOf.get(p.ownerCollaboratorId) || "",
    // NULL WHEN THERE IS NO TAG: "nobody has given this partner a link" and
    // "this partner's links brought nobody" are different facts, and only one
    // of them is the partner's doing.
    results: partnerResults(p.source, arrivals, outcomes),
  })).sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (b.results?.leads ?? -1) - (a.results?.leads ?? -1) || a.name.localeCompare(b.name);
  });

  return {
    partners: rows,
    kinds: PARTNER_KINDS,
    currency: String(ctx.studio.currency || ""),
    people: team,
    // THE TAGS ARRIVING THAT NOBODY CLAIMS — frequently the most interesting
    // row on the screen, because it is the partner nobody realised they had.
    unclaimed: unclaimedSources(arrivals, partners),
    // WHAT COULD NOT BE READ, so a count of nought is never mistaken for one.
    sources: {
      forms: Boolean(ctx.formsSection) && ctx.on("marketing-forms"),
      sales: Boolean(ctx.ticketsSection),
    },
    canCreate: may(ctx, "marketing.partners.create"),
    canEdit: may(ctx, "marketing.partners.edit"),
    canDelete: may(ctx, "marketing.partners.delete"),
  };
}

async function shapeProblem(ctx: MarketingContext, next: Partial<MarketingPartner>, selfId = "") {
  const problem = partnerProblem(next);
  if (problem) return problem;
  if (next.ownerCollaboratorId
    && !(await listCollaborators(ctx.studio.id) as Person[]).some((p) => String(p.id) === next.ownerCollaboratorId)) {
    return "owner";
  }
  // TWO PARTNERS MAY NOT CLAIM ONE TAG. Refused here rather than resolved on
  // the read: there is no honest way to split an arrival between two claimants,
  // and the studio would see its own numbers doubled with nothing saying why.
  if (next.source) {
    const all = await Partners.find(scope(ctx));
    if (sourceTaken(next.source, all, selfId)) return "source-taken";
  }
  return "";
}

export async function createPartner(ctx: MarketingContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.partners.create");
  if (denied) return denied;
  const fields = partnerFields(body || {});
  const next = { name: "", kind: "partner", source: "", ...fields };
  const problem = await shapeProblem(ctx, next);
  if (problem) return { error: problem };

  const at = now();
  const partner = await Partners.create(scope(ctx), {
    contactName: "",
    email: "",
    phone: "",
    website: "",
    terms: "",
    notes: "",
    active: true,
    ownerCollaboratorId: ctx.collaborator.id,
    ...next,
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: at,
    updatedAt: at,
  });
  return { partner };
}

export async function editPartner(ctx: MarketingContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.partners.edit");
  if (denied) return denied;
  const current = await Partners.byId(scope(ctx), id);
  if (!current) return { error: "notfound" };
  const patch = partnerFields(body || {});
  const problem = await shapeProblem(ctx, { ...current, ...patch }, id);
  if (problem) return { error: problem };
  const partner = await Partners.update(scope(ctx), id, (row) => ({ ...row, ...patch, updatedAt: now() }));
  return partner ? { partner } : { error: "notfound" };
}

/**
 * DELETING. A partner that brought ANYTHING is kept: the arrivals carrying
 * their tag are the record of what the arrangement was worth, and deleting the
 * row is how a studio loses the ability to say why those leads arrived. Ending
 * the arrangement is what `active` is for.
 */
export async function deletePartner(ctx: MarketingContext, id: string) {
  const denied = requirePermission(ctx.access, "marketing.partners.delete");
  if (denied) return denied;
  const partner = await Partners.byId(scope(ctx), id);
  if (!partner) return { error: "notfound" };
  if (partner.source) {
    const brought = partnerResults(partner.source, await arrivalsFor(ctx), new Map());
    if ((brought?.arrivals ?? 0) > 0) return { error: "partner-brought" };
  }
  await Partners.remove(scope(ctx), id);
  return { ok: true };
}
