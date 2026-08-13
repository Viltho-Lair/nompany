// WHAT A STUDIO CAN BUY — packages, tiers, and the ERP services a tier is made
// of. Authored in the console; nothing here belongs to a studio.
//
// Three registries with one shape between them, so they share one set of CRUD
// functions rather than three near-identical copies. Each is a flat list of
// small records always read whole, exactly like the questionnaire registry, so
// there is no cascade to maintain — deleting one is deleting its row.

import { readArr, editArr } from "@/lib/data/store";
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
export const KINDS = {
  packages: {
    key: REG.packages,
    id: ID.package,
    clean: (b) => ({
      name: str(b.name, 80) || "New package",
      minEmployees: num(b.minEmployees),
      maxEmployees: num(b.maxEmployees),
      cost: num(b.cost),
      // ZERO IS A VALUE, not a missing one: a package with no duration runs
      // endlessly. `|| 1` here used to quietly turn "endless" into "one month",
      // which meant the state could not be expressed at all.
      durationMonths: num(b.durationMonths),
      isPublic: Boolean(b.isPublic),
      // How the package shows up wherever a studio's plan is displayed. Stored,
      // not derived from the name: a package can be renamed without silently
      // changing colour, and a new one can pick any of these.
      // Any hex the author picked; falls back to the colour the four shipped
      // names imply, so "Free" still arrives green without being told to.
      color: normalizeColor(b.color) || hexForName(b.name),
      // 0 = unlimited, the same convention duration and max employees use on
      // this screen.
      supportTicketsPerMonth: num(b.supportTicketsPerMonth),
    }),
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
