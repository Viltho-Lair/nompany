import { route, refused } from "@/platform/http/route";
import { procurementContext } from "@/modules/procurement/requisitions";
import {
  listSubcontracts, createSubcontract, editSubcontract, removeSubcontract,
  createCertificate, editCertificate, certifyCertificate,
} from "@/modules/procurement/subcontracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = {
  auth: "studio", context: procurementContext, body: true,
  name: "procurement-subcontracts",
};

export const GET = route({ ...spec, body: false }, async (procurement) => {
  const result = await listSubcontracts(procurement);
  if (refused(result)) return result;
  return {
    ok: true,
    subcontracts: result.subcontracts,
    // THE CLOCK TRAVELS WITH THE ANSWER, so whether retention is releasable is
    // decided once rather than by whenever the screen rendered.
    asOf: result.asOf,
    canCreate: result.canCreate,
    canEdit: result.canEdit,
    canDelete: result.canDelete,
    canCertify: result.canCertify,
  };
});

export const POST = route(spec, async (procurement) => {
  // A CERTIFICATE IS A DIFFERENT RECORD, so it is a different branch rather
  // than a create with unfamiliar keys — it writes another collection and is
  // refused against a subcontract nobody has signed.
  if (procurement.body.certificate) {
    const made = await createCertificate(procurement, procurement.body);
    if (refused(made)) return made;
    return { status: 201, body: { ok: true, certificate: made.certificate } };
  }

  const result = await createSubcontract(procurement, procurement.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, subcontract: result.subcontract } };
});

export const PUT = route(spec, async (procurement) => {
  if (!procurement.body.id) return { error: "missing" };
  const id = String(procurement.body.id);

  // CERTIFYING IS ITS OWN BRANCH AND ITS OWN RIGHT. It can never be reached by
  // editing a status — the shape that let a rejected change order approve
  // itself was exactly an answer routed through a generic write.
  if (procurement.body.action === "certify") {
    const signed = await certifyCertificate(procurement, id);
    if (refused(signed)) return signed;
    return { ok: true, certificate: signed.certificate };
  }

  if (procurement.body.certificate) {
    const edited = await editCertificate(procurement, id, procurement.body);
    if (refused(edited)) return edited;
    return { ok: true, certificate: edited.certificate };
  }

  const result = await editSubcontract(procurement, id, procurement.body);
  if (refused(result)) return result;
  return { ok: true, subcontract: result.subcontract };
});

export const DELETE = route(spec, async (procurement) => {
  if (!procurement.body.id) return { error: "missing" };
  const result = await removeSubcontract(procurement, String(procurement.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
