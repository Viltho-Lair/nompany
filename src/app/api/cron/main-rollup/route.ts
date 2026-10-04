import { cronJob } from "@/platform/http/cron";
import { listStudios } from "@/modules/main/studios";
import { listSections, readCol } from "@/platform/db/sections";
import { hGetAll, hSet, hDel } from "@/platform/db/store";
import { S } from "@/platform/db/keys";
import { MAIN_AGG_SOURCES, aggField } from "@/platform/db/mainAgg";
import { writePlatformStats, type PlatformStats } from "@/platform/db/platformStats";
import { listCollaborators } from "@/platform/auth/collaborators";
import { ENG } from "@/platform/db/keys";
import { zRange } from "@/platform/db/store";
import { refreshDealCompletion } from "@/modules/main/engagements";
import type { PermissionSet } from "@/platform/access";

/**
 * DEALS REFRESHED PER STUDIO PER NIGHT, newest first. A deal nobody opens and
 * nothing touches for longer than that keeps its last snapshot, which says how
 * old it is; opening it refreshes it at once.
 */
const DEALS_PER_NIGHT = 500;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE NIGHTLY RECONCILE — the rollup's source of truth.
//
// `bumpMainAgg` (platform/db/mainAgg.ts) is fire-and-forget from addRow: it
// never joins the write's latency or failure path, so a dropped bump is a
// silent miss the write itself never sees. This job is what makes that safe
// to accept — it rebuilds every studio's rollup hash from the live rows
// themselves, every night, so a miss self-heals within one day instead of
// drifting forever.
//
// REBUILD-AND-REPLACE, never a delta: for every field the live rows produce,
// HSET the computed total; for every field already in the hash that the live
// rows did NOT produce, HDEL it by name. That is invariant 17's "prune only
// by named hDel" — there is no scan, no prefix delete, no FLUSH. A stale
// field (a section renamed away, a day that fell out of the horizon) is
// removed one named field at a time, the same way a fresh one is added.
export const GET = cronJob("main-rollup", reconcile);

async function reconcile() {

  const now = new Date();

  // 90-day horizon, matching the executive Overview's own window (§ Main
  // executive). A row older than this never counted toward what the
  // dashboard shows, so the reconcile does not keep a field for it either —
  // that is how an out-of-horizon create gets pruned rather than kept
  // forever as a stale field nobody asked for.
  const HORIZON = 90;
  const keepDays = new Set<string>();
  for (let i = 0; i < HORIZON; i++) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    keepDays.add(d.toISOString().slice(0, 10));
  }

  const studios = (await listStudios()) as { id: string }[];
  let rebuilt = 0;
  let dealsRefreshed = 0;

  // THE PUBLIC PAGES' FIGURES RIDE ON THIS PASS. See platform/db/platformStats
  // for why they are not their own cron: a second job would walk every studio
  // again each night for data this traversal already holds, and it would be a
  // sixth entry in vercel.json on a plan where a cron the host will not accept
  // rejects the whole deployment rather than just the job.
  //
  // AGGREGATE ONLY. These three counters never learn a studio's name or id, and
  // nothing per-tenant is written — a field whose value would move when one
  // named company acted could be differenced across two nights.
  const platform: PlatformStats = {
    studios: studios.length,
    people: 0,
    records: 0,
    refreshedAt: now.toISOString(),
  };

  for (const studio of studios) {
    const sid = studio.id;
    const sections = await listSections(sid);
    const byKey: Record<string, { id: string }> = Object.fromEntries(
      sections.map((s) => [s.key, s]),
    );

    const fresh: Record<string, number> = {};
    for (const src of MAIN_AGG_SOURCES) {
      // Same resolution order as bumpMainAgg's write path: the section's own
      // key first, its fallback (the parent department) second. A studio
      // created before a child section existed still counts against the
      // parent it does have.
      const sec = byKey[src.section] || (src.fallback ? byKey[src.fallback] : null);
      if (!sec) continue;
      const rows = (await readCol(sid, sec.id, src.collection)) as { createdAt?: string }[];
      // Counted BEFORE the horizon filter below: the public figure is how much
      // work the product holds, not how much of it happened in the last ninety
      // days. The rollup's window is the dashboard's question, not this one's.
      platform.records += rows.length;
      for (const row of rows) {
        const day = row.createdAt ? String(row.createdAt).slice(0, 10) : "";
        if (!day || !keepDays.has(day)) continue;
        const field = aggField(sec.id, day);
        fresh[field] = (fresh[field] || 0) + 1;
      }
    }

    const key = S.mainAgg(sid);
    const existing = await hGetAll(key);

    for (const [field, count] of Object.entries(fresh)) {
      await hSet(key, field, count);
    }

    // Prune BY NAME only: existing fields the live rows no longer produce,
    // excluding the refresh stamp itself (it is not a count and is rewritten
    // below regardless).
    const stale = Object.keys(existing).filter((f) => f !== "meta:refreshedAt" && !(f in fresh));
    if (stale.length) await hDel(key, ...stale);

    await hSet(key, "meta:refreshedAt", now.toISOString());

    // One more read per studio, on a job that has already read every collection
    // it owns. The alternative is a second nightly traversal for one integer.
    platform.people += (await listCollaborators(sid)).length;

    // EVERY DEAL'S COMPLETION, REFRESHED (the owner's choice, 04/10/2026:
    // nightly + whenever a deal is opened). It rides on this pass rather than a
    // job of its own for the reason the public figures do: this traversal
    // already holds the studio and its sections. The refresh reads records and
    // writes nothing to them; a deal whose snapshot did not change is not
    // written at all. One deal failing never stops the rest.
    const dealIds = await zRange(ENG.index(sid), 0, DEALS_PER_NIGHT - 1, { rev: true });
    // The refresh reads no rights — completion is the deal's, not a reader's —
    // so the context carries none.
    const dealCtx = { studio: studio as { id: string }, access: new Set<string>() as unknown as PermissionSet, sections };
    for (const dealId of dealIds) {
      try {
        if (await refreshDealCompletion(dealCtx, dealId)) dealsRefreshed += 1;
      } catch { /* the next night, or the next opening, tries again */ }
    }
    rebuilt += 1;
  }

  // WRITTEN WHOLE, never patched, matching the rollup above: a missed night
  // leaves a stale document rather than a number drifting permanently out of
  // true. A failure here must not fail the rollup — the per-studio hashes are
  // what the product runs on, and the public page's figures are what it says
  // about itself.
  try {
    await writePlatformStats(platform);
  } catch {
    // Deliberately swallowed; the rollup's own result is what this job is for.
  }

  return Response.json({ ok: true, studios: rebuilt, dealsRefreshed, at: now.toISOString() });
}
