// PURE clustering for the engagement backfill (spec §5.4). Walks each existing
// ticket→rfq/quotation/project chain and the project's children into one
// engagement descriptor. No Redis: a CLI (Task 3) turns these into keys.
import { deterministicEngId } from "../db/keys";

export type EngagementDescriptor = {
  engId: string; ref: string;
  context: Record<string, unknown>;
  singletons: { ticket: string | null; approvedQuotation: string | null; project: string | null };
  members: Record<string, string[]>;
};

const byField = (rows: Record<string, unknown>[], field: string, val: unknown) =>
  rows.filter((r) => r[field] === val);

export function buildEngagements(c: Record<string, Record<string, unknown>[]>): EngagementDescriptor[] {
  const tickets = c.salesTickets || [];
  const clients = c.salesClients || [];
  const clientById = new Map(clients.map((x) => [x.id as string, x]));
  const out: EngagementDescriptor[] = [];

  // Member keys are the SINGULAR registry type (STAGE_REGISTRY / attachRecord's
  // vocabulary), not the plural collection name — a future Phase-1b
  // attachRecord("invoice", …) must land in the SAME ZSET this backfill wrote,
  // or the two paths silently split one record type into two sets and
  // readEngagementView misses whichever one it isn't reading. The second tuple
  // element is only the source array to read; it stays plural because that is
  // the actual collection name in `c`.
  const memberTypes: [string, string][] = [
    ["invoice", "invoices"], ["expense", "expenses"], ["order", "materialOrders"],
    ["delivery", "deliveries"], ["shipment", "awbShipments"], ["task", "tasks"],
    ["overtime", "overtimes"], ["sheet", "projectSheets"],
  ];

  for (const t of tickets) {
    const engId = deterministicEngId("ticket", t.id as string);
    const project = byField(c.projects || [], "ticketId", t.id)[0] || null;
    const quotations = byField(c.quotations || [], "ticketId", t.id);
    // "the quotation this ticket is worth" — newest by createdAt (spec/relations rule).
    const approved = [...quotations].sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null;

    const members: Record<string, string[]> = {};
    members.rfq = byField(c.rfqs || [], "ticketId", t.id).map((r) => r.id as string);
    members.quotation = quotations.map((q) => q.id as string);
    if (project) {
      for (const [slot, coll] of memberTypes) {
        members[slot] = byField(c[coll] || [], "projectId", project.id).map((r) => r.id as string);
      }
    }

    const client = clientById.get(t.clientId as string);
    out.push({
      engId, ref: (t.ref as string) || "",
      context: {
        clientId: (t.clientId as string) || null,
        clientName: client ? (client.name as string) : (t.clientName as string) || "",
        industry: (t.industry as string) || "", urgency: (t.urgency as string) || "",
        title: (t.title as string) || "", deadline: (t.deadline as string) || "",
        contact: { name: (t.contactName as string) || "" }, site: t.location || {},
        // The engagement is dated when the DEAL began (the ticket's own
        // createdAt), not when this root happened to be written. applyDescriptor
        // scores ENG.index off context.createdAt — drop this and every
        // engagement sorts by backfill/write order instead of when it started,
        // which silently breaks "newest first" and the time-range/funnel
        // queries the index exists for.
        createdAt: (t.createdAt as string) || "",
      },
      singletons: { ticket: t.id as string, approvedQuotation: approved ? (approved.id as string) : null,
                    project: project ? (project.id as string) : null },
      members,
    });
  }

  // Orphan (internal) quotations with no ticket → their own engagement.
  for (const q of c.quotations || []) {
    if (q.ticketId) continue;
    const engId = deterministicEngId("quotation", q.id as string);
    out.push({
      engId, ref: (q.number as string) || "",
      context: { clientId: (q.clientId as string) || null, clientName: (q.clientName as string) || "",
                 industry: (q.industry as string) || "", title: (q.title as string) || "", deadline: (q.deadline as string) || "",
                 contact: {}, site: {},
                 // Same reasoning as the ticket-headed branch above: the deal
                 // began when this internal quotation was raised, not when its
                 // engagement root was written.
                 createdAt: (q.createdAt as string) || "" },
      singletons: { ticket: null, approvedQuotation: null, project: null },
      members: { quotation: [q.id as string] },
    });
  }
  return out;
}
