// PARTNERS, PR & INFLUENCERS (modules/marketing/partnersService).
//
// The figures each partner carries are COUNTED from the form arrivals bearing
// their tag, never typed in — so there is no action here for "record what they
// brought", and deliberately: a number a person maintains beside one the system
// can count is a second number free to disagree with it.
//
// Every right is asked inside the service.
import { route, refused } from "@/platform/http/route";
import { marketingContext } from "@/modules/marketing/campaigns";
import {
  listPartners, createPartner, editPartner, deletePartner,
} from "@/modules/marketing/partnersService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: marketingContext, body: true, name: "marketing-partners" };

export const GET = route({ ...spec, body: false }, async (m) => {
  const result = await listPartners(m);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (m) => {
  const result = await createPartner(m, m.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, partner: result.partner } };
});

export const PUT = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await editPartner(m, String(m.body.id), m.body);
  if (refused(result)) return result;
  return { ok: true, partner: result.partner };
});

export const DELETE = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await deletePartner(m, String(m.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
