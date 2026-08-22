import { route } from "@/lib/route";
import { repo } from "@/platform/db/repo";
import { NODES } from "@/lib/relations";
import { can } from "@/platform/access";
import { salesContext, ticketById } from "@/lib/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE ROW, BY THE ID A LIVE EVENT NAMED.
//
// The live stream says "row sal_123 in salesTickets changed". Until now a board
// could do nothing with that but re-run its module's entire GET — six
// collections, for one edited ticket, on every open tab. In a thirty-seat studio
// one person renaming a ticket cost thirty full payloads. That is finding H-6,
// and this endpoint is the other half of the answer.
//
// THE REGISTRY DECIDES WHAT IS FETCHABLE, not this file. relations.js already
// declares, for every record the product can traverse, which section owns it,
// which collection holds it and which permission lets you see it — and it says
// of itself that a node absent from it cannot be traversed, "deliberate: a graph
// that reaches everything is a graph that can be pointed at anything". The same
// sentence is exactly right here. A collection nobody declared is not readable
// through this door, so adding one is a decision somebody makes on purpose.
//
// THE PERMISSION IS THE NODE'S OWN, not the module's. Asking for
// `sales.tickets.view` rather than "may you open Sales" is what stops this
// becoming a way to read a collection whose own screen you are not allowed to
// open — the sub-section grants exist precisely so those two are different
// questions.
// A COMPOSED ROW WHERE THE BOARD SHOWS A COMPOSED ROW.
//
// This is the correctness trap in targeted patching, and it is silent. A board's
// Sales ticket is not the stored row: it carries its client's name, its RFQ
// status, its quotation value and its project link, all derived from four other
// collections. Handing the client the RAW row to splice in would blank every one
// of those columns and look like a rendering bug for as long as nobody reloaded.
//
// So a collection may declare a composer. Where there is one, this returns
// exactly what the list endpoint would have returned for that row; where there
// is none, the stored row IS what the board shows and the repository answer is
// already right.
const COMPOSERS = {
  salesTickets: async ({ user, slug }, id) => {
    const ctx = await salesContext(user, slug);
    return ctx.error ? null : ticketById(ctx, id);
  },
};

const byCollection = new Map(
  Object.entries(NODES).map(([kind, node]) => [node.collection, { kind, ...node }]),
);

export const GET = route(
  { auth: "studio", name: "studios/[slug]/rows" },
  async ({ request, studio, sections, access, user }) => {
    const url = new URL(request.url);
    const collection = url.searchParams.get("collection") || "";
    const id = url.searchParams.get("id") || "";
    if (!collection || !id) return { error: "missing" };

    const node = byCollection.get(collection);
    if (!node) return { error: "unknown-kind" };
    if (!can(access, node.permission)) return { error: "forbidden", key: node.permission };

    // The section is resolved from the studio's OWN list, so a studio that does
    // not have this section gets "not there" rather than a row from a section
    // it never had.
    const section = sections.find((s) => s.key === node.sectionKey);
    if (!section) return { error: "no-section" };

    const compose = COMPOSERS[collection];
    const row = compose
      ? await compose({ user, slug: studio.slug }, id)
      : await repo(collection).byId({ studio, section }, id);

    // A DELETED ROW IS A 404, AND THE BOARD WANTS THAT ANSWER. `row.deleted`
    // events name an id that is already gone; the client asking for it is not an
    // error, it is how the board learns to drop the row from its list.
    if (!row) return { error: "notfound" };
    return { row };
  },
);
