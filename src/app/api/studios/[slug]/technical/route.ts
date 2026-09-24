import { refused, route, subscriptionRefusal } from "@/platform/http/route";
import { sectionOffRefusal } from "@/platform/http/sectionRoutes";
import { valuesFor } from "@/modules/administration/taxonomy";
import { nextNumberForSequence } from "@/modules/technical/technical";
import { currentUser } from "@/platform/auth/identity";
import {
  technicalContext, listRfqs, listQuotations, openTickets, technicalPeople, technicalClients, catalogueItems,
  RFQ_STATUSES, QUOTATION_STATUSES, QUOTATION_LIVE_COLUMNS, saveTechnicalSettings,
} from "@/modules/technical/technical";
import { TICKET_URGENCIES, TICKET_INDUSTRIES } from "@/modules/sales/tickets";

import { can } from "@/platform/access";
import { studioVatRate } from "@/shared/vat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Technical screen.
//
// ON THE ROUTE WRAPPER NOW, and the reason is the studio page: it answers this
// GET inside its own render (`firstPayload`), so the Quotations screens paint
// with their lists instead of mounting empty and asking. The refusals are the
// ones this wrote by hand — `technicalContext` can only answer `notfound` and
// `no-section` (404) or `forbidden` (403), which is the status table's
// reading too — and the switched-off check it asked of `sectionOffRefusal` is
// the wrapper's own, run before the handler. PUT below still predates it.
export const GET = route({ auth: "studio", context: technicalContext, name: "technical", keys: false }, async ({ request, ...tech }) => {
  // WHOSE PRICES. A quotation is written FOR somebody, and what that customer
  // has been promised beats the studio's list price (shared/pricing.ts). The
  // screen lists the catalogue once with no customer in mind; a builder opened
  // on a real quotation asks again with that quotation's client, and the extra
  // read happens only then.
  //
  // The rate table itself never comes back — only the resolved price and a
  // token saying where it came from. Reading what THIS line costs is inherent
  // to quoting it; the rest of the relationship's pricing is not, and this
  // route is reached on Technical's grant rather than on Sales'.
  const clientId = new URL(request.url).searchParams.get("clientId") || "";

  // A LIST NO SCREEN THAT IS ON CAN SHOW IS NOT SENT. RFQs belong to the RFQ
  // desk; quotations to the register, the Live view and the dashboard. The
  // quotations are still READ while the RFQ desk is on, because converting an
  // RFQ numbers a new quotation from them — but they are not sent unless a
  // screen that lists them is on.
  //
  // AND NOT TO SOMEBODY WHOSE RIGHTS OPEN NONE OF THEM (24/09/2026). "Is the
  // screen on" was asked of the STUDIO, so a member holding only the Settings
  // right received every RFQ and every quotation in this payload. Each list now
  // also needs a right that shows it: its own screen's, or the dashboard's,
  // whose figures are drawn from them in the browser.
  const dash = can(tech.access, "engineeringDocs.dashboard.view");
  const rfqsOn = tech.on("quotations-rfq")
    && (can(tech.access, "engineeringDocs.rfq.view") || dash);
  const quotationsShown = (tech.on("quotations-register") || tech.on("quotations-live"))
    && (can(tech.access, "crmSales.quotations.view") || can(tech.access, "engineeringDocs.live.view") || dash);
  const [rfqs, allQuotations, tickets, people, catalogue, clients] = await Promise.all([
    rfqsOn ? listRfqs(tech) : Promise.resolve([]),
    // READ whenever a screen that numbers from them is on — the numbering
    // preview and the desk need them server-side — and SENT only as gated below.
    tech.on("quotations-register") || tech.on("quotations-live") || tech.on("quotations-rfq")
      ? listQuotations(tech) : Promise.resolve([]),
    // The tickets the Raise dialog offers, to whoever may raise and nobody else.
    can(tech.access, "engineeringDocs.rfq.create") ? openTickets(tech) : Promise.resolve([]),
    technicalPeople(tech), catalogueItems(tech, clientId),
    // The Sales clients, for the internal-quotation picker — folded into this
    // same wave rather than read after, so the screen still costs one round of
    // waiting regardless of how many lists it now shows.
    technicalClients(tech),
  ]);
  const quotations = quotationsShown ? allQuotations : [];
  return {
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
    canUnlockQuotations: can(tech.access, "crmSales.quotations.unlock"),
    // Handing a quotation to somebody else is its own power too (24/09/2026):
    // the handler pickers and the register's Assign ask for it.
    canAssignQuotations: can(tech.access, "crmSales.quotations.assign"),
    // ONE FLAG PER BUTTON, each the exact right the server asks for (the owner,
    // 24/09/2026). The desk and the register drew their buttons from canManage
    // (any create, edit or delete) and from CRM & Sales' manage, so people were
    // offered what they would be refused, and refused what they held. Every one
    // of these is a Quotations right on the Access screen.
    canRaiseRfq: can(tech.access, "engineeringDocs.rfq.create"),
    canEditRfq: can(tech.access, "engineeringDocs.rfq.edit"),
    canConvertRfq: can(tech.access, "engineeringDocs.rfq.convert"),
    canCreateQuotations: can(tech.access, "crmSales.quotations.create"),
    canEditQuotations: can(tech.access, "crmSales.quotations.edit"),
    canLockQuotations: can(tech.access, "crmSales.quotations.lock"),
    canCloseQuotations: can(tech.access, "crmSales.quotations.close"),
    canManageSettings: tech.canManageSettings,
    liveColumns: tech.liveColumns,
    // RAISING FROM THE DESK IS A QUOTATIONS RIGHT NOW (24/09/2026): the RFQs
    // "Create" right, with no CRM & Sales grant beside it. Kept under this name
    // because the screen reads it; it says the same thing as canRaiseRfq.
    canRequestRfq: can(tech.access, "engineeringDocs.rfq.create"),
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
    // WHETHER A QUOTATION CARRIES VAT AT ALL — the builder draws no VAT row for
    // a studio with no rate (shared/vat). The rate itself is on each quotation.
    vatEnabled: studioVatRate(tech.studio) !== null,
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
      // START IS SENT AS ITSELF (24/09/2026). Settings used to fill its Start
      // box from `nextNumber` — a reference such as "Q-0005", which a number
      // box cannot show — so every save wrote Start back as 1.
      id: seq.id, label: seq.label, prefix: seq.prefix, validDays: seq.validDays, start: seq.start,
      nextNumber: nextNumberForSequence(allQuotations, seq),
    })),
    // Which sequence a Sales-ticket conversion numbers against by default.
    defaultSequenceId: tech.defaultSequenceId,
    vocabulary: { rfqStatuses: RFQ_STATUSES, quotationStatuses: QUOTATION_STATUSES,
      // Urgency is Sales' field, carried here read-only — the Technical screens
      // filter by it, so they need the same list Sales uses.
      urgencies: TICKET_URGENCIES,
      // Same reuse for the internal-quotation form's Industry field: Sales
      // already owns this vocabulary for its tickets, and a ticket's industry
      // is carried onto Technical's rows read-only, so the create form has to
      // offer exactly the values a converted quotation could ever show.
      // WHAT THIS STUDIO ADMITS, not what the product ships.
      industries: valuesFor("clientIndustries", tech.studio.taxonomies),
      // The Sales clients this studio has, for the same form's client picker —
      // an id and a name, nothing else. See technicalClients.
      clients,
      liveColumnOptions: QUOTATION_LIVE_COLUMNS },
  };
});

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
  // A PART THE STUDIO SWITCHED OFF DOES NOT ANSWER — the same table `route()`
  // uses, asked by hand because this route predates the wrapper.
  {
    const off = sectionOffRefusal(request, tech.sections);
    if (off) return off;
  }
  // THE SUBSCRIPTION'S ANSWER, the same one the route wrapper gives (24/09/2026).
  {
    const lapsed = await subscriptionRefusal(tech, request);
    if (lapsed) return lapsed;
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
