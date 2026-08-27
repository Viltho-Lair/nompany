import { refused } from "@/platform/http/route";
import { statusFor } from "@/platform/http/httpStatus";
import { currentUser } from "@/platform/auth/identity";
import { mainContext } from "@/modules/main/main";
import { listEngagements } from "@/modules/main/engagements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A studio's deals, newest first. Permission is checked once, inside
// listEngagements — this route only surfaces whatever it refuses with
// (invariant 3: access is resolved once, never re-derived at the route).
export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const main = await mainContext(user, slug);
  if (refused(main)) {
    const status = main.error === "notfound" ? 404 : 403;
    return Response.json({ error: main.error }, { status });
  }

  // The cursor is untrusted input from the query string: anything that is not
  // a non-negative integer is treated as "start from the top" rather than
  // trusted through to zRange, which takes it as a raw score offset.
  const { searchParams } = new URL(request.url);
  const parsedCursor = Number.parseInt(searchParams.get("cursor") || "", 10);
  const cursor = Number.isFinite(parsedCursor) && parsedCursor >= 0 ? parsedCursor : 0;

  const result = await listEngagements({ studio: main.studio, access: main.access }, { cursor });
  if (refused(result)) {
    // listEngagements only ever refuses through requirePermission, so this is
    // "forbidden" (403) or the internal-bug case "unknown-permission" (500) —
    // never "notfound". statusFor carries that table rather than a route
    // re-deciding it, so the same refusal always costs the same status
    // everywhere it happens.
    return Response.json({ error: result.error }, { status: statusFor(result.error) });
  }

  return Response.json(result);
}
