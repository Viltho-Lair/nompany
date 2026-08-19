import { qualityGuard, createDocument, updateDocument, removeDocument, setCallPoint } from "@/lib/quality";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

// A refusal is not a malformed request: 403 so a client can tell "you may not"
// from "you sent nonsense", because those need different handling on screen.
const status = (error) => {
  if (error === "forbidden") return 403;
  if (error === "unknown-permission") return 500;
  if (error === "notfound") return 404;
  // The document is issued, so it is retained rather than deleted. That is a
  // rule about the RECORD, not about the caller — a 409, not a 403.
  if (error === "controlled") return 409;
  // Somebody else already runs from that button, or the document is not a
  // template. The data saying no, not a malformed request.
  if (error === "call-point-taken" || error === "not-a-template") return 409;
  return 400;
};

export async function POST(request, ctx) {
  const g = await qualityGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createDocument(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
  return Response.json({ ok: true, document: result.document }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await qualityGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  // Where a template is requested from is ROUTING, not content, and it answers
  // to the setup right rather than to edit.
  if (b.callPointId !== undefined) {
    const bound = await setCallPoint(g, b.id, b);
    if (bound.error) return Response.json({ error: bound.error }, { status: status(bound.error) });
    return Response.json({ ok: true, document: bound.document });
  }

  const result = await updateDocument(g, b.id, b);
  if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
  return Response.json({ ok: true, document: result.document });
}

export async function DELETE(request, ctx) {
  const g = await qualityGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeDocument(g, b.id);
  if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
  return Response.json({ ok: true });
}
