import { refused, type Guarded } from "@/platform/http/route";
import type { TechnicalContext } from "@/modules/technical/types";
import { currentUser } from "@/platform/auth/identity";
import { technicalContext, requestRfq, updateRfq } from "@/modules/technical/technical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function context(paramsPromise: Promise<Record<string, string>>): Promise<Guarded<TechnicalContext>> {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const tech = await technicalContext(user, slug);
  if (tech.error) {
    const status = tech.error === "notfound" || tech.error === "no-section" ? 404 : 403;
    return { fail: Response.json({ error: tech.error }, { status }) };
  }
  return tech;
}
const body = async (r: Request): Promise<Record<string, unknown>> => {
  try { return await r.json(); } catch { return {}; }
};

// Raise an RFQ from a Sales ticket. This is a SALES action — the permission
// checked is Sales:manage, not Technical:manage (enforced in requestRfq).
export async function POST(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const c = await context(ctx.params);
  if (c.fail) return c.fail;

  const result = await requestRfq(c, await body(request));
  if (refused(result)) {
    const status = result.error === "sales-required" || result.error === "forbidden" ? 403
      : result.error === "already" || result.error === "approved" ? 409
      : result.error === "ticket" || result.error === "no-sales" ? 404 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true, rfq: result.rfq }, { status: 201 });
}

// Working an RFQ (assigning, re-describing, rejecting) is a TECHNICAL action.
export async function PUT(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const c = await context(ctx.params);
  if (c.fail) return c.fail;
  if (!c.canManage) return Response.json({ error: "read-only" }, { status: 403 });

  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await updateRfq(c, String(b.id), b);
  if (refused(result)) return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : 400 });
  return Response.json({ ok: true, rfq: result.rfq });
}
