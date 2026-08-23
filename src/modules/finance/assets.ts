// FIXED ASSETS (PPE) — what the studio owns and writes down over time.
//
// The one idea here: DEPRECIATION IS DERIVED, never stored. A schedule saved at
// acquisition goes stale the instant a useful life is corrected or a disposal is
// backdated, so the book value, the accumulated depreciation and this month's
// charge are all a pure function of the five stored fields (cost, salvage, life,
// method, dates) and the date you ask about. `depreciationOf` is that function —
// no studio, no session, no Redis — which is why it can be tested to the cent.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { str, day, cash } from "./finance";
import type { FixedAsset, FinanceContext } from "./types";

const ASSETS = "fixedAssets";
const Assets = repo<FixedAsset>(ASSETS);

export const ASSET_METHODS = ["straight-line", "reducing-balance"];

const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// Whole months from `from` to `to`, both ISO dates, never negative. A part
// month does not count — depreciation is charged per completed month, the same
// way a lease is. 2026-01-31 → 2026-02-28 is one month; → 2026-02-27 is zero.
function monthsBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  if (isNaN(a.getTime()) || isNaN(b.getTime()) || b <= a) return 0;
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  // Not a full final month yet if the day-of-month has not come round.
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export type Depreciation = {
  monthsElapsed: number;
  monthlyDepreciation: number;   // the charge for the CURRENT period
  accumulated: number;           // total written off to date
  bookValue: number;             // cost − accumulated, floored at salvage
  fullyDepreciated: boolean;
  disposed: boolean;
};

/**
 * WHAT AN ASSET IS WORTH, and how much has been written off, as of `asOf`. Two
 * methods:
 *
 *   straight-line — the depreciable base (cost − salvage) spread evenly over the
 *   useful life. The simplest and the default.
 *
 *   reducing-balance — a double-declining charge: a fixed rate (2 ÷ life) of the
 *   REMAINING book value each month, so more is written off early. Never taken
 *   below salvage, and computed month by month so an arbitrary `asOf` lands
 *   exactly where the running book would.
 *
 * Depreciation STOPS at disposal: once `disposedOn` is set, the clock runs only
 * to that date, never past it.
 */
export function depreciationOf(asset: Pick<FixedAsset, "cost" | "salvageValue" | "usefulLifeMonths" | "method" | "acquiredOn" | "disposedOn">, asOf = new Date().toISOString().slice(0, 10)): Depreciation {
  const cost = Math.max(0, Number(asset.cost) || 0);
  const salvage = Math.min(cost, Math.max(0, Number(asset.salvageValue) || 0));
  const life = Math.max(0, Math.floor(Number(asset.usefulLifeMonths) || 0));
  const disposed = !!asset.disposedOn;
  // The clock stops at disposal — nothing is written off after the asset is gone.
  const until = disposed && asset.disposedOn! < asOf ? asset.disposedOn! : asOf;
  const elapsedRaw = asset.acquiredOn ? monthsBetween(asset.acquiredOn, until) : 0;
  const months = life > 0 ? Math.min(life, elapsedRaw) : 0;
  const base = round(cost - salvage);

  if (base <= 0 || life <= 0) {
    return { monthsElapsed: months, monthlyDepreciation: 0, accumulated: 0, bookValue: round(cost), fullyDepreciated: base <= 0, disposed };
  }

  if (asset.method === "reducing-balance") {
    const rate = Math.min(1, 2 / life);   // double-declining, per month
    let book = cost;
    let accumulated = 0;
    let lastCharge = 0;
    for (let m = 0; m < months; m++) {
      // Pure declining balance asymptotes and never reaches salvage on its own,
      // so the FINAL month of the useful life writes off whatever remains down
      // to salvage — the standard convention that makes the asset land exactly
      // on its residual value at end of life.
      let charge = m === life - 1 ? round(book - salvage) : round(book * rate);
      // Never below salvage — earlier months taper as the book approaches it.
      if (book - charge < salvage) charge = round(book - salvage);
      if (charge < 0) charge = 0;
      book = round(book - charge);
      accumulated = round(accumulated + charge);
      lastCharge = charge;
    }
    return {
      monthsElapsed: months,
      monthlyDepreciation: months >= life ? 0 : lastCharge,
      accumulated,
      bookValue: round(cost - accumulated),
      fullyDepreciated: round(cost - accumulated) <= salvage,
      disposed,
    };
  }

  // straight-line
  const monthly = round(base / life);
  const accumulated = Math.min(base, round(monthly * months));
  return {
    monthsElapsed: months,
    monthlyDepreciation: months >= life ? 0 : monthly,
    accumulated: round(accumulated),
    bookValue: round(cost - accumulated),
    fullyDepreciated: months >= life,
    disposed,
  };
}

/** An asset as the list hands it over: the stored row plus its derived book value. */
function withDepreciation(asset: FixedAsset, asOf?: string): FixedAsset & Depreciation & { gainOnDisposal?: number } {
  const dep = depreciationOf(asset, asOf);
  const out: FixedAsset & Depreciation & { gainOnDisposal?: number } = { ...asset, ...dep };
  // A disposed asset carries the gain or loss against its book value at disposal:
  // proceeds − what it was still worth. Positive is a gain, negative a loss.
  if (asset.disposedOn) {
    out.gainOnDisposal = round((Number(asset.disposalProceeds) || 0) - dep.bookValue);
  }
  return out;
}

export async function listAssets(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.assets.view");
  if (denied) return denied;
  const { studio, assetsSection } = ctx;
  const assets = await Assets.find({ studio, section: assetsSection });
  const rows = [...assets]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((a) => withDepreciation(a));
  return { assets: rows };
}

export async function createAsset(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.assets.create");
  if (denied) return denied;

  const { studio, assetsSection, collaborator } = ctx;
  const name = str(body?.name, 160);
  if (!name) return { error: "name" };
  const cost = cash(body?.cost);
  if (!cost) return { error: "cost" };
  const usefulLifeMonths = Math.max(0, Math.floor(Number(body?.usefulLifeMonths) || 0));
  if (!usefulLifeMonths) return { error: "life" };
  const method = ASSET_METHODS.includes(String(body?.method)) ? String(body?.method) : "straight-line";

  const assets = await Assets.find({ studio, section: assetsSection });
  const asset = await Assets.create({ studio, section: assetsSection }, {
    reference: await nextReference(studio.id, { rows: assets, field: "reference", prefix: "FA" }),
    name,
    category: str(body?.category, 120),
    acquiredOn: day(body?.acquiredOn) || new Date().toISOString().slice(0, 10),
    cost,
    // Salvage cannot exceed cost — an asset worth nothing new cannot be worth
    // more scrapped.
    salvageValue: Math.min(cost, cash(body?.salvageValue)),
    usefulLifeMonths,
    method,
    projectId: str(body?.projectId, 60),
    custodianCollaboratorId: str(body?.custodianCollaboratorId, 60),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { asset: withDepreciation(asset) };
}

export async function editAsset(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.assets.edit");
  if (denied) return denied;

  const { studio, assetsSection } = ctx;
  const current = (await Assets.find({ studio, section: assetsSection })).find((a) => a.id === id);
  if (!current) return { error: "notfound" };
  // A disposed asset is history — reverse the disposal (a future action) rather
  // than editing what was sold.
  if (current.disposedOn) return { error: "disposed" };

  const patch: Record<string, unknown> = {};
  if (body?.name !== undefined) { const v = str(body.name, 160); if (!v) return { error: "name" }; patch.name = v; }
  if (body?.category !== undefined) patch.category = str(body.category, 120);
  if (body?.acquiredOn !== undefined) patch.acquiredOn = day(body.acquiredOn);
  if (body?.cost !== undefined) { const c = cash(body.cost); if (!c) return { error: "cost" }; patch.cost = c; }
  if (body?.salvageValue !== undefined) patch.salvageValue = cash(body.salvageValue);
  if (body?.usefulLifeMonths !== undefined) {
    const l = Math.max(0, Math.floor(Number(body.usefulLifeMonths) || 0));
    if (!l) return { error: "life" };
    patch.usefulLifeMonths = l;
  }
  if (body?.method !== undefined && ASSET_METHODS.includes(String(body.method))) patch.method = String(body.method);
  if (body?.projectId !== undefined) patch.projectId = str(body.projectId, 60);
  if (body?.custodianCollaboratorId !== undefined) patch.custodianCollaboratorId = str(body.custodianCollaboratorId, 60);

  // Keep salvage ≤ cost even when only one of the two moves.
  const nextCost = patch.cost !== undefined ? Number(patch.cost) : current.cost;
  const nextSalvage = patch.salvageValue !== undefined ? Number(patch.salvageValue) : (current.salvageValue || 0);
  if (nextSalvage > nextCost) patch.salvageValue = nextCost;

  const asset = await Assets.update({ studio, section: assetsSection }, id, patch);
  return asset ? { asset: withDepreciation(asset) } : { error: "notfound" };
}

/**
 * DISPOSE OF AN ASSET — retire it, optionally for some proceeds. The gain or
 * loss is DERIVED (proceeds − book value at the disposal date), never stored, so
 * it stays correct if the useful life is later corrected. Once disposed the
 * asset stops depreciating at `disposedOn`.
 */
export async function disposeAsset(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.assets.dispose");
  if (denied) return denied;

  const { studio, assetsSection, collaborator } = ctx;
  const current = (await Assets.find({ studio, section: assetsSection })).find((a) => a.id === id);
  if (!current) return { error: "notfound" };
  if (current.disposedOn) return { error: "already-disposed", on: current.disposedOn };

  const disposedOn = day(body?.disposedOn) || new Date().toISOString().slice(0, 10);
  // Cannot dispose before it was acquired.
  if (current.acquiredOn && disposedOn < current.acquiredOn) return { error: "before-acquired" };

  const asset = await Assets.update({ studio, section: assetsSection }, id, () => ({
    disposedOn,
    disposalProceeds: cash(body?.disposalProceeds),
    disposedByCollaboratorId: collaborator.id,
    disposedAt: new Date().toISOString(),
  }));
  return asset ? { asset: withDepreciation(asset) } : { error: "notfound" };
}

export async function removeAsset(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.assets.edit");
  if (denied) return denied;
  const { studio, assetsSection } = ctx;
  const current = (await Assets.find({ studio, section: assetsSection })).find((a) => a.id === id);
  if (!current) return { error: "notfound" };
  // A disposed asset is part of the record — it stays.
  if (current.disposedOn) return { error: "disposed" };
  const removed = await Assets.remove({ studio, section: assetsSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}
