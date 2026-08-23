import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import {
  listAssets, createAsset, editAsset, disposeAsset, removeAsset, ASSET_METHODS,
} from "@/modules/finance/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: financeContext, body: true, name: "finance/assets" };

// listAssets gates itself (finance.assets.view) — unlike listBills, it does not
// trust the caller. So the read-gating convention here is the same rule as
// bills' (the assets section's own viewability), just already enforced one
// layer down: forward its refusal rather than re-checking `canViewAssets` and
// asking the same question twice.
export const GET = route(
  { auth: "studio", context: financeContext, name: "finance/assets" },
  async (fin) => {
    const result = await listAssets(fin);
    if (refused(result)) return result;
    return {
      canManage: fin.canManage,
      manage: fin.manage,
      nav: fin.nav,
      assets: result.assets,
      vocabulary: { assetMethods: ASSET_METHODS },
    };
  },
);

export const POST = route(spec, async (fin) => {
  const result = await createAsset(fin, fin.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, asset: result.asset } };
});

export const PUT = route(spec, async (fin) => {
  if (!fin.body.id) return { error: "missing" };

  const result = fin.body.dispose
    ? await disposeAsset(fin, fin.body.id, fin.body.dispose)
    : await editAsset(fin, fin.body.id, fin.body);

  if (refused(result)) return result;
  return { ok: true, asset: result.asset };
});

export const DELETE = route(spec, async (fin) => {
  if (!fin.body.id) return { error: "missing" };

  const result = await removeAsset(fin, fin.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
