import { refused } from "@/platform/http/route";
import { currentUser } from "@/platform/auth/identity";
import { mainContext, headlines, recent } from "@/modules/main/main";
import { readAggregate } from "@/modules/main/executive";
import { awaitingQueue } from "@/modules/main/awaiting";
import { loadCatalogues, planOf } from "@/lib/plans";
import { enabledWidgets } from "@/lib/dashboardWidgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The studio's front door. Everything here is assembled from the sections this
// person can actually see — a section they have no grant for is not read at all,
// so no figure on this page can describe something the sidebar hides from them.
export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const main = await mainContext(user, slug);
  if (refused(main)) {
    const status = main.error === "notfound" ? 404 : 403;
    return Response.json({ error: main.error }, { status });
  }

  const [figures, feed, agg, queue] = await Promise.all([
    headlines(main), recent(main), readAggregate(main), awaitingQueue(main),
  ]);

  // WHICH EXECUTIVE WIDGETS THIS STUDIO'S TIER BOUGHT — resolved server-side,
  // the same way the studio page resolves it (page.js ~line 175), because
  // mainContext carries no plan of its own (it is the one context exempt from
  // "every context returns access", see main.ts) and access is resolved once,
  // never re-derived per route (invariant 3). A locked widget's KEY reaches an
  // unentitled tier; its NUMBERS never do.
  const { packages, tiers } = await loadCatalogues();
  const plan = planOf(main.studio, packages, tiers);
  const entitled = enabledWidgets(plan);
  const widgets: Record<string, unknown> = {};
  const locked: string[] = [];
  const gate = (key: string, value: unknown) => {
    if (entitled.has(key)) widgets[key] = value;
    else locked.push(key);
  };
  gate("main.activity", agg.activity);
  gate("main.headline-trend", agg.trends);
  gate("main.event-ribbon", agg.ribbon);
  gate("main.awaiting-you", queue);

  return Response.json({
    studio: { name: main.studio.name, slug: main.studio.slug },
    me: { alias: main.collaborator.alias || "", collaboratorId: main.collaborator.id },
    nav: main.nav,
    // Which sections this person can reach, so the home page can offer a way in
    // to each rather than guessing.
    sections: main.visible.map((s) => ({ key: s.key, name: s.name, parentId: s.parentId || null })),
    headlines: figures,
    recent: feed,
    executive: { widgets, locked },
  });
}
