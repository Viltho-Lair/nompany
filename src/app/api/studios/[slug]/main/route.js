import { currentUser } from "@/platform/auth/identity";
import { mainContext, headlines, recent } from "@/modules/main/main";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The studio's front door. Everything here is assembled from the sections this
// person can actually see — a section they have no grant for is not read at all,
// so no figure on this page can describe something the sidebar hides from them.
export async function GET(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const main = await mainContext(user, slug);
  if (main.error) {
    const status = main.error === "notfound" ? 404 : 403;
    return Response.json({ error: main.error }, { status });
  }

  const [figures, feed] = await Promise.all([headlines(main), recent(main)]);

  return Response.json({
    studio: { name: main.studio.name, slug: main.studio.slug },
    me: { alias: main.collaborator.alias || "", collaboratorId: main.collaborator.id },
    nav: main.nav,
    // Which sections this person can reach, so the home page can offer a way in
    // to each rather than guessing.
    sections: main.visible.map((s) => ({ key: s.key, name: s.name, parentId: s.parentId || null })),
    headlines: figures,
    recent: feed,
  });
}
