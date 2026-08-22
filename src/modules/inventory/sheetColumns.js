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
// for them. What differs is who may WRITE which — and that is the `owner` on
// each column below.
//
// Prices appear in NEITHER. They belong to the quotation and to Sales, and are
// dropped when a sheet composes its rows rather than stored-without.

export const SHEET_OWNERS = {
  inventory: { label: "Inventory", permission: "inventory.sheets" },
  projects: { label: "Projects", permission: "projects.list" },
};

// PROJECTS' COLUMNS ARE GONE FOR NOW — installation, programming and the line
// note. They were my guess at what a project manager records against a line,
// and a guess in a shared row is worse than a gap: people start filling it in
// and then it has to be migrated when the real answer arrives.
//
// The MACHINERY stays, and that is the point of leaving SHEET_OWNERS whole. A
// column declares its owner, cleanSheetLine lets a department write only its
// own, and the route asks the matching right — so Projects' real columns are a
// list entry each when they are known, and nothing else has to change.
export const SHEET_COLUMNS = [
  {
    // ALLOCATION, not typing. A serial is a unit that physically exists in
    // stock, so it is chosen from what is actually there — and a serial already
    // allocated to another row is not offered, because one unit cannot be on
    // two jobs.
    //
    // MATERIAL and ORDERED are gone. Both asked somebody to say in a dropdown
    // what the allocation already says: a row with every unit allocated IS in
    // stock, and a row short of units IS what has to be ordered. Two hand-kept
    // fields that could disagree with the serials beside them, and would.
    key: "serials", owner: "inventory", label: "Serials", kind: "serials",
    hint: "Units allocated to this line from stock.",
  },
];

export const columnsFor = (owner) => SHEET_COLUMNS.filter((c) => c.owner === owner);

// WHERE A ROW STANDS, derived and never stored. Storing it would be a fourth
// number that has to agree with the other three, and it would be the one that
// went stale.
//
// Fully allocated reads "Fulfilled" and nothing else — the detail only matters
// while something is still missing. Otherwise it is up to three lines, and a
// line worth nothing is not drawn: "0 needed" is noise on a row that is done,
// and "0 in stock" is noise on a row nobody can progress anyway.
export function rowStatus({ qty = 0, assigned = 0, inStock = 0 }) {
  const need = Math.max(0, qty - assigned);
  if (qty > 0 && need === 0) return { fulfilled: true, lines: [] };
  const lines = [];
  if (assigned > 0) lines.push({ key: "assigned", n: assigned, text: `${assigned} assigned` });
  if (inStock > 0) lines.push({ key: "stock", n: inStock, text: `${inStock} in stock` });
  if (need > 0) lines.push({ key: "needed", n: need, text: `${need} needed` });
  return { fulfilled: false, lines };
}

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
    else if (col.kind === "serials") {
      out[col.key] = [...new Set((Array.isArray(v) ? v : []).map((x) => String(x ?? "").trim()).filter(Boolean))].slice(0, 200);
    } else out[col.key] = String(v ?? "").trim().slice(0, 500);
  }
  return out;
}
