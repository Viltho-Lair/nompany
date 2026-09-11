// DROPDOWN OPTIONS FROM `referencePickers` (modules/procurement/pickers.ts).
//
// One place that decides how a supplier, a project or a cost code is LABELLED,
// so a bill, a requisition and a subcontract name the same project the same way.
// Client-safe: plain functions over the payload the server already sent.

export const supplierOptions = (pickers) =>
  (pickers?.suppliers || []).map((s) => ({ value: s.id, label: s.name }));

export const projectOptions = (pickers) =>
  (pickers?.projects || []).map((p) => ({
    value: p.id,
    label: [p.number, p.title].filter(Boolean).join(" · ") || p.id,
  }));

// A COST CODE BELONGS TO ONE PROJECT, so the list is that project's alone — and
// empty until a project is chosen, because a code from another job would file
// the money against the wrong budget.
export const costCodeOptions = (pickers, projectId) =>
  (pickers?.costCodes || [])
    .filter((c) => projectId && c.projectId === projectId)
    .map((c) => ({ value: c.id, label: [c.code, c.name].filter(Boolean).join(" · ") }));

// A NAME WHERE THE REGISTER HAS ONE, the id where it does not — a supplier since
// deleted still has orders, and an id is a worse answer than a name but a far
// better one than nothing.
export const supplierName = (pickers, id) =>
  (pickers?.suppliers || []).find((s) => s.id === id)?.name || id || "";
