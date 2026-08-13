// A STUDIO'S PLAN — which package and tier it is on, and what that permits.
//
// The studio row stores ids, not names or numbers, so renaming a package or
// changing its limits takes effect everywhere at once instead of leaving copies
// behind on every studio sold under the old wording.

import { listCatalog, DEFAULT_PACKAGE, DEFAULT_TIER } from "@/lib/data/catalog";

export { PACKAGE_TONE, toneOf } from "@/lib/planColors";

// Resolve one studio's plan against the catalogue. Falls back to the default
// NAMES rather than to nothing, so a studio whose package was deleted still
// reads as something a person can act on instead of a blank.
export function planOf(studio, packages, tiers) {
  const pkg = packages.find((p) => p.id === studio?.packageId) || null;
  const tier = tiers.find((t) => t.id === studio?.tierId) || null;
  return {
    packageId: pkg?.id || "",
    packageName: pkg?.name || DEFAULT_PACKAGE,
    packageColor: pkg?.color || "green",
    // 0 means no limit — the same convention the console prints as "No limit".
    maxMembers: Number(pkg?.maxEmployees || 0),
    tierId: tier?.id || "",
    tierName: tier?.name || DEFAULT_TIER,
  };
}

// One read of both catalogues, for callers that need to resolve several studios.
export async function loadCatalogues() {
  const [packages, tiers] = await Promise.all([listCatalog("packages"), listCatalog("tiers")]);
  return { packages, tiers };
}

// THE LIMIT THAT BITES. Returns null when the package sets no ceiling.
export async function memberLimitOf(studio) {
  const { packages, tiers } = await loadCatalogues();
  const { maxMembers } = planOf(studio, packages, tiers);
  return maxMembers > 0 ? maxMembers : null;
}
