import { route, refused } from "@/platform/http/route";
import { procurementContext } from "@/modules/procurement/requisitions";
import {
  listRfqs, createRfq, editRfq, moveRfq, removeRfq, recordQuote, awardRfq,
} from "@/modules/procurement/rfq";
import { referencePickers } from "@/modules/procurement/pickers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = {
  auth: "studio", context: procurementContext, body: true,
  name: "procurement-rfq",
};

export const GET = route({ ...spec, body: false }, async (procurement) => {
  const [result, pickers] = await Promise.all([
    listRfqs(procurement),
    // WHO CAN BE ASKED. The suppliers were a comma-separated list of ids typed
    // by hand, and every quote and award showed an id rather than a name.
    referencePickers(procurement.studio, { suppliers: procurement.suppliersSection }, { suppliers: true }),
  ]);
  if (refused(result)) return result;
  return {
    ok: true,
    rfqs: result.rfqs,
    pickers,
    // THE CLOCK TRAVELS WITH THE ANSWER, so which quotes have lapsed is decided
    // once on the server rather than by whenever the screen happened to render.
    asOf: result.asOf,
    canCreate: result.canCreate,
    canEdit: result.canEdit,
    canDelete: result.canDelete,
    canAward: result.canAward,
  };
});

export const POST = route(spec, async (procurement) => {
  // RECORDING A QUOTE IS ITS OWN ACT, not a create with unfamiliar keys: it
  // writes a different collection, it replaces rather than appends when the
  // same supplier answers twice, and it is refused unless the request has
  // actually gone out.
  if (procurement.body.quote) {
    const recorded = await recordQuote(procurement, procurement.body);
    if (refused(recorded)) return recorded;
    return { status: 201, body: { ok: true, quote: recorded.quote, replaced: recorded.replaced } };
  }

  const result = await createRfq(procurement, procurement.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, rfq: result.rfq } };
});

export const PUT = route(spec, async (procurement) => {
  if (!procurement.body.id) return { error: "missing" };
  const id = String(procurement.body.id);
  const action = String(procurement.body.action || "");

  if (action === "send" || action === "cancel") {
    const moved = await moveRfq(procurement, id, action === "send" ? "Sent" : "Cancelled");
    if (refused(moved)) return moved;
    return { ok: true, rfq: moved.rfq };
  }

  // AWARDING IS ITS OWN BRANCH AND ITS OWN RIGHT. It names a quote, so it can
  // never be reached by editing a status — the defect the change-order route
  // shipped with was exactly an answer routed through a generic write.
  if (action === "award") {
    const awarded = await awardRfq(procurement, id, procurement.body);
    if (refused(awarded)) return awarded;
    return { ok: true, rfq: awarded.rfq, quote: awarded.quote };
  }

  const result = await editRfq(procurement, id, procurement.body);
  if (refused(result)) return result;
  return { ok: true, rfq: result.rfq };
});

export const DELETE = route(spec, async (procurement) => {
  if (!procurement.body.id) return { error: "missing" };
  const result = await removeRfq(procurement, String(procurement.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
