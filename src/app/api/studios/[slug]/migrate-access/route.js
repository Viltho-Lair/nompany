import { currentUser } from "@/lib/identity";
import { studioContext } from "@/lib/studios";
import { planMigration, runMigration } from "@/lib/data/migrateAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// OWNER ONLY, and not because the permission model could not express it. This
// rewrites who can do what across the whole studio in one action; that belongs
// to the person who owns it, not to anyone they have granted people.members.edit.
async function owner(ctx) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) {
    return { fail: Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 }) };
  }
  if (context.collaborator.role !== "owner") {
    return { fail: Response.json({ error: "owner-only" }, { status: 403 }) };
  }
  return { context };
}

// The dry run. The SAME code path as the real thing with the writing switched
// off, so what it shows is what will happen rather than a second guess at it.
export async function GET(request, ctx) {
  const g = await owner(ctx);
  if (g.fail) return g.fail;
  return Response.json(await planMigration(g.context.studio.id));
}

export async function POST(request, ctx) {
  const g = await owner(ctx);
  if (g.fail) return g.fail;
  return Response.json({ ok: true, ...(await runMigration(g.context.studio.id)) });
}
