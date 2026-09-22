// BRAND ASSETS AND CONTENT — the studio's own files, per campaign (22/09/2026).
//
// THE GAP THIS CLOSES. A campaign has carried a brief since this morning — who
// it is for, what it says, what it offers — and nowhere to put what was MADE
// from that brief. So the artwork, the copy document and the logo lived in
// somebody's Drive, and "which logo was on the autumn adverts" had no answer
// inside the product that had the adverts in it.
//
// THE REVISION CHAIN IS `lib/revisions`, NOT A SECOND COPY. Tendering has kept
// a replaced bid document since the tender pack shipped, for the same reason
// this needs one: the old version has to stay answerable. Extracting that was
// the first half of this slice.
//
// THE FILE ITSELF IS `/api/media`, which verifies membership before it writes
// and again before it serves — nothing new was built for storage, the same way
// the tender pack reuses it.

import * as R from "@/lib/revisions";

/**
 * WHAT AN ASSET IS FOR, not what program made it. "PSD", "MP4" and "docx" are a
 * toolchain's vocabulary and change every few years; a studio wants to find the
 * ARTWORK for a campaign whether it is a PNG or a PDF. The file's own type is
 * on the media record and the screen shows it.
 */
export const ASSET_KINDS = ["artwork", "copy", "video", "logo", "document", "other"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const isAssetKind = (v: unknown): v is AssetKind =>
  (ASSET_KINDS as readonly string[]).includes(String(v ?? ""));

export type AssetLike = {
  id?: string;
  campaignId?: string;
  kind?: string;
  name?: string;
  version?: string;
  supersededById?: string;
  createdAt?: string;
};

const rows = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const text = (v: unknown) => String(v ?? "");

/**
 * WHAT REFUSES AN ASSET. A name and a file, and nothing else is required: the
 * campaign is optional because a studio's logo belongs to the studio rather than
 * to any one campaign, and an asset library that could only hold campaign work
 * would send people back to the Drive for the brand itself.
 */
export function assetProblem(a: { name?: string; kind?: string; mediaId?: string }): string {
  if (!text(a.name).trim()) return "name";
  if (!isAssetKind(a.kind)) return "kind";
  if (!text(a.mediaId)) return "file";
  return "";
}

/** The current assets — what a replaced version is not. */
export const currentAssets = <T extends AssetLike>(list: unknown): T[] => R.currentOf<T>(list);

/** Every earlier version of this one, newest first. */
export const versionsOf = <T extends AssetLike>(list: unknown, id: string): T[] => R.chainFor<T>(list, id);

/**
 * WHY ONE ASSET MAY NOT REPLACE ANOTHER.
 *
 * THE CAMPAIGN IS NOT A BOUNDARY HERE, and that is the one place this differs
 * from a tender's documents. A tender's pack is that tender's, and a document
 * from another bid has no business in it. An asset genuinely moves: the autumn
 * artwork is reworked for the winter campaign, and the new file is honestly the
 * next version of the old one. So `parentOf` is left out, and the three rules
 * that make a chain a chain still hold.
 */
export const replaceProblem = (list: unknown, id: string, replacementId: string): R.SupersedeProblem =>
  R.supersedeProblem<AssetLike>(list, id, replacementId);

/**
 * WHY AN ASSET MAY NOT BE DELETED — either end of a chain is the history.
 * A loose asset is an upload somebody got wrong, and that one goes.
 *
 * RE-EXPORTED RATHER THAN WRAPPED, and `tests/assets-model` asserts that by
 * IDENTITY. A pass-through arrow would satisfy every behavioural assertion and
 * still be a second place the rule could drift to; only sameness rules that out,
 * which is the whole reason the chain was extracted instead of copied.
 */
export const assetDeleteProblem = R.deleteProblem;

/**
 * THE LIBRARY, GROUPED THE WAY SOMEBODY LOOKS FOR A FILE: by campaign, with the
 * studio's own unattached assets in their own group.
 *
 * AN ASSET WHOSE CAMPAIGN HAS BEEN DELETED IS NOT LOST. It falls into the
 * unattached group rather than vanishing from the library — the reader contains
 * it, which is where `projectCosting` puts the same rule, because deleting a
 * campaign must not delete the artwork somebody paid a designer for.
 */
export function libraryOf<T extends AssetLike>(
  list: unknown,
  campaignNames: ReadonlyMap<string, string>,
): { campaignId: string; name: string; assets: T[] }[] {
  const current = currentAssets<T>(list);
  const by = new Map<string, T[]>();
  for (const a of current) {
    const id = campaignNames.has(text(a.campaignId)) ? text(a.campaignId) : "";
    const at = by.get(id) || [];
    at.push(a);
    by.set(id, at);
  }
  return [...by].map(([campaignId, assets]) => ({
    campaignId,
    name: campaignId ? campaignNames.get(campaignId) || "" : "",
    assets: assets.sort((a, b) => text(b.createdAt).localeCompare(text(a.createdAt))),
  })).sort((a, b) => {
    // THE STUDIO'S OWN FIRST: a brand's logo is what somebody opening an asset
    // library most often wants, and it belongs to no campaign.
    if (!a.campaignId !== !b.campaignId) return a.campaignId ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

/** How many of each kind are current — the counts a header shows. */
export function assetSummary(list: unknown) {
  const all = rows<AssetLike>(list);
  const current = currentAssets<AssetLike>(all);
  const byKind: Record<string, number> = {};
  for (const a of current) {
    const kind = isAssetKind(a.kind) ? String(a.kind) : "other";
    byKind[kind] = (byKind[kind] || 0) + 1;
  }
  return {
    total: all.length,
    current: current.length,
    superseded: all.length - current.length,
    byKind,
  };
}
