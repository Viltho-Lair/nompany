import { buildPricing } from "@/modules/marketing/pricing";
import { listStudios } from "@/modules/main/studios";
import { readPlatformStats } from "@/platform/db/platformStats";
import { publicCompanies } from "@/shared/marketing/showcase";
import { publicCached } from "./publicSettings";

/* THE HOME PAGE'S READS, ONCE A MINUTE INSTEAD OF ONCE A VISIT.
   ------------------------------------------------------------------
   Every hit on nompany.com/en or /ar paid six Postgres round trips through the
   Cloud Run gateway before it could render: the package catalogue, the catalogue
   settings, the exchange snapshot, the WHOLE studio registry (for the featured
   band) and the platform figures. None of it changes per visitor, and all of it
   changes rarely — /super edits, a nightly FX snapshot, a nightly rollup. So a
   flood of traffic on the public page was a flood of database reads, billed on
   Google Cloud, with nothing between the two. Now it is at most one refresh per
   minute per value, however many people arrive.

   THE PAGE STILL RENDERS PER REQUEST. The root layout reads the theme cookie,
   so nothing under it can be static (publicSettings.ts says why that is not a
   one-line fix). What this removes is the database from that render, which is
   the part that costs money under load.

   IT WENT TO PRODUCTION ONCE AS BARE `unstable_cache` AND 500'D THE HOME PAGE
   (23/09/2026, reverted within the hour). Every value here goes through
   `publicCached`, which primes the gateway's identity outside the cache scope;
   publicSettings.ts says why that is not optional.

   `force-dynamic` DOES NOT DEFEAT THIS. Measured against Next 16.2's source:
   `unstable_cache` skips its cache only for `fetchCache: 'force-no-store'`,
   on-demand revalidation and draft mode; `force-dynamic` changes `fetch()`
   defaults and nothing here uses `fetch()`.

   WHAT IS CACHED IS WHAT IS ALREADY PUBLIC, never the source it came from.
   The featured band caches the OUTPUT of `publicCompanies` — the consented,
   featured names and logos the page prints anyway — and never the studio
   registry itself, which is tenant data. A process-wide cache must never hold
   a value one tenant could be served another's bytes from; every value below
   is identical for every visitor by construction. Keep it that way: nothing
   tenant-scoped belongs in this file.

   The window is publicSettings' minute, for its reason: an edit in /super (a
   price, a featured company switched off) shows within a minute, which is short
   enough that nobody wonders whether the save worked. */

/** Pricing in the base currency — what home renders. No country: the pricing
 *  page is where a visitor is offered their own, and it is not cached here. */
export const landingPricing = publicCached(async () => buildPricing(null), "landing-pricing");

export const featuredCompanies = publicCached(
  async () => publicCompanies(await listStudios()),
  "landing-featured-companies",
);

export const cachedPlatformStats = publicCached(async () => readPlatformStats(), "landing-platform-stats");
