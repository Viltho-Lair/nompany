import {
  qualityGuard, generateDocument, listGenerated, getGenerated,
  moveGenerated, regenerate, availableMoves, TRANSITIONS, letterheadFor, homeOf,
} from "@/lib/quality";
import { can } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

const status = (error) => {
  if (error === "forbidden") return 403;
  if (error === "unknown-permission") return 500;
  if (error === "notfound" || error === "no-record" || error === "no-section") return 404;
  // Every one of these is the DATA saying no: the blank has not been approved,
  // the document is not a template, or the move does not apply where it is.
  if (["not-issued", "not-a-template", "wrong-state", "no-subject"].includes(error)) return 409;
  return 400;
};

export async function GET(request, ctx) {
  const g = await qualityGuard(ctx.params);
  if (g.fail) return g.fail;

  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";

  if (id) {
    const found = await getGenerated(g, id);
    if (found.error) return Response.json({ error: found.error }, { status: status(found.error) });
    return Response.json({
      instance: found.instance,
      // The studio's own header and footer, so a generated document is
      // framed exactly like a controlled one.
      letterhead: letterheadFor(g),
      // Where Back goes: the screen the button that made this sits on.
      home: await homeOf(g, found.instance),
      // Computed from the same table the service enforces, so a button is only
      // ever drawn where pressing it would succeed.
      available: availableMoves(TRANSITIONS, found.instance.state, (p) => can(g.access, p)),
      canRegenerate: ["draft", "rejected"].includes(found.instance.state)
        && can(g.access, "quality.documents.edit"),
    });
  }

  return Response.json({
    generated: await listGenerated(g, {
      subjectType: url.searchParams.get("subjectType") || "",
      subjectId: url.searchParams.get("subjectId") || "",
    }),
  });
}

export async function POST(request, ctx) {
  const g = await qualityGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);

  if (b.action === "regenerate") {
    const result = await regenerate(g, b.id, b);
    if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
    return Response.json({ ok: true, instance: result.instance });
  }

  if (b.action && b.id) {
    const result = await moveGenerated(g, b.id, b.action, b);
    if (result.error) {
      return Response.json({ error: result.error, state: result.state }, { status: status(result.error) });
    }
    return Response.json({ ok: true, instance: result.instance });
  }

  const result = await generateDocument(g, b);
  if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
  return Response.json({ ok: true, instance: result.instance }, { status: 201 });
}
