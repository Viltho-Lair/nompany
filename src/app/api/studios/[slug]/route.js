import { currentUser } from "@/lib/identity";
import { studioContext, canAdminister, listSections } from "@/lib/studios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Entering a studio by its address. The slug names the tenant; MEMBERSHIP
// authorises it — a non-member gets 403 and learns nothing about the studio.
export async function GET(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const context = await studioContext(user, slug);
  if (context.error) {
    return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  }
  const { studio, collaborator, access } = context;
  const sections = await listSections(studio.id);
  return Response.json({
    studio: { id: studio.id, name: studio.name, slug: studio.slug },
    // "Me, inside THIS studio" — alias/role exist only here.
    me: {
      collaboratorId: collaborator.id,
      alias: collaborator.alias,
      role: collaborator.role,
      canAdminister: canAdminister(access),
    },
    sections: sections.map((s) => ({ id: s.id, key: s.key, name: s.name, enabled: s.enabled })),
  });
}
