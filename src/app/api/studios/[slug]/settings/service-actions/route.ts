import { currentUser } from "@/platform/auth/identity";
import { studioContext } from "@/lib/studios";
import { requirePermission } from "@/platform/access";
import { updateStudio } from "@/modules/main/studios";
import { FIELDS_OF_WORK, SERVICE_ACTIONS, OTHER_FIELD, actionsForField } from "@/shared/fieldsOfWork";
import { nextPool, cleanNextActive, serviceActionUsage } from "@/modules/studioServiceActions";
import type { User } from "@/platform/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A studio's field of work and its service-action pool — kept apart from the
// general studio/settings route because writing here recomputes the pool
// (seed from the matrix, or retire what an edit removes) rather than storing
// whatever the body says. `studioServiceActions.ts` holds that logic, pure and
// unit-tested on its own; this route is the thin authorised door onto it,
// mirroring the sibling settings route's auth pattern exactly.

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((s) => String(s ?? "")) : []);
const isField = (v: unknown) => FIELDS_OF_WORK.includes(String(v)) || String(v) === OTHER_FIELD;

async function payload(user: User, slug: string) {
  const context = await studioContext(user, slug);
  if (context.error) return { context, body: null };
  const { studio } = context;
  return {
    context,
    body: {
      fieldOfWork: String(studio.fieldOfWork ?? ""),
      fieldOfWorkOther: String(studio.fieldOfWorkOther ?? ""),
      serviceActions: arr(studio.serviceActions),
      retiredServiceActions: arr(studio.retiredServiceActions),
      // One inventory read (see serviceActionUsage) — never re-derived from a
      // collection this route has already read.
      usage: await serviceActionUsage(user, slug),
      options: { fields: [...FIELDS_OF_WORK], actions: [...SERVICE_ACTIONS] },
      canManage: !requirePermission(context.access, "studio.settings.edit"),
    },
  };
}

export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const { context, body } = await payload(user, slug);
  if (context.error) return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  return Response.json(body);
}

export async function PUT(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  if (requirePermission(context.access, "studio.settings.edit")) return Response.json({ error: "forbidden" }, { status: 403 });

  const { studio } = context;
  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch { raw = {}; }

  const prevActive = arr(studio.serviceActions);
  const prevRetired = arr(studio.retiredServiceActions);
  const usage = await serviceActionUsage(user, slug);
  const referenced = new Set(Object.keys(usage).filter((a) => usage[a] > 0));

  const patch: Record<string, unknown> = {};

  if ("fieldOfWork" in raw) {
    // Setting or changing the field RE-SEEDS the standard pool from its matrix
    // row (empty for "Other"); a referenced action the new field drops is
    // retired, not deleted, so an in-use item never loses its scope silently.
    if (!isField(raw.fieldOfWork)) return Response.json({ error: "field" }, { status: 400 });
    patch.fieldOfWork = String(raw.fieldOfWork);
    patch.fieldOfWorkOther = String(raw.fieldOfWork) === OTHER_FIELD ? String(raw.fieldOfWorkOther ?? "").slice(0, 80) : "";
    const seeded = nextPool({ prevActive, prevRetired, nextActive: actionsForField(String(raw.fieldOfWork)), referenced });
    patch.serviceActions = seeded.serviceActions;
    patch.retiredServiceActions = seeded.retiredServiceActions;
  } else if ("serviceActions" in raw) {
    // An explicit pool edit — add from the standard 20 (or a surviving legacy
    // name), or remove (retire if still referenced, drop otherwise).
    const cleaned = cleanNextActive(raw.serviceActions, prevActive);
    const out = nextPool({ prevActive, prevRetired, nextActive: cleaned, referenced });
    patch.serviceActions = out.serviceActions;
    patch.retiredServiceActions = out.retiredServiceActions;
  } else {
    return Response.json({ error: "nothing" }, { status: 400 });
  }

  const updated = await updateStudio(studio.id, patch);
  if (!updated) return Response.json({ error: "notfound" }, { status: 404 });
  const { body } = await payload(user, slug);
  return Response.json({ ok: true, ...body });
}
