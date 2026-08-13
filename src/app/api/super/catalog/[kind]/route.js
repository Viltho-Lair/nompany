import { currentSuperAdmin } from "@/lib/superAuth";
import { isKind, listCatalog, createCatalogItem, updateCatalogItem, deleteCatalogItem } from "@/lib/data/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One route for packages, tiers and ERP services: same shape, same gate, and the
// per-kind cleaning lives in the data module rather than being repeated here.
async function open(ctx) {
  const admin = await currentSuperAdmin();
  if (!admin) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { kind } = await ctx.params;
  if (!isKind(kind)) return { fail: Response.json({ error: "unknown-kind" }, { status: 404 }) };
  return { kind };
}
const body = async (request) => { try { return await request.json(); } catch { return {}; } };

export async function GET(request, ctx) {
  const g = await open(ctx);
  if (g.fail) return g.fail;
  return Response.json({ items: await listCatalog(g.kind) });
}

export async function POST(request, ctx) {
  const g = await open(ctx);
  if (g.fail) return g.fail;
  return Response.json({ ok: true, item: await createCatalogItem(g.kind, await body(request)) }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await open(ctx);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const item = await updateCatalogItem(g.kind, b.id, b);
  return item ? Response.json({ ok: true, item }) : Response.json({ error: "notfound" }, { status: 404 });
}

export async function DELETE(request, ctx) {
  const g = await open(ctx);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const gone = await deleteCatalogItem(g.kind, b.id);
  return gone ? Response.json({ ok: true }) : Response.json({ error: "notfound" }, { status: 404 });
}
