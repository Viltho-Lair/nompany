import { refused } from "@/platform/http/route";
import { currentUser } from "@/platform/auth/identity";
import { mainContext, headlines, recent } from "@/modules/main/main";
import { readAggregate } from "@/modules/main/executive";
import { awaitingQueue } from "@/modules/main/awaiting";
import { loadCatalogues, planOf } from "@/lib/plans";
import { enabledWidgets } from "@/lib/dashboardWidgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same order the gate() calls below fill widgets/locked in, so the all-locked
// shortcut below produces byte-identical output to the gated path.
const MAIN_WIDGET_KEYS = ["main.activity", "main.headline-trend", "main.event-ribbon", "main.awaiting-you"];

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

  const [figures, feed] = await Promise.all([headlines(main), recent(main)]);

  // WHICH EXECUTIVE WIDGETS THIS STUDIO'S TIER BOUGHT — resolved server-side,
  // the same way the studio page resolves it (page.js ~line 175), because
  // mainContext carries no plan of its own — access travels on it like on
  // every other module context (main.ts), but the plan/tier lookup is not
  // part of that, so it still happens here. Access is resolved once, never
  // re-derived per route (invariant 3). A locked widget's KEY reaches an
  // unentitled tier; its NUMBERS never do.
  const { packages, tiers } = await loadCatalogues();
  const plan = planOf(main.studio, packages, tiers);
  const entitled = enabledWidgets(plan);
  const widgets: Record<string, unknown> = {};
  const locked: string[] = [];

  // A basic-tier studio (the majority) is entitled to none of the four keys
  // below, so readAggregate/awaitingQueue would be computed only to be thrown
  // away — each reads several collections. Skip the reads entirely when
  // nothing is entitled; the response is identical either way.
  if (MAIN_WIDGET_KEYS.some((key) => entitled.has(key))) {
    const [agg, queue] = await Promise.all([readAggregate(main), awaitingQueue(main)]);
    const gate = (key: string, value: unknown) => {
      if (entitled.has(key)) widgets[key] = value;
      else locked.push(key);
    };
    gate("main.activity", agg.activity);
    gate("main.headline-trend", agg.trends);
    gate("main.event-ribbon", agg.ribbon);
    gate("main.awaiting-you", queue);
  } else {
    locked.push(...MAIN_WIDGET_KEYS);
  }

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
