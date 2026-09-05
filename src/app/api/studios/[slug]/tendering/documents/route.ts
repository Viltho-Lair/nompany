import { route, refused } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { tenderingContext } from "@/modules/tendering/tenders";
import {
  listTenderDocs, addTenderDocument, editTenderDocument,
  supersedeTenderDocument, removeTenderDocument,
} from "@/modules/tendering/tenderDocs";
import { changesSincePricing } from "@/modules/tendering/documents";
import type { BoqItem } from "@/modules/tendering/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The pack lives with the tender it belongs to, so the audit trail names the
// register's section — the same reasoning the bill's route states.
const spec = { auth: "studio", context: tenderingContext, body: true, name: "tendering-register" };

const Items = repo<BoqItem>("boqItems");

export const GET = route({ ...spec, body: false }, async (tendering) => {
  const tenderId = new URL(tendering.request.url).searchParams.get("tenderId") || "";
  const result = await listTenderDocs(tendering, tenderId);
  if (refused(result)) return result;

  // THE BILL IS READ HERE, ON THE PAPERWORK'S ROUTE, and that is the right way
  // round. "An addendum arrived after you priced" is a fact about the pack, and
  // the panel that lists what changed is this one. Computing it on the bill's
  // route instead would make the busier of the two read two more collections to
  // answer a question its own screen does not ask.
  const lines = await Items.find(
    { studio: tendering.studio, section: tendering.registerSection },
    { where: { tenderId } },
  );

  return {
    ok: true,
    tender: result.tender,
    documents: result.documents,
    clarifications: result.clarifications,
    lag: changesSincePricing({
      lines,
      documents: result.documents,
      clarifications: result.clarifications,
    }),
    canEdit: !requirePermission(tendering.access, "tendering.tenders.edit"),
  };
});

export const POST = route(spec, async (tendering) => {
  const result = await addTenderDocument(tendering, tendering.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, document: result.document } };
});

export const PUT = route(spec, async (tendering) => {
  if (!tendering.body.id) return { error: "missing" };
  const id = String(tendering.body.id);

  // SUPERSEDING IS ITS OWN VERB, not a field on the edit. It has rules the
  // patch path deliberately does not carry, and routing it through the same
  // body key would be a second door onto them.
  const result = tendering.body.supersededById !== undefined
    ? await supersedeTenderDocument(tendering, id, String(tendering.body.supersededById))
    : await editTenderDocument(tendering, id, tendering.body);
  if (refused(result)) return result;
  return { ok: true, document: result.document };
});

export const DELETE = route(spec, async (tendering) => {
  if (!tendering.body.id) return { error: "missing" };
  const result = await removeTenderDocument(tendering, String(tendering.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
