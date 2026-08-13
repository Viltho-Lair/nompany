// WHAT A STUDIO CAN BUY — packages, tiers, and the ERP services a tier is made
// of. Authored in the console; nothing here belongs to a studio.
//
// Three registries with one shape between them, so they share one set of CRUD
// functions rather than three near-identical copies. Each is a flat list of
// small records always read whole, exactly like the questionnaire registry, so
// there is no cascade to maintain — deleting one is deleting its row.

import { readArr, editArr } from "@/lib/data/store";
import { ID, REG } from "@/lib/data/keys";

const now = () => new Date().toISOString();
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
