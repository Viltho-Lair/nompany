import { currentUser } from "@/lib/identity";
import { projectsContext, createOvertime, updateOvertime, removeOvertime } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Overtime records are read through the section's main GET; this route only
// writes them, and writing needs the Manage grant on the Overtimes sub-section.
async function guard(paramsPromise) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const ctx = await projectsContext(user, slug);
  if (ctx.error) {
    const status = ctx.error === "notfound" || ctx.error === "no-section" ? 404 : 403;
    return { fail: Response.json({ error: ctx.error }, { status }) };
  }
  if (!ctx.canManageOvertimes) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return ctx;
}
const body = async (r) => { try { return await r.json(); } catch { return {}; } };

// One request, one row per person selected.
export async function POST(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const result = await createOvertime(g, await body(request));
  if (result.error) {
    // A refusal is not a malformed request. 403 so a client can tell "you may
    // not" from "you sent nonsense" — they need different handling.
    const status = result.error === "forbidden" ? 403 : result.error === "unknown-permission" ? 500 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true, overtimes: result.overtimes }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await updateOvertime(g, b.id, b);
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : 400 });
  return Response.json({ ok: true, overtime: result.overtime });
}

export async function DELETE(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await removeOvertime(g, b.id);
  if (result.error) return Response.json({ error: result.error }, { status: 404 });
  return Response.json({ ok: true });
}
