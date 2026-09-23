import { route, type RouteSpec } from "@/platform/http/route";
import { mainContext, type MainContext } from "@/modules/main/main";
import { listEngagements } from "@/modules/main/engagements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A studio's deals, newest first. Permission is checked once, inside
// listEngagements — this route only surfaces whatever it refuses with
// (invariant 3: access is resolved once, never re-derived at the route).
//
// ON THE ROUTE WRAPPER NOW, for the studio page rather than tidiness: the page
// answers this GET inside its own render (`firstPayload`), so the engagements
// list paints at once instead of mounting on a skeleton and asking. The
// refusals are the ones this wrote by hand — the wrapper maps `notfound` to 404
// and `forbidden` to 403, and a refusal from listEngagements goes through the
// same `statusFor` this route already called.
//
// THE ONE CAST is main's, for main's reason (main/route.ts): its context is
// hand-rolled rather than built by the factory, and the refusal half it answers
// is returned by the wrapper before the handler ever runs.
const spec: RouteSpec<MainContext> = {
  auth: "studio", context: mainContext as RouteSpec<MainContext>["context"], name: "main/engagements",
  // A session alone, as before the move onto the wrapper.
  keys: false,
};

export const GET = route(spec, async ({ request, ...main }) => {
  // The cursor is untrusted input from the query string: anything that is not
  // a non-negative integer is treated as "start from the top" rather than
  // trusted through to zRange, which takes it as a raw score offset.
  const { searchParams } = new URL(request.url);
  const parsedCursor = Number.parseInt(searchParams.get("cursor") || "", 10);
  const cursor = Number.isFinite(parsedCursor) && parsedCursor >= 0 ? parsedCursor : 0;

  // listEngagements only ever refuses through requirePermission, so a refusal
  // is "forbidden" (403) or the internal-bug case "unknown-permission" (500) —
  // never "notfound". Returned as it is: the wrapper carries that table through
  // `statusFor` rather than a route re-deciding it, so the same refusal always
  // costs the same status everywhere it happens.
  return listEngagements({ studio: main.studio, access: main.access, sections: main.sections }, { cursor });
});
