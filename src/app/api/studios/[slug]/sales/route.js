import { currentUser } from "@/lib/identity";
import {
  salesContext, listClients, listTickets, assignablePeople,
  TICKET_STATUSES, TICKET_URGENCIES, TICKET_INDUSTRIES,
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

  const [clients, tickets, people] = await Promise.all([
    listClients(sales), listTickets(sales), assignablePeople(sales),
  ]);
  return Response.json({
    canManage: sales.canManage,
    clients, tickets, people,
    vocabulary: { statuses: TICKET_STATUSES, urgencies: TICKET_URGENCIES, industries: TICKET_INDUSTRIES },
  });
}
