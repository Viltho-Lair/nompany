import { financeGuard, setCommercials } from "@/lib/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (r) => { try { return await r.json(); } catch { return {}; } };

// The PO number and the project number — Finance's own fields, stored on the
// project. Nothing else about the project can be reached from here.
export async function PUT(request, ctx) {
  const g = await financeGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;

  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await setCommercials(g, b.id, b);
  if (result.error) {
    const status = result.error === "notfound" || result.error === "no-projects" ? 404 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true, project: result.project });
}
