// FIXED ASSETS (PPE) — what the studio owns and writes down over time.
//
// The one idea here: DEPRECIATION IS DERIVED, never stored. A schedule saved at
// acquisition goes stale the instant a useful life is corrected or a disposal is
// backdated, so the book value, the accumulated depreciation and this month's
// charge are all a pure function of the five stored fields (cost, salvage, life,
// method, dates) and the date you ask about. `depreciationOf` is that function —
// no studio, no session, no Redis — which is why it can be tested to the cent.

import { requirePermission } from "@/platform/access";
import { seriesSetting } from "@/modules/administration/numbering";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { str, day, cash } from "./finance";
import { roundMoney } from "@/shared/money";
import { depreciationOf, depreciationDue, isFunding, FUNDING_SOURCES } from "./depreciation";
import type { Depreciation } from "./depreciation";
import { assetBookState, lastDayOf } from "./ledger";
import { autoPost, autoReverse, autoRepost } from "./posting";
import type { FixedAsset, FinanceContext } from "./types";

const ASSETS = "fixedAssets";
const Assets = repo<FixedAsset>(ASSETS);

export const ASSET_METHODS = ["straight-line", "reducing-balance"];
export { FUNDING_SOURCES };

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * HOW IT WAS PAID FOR, cleaned: a known source, and the bill it names when the
 * source is a bill. A bill source with no bill is no source — the posting would
 * have nothing to move the cost out of.
 */
function funding(body: Record<string, unknown>): { fundedBy: string; fundedByBillId: string } | null {
  const fundedBy = String(body?.fundedBy ?? "");
  if (!isFunding(fundedBy)) return null;
  const fundedByBillId = fundedBy === "bill" ? str(body?.fundedByBillId, 60) : "";
  if (fundedBy === "bill" && !fundedByBillId) return null;
  return { fundedBy, fundedByBillId };
}


// THE ARITHMETIC IS IN ./depreciation, which is pure, so the ledger's
// depreciation run and this register compute one schedule rather than two.
export { depreciationOf } from "./depreciation";
export type { Depreciation } from "./depreciation";

/** An asset as the list hands it over: the stored row plus its derived book value. */
function withDepreciation(asset: FixedAsset, currency: unknown, asOf?: string): FixedAsset & Depreciation & { gainOnDisposal?: number } {
  const dep = depreciationOf(asset, asOf, currency);
  const out: FixedAsset & Depreciation & { gainOnDisposal?: number } = { ...asset, ...dep };
  // A disposed asset carries the gain or loss against its book value at disposal:
  // proceeds − what it was still worth. Positive is a gain, negative a loss.
  if (asset.disposedOn) {
    out.gainOnDisposal = roundMoney((Number(asset.disposalProceeds) || 0) - dep.bookValue, currency);
  }
  return out;
}

export async function listAssets(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.assets.view");
  if (denied) return denied;
  const { studio, assetsSection } = ctx;
  const [assets, book] = await Promise.all([
    Assets.find({ studio, section: assetsSection }),
    assetBookState(ctx),
  ]);
  const rows = [...assets]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((a) => ({
      ...withDepreciation(a, studio.currency),
      // WHAT THE BOOK HOLDS, beside what the schedule says — so the register can
      // say "not on the books" rather than implying a cost the ledger never saw.
      onBooks: !!book.get(a.id)?.booked,
      depreciationPosted: book.get(a.id)?.depreciated || 0,
      disposalPosted: !!book.get(a.id)?.disposed,
    }));
  return { assets: rows };
}

export async function createAsset(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.assets.create");
  if (denied) return denied;

  const { studio, assetsSection, collaborator } = ctx;
  const name = str(body?.name, 160);
  if (!name) return { error: "name" };
  const cost = cash(body?.cost, studio.currency);
  if (!cost) return { error: "cost" };
  const usefulLifeMonths = Math.max(0, Math.floor(Number(body?.usefulLifeMonths) || 0));
  if (!usefulLifeMonths) return { error: "life" };
  const method = ASSET_METHODS.includes(String(body?.method)) ? String(body?.method) : "straight-line";

  const assets = await Assets.find({ studio, section: assetsSection });
  const asset = await Assets.create({ studio, section: assetsSection }, {
    reference: await nextReference(studio.id, { rows: assets, field: "reference", ...seriesSetting("asset", studio.numbering) }),
    name,
    category: str(body?.category, 120),
    acquiredOn: day(body?.acquiredOn) || new Date().toISOString().slice(0, 10),
    cost,
    // Salvage cannot exceed cost — an asset worth nothing new cannot be worth
    // more scrapped.
    salvageValue: Math.min(cost, cash(body?.salvageValue, studio.currency)),
    usefulLifeMonths,
    method,
    projectId: str(body?.projectId, 60),
    custodianCollaboratorId: str(body?.custodianCollaboratorId, 60),
    ...(funding(body) || {}),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  // ON THE BOOKS ONLY WHEN SOMEBODY SAID HOW IT WAS PAID FOR. Without that the
  // asset is registered and not posted — see FUNDING_SOURCES for why a default
  // would count the money twice.
  const posting = asset.fundedBy ? await autoPost(ctx, "asset", asset.id) : null;
  return { asset: withDepreciation(asset, ctx.studio.currency), ...(posting ? { posting } : {}) };
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
  if (body?.cost !== undefined) { const c = cash(body.cost, ctx.studio.currency); if (!c) return { error: "cost" }; patch.cost = c; }
  if (body?.salvageValue !== undefined) patch.salvageValue = cash(body.salvageValue, ctx.studio.currency);
  if (body?.usefulLifeMonths !== undefined) {
    const l = Math.max(0, Math.floor(Number(body.usefulLifeMonths) || 0));
    if (!l) return { error: "life" };
    patch.usefulLifeMonths = l;
  }
  if (body?.method !== undefined && ASSET_METHODS.includes(String(body.method))) patch.method = String(body.method);
  if (body?.projectId !== undefined) patch.projectId = str(body.projectId, 60);
  if (body?.custodianCollaboratorId !== undefined) patch.custodianCollaboratorId = str(body.custodianCollaboratorId, 60);

  // HOW IT WAS PAID FOR. Saying it on an asset that is not yet on the books is
  // what PUTS it there; changing it on one that is re-posts the acquisition.
  if (body?.fundedBy !== undefined) {
    const f = funding(body);
    if (!f) return { error: "funding" };
    Object.assign(patch, f);
  }

  // Keep salvage ≤ cost even when only one of the two moves.
  const nextCost = patch.cost !== undefined ? Number(patch.cost) : current.cost;
  const nextSalvage = patch.salvageValue !== undefined ? Number(patch.salvageValue) : (current.salvageValue || 0);
  if (nextSalvage > nextCost) patch.salvageValue = nextCost;

  const asset = await Assets.update({ studio, section: assetsSection }, id, patch);
  if (!asset) return { error: "notfound" };
  // THE ACQUISITION FOLLOWS THE ASSET: posted the first time a source is given,
  // replaced when the cost, the date or the source moves. Depreciation is not
  // touched here — the next run trues the book up to the corrected schedule.
  const booked = !!(await assetBookState(ctx)).get(id)?.booked;
  const moved = patch.cost !== undefined || patch.acquiredOn !== undefined || patch.fundedBy !== undefined || patch.fundedByBillId !== undefined;
  const posting = !booked && asset.fundedBy
    ? await autoPost(ctx, "asset", id)
    : booked && moved
      ? await autoRepost(ctx, "asset", id, `Asset ${asset.reference} corrected`)
      : null;
  return { asset: withDepreciation(asset, ctx.studio.currency), ...(posting ? { posting } : {}) };
}

/**
 * THE MONTH'S DEPRECIATION RUN — a preview, and on request the postings.
 *
 * PREVIEW FIRST, because a run writes one entry per asset and somebody should
 * see the list before it lands. Each row is what `depreciationDue` says the
 * book is short to the month's last day; a month already run for an asset shows
 * as posted and is not posted again. An asset not on the books is listed apart
 * rather than silently skipped: it is the one thing on this screen somebody
 * has to go and answer.
 *
 * `finance.assets.edit`, the right that maintains the register, runs it; the
 * entries post under the studio's authority like every other document's.
 */
export async function depreciationRun(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, body?.post ? "finance.assets.edit" : "finance.assets.view");
  if (denied) return denied;
  const period = String(body?.period ?? "");
  if (!PERIOD_RE.test(period)) return { error: "period" };

  const { studio, assetsSection } = ctx;
  const [assets, book] = await Promise.all([Assets.find({ studio, section: assetsSection }), assetBookState(ctx)]);
  const asOf = lastDayOf(period);
  const rows: { id: string; reference: string; name: string; due: number; state: string; posting?: unknown }[] = [];
  for (const a of assets) {
    // Not yet acquired by the month's end, or disposed — the disposal entry
    // charges whatever a run had not reached by the day it went.
    if (a.disposedOn || (a.acquiredOn && a.acquiredOn > asOf)) continue;
    const held = book.get(a.id);
    if (!held?.booked) { rows.push({ id: a.id, reference: a.reference, name: a.name, due: 0, state: "off-books" }); continue; }
    const due = depreciationDue(a, held.depreciated, asOf, studio.currency);
    rows.push({ id: a.id, reference: a.reference, name: a.name, due, state: due === 0 ? "nothing-due" : "due" });
  }

  if (body?.post) {
    for (const r of rows) {
      if (r.state !== "due") continue;
      const answer = await autoPost(ctx, "depreciation", `${r.id}:${period}`);
      r.posting = answer;
      r.state = answer.posted ? "posted" : "refused";
    }
  }
  rows.sort((x, y) => x.reference.localeCompare(y.reference));
  return { period, asOf, rows };
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

  // CAPTURED ONCE. This is a function-patch (invariant 8), so updateRow may
  // call it more than once — a CAS retry under contention, or once per store
  // under NOMPANY_DB=parity — and `new Date().toISOString()` called fresh
  // inside the closure disagreed by however many milliseconds separated those
  // calls. Parity's byte-for-byte comparison is what surfaced this exact
  // pattern in tasks.ts first; the fix is identical.
  const disposedAt = new Date().toISOString();
  const asset = await Assets.update({ studio, section: assetsSection }, id, () => ({
    disposedOn,
    disposalProceeds: cash(body?.disposalProceeds, studio.currency),
    disposedByCollaboratorId: collaborator.id,
    disposedAt,
  }));
  if (!asset) return { error: "notfound" };
  // OFF THE BOOKS IN THE SAME ACT, when it was on them: cost out, depreciation
  // cleared, proceeds in and the gain or loss booked. An asset never put on the
  // books has nothing to take off, and says so rather than posting a credit to
  // Fixed Assets that was never debited.
  const onBooks = !!(await assetBookState(ctx)).get(id)?.booked;
  const posting = onBooks ? await autoPost(ctx, "asset-disposal", id) : null;
  return { asset: withDepreciation(asset, ctx.studio.currency), ...(posting ? { posting } : {}) };
}

export async function removeAsset(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.assets.edit");
  if (denied) return denied;
  const { studio, assetsSection } = ctx;
  const current = (await Assets.find({ studio, section: assetsSection })).find((a) => a.id === id);
  if (!current) return { error: "notfound" };
  // A disposed asset is part of the record — it stays.
  if (current.disposedOn) return { error: "disposed" };
  // ONE THAT HAS BEEN DEPRECIATED IN THE BOOK is part of the record too: its
  // write-downs are in closed months' figures. Dispose of it instead. One only
  // put on the books and never depreciated was a mistake, and deleting it
  // reverses the acquisition.
  const held = (await assetBookState(ctx)).get(id);
  if (held?.depreciated) return { error: "on-the-books" };
  const posting = held?.booked ? await autoReverse(ctx, "asset", id, `Asset ${current.reference} deleted`) : null;
  if (posting && !posting.posted) return { error: posting.reason };
  const removed = await Assets.remove({ studio, section: assetsSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}
