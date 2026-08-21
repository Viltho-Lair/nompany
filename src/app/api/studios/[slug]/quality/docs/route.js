// THE DOCUMENT ENDPOINT.
//
// One route rather than four, because every call is about one collection and
// the guard in front of it is the same guard. What changes between them is the
// permission each asks for, and that is decided in the store rather than here —
// a route that decided its own authorisation would be a second place to keep
// the rules in step.
//
// The document application this replaces called Convex mutations straight from
// the browser against a guest id. Here every write goes through the studio
// context first, which is what makes the studio a tenant boundary rather than a
// label.

import { route } from "@/lib/route";
import { qualityContext } from "@/lib/quality";
import {
  listDocs, getDoc, createDoc, renameDoc, saveContent, savePageSetup, removeDoc,
} from "@/lib/qualityDocs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: qualityContext, name: "quality/docs" };
const writeSpec = { ...spec, body: true };
const idOf = (request) => new URL(request.url).searchParams.get("id") || "";

export const GET = route(spec, async ({ request, ...q }) => {
  const id = idOf(request);
  if (!id) return { documents: await listDocs(q) };
  return getDoc(q, id);
});

export const POST = route(writeSpec, async ({ body, ...q }) => {
  if (!q.canManage) return { error: "read-only" };

  const out = await createDoc(q, body);
  if (out.error) return out;
  return { status: 201, body: out };
});

/**
 * Three different writes share this door because they arrive on the same
 * debounce from the same screen: a title, a body, and a page-setup patch. Each
 * is applied only when its own key is present, so a save carrying just the
 * footer's alignment does not have to restate the document it belongs to.
 */
export const PATCH = route(writeSpec, async ({ request, body, ...q }) => {
  if (!q.canManage) return { error: "read-only" };

  const id = idOf(request);
  if (!id) return { error: "missing" };

  if (typeof body.content === "string") {
    const out = await saveContent(q, id, body);
    if (out.error) return out;
  }
  if (typeof body.title === "string") {
    const out = await renameDoc(q, id, body);
    if (out.error) return out;
  }

  // Whatever is left is page setup. Cleaned field by field in the store, so a
  // key nobody declared is dropped rather than written.
  const { content, title, ...setup } = body;
  if (Object.keys(setup).length) {
    const out = await savePageSetup(q, id, setup);
    // `empty` is not a failure here: a patch carrying only content or only a
    // title legitimately leaves nothing for page setup to apply.
    if (out.error && out.error !== "empty") return out;
  }

  return getDoc(q, id);
});

export const DELETE = route(writeSpec, async ({ request, ...q }) => {
  if (!q.canManage) return { error: "read-only" };

  const id = idOf(request);
  if (!id) return { error: "missing" };
  return removeDoc(q, id);
});
