import { qualityGuard, subjectOptions } from "@/lib/quality";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The records a document may be bound to.
//
// Its own route rather than a branch of the content payload, because a list of
// every sales ticket IS Sales data: it is permission-checked in its own right,
// and it should only be fetched when somebody actually opens the picker rather
// than on every open of every document.
export async function GET(request, ctx) {
  const g = await qualityGuard(ctx.params);
  if (g.fail) return g.fail;

  const type = new URL(request.url).searchParams.get("subject") || "";
  const result = await subjectOptions(g, type);
  if (result.error) {
    return Response.json({ error: result.error }, { status: result.error === "forbidden" ? 403 : 400 });
  }
  return Response.json(result);
}
