// SECTIONS HELD BACK WHILE BEING BUILT, purely. No store, no routes.
//
// THE NEED THIS GUARDS (the owner, 03/10/2026): a section still under
// development must be hidden from every studio "entirely", from /super, without
// losing anything a studio recorded. The lock is an overlay on the section read
// (platform/db/releaseLocks), so these assertions hold the overlay's rules: what
// may be locked, that a root takes its children (including engine registers
// that do not share its key prefix), that preview studios see through, that the
// studio's own rows are never mutated, and that the create screen does not ask
// about a held-back department.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const L = await import("@/platform/db/releaseLocks");
const K = await import("@/platform/db/keys");
const M = await import("@/modules/main/studios");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== what may be locked");

const lockable = L.lockableKeys();
ok("Main and Approvals can never be locked", !lockable.includes("main") && !lockable.includes("approvals"));
ok("no Administration key can be locked", !lockable.some((k) => K.isSystemSection(k)));
ok("a filed-only storage row is never offered — it is shown nowhere, so its switch would do nothing",
  !lockable.some((k) => K.isFiledOnlySection(k)));
ok("product roots and their sub-sections can", lockable.includes("manufacturing") && lockable.includes("crm-sales-orders"));
const cleaned = L.cleanLocks({ locked: ["manufacturing", "main", "administration-settings", "nope", "manufacturing"], previewStudios: ["s1", "s1", ""] });
ok("a stored list keeps only lockable keys, once each", JSON.stringify(cleaned.locked) === JSON.stringify(["manufacturing"]), JSON.stringify(cleaned.locked));
ok("...and preview studios once each", JSON.stringify(cleaned.previewStudios) === JSON.stringify(["s1"]));
ok("an absent document locks nothing", L.cleanLocks(null).locked.length === 0);

console.log("\n== a root takes its children");

const rows = [
  { id: "r1", key: "quality-hse", parentId: null, enabled: true },
  { id: "c1", key: "quality-hse-permits", parentId: "r1", enabled: true },
  // An engine register planted under the root, NOT sharing its key prefix.
  { id: "e1", key: "engine-ncr", parentId: "r1", enabled: true },
  { id: "r2", key: "crm-sales", parentId: null, enabled: true },
  { id: "c2", key: "crm-sales-orders", parentId: "r2", enabled: true },
  { id: "c3", key: "crm-sales-tickets", parentId: "r2", enabled: true },
];
const locks = L.cleanLocks({ locked: ["quality-hse", "crm-sales-orders"] });
const hidden = L.hiddenKeys(rows, locks, "studio-a");
ok("a locked root is hidden", hidden.has("quality-hse"));
ok("...with its sub-sections", hidden.has("quality-hse-permits"));
ok("...and the engine registers planted under it, found by parent id", hidden.has("engine-ncr"));
ok("a locked sub-section is hidden on its own", hidden.has("crm-sales-orders"));
ok("...leaving its root and siblings visible", !hidden.has("crm-sales") && !hidden.has("crm-sales-tickets"));

const seen = L.applyLocks(rows, locks, "studio-a");
ok("hidden rows read as switched off", seen.filter((r) => hidden.has(r.key)).every((r) => r.enabled === false));
ok("visible rows keep their own switch", seen.find((r) => r.key === "crm-sales-tickets").enabled === true);
ok("the studio's own rows are never mutated", rows.every((r) => r.enabled === true));

console.log("\n== preview studios see through");

const preview = L.cleanLocks({ locked: ["quality-hse"], previewStudios: ["studio-p"] });
ok("a preview studio sees every held-back section", L.hiddenKeys(rows, preview, "studio-p").size === 0);
ok("...and every other studio does not", L.hiddenKeys(rows, preview, "studio-a").has("quality-hse"));

console.log("\n== the create screen does not ask about a held-back department");

const held = L.hiddenDefKeys(L.cleanLocks({ locked: ["manufacturing", "crm-sales-orders"] }));
const { builtInIndustries } = await import("@/shared/industryCatalogue");
const setup = M.studioSetupScreen("en", builtInIndustries(), held);
ok("a held-back root is not asked about", !setup.departments.some((d) => d.key === "manufacturing"));
ok("a held-back part is not offered under its department",
  !setup.departments.find((d) => d.key === "crm-sales")?.parts.some((p) => p.key === "crm-sales-orders"));
ok("...and nothing is pre-filled for it", Object.values(setup.suggestedByIndustry).every((on) => !on.includes("manufacturing")));
ok("...even for the industry whose profile names it", (setup.suggestedByIndustry["food-production"] || ["none"]).length > 0);
ok("with nothing held back, every department is asked as before",
  M.studioSetupScreen("en", [], new Set()).departments.length === M.studioSetupCatalogue().roots.length);

console.log(fails ? `\nrelease locks: ${fails} FAILED` : "\nrelease locks: all passed");
process.exit(fails ? 1 : 0);
