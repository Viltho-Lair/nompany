import { route } from "@/lib/route";
import { repo } from "@/lib/data/repo";
import { NODES } from "@/lib/relations";
import { can } from "@/lib/access";

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
const byCollection = new Map(
  Object.entries(NODES).map(([kind, node]) => [node.collection, { kind, ...node }]),
);

export const GET = route(
  { auth: "studio", name: "studios/[slug]/rows" },
  async ({ request, studio, sections, access }) => {
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

    const row = await repo(collection).byId({ studio, section }, id);

    // A DELETED ROW IS A 404, AND THE BOARD WANTS THAT ANSWER. `row.deleted`
    // events name an id that is already gone; the client asking for it is not an
    // error, it is how the board learns to drop the row from its list.
    if (!row) return { error: "notfound" };
    return { row };
  },
);
