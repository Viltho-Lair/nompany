import { refused, type Guarded } from "@/platform/http/route";
import type { ProjectsContext } from "@/modules/projects/types";
import { currentUser } from "@/platform/auth/identity";
import { projectsContext, createSla, updateSla, removeSla } from "@/modules/projects/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SLA contracts are read through the section's main GET; this route only writes
// them, and writing needs the Manage grant on the SLA sub-section specifically.
async function guard(paramsPromise: Promise<Record<string, string>>): Promise<Guarded<ProjectsContext>> {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const ctx = await projectsContext(user, slug);
  if (ctx.error) {
    const status = ctx.error === "notfound" || ctx.error === "no-section" ? 404 : 403;
    return { fail: Response.json({ error: ctx.error }, { status }) };
  }
  if (!ctx.canManageSla) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return ctx;
}
const body = async (r: Request): Promise<Record<string, unknown>> => {
  try { return await r.json(); } catch { return {}; }
};

export async function POST(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const result = await createSla(g, await body(request));
  if (refused(result)) {
    // A refusal is not a malformed request. 403 so a client can tell "you may
    // not" from "you sent nonsense" — they need different handling.
    const status = result.error === "forbidden" ? 403 : result.error === "unknown-permission" ? 500 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true, sla: result.sla }, { status: 201 });
}

export async function PUT(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await updateSla(g, String(b.id), b);
  if (refused(result)) {
    const status = result.error === "notfound" ? 404 : result.error === "emergency-cap" ? 409 : 400;
    return Response.json(
      { error: result.error, ...("cap" in result ? { cap: result.cap } : {}) },
      { status },
    );
  }
  return Response.json({ ok: true, sla: result.sla });
}

export async function DELETE(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await removeSla(g, String(b.id));
  if (refused(result)) return Response.json({ error: result.error }, { status: 404 });
  return Response.json({ ok: true });
}
