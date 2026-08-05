// Public showcase data mapping. The marketing site's Vendors / Clients / Team
// sections now read live from the operational collections instead of standalone
// Content collections:
//   Vendors  ← Inventory vendors (inventoryVendors)
//   Clients  ← Sales clients (salesClients)
//   Team     ← Employees (employees)
//
// `fillForward` implements the requested "add missing information from the first
// record to the next if missing" merge: walking the list in order, any blank
// field on a record inherits the most recent non-blank value seen before it.
// Identity / visual fields (name, logo, photo) are intentionally NOT
// forward-filled — one company's logo or one person's photo must never be shown
// for another, which would misrepresent them on a public page.

export function fillForward(rows, fields) {
  const last = {};
  return (rows || []).map((row) => {
    const out = { ...row };
    for (const f of fields) {
      const v = out[f];
      if (v == null || v === "") {
        if (last[f] != null && last[f] !== "") out[f] = last[f];
      } else {
        last[f] = v;
      }
    }
    return out;
  });
}

export function showcaseVendors(inventoryVendors) {
  const mapped = (inventoryVendors || [])
    .filter((v) => v && (v.name || "").trim())
    .map((v) => ({
      id: v.id,
      name: v.name || "",
      image: v.image || v.logo || "",
      url: v.url || v.website || "",
      tag: v.tag || "",
      address: v.address || "",
    }));
  return fillForward(mapped, ["url", "tag", "address"]);
}

export function showcaseClients(salesClients) {
  return (salesClients || [])
    .filter((c) => c && (c.name || "").trim())
    .map((c) => ({
      id: c.id,
      name: c.name || "",
      logo: c.logo || c.image || "",
    }));
}

export function showcaseTeam(employees, positionsById = {}, departmentsById = {}) {
  const mapped = (employees || [])
    .filter((e) => e && (e.fullName || e.name || "").trim())
    .map((e) => ({
      id: e.id,
      name: e.fullName || e.name || "",
      // Employees store positionId / departmentId — resolve them to names.
      position: positionsById[e.positionId]?.name || e.position || "",
      department: departmentsById[e.departmentId]?.name || e.department || "",
      image: e.photo || e.image || "",
    }));
  return fillForward(mapped, ["position", "department"]);
}
