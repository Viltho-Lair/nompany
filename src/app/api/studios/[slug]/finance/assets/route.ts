import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import {
  listAssets, createAsset, editAsset, disposeAsset, removeAsset, depreciationRun, ASSET_METHODS, FUNDING_SOURCES,
} from "@/modules/finance/assets";
import { repo } from "@/platform/db/repo";

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
    // THE BILLS AN ASSET CAN SAY IT WAS BOUGHT ON — reference, supplier and
    // total, nothing else — and only for a reader who may open Payables. The
    // cost of the pick is one read; without it "bought on a bill" could only be
    // typed as an id.
    const bills = fin.canViewPayables
      ? (await repo<{ id: string; reference?: string; vendorName?: string; status?: string }>("bills")
        .find({ studio: fin.studio, section: fin.payablesSection }))
        .filter((b) => b.status !== "Draft" && b.status !== "Cancelled")
        .map((b) => ({ id: b.id, reference: b.reference || "", vendorName: b.vendorName || "" }))
      : [];
    return {
      canManage: fin.canManage,
      manage: fin.manage,
      nav: fin.nav,
      assets: result.assets,
      vocabulary: { assetMethods: ASSET_METHODS, fundingSources: FUNDING_SOURCES, bills },
    };
  },
);

export const POST = route(spec, async (fin) => {
  // THE DEPRECIATION RUN shares the door: `{ depreciation: { period, post } }`
  // previews a month, and with `post` writes it. It is not an asset, so it is
  // named in the body rather than guessed from its shape.
  if (fin.body.depreciation) {
    const run = await depreciationRun(fin, fin.body.depreciation);
    if (refused(run)) return run;
    return { ok: true, run };
  }
  const result = await createAsset(fin, fin.body);
  if (refused(result)) return result;
  // THE BOOKS' ANSWER TRAVELS BACK, as it does for invoices and bills — a
  // refusal dropped here would report success with the ledger an entry short.
  return { status: 201, body: { ok: true, asset: result.asset, ...("posting" in result ? { posting: result.posting } : {}) } };
});

export const PUT = route(spec, async (fin) => {
  if (!fin.body.id) return { error: "missing" };

  const result = fin.body.dispose
    ? await disposeAsset(fin, fin.body.id, fin.body.dispose)
    : await editAsset(fin, fin.body.id, fin.body);

  if (refused(result)) return result;
  return { ok: true, asset: result.asset, ...("posting" in result ? { posting: result.posting } : {}) };
});

export const DELETE = route(spec, async (fin) => {
  if (!fin.body.id) return { error: "missing" };

  const result = await removeAsset(fin, fin.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
