// WHAT A STUDIO CAN BUY — packages, tiers, and the ERP services a tier is made
// of. Authored in the console; nothing here belongs to a studio.
//
// Three registries with one shape between them, so they share one set of CRUD
// functions rather than three near-identical copies. Each is a flat list of
// small records always read whole, exactly like the questionnaire registry, so
// there is no cascade to maintain — deleting one is deleting its row.

import { readArr, editArr, getJSON, setJSON } from "@/platform/db/store";
import { ID, REG } from "@/platform/db/keys";
import { normalizeColor, hexForName, DEFAULT_HEX } from "@/lib/planColors";
import { ANALYTICS_LEVELS } from "@/lib/analytics";
import { WIDGET_KEYS } from "@/lib/dashboardWidgets";
import type { Row } from "@/platform/db/store";

const now = () => new Date().toISOString();

// The palette a package can wear, and the sensible first guess for each of the
// four names the product ships with.


const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };

// Per kind: where it lives, how ids are minted, and how a submitted record is
// cleaned. The clean function IS the write boundary — anything not named here
// cannot be stored, whatever the request says.
// ---- catalogue-wide settings -------------------------------------------------
// Things that qualify the whole price list rather than any one package. Just
// the yearly discount so far.
// The three shapes a package can take. The type decides what the card shows and
// what its button says, so it is a fixed list rather than free text.
export const PACKAGE_TYPES = ["free", "compound", "premium"];
export const PACKAGE_TYPE_LABELS = { free: "Free", compound: "Compound", premium: "Premium" };

// A category is a headcount band inside a compound package: its own range and
// its own per-head rate, which is what lets one card price 10-25 differently
// from 26-49. The total follows from the rate, exactly as it does on a package.
function cleanCategories(v: unknown) {
  return (Array.isArray(v) ? v : []).slice(0, 12).map((c, i) => {
    const perEmployee = num(c?.costPerEmployee);
    const maxEmployees = num(c?.maxEmployees);
    return {
      id: str(c?.id, 40) || `c${i + 1}`,
      label: str(c?.label, 40),
      minEmployees: num(c?.minEmployees),
      maxEmployees,
      costPerEmployee: perEmployee,
      cost: maxEmployees > 0 ? perEmployee * maxEmployees : perEmployee,
    };
  }).filter((c) => c.maxEmployees > 0 || c.costPerEmployee > 0);
}

// Bullets arrive as one block of text and are stored as lines. Blank lines are
// dropped — an empty bullet is a dot with nothing beside it.
function cleanLines(v: unknown) {
  const list = Array.isArray(v) ? v : String(v ?? "").split(/\r?\n/);
  return list.map((x) => str(x, 160)).filter(Boolean).slice(0, 20);
}

export const DEFAULT_CATALOG_SETTINGS = { yearlyDiscountPct: 0 };

export async function getCatalogSettings() {
  const stored = (await getJSON<{ yearlyDiscountPct?: unknown }>(REG.catalogSettings)) || {};
  return { ...DEFAULT_CATALOG_SETTINGS, ...stored, yearlyDiscountPct: pct(stored.yearlyDiscountPct) };
}

export async function saveCatalogSettings(patch: Record<string, unknown>) {
  const next = { yearlyDiscountPct: pct(patch?.yearlyDiscountPct) };
  await setJSON(REG.catalogSettings, next);
  return next;
}

// A percentage, clamped. Over 100 would price a year below nothing, and a
// negative discount is a surcharge wearing the wrong label.
const pct = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 100) / 100)) : 0;
};

// What a year costs once the discount is taken off. One function, so /super and
// the public pricing page can never round it differently.
export function yearlyPrice(total: unknown, discountPct: unknown) {
  const t = Number(total) || 0;
  const d = Math.min(100, Math.max(0, Number(discountPct) || 0));
  return Math.round((t - t * (d / 100)) * 100) / 100;
}

export /**
 * ONE CATALOGUE KIND: where its rows live, how an id is minted, and the one
 * function that decides what a request may store. `clean` is the whole security
 * boundary for this file — a field it does not name cannot be written, whatever
 * the body says.
 */
type CatalogKind = {
  key: string;
  id: () => string;
  clean: (b: Record<string, unknown>) => Record<string, unknown>;
};

// A RECORD, so `kind` off a request can index it. `isKind` is the guard that
// makes that safe and every caller runs it first.
const KINDS: Record<string, CatalogKind> = {
  packages: {
    key: REG.packages,
    id: ID.package,
    clean: (b) => {
      const type = PACKAGE_TYPES.includes(String(b.type)) ? String(b.type) : "compound";
      // A COMPOUND package is priced by category — each one its own headcount
      // band with its own per-head rate. Free and Premium have a single range
      // and no figure on the card, so categories would be furniture.
      const categories = type === "compound" ? cleanCategories(b.categories) : [];
      const perEmployee = num(b.costPerEmployee);
      const maxEmployees = num(b.maxEmployees);
      return {
        name: str(b.name, 80) || "New package",
        nameAr: str(b.nameAr, 80),
        tagline: str(b.tagline, 240),
        taglineAr: str(b.taglineAr, 240),
        // The line under the name — "10–49 users". Written rather than derived
        // because a compound package spans several categories and no single
        // range describes it honestly.
        usersLabel: str(b.usersLabel, 80),
        usersLabelAr: str(b.usersLabelAr, 80),
        type,
        categories,
        minEmployees: num(b.minEmployees),
        maxEmployees,
        costPerEmployee: perEmployee,
        // Derived, never accepted: a stored total and a stored rate can
        // disagree, and then nobody knows which is the price. For a compound
        // package the headline total is the largest category's.
        cost: type === "compound"
          ? categories.reduce((top, c) => Math.max(top, c.cost), 0)
          : maxEmployees > 0 ? perEmployee * maxEmployees : perEmployee,
        durationMonths: num(b.durationMonths),
        // What the card lists as bullets, one per line in, one array out.
        includes: cleanLines(b.includes),
        includesAr: cleanLines(b.includesAr),
        // The badge. Stored, so it can move without a code change.
        popular: Boolean(b.popular),
        isPublic: Boolean(b.isPublic),
        color: normalizeColor(b.color) || hexForName(String(b.name || "")),
        supportTicketsPerMonth: num(b.supportTicketsPerMonth),
        // Whether this package gets the live chat button at all. An explicit
        // switch, because the old rule read the package NAME and asked whether
        // it was "Free" — which quietly turned renaming a package into a
        // billing change.
        chatEnabled: Boolean(b.chatEnabled),
        // Whether studios on this package get Nova, the in-app assistant. The
        // package axis of the two gates — availability. Which capabilities Nova
        // then offers is a platform-wide choice in /super → Application → Nova.
        novaHeadEnabled: Boolean(b.novaHeadEnabled),
      };
    },
  },
  tiers: {
    key: REG.tiers,
    id: ID.tier,
    clean: (b: Record<string, unknown>) => ({
      name: str(b.name, 80) || "New tier",
      // Service IDS, not names: renaming a service must not orphan the tiers
      // that include it.
      serviceIds: Array.isArray(b.serviceIds) ? [...new Set(b.serviceIds.map((x) => str(x, 40)))].filter(Boolean).slice(0, 200) : [],
      cost: num(b.cost),
      durationMonths: num(b.durationMonths),   // 0 = endless, as above
      isPublic: Boolean(b.isPublic),
      // WHAT DASHBOARD ANALYTICS THIS TIER SELLS. Set in the console per tier.
      //   analyticsEnabled — the master "activate content" switch; default ON so
      //     an un-edited tier keeps showing its rung's widgets. An explicit false
      //     sells a tier with no dashboard analytics at all.
      //   dashboardWidgets — the explicit per-component selection, whitelisted to
      //     real widget keys so a bad body can never enable something that does
      //     not exist. Left ABSENT (undefined, dropped from JSON) when the body
      //     carries no array, so a tier that has never had a selection made falls
      //     back to its rung rather than resolving to "nothing ticked".
      //   analyticsLevel — the fallback rung, still whitelisted to the four names.
      analyticsEnabled: b.analyticsEnabled === undefined ? true : Boolean(b.analyticsEnabled),
      dashboardWidgets: Array.isArray(b.dashboardWidgets)
        ? [...new Set(b.dashboardWidgets.map((k) => String(k)))].filter((k) => WIDGET_KEYS.has(k)).slice(0, 200)
        : undefined,
      analyticsLevel: (ANALYTICS_LEVELS as readonly string[]).includes(String(b.analyticsLevel)) ? String(b.analyticsLevel) : "basic",
      // Same picker as a package's, so a tier is as recognisable at a glance.
      // No name-based default here: tier names are the studio's own invention,
      // not a fixed four, so an unpicked colour is simply grey.
      color: normalizeColor(b.color) || DEFAULT_HEX,
    }),
  },
  services: {
    key: REG.erpServices,
    id: ID.erpService,
    clean: (b: Record<string, unknown>) => ({
      name: str(b.name, 80) || "New service",
      description: str(b.description, 300),
    }),
  },
};

export const isKind = (k: unknown) => Object.hasOwn(KINDS, String(k || ""));

export async function listCatalog(kind: string) {
  return readArr(KINDS[kind].key);
}

export async function createCatalogItem(kind: string, body: Record<string, unknown>) {
  const spec = KINDS[kind];
  const row = { id: spec.id(), ...spec.clean(body || {}), createdAt: now(), updatedAt: now() };
  await editArr(spec.key, (rows) => ({ next: [...rows, row] }));
  return row;
}

export async function updateCatalogItem(kind: string, id: string, body: Record<string, unknown>) {
  const spec = KINDS[kind];
  const updatedAt = now();
  // Captured here, not inside the closure below: editArr re-invokes its function
  // once per CAS round (store.ts:221), so a timestamp read from inside it would
  // land at whatever moment the winning round happened to run, not at the moment
  // the update was asked for.
  return editArr(spec.key, (rows) => {
    let updated: Record<string, unknown> | null = null;
    const next = rows.map((r) => {
      if (r.id !== id) return r;
      // Merged, not replaced: a form that sends one field must not blank the rest.
      updated = { ...r, ...spec.clean({ ...r, ...body }), id: r.id, createdAt: r.createdAt, updatedAt };
      return updated;
    });
    return updated ? { next, result: updated } : { result: null };
  });
}

export async function deleteCatalogItem(kind: string, id: string) {
  const spec = KINDS[kind];
  const gone = await editArr(spec.key, (rows) => {
    const next = rows.filter((r) => r.id !== id);
    return { next, result: next.length !== rows.length };
  });
  // A deleted service must not linger as a dangling id inside a tier.
  if (gone && kind === "services") {
    const updatedAt = now(); // captured outside the closure — see updateCatalogItem above.
    await editArr(REG.tiers, (rows) => ({
      next: rows.map((t) => ((t.serviceIds as string[] | undefined)?.includes(id)
        ? { ...t, serviceIds: (t.serviceIds as string[]).filter((s) => s !== id), updatedAt }
        : t)),
    }));
  }
  return gone;
}

// ---- what every studio starts on --------------------------------------------
// A studio is created with a package and a tier, so both have to exist before
// the first one is. Seeded lazily and guarded by name, the same way the
// registration questionnaire is planted: a migration can be forgotten in an
// environment, a lazy seed cannot.
//
// Free is created with NO member limit rather than a number invented here. The
// limit is a commercial decision and belongs in the console; until it is set,
// nothing is enforced, which is the safe direction to be wrong in.
export const DEFAULT_PACKAGE = "Free";
export const DEFAULT_TIER = "Basic";

const byName = (rows: Row[], name: string) =>
  rows.find((r: Row) => String(r.name || "").trim().toLowerCase() === name.toLowerCase()) || null;

export async function ensureDefaultPlan() {
  const [packages, tiers] = await Promise.all([listCatalog("packages"), listCatalog("tiers")]);

  let pkg = byName(packages, DEFAULT_PACKAGE);
  if (!pkg) {
    pkg = await createCatalogItem("packages", {
      name: DEFAULT_PACKAGE, minEmployees: 0, maxEmployees: 0, cost: 0,
      durationMonths: 0, isPublic: true, color: "green", supportTicketsPerMonth: 0,
    });
  }
  let tier = byName(tiers, DEFAULT_TIER);
  if (!tier) {
    tier = await createCatalogItem("tiers", {
      name: DEFAULT_TIER, serviceIds: [], cost: 0, durationMonths: 0, isPublic: true, color: "#64748b",
    });
  }
  // Both branches above create one when it is missing, so neither can be null
  // here — and if `byName` ever answered null after a successful create, the
  // studio would be pointed at a package that does not exist, which is worth
  // failing loudly rather than defaulting past.
  if (!pkg || !tier) throw new Error("catalog: default package or tier could not be created");
  return { packageId: pkg.id, tierId: tier.id };
}
