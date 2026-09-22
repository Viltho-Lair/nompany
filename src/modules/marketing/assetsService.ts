// CONTENT & BRAND ASSETS — the library (22/09/2026).
//
// THE RULES ARE ./assets, which is pure and shares its revision chain with
// Tendering's bid documents (lib/revisions) rather than carrying a copy.
//
// THE FILE IS NEVER STORED HERE AND ITS URL IS NEVER GIVEN OUT. The screen
// uploads to `/api/media?kind=private`, which verifies membership before it
// writes; this keeps the id, and the same route serves the bytes after checking
// again. That is the rule the whole product follows for a private file: the
// access decision stays in code rather than being delegated to a store that
// cannot express "private".
import { requirePermission, type PermissionKey } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { getMedia, deleteMedia } from "@/lib/media";
import {
  ASSET_KINDS, isAssetKind, assetProblem, replaceProblem, assetDeleteProblem,
  libraryOf, assetSummary, versionsOf,
} from "./assets";
import { isFinal } from "./model";
import type { Campaign, MarketingAsset } from "./schema";
import type { MarketingContext } from "./types";

const Assets = repo<MarketingAsset>("marketingAssets");
const Campaigns = repo<Campaign>("marketingCampaigns");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();
const scope = (ctx: MarketingContext) => ({ studio: ctx.studio, section: ctx.contentSection });
const may = (ctx: MarketingContext, key: PermissionKey) => !requirePermission(ctx.access, key);

type Person = { id: string; alias?: string };

function assetFields(body: Record<string, unknown>) {
  const out: Partial<MarketingAsset> = {};
  const has = (k: string) => body?.[k] !== undefined;
  if (has("name")) out.name = str(body.name, 200);
  if (has("kind")) out.kind = isAssetKind(body.kind) ? String(body.kind) : "other";
  if (has("notes")) out.notes = str(body.notes, 2000);
  if (has("campaignId")) out.campaignId = str(body.campaignId, 60);
  if (has("version")) out.version = str(body.version, 40);
  // THE FILE IS SET ONCE, ON CREATE. Swapping the bytes under a name is exactly
  // what the revision chain exists to prevent — "which logo was on the autumn
  // adverts" stops being answerable the moment a file can be replaced in place.
  return out;
}

/**
 * THE LIBRARY, grouped by campaign with the studio's own files first.
 *
 * FILE NAMES AND SIZES ARE RESOLVED HERE, because an id is not something a
 * person recognises. Bounded, as the form responses' own lookup is: past the
 * cap the screen shows a plain link rather than costing a round trip each.
 */
export async function listAssets(ctx: MarketingContext) {
  const denied = requirePermission(ctx.access, "marketing.content.view");
  if (denied) return denied;

  const [assets, team, campaigns] = await Promise.all([
    Assets.find(scope(ctx)),
    listCollaborators(ctx.studio.id) as Promise<Person[]>,
    ctx.campaignsSection && ctx.on("marketing-campaigns")
      ? Campaigns.find({ studio: ctx.studio, section: ctx.campaignsSection }) : Promise.resolve([] as Campaign[]),
  ]);
  const aliasOf = new Map(team.map((p) => [String(p.id), p.alias || ""]));
  const campaignNames = new Map(campaigns.map((c) => [c.id, `${c.reference} · ${c.name}`]));

  const files: Record<string, { name: string; size: number; type: string }> = {};
  for (const mediaId of [...new Set(assets.map((a) => a.mediaId).filter(Boolean))].slice(0, 500)) {
    const record = await getMedia(mediaId).catch(() => null);
    // ONLY THIS STUDIO'S. A media id from elsewhere resolves to nothing here
    // rather than to somebody else's filename.
    if (record && record.studioId === ctx.studio.id) {
      files[mediaId] = { name: record.filename, size: record.size, type: record.contentType || "" };
    }
  }

  const decorate = (a: MarketingAsset) => ({
    ...a,
    byAlias: aliasOf.get(a.createdByCollaboratorId) || "",
    file: files[a.mediaId] || null,
    // EVERY EARLIER VERSION TRAVELS WITH THE CURRENT ONE, so the screen can
    // show the history without a second request per asset.
    versions: versionsOf<MarketingAsset>(assets, a.id).map((v) => ({
      id: v.id, name: v.name, version: v.version, createdAt: v.createdAt,
      // THE OLD FILE IS OPENABLE, which is the whole reason it was kept: a
      // version history nobody can read is a list of names.
      mediaId: v.mediaId,
      file: files[v.mediaId] || null,
      byAlias: aliasOf.get(v.createdByCollaboratorId) || "",
    })),
    deleteProblem: assetDeleteProblem(assets, a.id),
  });

  return {
    groups: libraryOf<MarketingAsset>(assets, campaignNames)
      .map((g) => ({ ...g, assets: g.assets.map(decorate) })),
    summary: assetSummary(assets),
    kinds: ASSET_KINDS,
    campaigns: campaigns.filter((c) => !isFinal(c.status))
      .map((c) => ({ id: c.id, name: `${c.reference} · ${c.name}` })),
    canCreate: may(ctx, "marketing.content.create"),
    canEdit: may(ctx, "marketing.content.edit"),
    canDelete: may(ctx, "marketing.content.delete"),
  };
}

export async function createAsset(ctx: MarketingContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.content.create");
  if (denied) return denied;
  const fields = assetFields(body || {});
  const mediaId = str(body?.mediaId, 120);
  const next = { name: "", kind: "other", ...fields, mediaId };
  const problem = assetProblem(next);
  if (problem) return { error: problem };

  // THE FILE MUST BE THIS STUDIO'S. `/api/media` already refuses a non-member,
  // but an id is a string in a body: without this, a member of one studio could
  // file another studio's media id into their own library and the reader would
  // resolve it to nothing while the record claimed a file existed.
  const record = await getMedia(mediaId).catch(() => null);
  if (!record || record.studioId !== ctx.studio.id) return { error: "file" };

  if (next.campaignId && ctx.campaignsSection
    && !(await Campaigns.byId({ studio: ctx.studio, section: ctx.campaignsSection }, next.campaignId))) {
    return { error: "campaign" };
  }

  const at = now();
  const asset = await Assets.create(scope(ctx), {
    notes: "",
    campaignId: "",
    version: "",
    supersededById: "",
    ...next,
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: at,
    updatedAt: at,
  });
  return { asset };
}

export async function editAsset(ctx: MarketingContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.content.edit");
  if (denied) return denied;
  const current = await Assets.byId(scope(ctx), id);
  if (!current) return { error: "notfound" };
  const patch = assetFields(body || {});
  const next = { ...current, ...patch };
  const problem = assetProblem(next);
  if (problem) return { error: problem };
  if (next.campaignId && ctx.campaignsSection
    && !(await Campaigns.byId({ studio: ctx.studio, section: ctx.campaignsSection }, next.campaignId))) {
    return { error: "campaign" };
  }
  const asset = await Assets.update(scope(ctx), id, (row) => ({ ...row, ...patch, updatedAt: now() }));
  return asset ? { asset } : { error: "notfound" };
}

/**
 * A NEWER VERSION REPLACES AN OLDER ONE, and the older one STAYS.
 *
 * AN EDIT, NOT A DELETE, and not a verb of its own: the old file remains in the
 * library and remains readable, so marking it replaced is the library's own
 * content changing rather than anything being taken away.
 */
export async function replaceAsset(ctx: MarketingContext, id: string, replacementId: string) {
  const denied = requirePermission(ctx.access, "marketing.content.edit");
  if (denied) return denied;
  const assets = await Assets.find(scope(ctx));
  const problem = replaceProblem(assets, id, replacementId);
  if (problem) return { error: problem };
  const asset = await Assets.update(scope(ctx), id, (row) => ({
    ...row, supersededById: replacementId, updatedAt: now(),
  }));
  return asset ? { asset } : { error: "notfound" };
}

/**
 * DELETING TAKES THE FILE WITH IT — children first, the cascade's own order
 * (invariant 11): the blob goes, then the record. A record deleted first would
 * leave a file nothing names and nothing can ever reach to remove.
 *
 * AND ONLY A LOOSE ASSET GOES. Either end of a revision chain is the history.
 */
export async function deleteAsset(ctx: MarketingContext, id: string) {
  const denied = requirePermission(ctx.access, "marketing.content.delete");
  if (denied) return denied;
  const assets = await Assets.find(scope(ctx));
  const asset = assets.find((a) => a.id === id);
  if (!asset) return { error: "notfound" };
  const problem = assetDeleteProblem(assets, id);
  if (problem) return { error: problem };

  if (asset.mediaId) {
    const record = await getMedia(asset.mediaId).catch(() => null);
    // ONLY THIS STUDIO'S FILE IS REMOVED. A record somehow naming a foreign id
    // loses the record and leaves that file alone, which is the safe half.
    if (record && record.studioId === ctx.studio.id) await deleteMedia(asset.mediaId).catch(() => {});
  }
  await Assets.remove(scope(ctx), id);
  return { ok: true };
}
