import { route, type RouteSpec } from "@/platform/http/route";
import { mainContext, headlines, recent, type MainContext } from "@/modules/main/main";
import { readAggregate } from "@/modules/main/executive";
import { awaitingQueue } from "@/modules/main/awaiting";
import { loadCatalogues, planOf } from "@/lib/plans";
import { enabledWidgets, switchboard, widgetAvailable, DASHBOARD_WIDGETS } from "@/lib/dashboardWidgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same order the gate() calls below fill widgets/locked in, so the all-locked
// shortcut below produces byte-identical output to the gated path.
const MAIN_WIDGET_KEYS = ["main.activity", "main.headline-trend", "main.event-ribbon", "main.awaiting-you"];

// The studio's front door. Everything here is assembled from the sections this
// person can actually see — a section they have no grant for is not read at all,
// so no figure on this page can describe something the sidebar hides from them.
//
// ON THE ROUTE WRAPPER NOW, and the reason is the studio page rather than tidiness:
// the page answers this GET inside its own render (`firstPayload`), so the front
// door paints with its figures instead of mounting empty and asking. The refusal
// statuses are unchanged — the wrapper maps `notfound` to 404 and `forbidden` to
// 403, which is exactly the ladder this route used to write by hand.
//
// THE ONE CAST, and it is about main's context being hand-rolled rather than
// built by the factory (main.ts says why): it answers studioContext's own
// refusal type, which the wrapper returns before the handler runs — exactly
// what it does for every factory-built context.
const spec: RouteSpec<MainContext> = {
  auth: "studio", context: mainContext as RouteSpec<MainContext>["context"], name: "main",
};

export const GET = route(spec, async (main) => {
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

  // THE SECOND GATE — what the studio RUNS, not what it bought. A widget whose
  // every source is switched off is not computed, not sent, and not offered as
  // a locked teaser: that teaser means "not bought yet", and a department the
  // owner switched off is a choice. It is listed in `hidden` so the screen can
  // leave it out rather than guess. A widget with SOME sources on is drawn from
  // those alone — `seen` already drops the rest.
  const on = switchboard(main.sections);
  const hidden = MAIN_WIDGET_KEYS.filter((key) =>
    !widgetAvailable(DASHBOARD_WIDGETS.find((w) => w.key === key), on));
  const shown = MAIN_WIDGET_KEYS.filter((key) => !hidden.includes(key));

  // A basic-tier studio (the majority) is entitled to none of the four keys
  // below, so readAggregate/awaitingQueue would be computed only to be thrown
  // away — each reads several collections. Skip the reads entirely when
  // nothing is entitled; the response is identical either way.
  if (shown.some((key) => entitled.has(key))) {
    const [agg, queue] = await Promise.all([readAggregate(main), awaitingQueue(main)]);
    const gate = (key: string, value: unknown) => {
      if (hidden.includes(key)) return;
      if (entitled.has(key)) widgets[key] = value;
      else locked.push(key);
    };
    gate("main.activity", agg.activity);
    gate("main.headline-trend", agg.trends);
    gate("main.event-ribbon", agg.ribbon);
    gate("main.awaiting-you", queue);
  } else {
    locked.push(...shown);
  }

  return {
    studio: { name: main.studio.name, slug: main.studio.slug },
    me: { alias: main.collaborator.alias || "", collaboratorId: main.collaborator.id },
    nav: main.nav,
    headlines: figures,
    recent: feed,
    executive: { widgets, locked, hidden },
  };
});
