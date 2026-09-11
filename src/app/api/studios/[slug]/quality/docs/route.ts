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

import { route, refused } from "@/platform/http/route";
import { qualityContext, fieldsFor, bindSubject } from "@/modules/quality/quality";
import { layoutStateFor, setDefaultLayout, createStarterLayout } from "@/modules/quality/print";
import {
  listDocs, getDoc, createDoc, renameDoc, saveContent, savePageSetup, removeDoc,
} from "@/modules/quality/qualityDocs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: qualityContext, name: "quality/docs" };
const writeSpec = { ...spec, body: true };
const idOf = (request: Request) => new URL(request.url).searchParams.get("id") || "";

export const GET = route(spec, async ({ request, ...q }) => {
  const id = idOf(request);
  if (!id) return { documents: await listDocs(q) };
  const out = await getDoc(q, id);
  if ("error" in out) return out;
  // WHAT THE INSERT-FIELD MENU OFFERS this reader on this document: what the
  // document's subject can reach AND what they may read — see fieldsFor. Served
  // with the document so the menu and the save-time allowlist cannot disagree.
  return {
    ...out,
    fields: fieldsFor(q, out.document).groups,
    // WHAT IT IS AS A CUSTOMER LAYOUT, when it is one — see layoutStateFor.
    layout: await layoutStateFor(q, out.document),
  };
});

export const POST = route(writeSpec, async ({ body, ...q }) => {
  if (!q.canManage) return { error: "read-only" };

  // A STARTER LAYOUT — offered by the print page when a studio has none.
  if (body?.starter) {
    const starter = await createStarterLayout(q, body);
    if (refused(starter)) return starter;
    return { status: 201, body: starter };
  }

  const out = await createDoc(q, body);
  if (refused(out)) return out;
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

  // WHAT THIS DOCUMENT IS A LAYOUT FOR — a quotation, an invoice, or nothing.
  // Refused on an issued document with no revision open, exactly as its body
  // is: the subject decides what every placeholder resolves against, so
  // changing it would change what a published layout prints with no revision
  // recording that anything happened.
  if (typeof body.subjectType === "string") {
    const current = await getDoc(q, id);
    if ("error" in current) return current;
    if (!current.canEdit) return { error: "issued" };
    const out = await bindSubject(q, id, body);
    if (refused(out)) return out;
  }

  // THE ONE CUSTOMERS RECEIVE, or not any more. Its own right and its own
  // refusals — see setDefaultLayout — and nothing else rides with it.
  if (typeof body.defaultLayout === "boolean") {
    const out = await setDefaultLayout(q, id, body.defaultLayout);
    if (refused(out)) return out;
  }

  if (typeof body.content === "string") {
    const out = await saveContent(q, id, body);
    if (refused(out)) return out;
  }
  if (typeof body.title === "string") {
    const out = await renameDoc(q, id, body);
    if (refused(out)) return out;
  }

  // Whatever is left is page setup. Cleaned field by field in the store, so a
  // key nobody declared is dropped rather than written.
  const { content, title, subjectType, subjectId, defaultLayout, ...setup } = body;
  if (Object.keys(setup).length) {
    const out = await savePageSetup(q, id, setup);
    // `empty` is not a failure here: a patch carrying only content or only a
    // title legitimately leaves nothing for page setup to apply.
    if (refused(out) && out.error !== "empty") return out;
  }

  return getDoc(q, id);
});

export const DELETE = route(writeSpec, async ({ request, ...q }) => {
  if (!q.canManage) return { error: "read-only" };

  const id = idOf(request);
  if (!id) return { error: "missing" };
  return removeDoc(q, id);
});
