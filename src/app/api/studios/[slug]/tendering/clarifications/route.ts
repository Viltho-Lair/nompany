import { route, refused } from "@/platform/http/route";
import { tenderingContext } from "@/modules/tendering/tenders";
import {
  askClarification, editClarification, removeClarification,
} from "@/modules/tendering/tenderDocs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NO GET. The clarification log arrives with the pack on
// /tendering/documents — one screen shows both, and a second listing route
// would be a second answer to "what has been asked on this tender".
const spec = { auth: "studio", context: tenderingContext, body: true, name: "tendering-register" };

export const POST = route(spec, async (tendering) => {
  const result = await askClarification(tendering, tendering.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, clarification: result.clarification } };
});

export const PUT = route(spec, async (tendering) => {
  if (!tendering.body.id) return { error: "missing" };
  const result = await editClarification(tendering, String(tendering.body.id), tendering.body);
  if (refused(result)) return result;
  return { ok: true, clarification: result.clarification };
});

export const DELETE = route(spec, async (tendering) => {
  if (!tendering.body.id) return { error: "missing" };
  const result = await removeClarification(tendering, String(tendering.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
