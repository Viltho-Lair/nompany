import { getJSON, setJSON } from "@/platform/db/store";
import { SITE } from "@/platform/db/keys";

/* PLATFORM-WIDE COUNTS — aggregate only, for the public pages.
   ------------------------------------------------------------------
   WHAT THIS EXISTS TO PREVENT. The site carried "180+ connectors", "99.99%
   uptime" and "3.2M transactions a day", none of which anything computed. They
   were removed rather than corrected, and the pages have shown product facts
   since — fifteen departments, free to nine people, Arabic and English. Those
   are true and they never grow. This is the mechanism by which a real figure
   can replace one of them without anybody being tempted to type a number.

   AGGREGATE ONLY, AND NOTHING PER-TENANT, EVER. What is stored is a handful of
   totals. No studio name, no id, no per-tenant count, nothing that could be
   differenced across two nightly runs to learn about one company. A field that
   cannot be added here is one whose value would change when a single named
   tenant did something.

   COUNTING ACROSS TENANTS IS A DESIGN DECISION, NOT A QUERY, because row-level
   security is FORCED on tenant rows and `withTenant` is the only door — nothing
   can even discover which tenants hold rows without an id already in hand. The
   studio REGISTRY is that door: it is key-addressed rather than tenant-scoped,
   so the nightly pass walks the ids it names and reads each studio with its own
   id. That is the same path `main-rollup` already takes, which is why this is
   computed inside that job's existing loop.

   AND IT IS NOT ITS OWN CRON, deliberately. A second job would traverse every
   studio a second time each night for data the first traversal already has —
   and it would be a sixth entry in `vercel.json`, on a plan where a cron the
   host will not accept does not fail the job, it REJECTS THE WHOLE DEPLOYMENT.
   That has already cost this project eight pushes that built green and produced
   nothing. The aggregation lives here so it is separable and testable; only the
   traversal is shared.

   REBUILD-AND-REPLACE, never a delta, matching the rollup beside it: the
   document is written whole from what the pass just counted, so a missed night
   is a stale document rather than a number drifting permanently out of true. */

export type PlatformStats = {
  studios: number;
  people: number;
  records: number;
  /** When the nightly pass last rebuilt this, ISO. */
  refreshedAt: string;
};

export const EMPTY_STATS: PlatformStats = {
  studios: 0, people: 0, records: 0, refreshedAt: "",
};

/* A FIGURE IS PRINTED ONLY WHEN IT IS WORTH PRINTING.
   "Trusted by 3 companies" is worse than saying nothing: it invites the reader
   to do arithmetic nobody wanted them to do, and it is the number most likely
   to be screenshotted. Below these, the pages keep showing the product facts
   they show today, and the copy switches on by itself when the figures arrive —
   so nobody has to remember to turn it on, and nobody can turn it on early. */
export const THRESHOLDS: Record<keyof Omit<PlatformStats, "refreshedAt">, number> = {
  studios: 25,
  people: 250,
  records: 25000,
};

/** Is this figure large enough to state in public? */
export function showsFigure(stats: PlatformStats | null, field: keyof typeof THRESHOLDS): boolean {
  if (!stats) return false;
  const value = stats[field];
  return Number.isFinite(value) && value >= THRESHOLDS[field];
}

/* HOW A COUNT IS ROUNDED DOWN BEFORE IT IS SHOWN.
   Never the exact figure. An exact one is a tracker: two visits a week apart
   tell a reader how fast the business is growing, and a competitor reading it
   monthly learns more than a customer does. Rounding down also means the stated
   number is one the product can always stand behind — it is never larger than
   the truth, only older. */
export function statedFigure(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n < 100) return Math.floor(n / 10) * 10;
  if (n < 1000) return Math.floor(n / 50) * 50;
  if (n < 10000) return Math.floor(n / 100) * 100;
  return Math.floor(n / 1000) * 1000;
}

const KEY = SITE.collection("platformStats");

export async function readPlatformStats(): Promise<PlatformStats | null> {
  return (await getJSON<PlatformStats>(KEY)) || null;
}

export async function writePlatformStats(stats: PlatformStats): Promise<void> {
  await setJSON(KEY, stats);
}
