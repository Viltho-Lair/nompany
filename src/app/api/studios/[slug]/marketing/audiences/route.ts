// AUDIENCES & CONSENT — the ledger of who may be contacted
// (modules/marketing/audiences).
//
// GET reads it; POST appends a consent or a withdrawal recorded by hand. There
// is no PUT and no DELETE, and that is the feature rather than an omission: the
// ledger is append-only, because a consent somebody could edit or erase is not
// evidence of anything. Every right is asked inside the service.
import { route, refused } from "@/platform/http/route";
import { marketingContext } from "@/modules/marketing/campaigns";
import { audienceView, recordConsent } from "@/modules/marketing/audiences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: marketingContext, name: "marketing-audiences" };

export const GET = route(spec, async (m) => {
  const result = await audienceView(m, Object.fromEntries(new URL(m.request.url).searchParams));
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route({ ...spec, body: true }, async (m) => {
  const result = await recordConsent(m, m.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, consent: result.consent, stateNow: result.stateNow } };
});
