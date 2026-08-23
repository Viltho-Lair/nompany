// A STUDIO'S PLAN — which package and tier it is on, and what that permits.
//
// The studio row stores ids, not names or numbers, so renaming a package or
// changing its limits takes effect everywhere at once instead of leaving copies
// behind on every studio sold under the old wording.

import { listCatalog, DEFAULT_PACKAGE, DEFAULT_TIER } from "@/lib/data/catalog";
import type { Row } from "@/platform/db/store";

// PACKAGE_TONE went with the named-colour model — packages carry a hex now and
// toneOf derives the rest. Re-exporting a name planColors no longer has was a
// hard error under plain ESM and invisible under the bundler, which tree-shakes
// an unused re-export away rather than complaining.
export { toneOf } from "@/lib/planColors";

// Resolve one studio's plan against the catalogue. Falls back to the default
// NAMES rather than to nothing, so a studio whose package was deleted still
// reads as something a person can act on instead of a blank.
// The rung a tier grants: an explicit `analyticsLevel` field wins (for when the
// console gains an editor for it); otherwise the tier's NAME is read as the rung,
// so a studio on a tier named "Advanced" sees the advanced widgets today without
// any migration. Anything unrecognised is the free floor.
const ANALYTICS_RUNGS = ["basic", "simple", "moderate", "advanced"];
function analyticsLevelFromTier(tier: Row | null | undefined): string {
  const explicit = typeof tier?.analyticsLevel === "string" ? tier.analyticsLevel.trim().toLowerCase() : "";
  if (ANALYTICS_RUNGS.includes(explicit)) return explicit;
  const name = String(tier?.name || "").trim().toLowerCase();
  // Longest first so "advanced"/"moderate" win before any shorter substring.
  const byName = [...ANALYTICS_RUNGS].sort((a, b) => b.length - a.length).find((r) => name.includes(r));
  return byName || "basic";
}

export function planOf(studio: Row | null | undefined, packages: Row[], tiers: Row[]) {
  const pkg = packages.find((p: Row) => p.id === studio?.packageId) || null;
  const tier = tiers.find((t: Row) => t.id === studio?.tierId) || null;
  return {
    packageId: pkg?.id || "",
    packageName: pkg?.name || DEFAULT_PACKAGE,
    packageColor: pkg?.color || "green",
    // 0 means no limit — the same convention the console prints as "No limit".
    maxMembers: Number(pkg?.maxEmployees || 0),
    // Live chat: on or off, and how many conversations a month it allows.
    // 0 allowed means unlimited, the same convention every other cap here uses.
    chatEnabled: Boolean(pkg?.chatEnabled),
    chatPerMonth: Number(pkg?.supportTicketsPerMonth || 0),
    // Nova, the in-app assistant — availability rides on the package (the /super
    // Nova switchboard decides which capabilities, platform-wide).
    novaEnabled: Boolean(pkg?.novaHeadEnabled),
    tierId: tier?.id || "",
    tierName: tier?.name || DEFAULT_TIER,
    tierColor: tier?.color || "",
    // WHAT DASHBOARD ANALYTICS THIS TIER SELLS. A tier gates the dashboards by
    // an explicit per-component SELECTION (see lib/dashboardWidgets), not just a
    // rung. The client resolves the visible set from these three fields:
    //   analyticsEnabled — the master switch; off means no analytics at all.
    //   dashboardWidgets — the explicit selection, or null when none was made.
    //   analyticsLevel   — the fallback rung a tier with no selection derives
    //                      from (name-resolved here, so an "Advanced" tier still
    //                      lights up without a migration).
    analyticsEnabled: tier?.analyticsEnabled === undefined ? true : Boolean(tier.analyticsEnabled),
    dashboardWidgets: Array.isArray(tier?.dashboardWidgets) ? (tier.dashboardWidgets as string[]) : null,
    analyticsLevel: analyticsLevelFromTier(tier),
  };
}

// One read of both catalogues, for callers that need to resolve several studios.
export async function loadCatalogues() {
  const [packages, tiers] = await Promise.all([listCatalog("packages"), listCatalog("tiers")]);
  return { packages, tiers };
}

// WHO GETS LIVE CHAT WITH NOMPANY. Every package except Free — a studio on the
// free package can still use everything it was given, it just does not get a
// person on the other end of a chat window.
//
// Matched on the package NAME rather than on its id, because Free is identified
// by name everywhere else too: `ensureDefaultPlan()` seeds it by name and finds
// it by name, so a second package called "Free" would already be the same
// package as far as the platform is concerned. The cost of that choice is that
// renaming Free turns chat ON for its studios; the alternative — a stored id —
// would leave the console with a flag it has no screen to set.
//
// A studio whose package was deleted resolves to the Free NAME (see planOf), so
// it lands on "no chat". That is the safe direction to be wrong in.
// ASKED OF THE PACKAGE, not of its name. This used to compare the package name
// against "Free", which meant renaming a package silently switched chat on or
// off for every studio on it.
export function hasLiveChat(plan: { chatEnabled?: unknown } | null | undefined) {
  return Boolean(plan?.chatEnabled);
}

// The same question asked from a studio row, for callers (the API) that hold a
// studio rather than a resolved plan.
export async function studioHasLiveChat(studio: Row | null | undefined) {
  const { packages, tiers } = await loadCatalogues();
  return hasLiveChat(planOf(studio, packages, tiers));
}

// THE LIMIT THAT BITES. Returns null when the package sets no ceiling.
export async function memberLimitOf(studio: Row | null | undefined) {
  const { packages, tiers } = await loadCatalogues();
  const { maxMembers } = planOf(studio, packages, tiers);
  return maxMembers > 0 ? maxMembers : null;
}
