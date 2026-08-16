// WHAT A STUDIO CAN BUY — packages, tiers, and the ERP services a tier is made
// of. Authored in the console; nothing here belongs to a studio.
//
// Three registries with one shape between them, so they share one set of CRUD
// functions rather than three near-identical copies. Each is a flat list of
// small records always read whole, exactly like the questionnaire registry, so
// there is no cascade to maintain — deleting one is deleting its row.

import { readArr, editArr, getJSON, setJSON } from "@/lib/data/store";
import { ID, REG } from "@/lib/data/keys";
import { normalizeColor, hexForName, DEFAULT_HEX } from "@/lib/planColors";

const now = () => new Date().toISOString();

// The palette a package can wear, and the sensible first guess for each of the
// four names the product ships with.


const str = (v, max) => String(v ?? "").trim().slice(0, max);
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };

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
function cleanCategories(v) {
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
function cleanLines(v) {
  const list = Array.isArray(v) ? v : String(v ?? "").split(/\r?\n/);
  return list.map((x) => str(x, 160)).filter(Boolean).slice(0, 20);
}

export const DEFAULT_CATALOG_SETTINGS = { yearlyDiscountPct: 0 };

export async function getCatalogSettings() {
  const stored = (await getJSON(REG.catalogSettings)) || {};
  return { ...DEFAULT_CATALOG_SETTINGS, ...stored, yearlyDiscountPct: pct(stored.yearlyDiscountPct) };
}

export async function saveCatalogSettings(patch) {
  const next = { yearlyDiscountPct: pct(patch?.yearlyDiscountPct) };
  await setJSON(REG.catalogSettings, next);
  return next;
}

// A percentage, clamped. Over 100 would price a year below nothing, and a
// negative discount is a surcharge wearing the wrong label.
const pct = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 100) / 100)) : 0;
};

// What a year costs once the discount is taken off. One function, so /super and
// the public pricing page can never round it differently.
export function yearlyPrice(total, discountPct) {
  const t = Number(total) || 0;
  const d = Math.min(100, Math.max(0, Number(discountPct) || 0));
  return Math.round((t - t * (d / 100)) * 100) / 100;
}

export const KINDS = {
  packages: {
    key: REG.packages,
    id: ID.package,
    clean: (b) => {
      const type = PACKAGE_TYPES.includes(b.type) ? b.type : "compound";
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
        color: normalizeColor(b.color) || hexForName(b.name),
        supportTicketsPerMonth: num(b.supportTicketsPerMonth),
      };
    },
  },
  tiers: {
    key: REG.tiers,
    id: ID.tier,
    clean: (b) => ({
      name: str(b.name, 80) || "New tier",
      // Service IDS, not names: renaming a service must not orphan the tiers
      // that include it.
      serviceIds: Array.isArray(b.serviceIds) ? [...new Set(b.serviceIds.map((x) => str(x, 40)))].filter(Boolean).slice(0, 200) : [],
      cost: num(b.cost),
      durationMonths: num(b.durationMonths),   // 0 = endless, as above
      isPublic: Boolean(b.isPublic),
      // Same picker as a package's, so a tier is as recognisable at a glance.
      // No name-based default here: tier names are the studio's own invention,
      // not a fixed four, so an unpicked colour is simply grey.
      color: normalizeColor(b.color) || DEFAULT_HEX,
    }),
  },
  services: {
    key: REG.erpServices,
    id: ID.erpService,
    clean: (b) => ({
      name: str(b.name, 80) || "New service",
      description: str(b.description, 300),
    }),
  },
};

export const isKind = (k) => Object.hasOwn(KINDS, String(k || ""));

export async function listCatalog(kind) {
  return readArr(KINDS[kind].key);
}

export async function createCatalogItem(kind, body) {
  const spec = KINDS[kind];
  const row = { id: spec.id(), ...spec.clean(body || {}), createdAt: now(), updatedAt: now() };
  await editArr(spec.key, (rows) => ({ next: [...rows, row] }));
  return row;
}

export async function updateCatalogItem(kind, id, body) {
  const spec = KINDS[kind];
  return editArr(spec.key, (rows) => {
    let updated = null;
    const next = rows.map((r) => {
      if (r.id !== id) return r;
      // Merged, not replaced: a form that sends one field must not blank the rest.
      updated = { ...r, ...spec.clean({ ...r, ...body }), id: r.id, createdAt: r.createdAt, updatedAt: now() };
      return updated;
    });
    return updated ? { next, result: updated } : { result: null };
  });
}

export async function deleteCatalogItem(kind, id) {
  const spec = KINDS[kind];
  const gone = await editArr(spec.key, (rows) => {
    const next = rows.filter((r) => r.id !== id);
    return { next, result: next.length !== rows.length };
  });
  // A deleted service must not linger as a dangling id inside a tier.
  if (gone && kind === "services") {
    await editArr(REG.tiers, (rows) => ({
      next: rows.map((t) => (t.serviceIds?.includes(id)
        ? { ...t, serviceIds: t.serviceIds.filter((s) => s !== id), updatedAt: now() }
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
export const DEFAULT_TIER = "Standard";

const byName = (rows, name) =>
  rows.find((r) => String(r.name || "").trim().toLowerCase() === name.toLowerCase()) || null;

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
  return { packageId: pkg.id, tierId: tier.id };
}
