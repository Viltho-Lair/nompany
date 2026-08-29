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
    // Same resolution as the ticket branch above: prefer the live Client row
    // over whatever was typed at the time, falling back to the stored name
    // only when there is no row (free text that never became a record). The
    // two branches used to read asymmetrically — this one trusted q.clientName
    // alone and never consulted clientById — which is why every internal
    // quotation's engagement carried a blank client name: createQuotation
    // stores clientName as "" once a real Client record exists (see
    // technical.ts createQuotation), so the untranslated clientId here always
    // resolved to nothing.
    const orphanClient = clientById.get(q.clientId as string);
    out.push({
      engId, ref: (q.number as string) || "",
      context: { clientId: (q.clientId as string) || null,
                 clientName: orphanClient ? (orphanClient.name as string) : (q.clientName as string) || "",
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

  // ORPHAN PROJECTS — no ticket and no quotation behind them → their own
  // engagement. A project raised directly (Sales was never involved) is a real
  // deal with a real client, and the stage registry's `unassignable: false`
  // says a project is never loose. Third rather than first, so a project that
  // DOES have lineage is already claimed by the ticket branch above and cannot
  // root a second engagement of its own.
  //
  // This branch is what makes the live dual-write safe. openProject attaches a
  // direct project's engagement best-effort; if the reconciler could not
  // reproduce that root it would drop it on the next pass, which is the
  // internal-quotation defect one stage further down.
  for (const p of c.projects || []) {
    if (p.ticketId || p.quotationId) continue;
    const engId = deterministicEngId("project", p.id as string);
    // Same resolution as both branches above: the live Client row first, the
    // record's own stored name only as the fallback for free text that never
    // became a record.
    const directClient = clientById.get(p.clientId as string);
    const members: Record<string, string[]> = {};
    for (const [slot, coll] of memberTypes) {
      members[slot] = byField(c[coll] || [], "projectId", p.id).map((r) => r.id as string);
    }
    out.push({
      // THE REF IS THE NUMBER ONCE FINANCE ISSUES ONE, the title until then. A
      // direct project starts with a blank number by design (Finance's act),
      // and a permanently blank ref would leave its card unnamed on the
      // engagements view. Re-running the reconciler upgrades it in place.
      engId, ref: (p.number as string) || (p.title as string) || "",
      context: {
        clientId: (p.clientId as string) || null,
        clientName: directClient ? (directClient.name as string) : (p.clientName as string) || "",
        // INDUSTRY IS THE CLIENT'S FACT and is read off the client row — the
        // project deliberately stores no copy of it (see the spec, §4.3).
        industry: (directClient?.industry as string) || "",
        title: (p.title as string) || "",
        // A project's deadline is its target end; there is no separate one.
        deadline: (p.endDate as string) || "",
        contact: {}, site: {},
        // The deal began when the project was raised, not when this root was
        // written — applyDescriptor scores ENG.index off context.createdAt.
        createdAt: (p.createdAt as string) || "",
      },
      singletons: { ticket: null, approvedQuotation: null, project: p.id as string },
      members,
    });
  }
  return out;
}
