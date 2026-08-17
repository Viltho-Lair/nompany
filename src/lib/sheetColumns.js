// WHAT EACH DEPARTMENT ADDS TO A QUOTATION ROW. Client-safe, so the viewer can
// draw its columns without pulling the store into the browser.
//
// THE ROW IS ONE ROW. The quotation owns it — description, unit, quantity — and
// it is read back through quotationId on every read, never copied. What a
// department adds sits beside it in the sheet's own `lines[rowId]`, and there is
// ONE such record per row, not one per department. That is the whole point:
//
//   Inventory records that the material is on order, and PROJECTS SEES IT.
//   Projects records that installation is done, and INVENTORY SEES IT.
//
// Two records would make that a copy again, with the same drift and the same
// arguments about which is right. One record, columns owned by whoever the work
// belongs to, everybody reading all of it.
//
// SO "PROJECT VERSION" AND "INVENTORY VERSION" ARE ONE VIEWER WITH TWO SETS OF
// CONTROLS. Both show every column, because a project manager needs to know the
// cameras have not arrived and a storeman needs to know the floor is not ready
// for them. What differs is who may WRITE which — assigning serials is
// Inventory's, installation and programming are Projects' — and that is the
// `owner` on each column below.
//
// Prices appear in NEITHER. They belong to the quotation and to Sales, and are
// dropped when a sheet composes its rows rather than stored-without.

export const SHEET_OWNERS = {
  inventory: { label: "Inventory", permission: "inventory.sheets" },
  projects: { label: "Projects", permission: "projects.list" },
};

// `kind` is what the cell is, which is all the viewer needs to render and
// validate it. Anything more specific belongs to the screen, not here.
export const SHEET_COLUMNS = [
  // ---- Inventory's -------------------------------------------------------
  {
    key: "serials", owner: "inventory", label: "Serials", kind: "list",
    hint: "The units actually held against this line, from Registered Items.",
  },
  {
    key: "stockStatus", owner: "inventory", label: "Material", kind: "choice",
    // The states a line passes through on its way in. "Awaiting" is the one
    // Projects most needs to see and the reason this column is shared at all.
    options: ["Not ordered", "Awaiting", "Partly received", "In stock", "Issued"],
    hint: "Where the material for this line has got to.",
  },
  {
    key: "orderedQty", owner: "inventory", label: "Ordered", kind: "number",
    hint: "How many have been put on order, against the quantity sold.",
  },

  // ---- Projects' ---------------------------------------------------------
  {
    key: "installation", owner: "projects", label: "Installation", kind: "choice",
    options: ["Not started", "In progress", "Done", "Not required"],
    hint: "Whether this line has been installed on site.",
  },
  {
    key: "programming", owner: "projects", label: "Programming", kind: "choice",
    options: ["Not started", "In progress", "Done", "Not required"],
    hint: "Whether this line has been configured and handed over.",
  },
  {
    key: "note", owner: "projects", label: "Note", kind: "text",
    hint: "Anything about this line the next person needs.",
  },
];

export const columnsFor = (owner) => SHEET_COLUMNS.filter((c) => c.owner === owner);

// Only known columns survive, cleaned to their kind. A sheet stores whatever
// this returns and nothing else, so an unknown key cannot be written and read
// back later as if the product had ever meant it.
export function cleanSheetLine(patch, owner) {
  const out = {};
  for (const col of SHEET_COLUMNS) {
    // A department may only write ITS OWN columns. The route asks the
    // permission; this decides which keys that permission covers, so the two
    // cannot drift apart.
    if (owner && col.owner !== owner) continue;
    if (patch?.[col.key] === undefined) continue;
    const v = patch[col.key];
    if (col.kind === "number") out[col.key] = Math.max(0, Math.floor(Number(v) || 0));
    else if (col.kind === "choice") { if (col.options.includes(v)) out[col.key] = v; }
    else if (col.kind === "list") {
      out[col.key] = [...new Set((Array.isArray(v) ? v : []).map((x) => String(x ?? "").trim()).filter(Boolean))].slice(0, 200);
    } else out[col.key] = String(v ?? "").trim().slice(0, 500);
  }
  return out;
}
