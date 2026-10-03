import { currentUser } from "@/platform/auth/identity";
import { subscriptionRefusal } from "@/platform/http/route";
import { studioContext } from "@/lib/studios";
import { requirePermission } from "@/platform/access";
import { updateStudio } from "@/modules/main/studios";
import { OTHER_FIELD } from "@/shared/fieldsOfWork";
import { fieldForIndustry, isChoosable, needsIndustry, pickCatalogue, suggestedIndustry } from "@/shared/industryPick";
import { readIndustries } from "@/lib/data/industries";
import type { User } from "@/platform/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A STUDIO'S INDUSTRY — the specialism it chose from the console's catalogue,
// and through that specialism's template the field of work its departments and
// deal flows start from. Kept apart from the general settings route because the
// two are written TOGETHER: the field follows the specialism, so a body naming
// one alone could leave them disagreeing.
//
// THIS WAS `settings/service-actions` UNTIL 03/10/2026, when the owner removed
// service actions from studios. It also wrote the action pool, re-seeded from
// the trade on every change; with the pool gone, what is left is the trade.

async function payload(user: User, slug: string) {
  const context = await studioContext(user, slug);
  if (context.error) return { context, body: null };
  const { studio } = context;
  const industries = await readIndustries();
  return {
    context,
    body: {
      fieldOfWork: String(studio.fieldOfWork ?? ""),
      fieldOfWorkOther: String(studio.fieldOfWorkOther ?? ""),
      // The specialism the studio chose, and — while it is still on the old
      // list — the one that starts from its current setup, to offer first.
      industry: String(studio.industry || ""),
      needsIndustry: needsIndustry(studio),
      suggestedIndustry: needsIndustry(studio) ? suggestedIndustry(industries, studio.fieldOfWork) : "",
      // The console's list, resolved here (lib/data/industries): what the
      // picker offers, and what an answer is checked against.
      industries: pickCatalogue(industries),
      canManage: !requirePermission(context.access, "administration.settings.edit"),
    },
  };
}

export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const { context, body } = await payload(user, slug);
  if (context.error) return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  // THE SUBSCRIPTION'S ANSWER, the same one the route wrapper gives (24/09/2026).
  const lapsed = await subscriptionRefusal(context, request);
  if (lapsed) return lapsed;
  return Response.json(body);
}

export async function PUT(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  // THE SUBSCRIPTION'S ANSWER, the same one the route wrapper gives (24/09/2026).
  const lapsed = await subscriptionRefusal(context, request);
  if (lapsed) return lapsed;
  if (requirePermission(context.access, "administration.settings.edit")) return Response.json({ error: "forbidden" }, { status: 403 });

  const { studio } = context;
  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch { raw = {}; }
  if (!("industry" in raw)) return Response.json({ error: "nothing" }, { status: 400 });

  // An industry the console switched off is not offered — but the studio's own
  // current answer may be saved again (with a new "Other" label, say).
  const industries = await readIndustries();
  if (!isChoosable(industries, raw.industry, String(studio.industry || ""))) return Response.json({ error: "field" }, { status: 400 });
  const field = fieldForIndustry(industries, raw.industry);
  const patch: Record<string, unknown> = {
    industry: String(raw.industry),
    fieldOfWork: field,
    fieldOfWorkOther: field === OTHER_FIELD ? String(raw.fieldOfWorkOther ?? studio.fieldOfWorkOther ?? "").slice(0, 80) : "",
  };

  const updated = await updateStudio(studio.id, patch);
  if (!updated) return Response.json({ error: "notfound" }, { status: 404 });
  const { body } = await payload(user, slug);
  return Response.json({ ok: true, ...body });
}
