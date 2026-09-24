import { currentUser } from "@/platform/auth/identity";
import { subscriptionRefusal } from "@/platform/http/route";
import { studioContext } from "@/lib/studios";
import { requirePermission } from "@/platform/access";
import { switchboard } from "@/lib/dashboardWidgets";
import { officialView, officialHistory, saveOfficialValues } from "@/modules/administration/officialValues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// OFFICIAL STUDIO VALUES — the country's official fields, what the Studio has
// entered against them, and who changed what.
//
// ITS OWN ROUTE, for the reason service-actions has one: a save here is not
// "set this field", it is "judge every value against the selected country's
// rule, write all or none, and record each change". A blind write through the
// general settings allowlist would skip all three.
//
// THE SAME TWO RIGHTS AS THE REST OF STUDIO SETTINGS — view to read, edit to
// save. What is Owner-only is choosing the COUNTRY, which decides which fields
// exist at all; that lives on the settings PUT beside the country itself.

async function load(slug: string) {
  const user = await currentUser();
  if (!user) return { refused: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const context = await studioContext(user, slug);
  if (context.error) {
    return { refused: Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 }) };
  }
  return { context };
}

async function payload(context: Awaited<ReturnType<typeof studioContext>> & { error?: undefined }) {
  const { studio, collaborator } = context as unknown as {
    studio: { id: string } & Record<string, unknown>; collaborator: { id: string; role?: string };
  };
  // WHETHER A DEPARTMENT IS SWITCHED ON — a fleet licence applies only to a
  // Studio running Logistics & Fleet (shared/compliance/resolve).
  const sectionOn = switchboard(context.sections || []);
  const view = officialView(studio, { sectionOn });
  // THE NAMES OF THE DEPARTMENTS A FIELD DEPENDS ON, as this Studio stores them,
  // so "does not apply while Logistics & Fleet is off" names the section the way
  // the sidebar does. Only the ones a field refers to.
  const wanted = new Set(view.fields.map((f) => (f.appliesWhen as { sectionOn?: string } | null)?.sectionOn).filter(Boolean));
  const sectionNames = Object.fromEntries(
    (context.sections || []).filter((s) => wanted.has(s.key)).map((s) => [s.key, String(s.name || s.key)]),
  );
  return {
    ...view,
    sectionNames,
    history: await officialHistory(studio.id, 50),
    canEdit: !requirePermission(context.access, "administration.settings.edit"),
    isOwner: collaborator.role === "owner",
  };
}

export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { slug } = await ctx.params;
  const { context, refused } = await load(slug);
  if (refused) return refused;
  // THE SUBSCRIPTION'S ANSWER, the same one the route wrapper gives (24/09/2026).
  const lapsed = await subscriptionRefusal(context, request);
  if (lapsed) return lapsed;
  // THE SAME DOOR AS STUDIO SETTINGS — a member without it learns nothing,
  // including which country the Studio is in (invariant 2: contents, not
  // existence).
  const denied = requirePermission(context.access, "administration.settings.view");
  if (denied) return Response.json(denied, { status: 403 });
  return Response.json(await payload(context));
}

export async function PUT(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { slug } = await ctx.params;
  const { context, refused } = await load(slug);
  if (refused) return refused;
  // THE SUBSCRIPTION'S ANSWER, the same one the route wrapper gives (24/09/2026).
  const lapsed = await subscriptionRefusal(context, request);
  if (lapsed) return lapsed;
  if (requirePermission(context.access, "administration.settings.edit")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }

  const { studio, collaborator } = context as unknown as {
    studio: { id: string } & Record<string, unknown>; collaborator: { id: string; alias?: string };
  };
  const result = await saveOfficialValues(studio, collaborator, body);
  if ("error" in result) {
    // EACH REFUSED FIELD IS NAMED, so the screen marks the one that is wrong
    // rather than refusing the whole form with one sentence.
    const status = result.error === "invalid" ? 422 : result.error === "notfound" ? 404 : 409;
    return Response.json(result, { status });
  }
  // THE FRESH VIEW, read from the studio as it now stands, so the screen shows
  // what was stored (normalised) rather than what was typed.
  const fresh = await load(slug);
  if (fresh.refused) return fresh.refused;
  return Response.json({ ok: true, changed: result.changed, ...(await payload(fresh.context)) });
}
