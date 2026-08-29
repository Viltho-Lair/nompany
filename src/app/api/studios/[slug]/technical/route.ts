import { refused } from "@/platform/http/route";
import { nextNumberForSequence } from "@/modules/technical/technical";
import { currentUser } from "@/platform/auth/identity";
import {
  technicalContext, listRfqs, listQuotations, openTickets, technicalPeople, technicalClients, catalogueItems,
  RFQ_STATUSES, QUOTATION_STATUSES, DEFAULT_VAT_RATE, QUOTATION_LIVE_COLUMNS, saveTechnicalSettings,
} from "@/modules/technical/technical";
import { TICKET_URGENCIES, TICKET_INDUSTRIES } from "@/modules/sales/tickets";

import { can } from "@/platform/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Technical screen.
export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const tech = await technicalContext(user, slug);
  if (tech.error) {
    const status = tech.error === "notfound" || tech.error === "no-section" ? 404 : 403;
    return Response.json({ error: tech.error }, { status });
  }

  const [rfqs, quotations, tickets, people, catalogue, clients] = await Promise.all([
    listRfqs(tech), listQuotations(tech), openTickets(tech), technicalPeople(tech), catalogueItems(tech),
    // The Sales clients, for the internal-quotation picker — folded into this
    // same wave rather than read after, so the screen still costs one round of
    // waiting regardless of how many lists it now shows.
    technicalClients(tech),
  ]);
  return Response.json({
    // One flag per sub-section: RFQ and Quotations are separately granted, so
    // they are separately answered.
    canManage: tech.canManage,
    // Whether the module's OWN screen may be opened. The dashboard summarises
    // everything underneath it, so it is withheld on a right of its own.
    canViewDashboard: tech.canViewDashboard,
    canManageRfq: tech.canManageRfq,
    canManageQuotations: tech.canManageQuotations,
    // Reopening a locked document is its own power, so the button asks for
    // it rather than riding in on Manage.
    canUnlockQuotations: can(tech.access, "technical.quotations.unlock"),
    canManageSettings: tech.canManageSettings,
    liveColumns: tech.liveColumns,
    // Raising an RFQ is a Sales action, so the button depends on a different grant.
    canRequestRfq: tech.canManageSales,
    nav: tech.nav,
    // Manage per section key, so each screen can ask about itself rather
    // than being handed the parent section's answer.
    manage: tech.manage,
    rfqs, quotations, openTickets: tickets, people,
    // Registered Items, for the builder's line picker.
    catalogue,
    // What this studio prices in. The builder shows it beside every figure, so
    // nobody has to remember which money a number is in.
    currency: tech.studio?.currency || "",
    // Where the studio itself is. A site on a new quotation starts here and
    // whoever raises it can change either — defaults, not the answer, exactly
    // as the Sales payload serves them. Read off the studio record this route
    // already holds, so it costs no extra round trip.
    studioDefaults: {
      country: tech.studio?.country || "", city: tech.studio?.city || "",
    },
    // EVERY SEQUENCE THE STUDIO NUMBERS QUOTATIONS UNDER, each with the number
    // the NEXT quotation raised against it will carry — so a create screen can
    // show one instead of asking for one. Advisory only: the number is issued
    // again on save, because another create may land between this page loading
    // and that click. Replaces the single `nextQuotationNumber` field now that
    // a studio can number more than one kind of quotation.
    sequences: tech.sequences.map((seq) => ({
      id: seq.id, label: seq.label, prefix: seq.prefix,
      nextNumber: nextNumberForSequence(quotations, seq),
    })),
    // Which sequence a Sales-ticket conversion numbers against by default.
    defaultSequenceId: tech.defaultSequenceId,
    vocabulary: { rfqStatuses: RFQ_STATUSES, quotationStatuses: QUOTATION_STATUSES, defaultVatRate: DEFAULT_VAT_RATE,
      // Urgency is Sales' field, carried here read-only — the Technical screens
      // filter by it, so they need the same list Sales uses.
      urgencies: TICKET_URGENCIES,
      // Same reuse for the internal-quotation form's Industry field: Sales
      // already owns this vocabulary for its tickets, and a ticket's industry
      // is carried onto Technical's rows read-only, so the create form has to
      // offer exactly the values a converted quotation could ever show.
      industries: TICKET_INDUSTRIES,
      // The Sales clients this studio has, for the same form's client picker —
      // an id and a name, nothing else. See technicalClients.
      clients,
      liveColumnOptions: QUOTATION_LIVE_COLUMNS },
  });
}

// Technical Settings — Live view columns and the quotation numbering sequences.
export async function PUT(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const tech = await technicalContext(user, slug);
  if (tech.error) {
    const status = tech.error === "notfound" || tech.error === "no-section" ? 404 : 403;
    return Response.json({ error: tech.error }, { status });
  }
  if (!tech.canManageSettings) return Response.json({ error: "read-only" }, { status: 403 });

  const result = await saveTechnicalSettings(tech, await request.json().catch(() => ({})));
  if (refused(result)) {
    // A refusal is not a malformed request. 403 so a client can tell "you may
    // not" from "you sent nonsense" — they need different handling.
    const status = result.error === "forbidden" ? 403 : result.error === "unknown-permission" ? 500 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json(result);
}
