import { route } from "@/lib/route";
import { isKind, listCatalog, createCatalogItem, updateCatalogItem, deleteCatalogItem } from "@/lib/data/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One route for packages, tiers and ERP services: same shape, same gate, and the
// per-kind cleaning lives in the data module rather than being repeated here.
const spec = { auth: "super", body: true, name: "super/catalog/[kind]" };

// A kind that is not one of the three is a 404, not a 400 — the caller asked for
// a catalogue that does not exist, which is the same answer as asking for a row
// that does not exist.
const known = (kind) => (isKind(kind) ? null : { error: "unknown-kind" });

export const GET = route({ ...spec, body: false }, async ({ params }) => {
  const refusal = known(params.kind);
  if (refusal) return refusal;
  return { items: await listCatalog(params.kind) };
});

export const POST = route(spec, async ({ params, body }) => {
  const refusal = known(params.kind);
  if (refusal) return refusal;
  return { status: 201, body: { ok: true, item: await createCatalogItem(params.kind, body) } };
});

export const PUT = route(spec, async ({ params, body }) => {
  const refusal = known(params.kind);
  if (refusal) return refusal;
  if (!body.id) return { error: "missing" };

  const item = await updateCatalogItem(params.kind, body.id, body);
  if (!item) return { error: "notfound" };
  return { ok: true, item };
});

export const DELETE = route(spec, async ({ params, body }) => {
  const refusal = known(params.kind);
  if (refusal) return refusal;
  if (!body.id) return { error: "missing" };

  const gone = await deleteCatalogItem(params.kind, body.id);
  if (!gone) return { error: "notfound" };
  return { ok: true };
});
