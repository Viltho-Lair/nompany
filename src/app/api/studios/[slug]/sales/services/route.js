import { currentUser } from "@/lib/identity";
import { salesContext, createService, editService, removeService } from "@/lib/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Sales service catalogue, owned by the sales-settings sub-section. Each
// row's id IS the serviceId a ticket stores.
async function guard(ctx) {
  const user = await currentUser();
  if (!user) return { res: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await ctx.params;
  const sales = await salesContext(user, slug);
  if (sales.error) {
    const status = sales.error === "notfound" || sales.error === "no-section" ? 404 : 403;
    return { res: Response.json({ error: sales.error }, { status }) };
  }
  // Managing the catalogue is a Settings right, not a Tickets one.
  if (!sales.canManageSettings) return { res: Response.json({ error: "read-only" }, { status: 403 }) };
  return { sales };
}

const done = (result) =>
  result.error
    ? Response.json(result, { status: result.error === "notfound" ? 404 : 400 })
    : Response.json(result);

export async function POST(request, ctx) {
  const { res, sales } = await guard(ctx);
  if (res) return res;
  return done(await createService(sales, await request.json().catch(() => ({}))));
}

export async function PUT(request, ctx) {
  const { res, sales } = await guard(ctx);
  if (res) return res;
  const body = await request.json().catch(() => ({}));
  if (!body.id) return Response.json({ error: "missing" }, { status: 400 });
  return done(await editService(sales, body.id, body));
}

export async function DELETE(request, ctx) {
  const { res, sales } = await guard(ctx);
  if (res) return res;
  const body = await request.json().catch(() => ({}));
  if (!body.id) return Response.json({ error: "missing" }, { status: 400 });
  return done(await removeService(sales, body.id));
}
