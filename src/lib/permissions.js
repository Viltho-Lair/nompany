// THE PERMISSION CATALOGUE — what this product protects, declared explicitly.
//
// This list is NOT derived from the navigation tree, and that is the whole
// point. The old model hung grants off section ids, so the nav's shape leaked
// into the security model: because "Sales" and "Sales › Tickets" were both
// sections, the model had to answer whether one implied the other — a question
// with no correct answer, and the source of every inheritance bug we hit.
//
// Here there is no `sales` permission. Sales is a HEADING. Only the leaves are
// rights, so nothing can inherit from anything and the question never arises.
//
// Adding a protected capability means adding it here. Nothing else grants it,
// and a key that is never enforced is findable (see the audit in the tests).

// The ladder. Cumulative BY CONVENTION, not by resolution: granting "edit" on
// an area stores view+create+edit as three separate keys, so what is stored is
// always exactly what is allowed. Nothing is computed at check time.
export const LEVELS = ["none", "view", "edit", "full"];
export const LEVEL_VERBS = {
  none: [],
  view: ["view"],
  edit: ["view", "create", "edit"],
  full: ["view", "create", "edit", "delete"],
};

// Scope answers "whose records", and only exists where it means something.
// Everywhere else, asking would teach people to stop reading the control.
export const SCOPES = ["own", "department", "all"];

// The one wildcard role's id. It lives HERE rather than in data/roles.js so a
// client component can name it without dragging the Redis-backed store into the
// browser bundle.
export const ADMIN_ROLE_ID = "role_admin";

// One row per protected area. `verbs` are the ladder rungs this area supports;
// `extra` are powers that do NOT nest inside the ladder and therefore have to be
// granted deliberately — converting an RFQ is not "a bigger edit".
// A PARENT SECTION IS NOT ALWAYS JUST A HEADING. Six of them render a screen of
// their own — the module dashboard — and until now that screen had no right
// behind it: "Sales" was treated as a pure nav parent, so anybody who could open
// any one ticket screen could also read the whole department's funnel, pipeline
// value and win rate. A dashboard is a summary of everything underneath it,
// which is frequently the most sensitive view in the module and exactly the one
// a studio wants to withhold from the people doing the work.
//
// VIEW ONLY, deliberately. A dashboard writes nothing — everything on it is
// derived from records whose own areas already guard them — so create/edit/
// delete here would be three more rights nothing can exercise.
//
// OPERATIONS IS ON THIS LIST TOO, even though its parent is not a summary — it
// is the locations/permits/shifts screen. Its WRITES already answer to
// operations.tracking, but nothing decided whether the screen could be OPENED,
// so it rode in on whatever sub-section grant got somebody into the module. A
// parent that renders anything at all needs a right, whether what it renders is
// a summary or a screen.
//
// Tasks is the one parent still absent, and for a reason that does not apply to
// the others: its parent IS the board, which is tasks.board — it already has a
// right of its own, and a second would be two answers to one question.
//
// QUALITY is on this list for the same reason, arriving from the other end: it
// has no module of its own, so its parent renders the generic section dashboard
// — which is still a screen, and a parent that renders anything at all needs a
// right. Without one it would be a heading with areas nowhere, and
// sectionViewable treats a section with no areas and no viewable children as
// having nothing to protect: Quality would have shown for everybody.
const DASHBOARD_AREAS = [
  ["sales", "Sales"], ["technical", "Technical"], ["projects", "Projects"],
  ["inventory", "Inventory"], ["hr", "Human Resources"], ["finance", "Finance"],
  ["operations", "Operations"], ["quality", "Quality"],
].map(([key, group]) => ({
  key: `${key}.dashboard`, group,
  // Operations' parent is a working screen rather than a dashboard, so it is
  // named for what it actually is on the access grid.
  label: key === "operations" ? "Main screen" : "Dashboard",
  verbs: ["view"],
}));

export const AREAS = [
  ...DASHBOARD_AREAS,

  // NO DELETE. A sales ticket is closed, never erased — its quotations, RFQs
  // and comments all point back at it. Declaring a right nothing can exercise
  // is the same dead-capability trap as the department grants that were stored
  // and never read.
  { key: "sales.tickets", group: "Sales", label: "Tickets", verbs: ["view", "create", "edit"] },
  { key: "sales.clients", group: "Sales", label: "Clients", verbs: ["view", "create", "edit", "delete"] },
  { key: "sales.live", group: "Sales", label: "Live view", verbs: ["view"] },
  { key: "sales.settings", group: "Sales", label: "Settings", verbs: ["view", "edit"] },

  { key: "technical.rfq", group: "Technical", label: "RFQ", verbs: ["view", "create", "edit"],
    extra: [{ key: "convert", label: "Convert to quotation" }] },
  // LOCK AND UNLOCK ARE SEPARATE POWERS, and unlock is the rarer and larger of
  // the two. Locking says "this document is finished"; unlocking reopens one
  // somebody already declared finished — a client is holding it — so it is
  // granted deliberately rather than folded into lock or into edit.
  { key: "technical.quotations", group: "Technical", label: "Quotations", verbs: ["view", "create", "edit", "delete"],
    extra: [
      { key: "lock", label: "Lock permanently" },
      { key: "unlock", label: "Unlock a locked quotation" },
    ] },
  { key: "technical.live", group: "Technical", label: "Live view", verbs: ["view"] },
  { key: "technical.settings", group: "Technical", label: "Settings", verbs: ["view", "edit"] },

  { key: "projects.list", group: "Projects", label: "Projects", verbs: ["view", "create", "edit", "delete"] },
  { key: "projects.sla", group: "Projects", label: "SLA", verbs: ["view", "create", "edit", "delete"] },
  { key: "projects.overtimes", group: "Projects", label: "Overtimes", verbs: ["view", "create", "edit", "delete"] },
  { key: "projects.settings", group: "Projects", label: "Settings", verbs: ["view", "edit"] },

  { key: "inventory.stock", group: "Inventory", label: "Stock", verbs: ["view", "create", "edit", "delete"] },
  { key: "inventory.vendors", group: "Inventory", label: "Vendors", verbs: ["view", "create", "edit", "delete"] },
  { key: "inventory.items", group: "Inventory", label: "Registered items", verbs: ["view", "create", "edit", "delete"] },
  // NO LONGER VIEW ONLY. It was, while a sheet was just the screen over purchase
  // orders — every write on it moved stock, so those were inventory.stock
  // rights and declaring more here would have been rights nothing could
  // exercise.
  //
  // A sheet now carries INVENTORY'S OWN COLUMNS against each quotation row —
  // serials, material status, quantity ordered — which are written on the sheet
  // and move no stock. That is a real write with no existing right behind it,
  // so it gets one. See lib/sheetColumns.js for which columns this covers;
  // Projects' columns on the same row answer to projects.list.edit.
  { key: "inventory.sheets", group: "Inventory", label: "Project sheets", verbs: ["view", "edit"] },
  { key: "inventory.awb", group: "Inventory", label: "AWB tracking", verbs: ["view", "create", "edit", "delete"] },

  // The sharpest scoping case in the product: everybody needs their own record
  // and nobody else's, and salary is a separate right from the record itself.
  { key: "hr.employees", group: "Human Resources", label: "Employees", verbs: ["view", "create", "edit", "delete"],
    scoped: true, extra: [{ key: "salary", label: "See pay and salary" }] },
  { key: "hr.vacations", group: "Human Resources", label: "Vacations", verbs: ["view", "create", "edit"],
    scoped: true, extra: [{ key: "approve", label: "Approve requests" }] },

  { key: "finance.cash", group: "Finance", label: "Cash", verbs: ["view", "create", "edit", "delete"] },
  { key: "finance.settings", group: "Finance", label: "Settings", verbs: ["view", "edit"] },

  { key: "operations.tracking", group: "Operations", label: "Tracking", verbs: ["view", "create", "edit", "delete"] },
  { key: "operations.settings", group: "Operations", label: "Settings", verbs: ["view", "edit"] },

  // VIEW ONLY, for now and on purpose. The Documents screen is empty — there is
  // nothing to create, edit or delete on it yet — and declaring those three
  // rungs would be three rights nothing can exercise, which is the dead
  // capability this catalogue exists to avoid. The verbs go in beside the
  // writes that need them.
  { key: "quality.documents", group: "Quality", label: "Documents", verbs: ["view"] },

  { key: "tasks.board", group: "Tasks", label: "Task board", verbs: ["view", "create", "edit", "delete"] },
  { key: "tasks.settings", group: "Tasks", label: "Settings", verbs: ["view", "edit"] },

  { key: "people.members", group: "People", label: "People & access", verbs: ["view", "edit"] },
  { key: "studio.settings", group: "Studio", label: "Studio settings", verbs: ["view", "edit"] },
];

// Every key this product recognises: "sales.tickets.view", "hr.employees.salary".
export const ALL_PERMISSIONS = AREAS.flatMap((a) => [
  ...a.verbs.map((v) => `${a.key}.${v}`),
  ...(a.extra || []).map((x) => `${a.key}.${x.key}`),
]);

const KNOWN = new Set(ALL_PERMISSIONS);
export const isPermission = (key) => KNOWN.has(String(key || ""));
export const areaOf = (key) => AREAS.find((a) => String(key || "").startsWith(`${a.key}.`)) || null;

// Only known keys survive, and duplicates collapse. A permission the product
// does not recognise cannot be stored, whatever a request says.
export function cleanPermissions(list) {
  return [...new Set((Array.isArray(list) ? list : []).map(String).filter(isPermission))];
}

// THE RUNGS THIS AREA ACTUALLY HAS. An area with no delete verb — a sales
// ticket, which is closed rather than erased — has no "full" distinct from
// "edit", and offering both would be two buttons that do the same thing.
// A rung only exists if it grants something the rung below it does not.
export function levelsFor(area) {
  const out = [];
  let previous = "";
  for (const level of LEVELS) {
    const verbs = LEVEL_VERBS[level].filter((v) => area.verbs.includes(v));
    const signature = verbs.join(",");
    if (level !== "none" && signature === previous) continue;
    out.push(level);
    previous = signature;
  }
  return out;
}

// The ladder rung a set of held keys amounts to, for ONE area. Used only to
// render the segmented control — resolution never consults it.
//
// Walks the area's OWN rungs, highest first. Walking the full four would report
// "full" for an area that has no delete, because every verb it does have would
// be held.
export function levelOf(area, held) {
  const rungs = levelsFor(area);
  for (let i = rungs.length - 1; i > 0; i -= 1) {
    const wanted = LEVEL_VERBS[rungs[i]].filter((v) => area.verbs.includes(v));
    if (wanted.length && wanted.every((v) => held.has(`${area.key}.${v}`))) return rungs[i];
  }
  return "none";
}

// The keys a ladder rung means for one area — what the segmented control writes.
export function keysForLevel(area, level) {
  return (LEVEL_VERBS[level] || []).filter((v) => area.verbs.includes(v)).map((v) => `${area.key}.${v}`);
}

export const GROUPS = [...new Set(AREAS.map((a) => a.group))];
