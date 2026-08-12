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
    canManage: sales.canManage,
    canManageSettings: sales.canManageSettings,
    nav: sales.nav,
    clients, tickets, people, services,
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
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json(result);
}
