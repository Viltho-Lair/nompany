// CONTENT & BRAND ASSETS (modules/marketing/assetsService).
//
// THE FILE IS NOT UPLOADED HERE. The screen sends it to `/api/media?kind=private`
// first, which verifies membership before it writes, and this route is given
// the id it hands back — so there is one upload door in the product rather than
// one per register.
//
// PUT CARRIES ONE NAMED ACTION — `replace`, which marks an asset as superseded
// by a newer one — and otherwise edits. Every right is asked inside the service.
import { route, refused } from "@/platform/http/route";
import { marketingContext } from "@/modules/marketing/campaigns";
import {
  listAssets, createAsset, editAsset, replaceAsset, deleteAsset,
} from "@/modules/marketing/assetsService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: marketingContext, body: true, name: "marketing-assets" };

export const GET = route({ ...spec, body: false }, async (m) => {
  const result = await listAssets(m);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (m) => {
  const result = await createAsset(m, m.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, asset: result.asset } };
});

export const PUT = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const id = String(m.body.id);
  const result = String(m.body.action || "") === "replace"
    ? await replaceAsset(m, id, String(m.body.replacementId || ""))
    : await editAsset(m, id, m.body);
  if (refused(result)) return result;
  return { ok: true, asset: result.asset };
});

export const DELETE = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await deleteAsset(m, String(m.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
