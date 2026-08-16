import { currentUser } from "@/lib/identity";
import {
  salesContext, listClients, listTickets, assignablePeople, saveSalesSettings, listServices,
  TICKET_STATUSES, TICKET_URGENCIES, TICKET_INDUSTRIES, TICKET_LIVE_COLUMNS,
} from "@/lib/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Sales screen: clients, tickets, the people who can be
// assigned work, the vocabulary, and whether this person may change anything.
export async function GET(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const sales = await salesContext(user, slug);
  if (sales.error) {
    const status = sales.error === "notfound" || sales.error === "no-section" ? 404 : 403;
    return Response.json({ error: sales.error }, { status });
  }

  const [clients, tickets, people, services] = await Promise.all([
    listClients(sales), listTickets(sales), assignablePeople(sales), listServices(sales),
  ]);
  return Response.json({
    // ONE FLAG PER SUB-SECTION. Tickets, Clients and Settings are separate
    // sections with separate grants, so the screens must be told separately —
    // sending only the parent's answer is what made a sub-section grant look
    // like it did nothing.
    canManage: sales.canManage,
    canManageTickets: sales.canManageTickets,
    canManageClients: sales.canManageClients,
    canManageSettings: sales.canManageSettings,
    nav: sales.nav,
    // Manage per section key, so each screen can ask about itself rather
    // than being handed the parent section's answer.
    manage: sales.manage,
    // Whether there is a Technical section to send an RFQ to at all. Without
    // one the tickets list drops the RFQ column rather than offering a button
    // that could only ever fail.
    hasTechnical: Boolean(sales.rfqSection),
    // Whether there is a Tasks section to send an approval to. Without one the
    // ticket drops "Send for Approval" rather than offering a button that could
    // only ever fail — the same rule the RFQ column follows.
    hasTasks: Boolean(sales.tasksSection),
    clients, tickets, people, services,
    // Where the studio itself is. A new ticket starts here and the person
    // raising it can change either, which is why these are defaults rather
    // than the answer.
    studioDefaults: {
      country: sales.studio.country || "", city: sales.studio.city || "",
      // Money on a ticket is the studio's money, so its symbol comes from
      // the studio rather than being guessed per amount.
      currency: sales.studio.currency || "",
    },
    // Which columns the Live view shows, and everything it could show.
    liveColumns: sales.liveColumns,
    salesCities: sales.salesCities,
    salesContactPositions: sales.salesContactPositions,
    vocabulary: {
      statuses: TICKET_STATUSES, urgencies: TICKET_URGENCIES, industries: TICKET_INDUSTRIES,
      liveColumnOptions: TICKET_LIVE_COLUMNS,
    },
  });
}

// Sales Settings — currently the Live view's column selection.
export async function PUT(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const sales = await salesContext(user, slug);
  if (sales.error) {
    const status = sales.error === "notfound" || sales.error === "no-section" ? 404 : 403;
    return Response.json({ error: sales.error }, { status });
  }
  if (!sales.canManageSettings) return Response.json({ error: "read-only" }, { status: 403 });

  const result = await saveSalesSettings(sales, await request.json().catch(() => ({})));
  if (result.error) {
    // A refusal is not a malformed request. 403 so a client can tell "you may
    // not" from "you sent nonsense" — they need different handling.
    const status = result.error === "forbidden" ? 403 : result.error === "unknown-permission" ? 500 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json(result);
}
