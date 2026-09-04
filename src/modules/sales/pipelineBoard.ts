// THE BOARD'S READ — the deals a studio still has open, arranged as a funnel.
//
// SPLIT FROM ./pipeline ON PURPOSE, and the split is the same one platform/db
// makes by having no barrel. ./pipeline is pure vocabulary and arithmetic with
// no server import at all, so the board can import it and validate a move with
// the very function the server refuses it with. This file reads Postgres, so
// nothing in a browser may touch it — keeping them apart is what stops one
// import pulling a database client into a client component.
//
// TWO READS, NOT SIX. `listTickets` reads tickets, clients, RFQs, quotations,
// tasks and projects, because a ticket ROW has to report what happened to it
// downstream. A funnel does not: which stage a deal is in, what it is worth and
// how likely it is are all on the ticket itself, and the client's name is the
// one thing that is not. Hop counts are part of the contract, so this asks for
// what it draws and no more.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import {
  BOARD_COLUMNS, CLOSED_STAGES, stageDef, isWon,
  weightedValue, enteredStageAt, daysSince,
} from "./pipeline";
import type { SalesContext, Client } from "./types";
import type { SalesTicket } from "./schema";

const Tickets = repo<SalesTicket>("salesTickets");
const Clients = repo<Client>("salesClients");

export type PipelineDeal = {
  id: string;
  ref: string;
  title: string;
  clientName: string;
  status: string;
  value: number;
  probability: number;
  weighted: number;
  deadline: string;
  /** Whole days this deal has been sitting in the stage it is in. */
  days: number;
  /**
   * Whether a quotation exists on this deal — sent so the BOARD can grey out
   * the moves the server would refuse, using the same stageProblem the route
   * refuses with rather than a second opinion about which stages need one.
   */
  hasQuotation: boolean;
};

export type PipelineColumn = {
  status: string;
  kind: string;
  deals: PipelineDeal[];
  count: number;
  value: number;
  /** Null for a paused column — see the note on weighting below. */
  weighted: number | null;
};

export async function listPipeline(ctx: SalesContext) {
  const denied = requirePermission(ctx.access, "crmSales.pipeline.view");
  if (denied) return denied;

  const { studio, ticketsSection, clientsSection } = ctx;
  const [tickets, clients] = await Promise.all([
    Tickets.find({ studio, section: ticketsSection }),
    Clients.find({ studio, section: clientsSection }),
  ]);
  const nameById = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const nowMs = Date.now();

  const toDeal = (t: SalesTicket): PipelineDeal => {
    const value = Number(t.value) > 0 ? Number(t.value) : 0;
    const probability = Number(t.probability) || 0;
    return {
      id: t.id,
      ref: t.ref || "",
      title: t.title || "",
      clientName: nameById[t.clientId] || t.clientName || "",
      status: t.status || "",
      value,
      probability,
      weighted: weightedValue(value, probability),
      deadline: t.deadline || "",
      days: daysSince(enteredStageAt(t), nowMs),
      hasQuotation: !!t.quotationId,
    };
  };

  const columns: PipelineColumn[] = BOARD_COLUMNS.map((status) => {
    const deals = tickets
      .filter((t) => t.status === status)
      .map(toDeal)
      // OLDEST FIRST, and that is the point of the column rather than a default.
      // A board sorted newest-first buries the deal that has been stuck for
      // ninety days under the one raised this morning, which is precisely the
      // deal a pipeline review exists to find.
      .sort((a, b) => b.days - a.days);
    const kind = stageDef(status)?.kind || "open";
    return {
      status,
      kind,
      deals,
      count: deals.length,
      value: deals.reduce((s, d) => s + d.value, 0),
      // A PAUSED COLUMN IS NOT FORECAST, so it reports null rather than zero.
      // Zero would read as "these deals are worth nothing", which is a
      // different and false claim — a held deal is worth exactly what it was
      // worth, at a probability nobody has revisited since it stalled. Null
      // says the number is deliberately not being offered.
      weighted: kind === "paused" ? null : deals.reduce((s, d) => s + d.weighted, 0),
    };
  });

  const closed = CLOSED_STAGES.map((status) => {
    const rows = tickets.filter((t) => t.status === status);
    return {
      status,
      count: rows.length,
      value: rows.reduce((s, t) => s + (Number(t.value) > 0 ? Number(t.value) : 0), 0),
    };
  });

  // WIN RATE OVER DECIDED DEALS ONLY. Counting open deals in the denominator
  // would make a studio's win rate fall every time it raised a lead, which is
  // the opposite of what the number is for.
  const decided = closed.reduce((s, c) => s + c.count, 0);
  const won = closed.filter((c) => isWon(c.status)).reduce((s, c) => s + c.count, 0);

  return {
    columns,
    closed,
    // Null rather than zero when nothing has closed yet: a studio with no
    // decided deals has no win rate, and "0%" would be a verdict on it.
    winRate: decided > 0 ? Math.round((won / decided) * 100) : null,
    openValue: columns.filter((c) => c.kind === "open").reduce((s, c) => s + c.value, 0),
    weightedValue: columns.reduce((s, c) => s + (c.weighted || 0), 0),
  };
}
