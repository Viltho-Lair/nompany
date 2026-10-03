import { route, type RouteSpec } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { mainContext, type MainContext } from "@/modules/main/main";
import { workBoard } from "@/modules/main/work";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE WORK IN HAND, on the front door (modules/main/work). Its own request
// rather than part of `/main`'s, because a deal's progress costs several reads
// and the front door paints its figures inside the page's own render — the
// board arrives a moment later instead of holding up everything above it.
//
// Main's right opens it; each LANE then answers to its own department's rights
// and switch (`readIfVisible`), so nothing here shows what its screen would not.
const spec: RouteSpec<MainContext> = {
  auth: "studio", context: mainContext as RouteSpec<MainContext>["context"], name: "main.work",
  keys: false,
};

export const GET = route(spec, async (main) => {
  if (requirePermission(main.access, "main.view")) return { error: "forbidden" };
  return { lanes: await workBoard(main) };
});
