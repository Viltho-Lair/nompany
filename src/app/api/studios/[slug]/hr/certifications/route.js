import { route } from "@/platform/http/route";
import { hrContext, createCertification, editCertification, removeCertification } from "@/modules/hr/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: hrContext, body: true, name: "hr/certifications" };
const manageable = (hr) => (hr.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (hr) => {
  const refusal = manageable(hr);
  if (refusal) return refusal;

  const result = await createCertification(hr, hr.body);
  if (result.error) return result;
  return { status: 201, body: { ok: true, certification: result.certification } };
});

export const PUT = route(spec, async (hr) => {
  const refusal = manageable(hr);
  if (refusal) return refusal;
  if (!hr.body.id) return { error: "missing" };

  const result = await editCertification(hr, hr.body.id, hr.body);
  if (result.error) return result;
  return { ok: true, certification: result.certification };
});

// A certification somebody still holds cannot be removed — the refusal names the
// people holding it.

export const DELETE = route(spec, async (hr) => {
  const refusal = manageable(hr);
  if (refusal) return refusal;
  if (!hr.body.id) return { error: "missing" };

  const result = await removeCertification(hr, hr.body.id);
  if (result.error) return result;
  return { ok: true };
});
