// THE DOCUMENT ENDPOINT.
//
// One route rather than four, because every call is about one collection and
// the guard in front of it is the same guard. What changes between them is the
// permission each asks for, and that is decided in the store rather than here —
// a route that decided its own authorisation would be a second place to keep
// the rules in step.
//
// The document application this replaces called Convex mutations straight from
// the browser against a guest id. Here every write goes through qualityGuard
// first, which is what makes the studio a tenant boundary rather than a label.

import { qualityGuard } from "@/lib/quality";
import {
  listDocs, getDoc, createDoc, renameDoc, saveContent, savePageSetup, removeDoc,
} from "@/lib/qualityDocs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bad = (out) => {
  const status = out.error === "notfound" ? 404
    : out.error === "forbidden" || out.error === "denied" ? 403
    : out.error === "controlled" ? 409
    : 400;
  return Response.json(out, { status });
};

export async function GET(request, ctx) {
  const g = await qualityGuard(ctx.params);
  if (g.fail) return g.fail;

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ documents: await listDocs(g) });

  const out = await getDoc(g, id);
  return out.error ? bad(out) : Response.json(out);
}

export async function POST(request, ctx) {
  const g = await qualityGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;

  const out = await createDoc(g, await request.json().catch(() => ({})));
  return out.error ? bad(out) : Response.json(out, { status: 201 });
}

/**
 * Three different writes share this door because they arrive on the same
 * debounce from the same screen: a title, a body, and a page-setup patch. Each
 * is applied only when its own key is present, so a save carrying just the
 * footer's alignment does not have to restate the document it belongs to.
 */
export async function PATCH(request, ctx) {
  const g = await qualityGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "missing" }, { status: 400 });

  const body = await request.json().catch(() => ({}));

  if (typeof body.content === "string") {
    const out = await saveContent(g, id, body);
    if (out.error) return bad(out);
  }
  if (typeof body.title === "string") {
    const out = await renameDoc(g, id, body);
    if (out.error) return bad(out);
  }

  // Whatever is left is page setup. Cleaned field by field in the store, so a
  // key nobody declared is dropped rather than written.
  const { content, title, ...setup } = body;
  if (Object.keys(setup).length) {
    const out = await savePageSetup(g, id, setup);
    if (out.error && out.error !== "empty") return bad(out);
  }

  return Response.json(await getDoc(g, id));
}

export async function DELETE(request, ctx) {
  const g = await qualityGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "missing" }, { status: 400 });

  const out = await removeDoc(g, id);
  return out.error ? bad(out) : Response.json(out);
}
