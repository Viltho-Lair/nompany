// HOW THE DEPARTMENTS ARE JOINED, written down once.
//
// The chain itself was never in doubt: Sales raises a ticket, requests an RFQ,
// Technical converts it to a quotation, Sales sends it for approval, and an
// approved quotation opens a project. Every row downstream carries the keys of
// everything above it — projects.js calls it "Lineage — the whole chain of keys".
//
// WHAT WAS MISSING IS ANYWHERE THAT SAYS SO. Walking the chain was retyped
// wherever somebody needed it: seven `.filter(x => x.parentId === id)`
// expressions across sales.js, rfqs.js and finance.js, each rediscovering the
// same edge. Four things follow from that, and all four are why a sales ticket
// could not tell you its project's stage:
//
//   • Nothing could enumerate the edges, so a missing one was invisible.
//   • The interesting part is the RULE — which quotation counts, whether
//     cancelled invoices are included — and each rule lived alone in one file.
//   • Permission was not attached, so every caller decided separately, or
//     forgot.
//   • Nothing outside the owning module could reuse any of it, which is why a
//     document printed from a quotation could not reach its client.
//
// This declares the edges instead. Pure and reader-injected, so it can be tested
// without Redis and imported by a client component without dragging the store
// in behind it.

// ---- the records that can be joined ----------------------------------------
//
// Each names where it lives. A node absent from here cannot be traversed, which
// is deliberate: a graph that reaches everything is a graph that can be pointed
// at anything.
/** What one traversable record type declares about itself. */
export type Node = {
  label: string;
  sectionKey: string;
  collection: string;
  permission: string;
};

// TYPED AS A RECORD, NOT LEFT AS A LITERAL. Every lookup here is by a NodeKey
// that came from an edge or a caller, so `string` has to be able to index it —
// and the alternative, narrowing NodeKey to `keyof typeof NODES`, would make
// adding a node a change in two places instead of one.
export const NODES: Record<string, Node> = {
  salesTicket: { label: "Sales ticket", sectionKey: "crm-sales-tickets", collection: "salesTickets", permission: "crmSales.tickets.view" },
  client: { label: "Client", sectionKey: "crm-sales-clients", collection: "salesClients", permission: "crmSales.clients.view" },
  rfq: { label: "RFQ", sectionKey: "engineering-docs-rfq", collection: "rfqs", permission: "engineeringDocs.rfq.view" },
  quotation: { label: "Quotation", sectionKey: "crm-sales-quotations", collection: "quotations", permission: "crmSales.quotations.view" },
  project: { label: "Project", sectionKey: "projects-list", collection: "projects", permission: "projects.list.view" },
  projectSheet: { label: "Project sheet", sectionKey: "inventory-sheets", collection: "projectSheets", permission: "inventory.sheets.view" },
  materialOrder: { label: "Material order", sectionKey: "inventory-sheets", collection: "materialOrders", permission: "inventory.sheets.view" },
  invoice: { label: "Invoice", sectionKey: "finance-cash", collection: "invoices", permission: "finance.cash.view" },
  expense: { label: "Expense", sectionKey: "finance-cash", collection: "expenses", permission: "finance.cash.view" },
  delivery: { label: "Delivery", sectionKey: "inventory", collection: "deliveries", permission: "inventory.stock.view" },
  overtime: { label: "Overtime", sectionKey: "projects-overtimes", collection: "overtimes", permission: "projects.overtimes.view" },
  awbShipment: { label: "AWB shipment", sectionKey: "logistics-shipments", collection: "awbShipments", permission: "logistics.shipments.view" },
  task: { label: "Task", sectionKey: "tasks", collection: "tasks", permission: "tasks.board.view" },
};

// ---- cardinality -------------------------------------------------------------
//
// ONE      — at most one, and more than one is a data fault rather than a choice.
// SEQUENCE — several, in order, where the last one is the one that counts. This
//            is what a quotation's revisions are: earlier ones exist because the
//            reference for what was previously sent has to survive, not because
//            anybody wanted alternatives.
// MANY     — a plain list, all of it meaningful at once.
export const ONE = "one";
export const SEQUENCE = "sequence";
export const MANY = "many";

// ---- the edges ---------------------------------------------------------------
//
// `forward` means this record holds the other's id — one lookup, one answer.
// `reverse` means the other record holds ours, so it is found by scanning that
// collection. Reverse is not a weakness of the model: the child is created
// knowing its parent, so the key is written once at the moment the fact becomes
// true. A back-pointer on the parent would be a second copy of the same fact,
// and writing it would mean a downstream module reaching up and modifying a
// record belonging to a department it does not own — which sales.js forbids in
// so many words: "Sales never WRITES them."
/** A record type this graph can traverse. Keys of NODES; kept as `string` so a
 *  node added there needs no second declaration here. */
export type NodeKey = string;

/** How many rows the far end of an edge can meaningfully have. */
export type Cardinality = typeof ONE | typeof SEQUENCE | typeof MANY;

/**
 * ONE EDGE, AND EVERY FIELD ON IT IS LOAD-BEARING. `direction` decides whether
 * the walk looks up an id or scans for one; `exclude` and `order` are the RULE
 * that used to live scattered across seven filters — which quotation counts,
 * whether a cancelled invoice is included.
 */
export type Edge = {
  from: NodeKey;
  to: NodeKey;
  direction: "forward" | "reverse";
  key: string;
  cardinality: Cardinality;
  exclude?: Record<string, unknown>;
  order?: string;
};

const edge = (
  from: NodeKey, to: NodeKey, direction: "forward" | "reverse",
  key: string, cardinality: Cardinality, extra: Partial<Edge> = {},
): Edge => ({ from, to, direction, key, cardinality, ...extra });

export const EDGES = [
  // ---- upstream: the child holds the key ----
  edge("rfq", "salesTicket", "forward", "ticketId", ONE),
  edge("quotation", "salesTicket", "forward", "ticketId", ONE),
  edge("quotation", "rfq", "forward", "rfqId", ONE),
  // RECIPROCAL, and both halves are genuinely stored: a quotation is created
  // carrying its rfqId, and converting the RFQ writes the quotation's id back
  // onto it (technical.js:571). This is the one place in the chain where the
  // link is held from both ends, so it is the one place a back-pointer is a
  // fact rather than a copy.
  //
  // It makes rfq -> project reachable two ways: through the ticket, or through
  // the quotation. Both land on the same record, because a ticket has one
  // project — see the test that pins it, so a change to the edge order cannot
  // silently pick the other route.
  edge("rfq", "quotation", "forward", "quotationId", ONE),
  edge("project", "quotation", "forward", "quotationId", ONE),
  edge("project", "salesTicket", "forward", "ticketId", ONE),
  edge("project", "client", "forward", "clientId", ONE),
  edge("salesTicket", "client", "forward", "clientId", ONE),
  edge("projectSheet", "project", "forward", "projectId", ONE),
  edge("invoice", "project", "forward", "projectId", ONE),
  edge("expense", "project", "forward", "projectId", ONE),
  edge("delivery", "project", "forward", "projectId", ONE),
  edge("overtime", "project", "forward", "projectId", ONE),
  edge("awbShipment", "project", "forward", "projectId", ONE),
  edge("task", "project", "forward", "projectId", ONE),
  edge("materialOrder", "project", "forward", "projectId", ONE),

  // ---- downstream: scan the children ----
  //
  // A ticket has ONE project. Not a rule this module invented — a project is
  // opened against a request, and a second project means a second ticket,
  // because the client asking for more work starts the process from scratch.
  edge("salesTicket", "project", "reverse", "ticketId", ONE),
  edge("salesTicket", "rfq", "reverse", "ticketId", SEQUENCE, { order: "createdAt" }),
  // Newest first, and `[0]` is "the quotation this ticket is worth" — the exact
  // rule sales.js already applies, named here so the Print button and the
  // ticket's own Quotations box cannot come to different answers about it.
  edge("salesTicket", "quotation", "reverse", "ticketId", SEQUENCE, { order: "createdAt" }),
  edge("quotation", "project", "reverse", "quotationId", ONE),
  edge("project", "projectSheet", "reverse", "projectId", MANY),
  // Finance excludes cancelled rows when it totals a project. That was a rule
  // living inside finance.js; it is a property of the EDGE, so it belongs here.
  edge("project", "invoice", "reverse", "projectId", MANY, { exclude: { status: "Cancelled" } }),
  edge("project", "expense", "reverse", "projectId", MANY),
  // A project's material cost comes from these. Cancelled orders are excluded
  // for the same reason cancelled invoices are: an order nobody is going to
  // fulfil is not money anybody is going to spend.
  edge("project", "materialOrder", "reverse", "projectId", MANY, { exclude: { status: "Cancelled" } }),
  edge("project", "delivery", "reverse", "projectId", MANY),
  edge("project", "overtime", "reverse", "projectId", MANY),
  edge("project", "awbShipment", "reverse", "projectId", MANY),
  edge("project", "task", "reverse", "projectId", MANY),
];

export const edgeBetween = (from: NodeKey, to: NodeKey): Edge | null => EDGES.find((e) => e.from === from && e.to === to) || null;

// ---- paths -------------------------------------------------------------------
//
// The answer to "can a sales ticket see its invoices". It has no invoiceId and
// an invoice has no ticketId, so the answer is not a key — it is a PATH:
// ticket → project → invoices. Composing beats copying the ticket's id into six
// more collections, which would be six more writes able to disagree with the
// project that already knows.
//
// Breadth-first, so the shortest path wins and nothing loops.
export function pathBetween(from: NodeKey, to: NodeKey, { maxHops = 4 }: { maxHops?: number } = {}): Edge[] | null {
  if (!NODES[from] || !NODES[to]) return null;
  if (from === to) return [];

  const seen = new Set([from]);
  let frontier: { node: NodeKey; path: Edge[] }[] = [{ node: from, path: [] }];

  for (let hop = 0; hop < maxHops; hop += 1) {
    const next: typeof frontier = [];
    for (const { node, path } of frontier) {
      for (const e of EDGES.filter((x) => x.from === node)) {
        if (seen.has(e.to)) continue;
        const grown = [...path, e];
        if (e.to === to) return grown;
        seen.add(e.to);
        next.push({ node: e.to, path: grown });
      }
    }
    if (!next.length) break;
    frontier = next;
  }
  return null;
}

// Every record type reachable from one, with the path to it. Used to answer
// "what could a document printed from here talk about" — and to make a MISSING
// edge visible, which is the thing seven scattered filters could never do.
export type Reachable = { to: NodeKey; hops: number; path: Edge[] };

export function reachableFrom(from: NodeKey, opts?: { maxHops?: number }): Reachable[] {
  const out: Reachable[] = [];
  for (const to of Object.keys(NODES)) {
    if (to === from) continue;
    const path = pathBetween(from, to, opts);
    if (path) out.push({ to, hops: path.length, path });
  }
  return out.sort((a, b) => a.hops - b.hops || a.to.localeCompare(b.to));
}

// ---- walking one ------------------------------------------------------------
//
// `Row` is declared here rather than imported from platform/db, and that is the
// point of this module: it is PURE and reader-injected, so it can be tested
// against plain arrays and imported by a client component without dragging the
// store in behind it. Importing the store's Row type would be a type-only
// import today and an ordinary one the first time somebody was careless.
type Row = Record<string, unknown>;

/** What a walk found, and how far it got before a right stopped it. */
// GENERIC OVER THE DESTINATION, because a walk to "quotation" returns
// quotations. The default keeps every existing caller reading Rows; a caller
// that says which node it is walking to gets that record type back instead of
// casting the result at the other end.
export type WalkResult<T extends Row = Row> = {
  records: T[];
  record?: T | null;
  path?: Edge[];
  error?: string;
  at?: NodeKey;
};


const pick = (rows: Row[], e: Edge): Row[] => {
  const kept = e.exclude
    ? rows.filter((r) => !Object.entries(e.exclude || {}).every(([k, v]) => r[k] === v))
    : rows;
  if (e.cardinality !== SEQUENCE) return kept;
  // Newest first, so [0] is the one that counts.
  return [...kept].sort((a, b) => String(b[e.order || ""] || "").localeCompare(String(a[e.order || ""] || "")));
};

// The walk itself, over rows already in hand. Sync, because the callers that
// matter most already hold their collections — sales.js is HANDED rfqs,
// quotations and tasks because the screen above it had loaded them anyway, and
// making a summary async to re-read what it was given would be a step
// backwards dressed as a refactor.
function walk(
  path: Edge[], record: Row | null | undefined,
  rowsFor: (node: NodeKey) => Row[] | undefined,
  holds?: (permission: string) => boolean,
): WalkResult {
  let current = [record].filter(Boolean) as Row[];
  for (const e of path) {
    if (holds && !holds(NODES[e.to].permission)) return { error: "forbidden", at: e.to, records: [] };
    if (!current.length) return { records: [], record: null, path };

    const rows = rowsFor(e.to) || [];
    const found: Row[] = [];
    for (const row of current) {
      if (e.direction === "forward") {
        const hit = rows.find((r) => r.id === row[e.key]);
        if (hit && !found.includes(hit)) found.push(hit);
      } else {
        for (const r of pick(rows.filter((x) => x[e.key] === row.id), e)) {
          if (!found.includes(r)) found.push(r);
        }
      }
    }
    current = found;
  }
  return {
    records: current,
    // The one that counts: the only one for a `one` edge, the newest for a
    // sequence, the first for a list.
    record: current[0] || null,
    path,
  };
}

/**
 * Follow a path using rows the caller already has.
 *
 * `rows` is a map of record type to its collection. Anything on the path that
 * is missing from it resolves empty rather than throwing, so a caller can hand
 * over only the hops it cares about.
 */
export function traverseIn<T extends Row = Row>(
  from: NodeKey, record: Row | null | undefined, to: NodeKey,
  { rows = {}, holds }: { rows?: Record<string, Row[]>; holds?: (permission: string) => boolean } = {},
): WalkResult<T> {
  const path = pathBetween(from, to);
  if (!path) return { error: "no-path", records: [] };
  return walk(path, record, (node) => rows[node], holds) as WalkResult<T>;
}

/**
 * Follow a path, fetching each hop.
 *
 * `read(node)` returns that record type's rows. Injected rather than imported so
 * this module needs no store — it can be tested against plain arrays, and a
 * client component can import the declarations above without pulling Redis in.
 *
 * `holds(permission)` gates each hop. Optional, and that is deliberate: a
 * summary a module builds of its OWN records answers to the right that got the
 * reader onto the screen, whereas a document reaching across departments must
 * ask. Passing nothing means "already established" — which is what keeps a
 * retrofit from silently taking information away from people who have it today.
 */
export async function traverse(
  from: NodeKey, record: Row | null | undefined, to: NodeKey,
  {
    read,
    holds,
  }: { read: (node: NodeKey) => Promise<Row[]> | Row[]; holds?: (permission: string) => boolean },
): Promise<WalkResult> {
  const path = pathBetween(from, to);
  if (!path) return { error: "no-path", records: [] };

  // Every hop is known before the walk starts, so each collection is read once
  // rather than once per record found at the hop before it.
  const rows: Record<string, Row[]> = {};
  for (const e of path) {
    if (holds && !holds(NODES[e.to].permission)) return { error: "forbidden", at: e.to, records: [] };
    if (!(e.to in rows)) rows[e.to] = (await read(e.to)) || [];
  }
  return walk(path, record, (node) => rows[node], holds);
}
