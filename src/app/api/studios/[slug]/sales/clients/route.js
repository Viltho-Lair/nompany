import { currentUser } from "@/lib/identity";
import { salesContext, createClient, editClient, removeClient } from "@/lib/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Viewing Sales is enough to read; CHANGING it needs the Manage grant.
async function guard(paramsPromise, { write }) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const sales = await salesContext(user, slug);
  if (sales.error) {
    const status = sales.error === "notfound" || sales.error === "no-section" ? 404 : 403;
    return { fail: Response.json({ error: sales.error }, { status }) };
  }
  if (write && !sales.canManage) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return sales;
}
const body = async (request) => { try { return await request.json(); } catch { return {}; } };

export async function POST(request, ctx) {
  const g = await guard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createClient(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "duplicate" ? 409 : 400 });
  return Response.json({ ok: true, client: result.client }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await guard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await editClient(g, b.id, b);
  if (result.error) {
    return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : result.error === "duplicate" ? 409 : 400 });
  }
  return Response.json({ ok: true, client: result.client });
}

export async function DELETE(request, ctx) {
  const g = await guard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeClient(g, b.id);
  if (result.error) {
    // A client with tickets can't be deleted — that would orphan real work.
    return Response.json({ error: result.error, tickets: result.tickets }, { status: result.error === "in-use" ? 409 : 404 });
  }
  return Response.json({ ok: true });
}
