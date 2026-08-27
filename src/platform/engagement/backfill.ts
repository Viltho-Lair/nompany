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

  const memberTypes: [string, string][] = [
    ["rfqs", "rfqs"], ["quotations", "quotations"],
    ["invoices", "invoices"], ["expenses", "expenses"], ["orders", "materialOrders"],
    ["deliveries", "deliveries"], ["shipments", "awbShipments"], ["tasks", "tasks"],
    ["overtimes", "overtimes"], ["sheets", "projectSheets"],
  ];

  for (const t of tickets) {
    const engId = deterministicEngId("ticket", t.id as string);
    const project = byField(c.projects || [], "ticketId", t.id)[0] || null;
    const quotations = byField(c.quotations || [], "ticketId", t.id);
    // "the quotation this ticket is worth" — newest by createdAt (spec/relations rule).
    const approved = [...quotations].sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null;

    const members: Record<string, string[]> = {};
    members.rfqs = byField(c.rfqs || [], "ticketId", t.id).map((r) => r.id as string);
    members.quotations = quotations.map((q) => q.id as string);
    if (project) {
      for (const [slot, coll] of memberTypes) {
        if (slot === "rfqs" || slot === "quotations") continue;
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
                 contact: {}, site: {} },
      singletons: { ticket: null, approvedQuotation: null, project: null },
      members: { quotations: [q.id as string] },
    });
  }
  return out;
}
