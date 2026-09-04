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
export const LEVELS = ["none", "view", "edit", "full"] as const;
export type Level = (typeof LEVELS)[number];

// The four verbs, and the only four. `as const` throughout this file is not
// decoration: it is what turns these lists into the PermissionKey union at the
// bottom, so a mistyped key stops being a runtime "unknown-permission" and
// becomes a red squiggle.
export const VERBS = ["view", "create", "edit", "delete"] as const;
export type Verb = (typeof VERBS)[number];

export const LEVEL_VERBS: Record<Level, readonly Verb[]> = {
  none: [],
  view: ["view"],
  edit: ["view", "create", "edit"],
  full: ["view", "create", "edit", "delete"],
};

// Scope answers "whose records", and only exists where it means something.
// Everywhere else, asking would teach people to stop reading the control.
export const SCOPES = ["own", "department", "all"] as const;
export type Scope = (typeof SCOPES)[number];

// The one wildcard role's id. It lives HERE rather than in data/roles.js so a
// client component can name it without dragging the Redis-backed store into the
// browser bundle.
export const ADMIN_ROLE_ID = "role_admin";

// One row per protected area. `verbs` are the ladder rungs this area supports;
// `extra` are powers that do NOT nest inside the ladder and therefore have to be
// granted deliberately — converting an RFQ is not "a bigger edit".
// A PARENT SECTION IS NOT ALWAYS JUST A HEADING. Eight of them render a screen
// of their own — the module dashboard — and until now that screen had no right
// behind it: "Sales" was treated as a pure nav parent, so anybody who could open
// any one ticket screen could also read the whole department's funnel, pipeline
// value and win rate. A dashboard is a summary of everything underneath it,
// which is frequently the most sensitive view in the module and exactly the one
// a studio wants to withhold from the people doing the work.
//
// PROCUREMENT AND LOGISTICS ARE NOT ON THIS LIST, and were for one commit. The
// argument made for them was that each backs a real screen — Suppliers,
// Shipments — but those screens are the CHILD sections
// (`procurement-suppliers`, `logistics-shipments`) and each already answers to
// its own area. Neither PARENT has a dashboard: the studio router has no
// `screenKey === "procurement"` / `"logistics"` case, so both roots fall
// through to the generic SectionDashboard, which renders a heading and its
// subsection cards and gates on nothing. So `procurement.dashboard.view` and
// `logistics.dashboard.view` were two rights nobody could exercise — invariant
// 16, and exactly what "every area is referenced by something that enforces
// it" caught: neither had a SECTION_AREAS entry, because there was no screen
// for one to gate. They come back on the day either root renders a summary of
// its own, along with the SECTION_AREAS lines that make them bite.
//
// VIEW ONLY, deliberately. A dashboard writes nothing — everything on it is
// derived from records whose own areas already guard them — so create/edit/
// delete here would be three more rights nothing can exercise.
//
// FIELD SERVICE IS ON THIS LIST TOO, even though its parent is not a summary —
// today it is still the combined locations/permits/shifts screen carried over
// from Operations (locations move to Administration and permits to Quality &
// HSE in the data — see restructure.ts's COLLECTION_MOVES — but the screen that
// renders them has not been split yet). Its WRITES already answer to
// fieldService.tracking, but nothing decided whether the screen could be
// OPENED, so it rode in on whatever sub-section grant got somebody into the
// module. A parent that renders anything at all needs a right, whether what it
// renders is a summary or a screen.
//
// Tasks is the one parent still absent, and for a reason that does not apply to
// the others: its parent IS the board, which is tasks.board — it already has a
// right of its own, and a second would be two answers to one question.
//
// QUALITY & HSE is on this list for the same reason, arriving from the other
// end: it has no sub-sections of its own at all now that the document register
// has moved to Engineering & Documents too, so its parent renders the generic
// section dashboard — which is still a screen, and a parent that renders
// anything at all needs a right. Without one it would be a heading with areas
// nowhere, and sectionViewable treats a section with no areas and no viewable
// children as having nothing to protect: Quality & HSE would have shown for
// everybody.
//
// STILL GENERATED, not written out. One row per module is the point — the eight
// are the same right with a different subject — and spelling them out to
// satisfy the type system would trade the reason for the convenience. The
// tuple below carries the literal types instead, and the union at the bottom
// is built from it rather than from the mapped result, which `.map` would have
// widened to `string`.
const DASHBOARD_MODULES = [
  ["crmSales", "CRM & Sales"], ["engineeringDocs", "Engineering & Documents"],
  ["projects", "Projects"], ["inventory", "Inventory & Warehouse"],
  ["hr", "Human Resources"],
  ["finance", "Finance & Accounting"], ["fieldService", "Field Operations & Service"],
] as const;
type DashboardModule = (typeof DASHBOARD_MODULES)[number][0];

const DASHBOARD_AREAS: readonly Area[] = DASHBOARD_MODULES.map(([key, group]) => ({
  key: `${key}.dashboard`, group,
  // Field Service's parent is a working screen rather than a dashboard, so it
  // is named for what it actually is on the access grid.
  label: key === "fieldService" ? "Main screen" : "Dashboard",
  verbs: ["view"],
}));

// WHAT AN AREA IS, structurally. Named rather than inferred because it is the
// contract `levelsFor`, `levelOf` and `keysForLevel` all take, and inferring it
// from the list below would make every one of them depend on the exact tuple
// rather than on the shape.
export type Area = {
  readonly key: string;
  readonly group: string;
  readonly label: string;
  readonly verbs: readonly Verb[];
  readonly scoped?: boolean;
  readonly extra?: readonly { readonly key: string; readonly label: string }[];
};

// The areas declared one by one. The dashboards are NOT spread in here — they
// join in AREAS below — because a spread of `readonly Area[]` widens the whole
// literal: `as const` cannot see through it, every key becomes `string`, and
// PermissionKey silently degrades into "any key crossed with any verb".
//
// That is exactly what happened on the first draft of this conversion, and the
// type caught it: `sales.tickets.delete` type-checked (the area was still
// called `sales.tickets` then), on an area whose comment three lines down says
// it deliberately has no delete. The runtime bug hiding underneath was a
// duplicate — every dashboard permission listed twice.
const OWN_AREAS = [
  // NO DELETE. A sales ticket is closed, never erased — its quotations, RFQs
  // and comments all point back at it. Declaring a right nothing can exercise
  // is the same dead-capability trap as the department grants that were stored
  // and never read.
  { key: "crmSales.tickets", group: "CRM & Sales", label: "Tickets", verbs: ["view", "create", "edit"] },
  { key: "crmSales.clients", group: "CRM & Sales", label: "Clients", verbs: ["view", "create", "edit", "delete"] },
  { key: "crmSales.live", group: "CRM & Sales", label: "Live view", verbs: ["view"] },
  { key: "crmSales.settings", group: "CRM & Sales", label: "Settings", verbs: ["view", "edit"] },

  { key: "engineeringDocs.rfq", group: "Engineering & Documents", label: "RFQ", verbs: ["view", "create", "edit"],
    extra: [{ key: "convert", label: "Convert to quotation" }] },
  // LOCK AND UNLOCK ARE SEPARATE POWERS, and unlock is the rarer and larger of
  // the two. Locking says "this document is finished"; unlocking reopens one
  // somebody already declared finished — a client is holding it — so it is
  // granted deliberately rather than folded into lock or into edit.
  //
  // GROUPED UNDER CRM & SALES, not Engineering & Documents alongside the RFQ it
  // is raised from — the quotation is the offer, which the blueprint puts in
  // the sales half of the deal (restructure.ts's SECTION_KEY_MAP: the quotation
  // moves to crm-sales-quotations, RFQ stays behind in engineering-docs-rfq).
  { key: "crmSales.quotations", group: "CRM & Sales", label: "Quotations", verbs: ["view", "create", "edit", "delete"],
    extra: [
      { key: "lock", label: "Lock permanently" },
      { key: "unlock", label: "Unlock a locked quotation" },
    ] },
  // CONTRACTS AND THE VARIATIONS AGAINST THEM, under one area on purpose.
  // The stage registry already says a change order "answers to the same right
  // the contract does": scope moving after signature is the same authority as
  // the signature. Both records were built in P2 borrowing
  // crmSales.quotations, with a note that each "gets its own area when it gets
  // a screen" — this is that.
  //
  // NO `delete`. A contract is a commitment somebody signed; it is amended by a
  // change order or ended, never removed, which is the same reasoning that
  // keeps a ledger entry reversible rather than editable.
  //
  // `approve` IS ITS OWN POWER because answering a variation is not raising
  // one. Invariant 7 is enforced at the transition — the person who submitted
  // a change order may not answer it — and holding both rights stays
  // legitimate; using both on one record does not.
  { key: "crmSales.contracts", group: "CRM & Sales", label: "Contracts", verbs: ["view", "create", "edit"],
    extra: [{ key: "approve", label: "Answer a change order" }] },
  { key: "engineeringDocs.live", group: "Engineering & Documents", label: "Live view", verbs: ["view"] },
  { key: "engineeringDocs.settings", group: "Engineering & Documents", label: "Settings", verbs: ["view", "edit"] },

  { key: "projects.list", group: "Projects", label: "Projects", verbs: ["view", "create", "edit", "delete"] },
  { key: "projects.sla", group: "Projects", label: "SLA", verbs: ["view", "create", "edit", "delete"] },
  { key: "projects.overtimes", group: "Projects", label: "Overtimes", verbs: ["view", "create", "edit", "delete"] },
  { key: "projects.settings", group: "Projects", label: "Settings", verbs: ["view", "edit"] },

  { key: "inventory.stock", group: "Inventory & Warehouse", label: "Stock", verbs: ["view", "create", "edit", "delete"] },
  // MOVED TO PROCUREMENT & SUBCONTRACTING — buying is where Vendors always
  // belonged; Inventory kept the screen only because that is where it was
  // built. Relabelled to match the section it now sits in
  // (procurement-suppliers, "Suppliers", in keys.ts's SECTION_DEFS).
  { key: "procurement.suppliers", group: "Procurement & Subcontracting", label: "Suppliers", verbs: ["view", "create", "edit", "delete"] },
  { key: "inventory.items", group: "Inventory & Warehouse", label: "Registered items", verbs: ["view", "create", "edit", "delete"] },
  // NO LONGER VIEW ONLY. It was, while a sheet was just the screen over purchase
  // orders — every write on it moved stock, so those were inventory.stock
  // rights and declaring more here would have been rights nothing could
  // exercise.
  //
  // A sheet now carries INVENTORY'S OWN COLUMNS against each quotation row —
  // serials, material status, quantity ordered — which are written on the sheet
  // and move no stock. That is a real write with no existing right behind it,
  // so it gets one. See modules/inventory/sheetColumns.js for which columns this covers;
  // Projects' columns on the same row answer to projects.list.edit.
  { key: "inventory.sheets", group: "Inventory & Warehouse", label: "Project sheets", verbs: ["view", "edit"] },
  // MOVED TO LOGISTICS & FLEET — AWB is goods in movement, which is Logistics's
  // home now (restructure.ts's SECTION_KEY_MAP). Relabelled to match
  // logistics-shipments, "Shipments", in keys.ts's SECTION_DEFS.
  { key: "logistics.shipments", group: "Logistics & Fleet", label: "Shipments", verbs: ["view", "create", "edit", "delete"] },

  // The sharpest scoping case in the product: everybody needs their own record
  // and nobody else's, and salary is a separate right from the record itself.
  { key: "hr.employees", group: "Human Resources", label: "Employees", verbs: ["view", "create", "edit", "delete"],
    scoped: true, extra: [{ key: "salary", label: "See pay and salary" }] },
  { key: "hr.vacations", group: "Human Resources", label: "Vacations", verbs: ["view", "create", "edit"],
    scoped: true, extra: [{ key: "approve", label: "Approve requests" }] },

  { key: "finance.cash", group: "Finance & Accounting", label: "Cash", verbs: ["view", "create", "edit", "delete"] },
  // THE LEDGER HAS NO ORDINARY CRUD. An entry is posted and, if wrong, reversed;
  // it is never edited or deleted, because it is the record of a decision (the
  // same reasoning as a typed task). So `post` and `reverse` are `extra` powers
  // outside the view/create/edit/delete ladder, and they are SEPARATE from each
  // other on purpose — reversing somebody's posting is not a bigger post.
  { key: "finance.ledger", group: "Finance & Accounting", label: "Ledger", verbs: ["view"],
    extra: [{ key: "post", label: "Post journal entries" }, { key: "reverse", label: "Reverse entries" }] },
  // Raising a bill and AUTHORISING it are two acts (invariant 7: raiser ≠
  // approver), and paying is a third — so approve and pay are extra powers
  // outside the view/create/edit/delete ladder.
  //
  // `approveHigh` is a FOURTH, and it exists because `approve` could not
  // express an amount: one right meant a 200-unit stationery bill and a
  // 2,000,000 subcontractor bill took the same path, so the only way a studio
  // could say "the FD sees the big ones" was to withhold approval from
  // everybody who handles the small ones — a bottleneck, not a control. WHICH
  // amount counts as high is the STUDIO's to set (Finance settings, as an
  // approval chain); this key is only who may clear a bill once it is.
  { key: "finance.payables", group: "Finance & Accounting", label: "Payables", verbs: ["view", "create", "edit", "delete"],
    extra: [
      { key: "approve", label: "Approve bills" },
      { key: "pay", label: "Record payments" },
      { key: "approveHigh", label: "Approve bills above the limit" },
    ] },
  { key: "finance.assets", group: "Finance & Accounting", label: "Fixed assets", verbs: ["view", "create", "edit"],
    extra: [{ key: "dispose", label: "Dispose of an asset" }] },
  { key: "finance.settings", group: "Finance & Accounting", label: "Settings", verbs: ["view", "edit"] },

  // The rota is a sub-section of its own: view opens the schedule screen, and
  // create/edit/delete are the shifts on it. The working week it draws against
  // is the STUDIO's (studio.workingHours), set in Studio settings — this grant
  // governs the shifts, not the week.
  { key: "fieldService.schedule", group: "Field Operations & Service", label: "Schedule", verbs: ["view", "create", "edit", "delete"] },
  { key: "fieldService.tracking", group: "Field Operations & Service", label: "Tracking", verbs: ["view", "create", "edit", "delete"] },
  { key: "fieldService.settings", group: "Field Operations & Service", label: "Settings", verbs: ["view", "edit"] },
  // The project planner is a sub-section of its own, so it carries its own right:
  // view opens the app and its plans, edit creates and changes them. A project's
  // OWN plan is reached through the projects-list grant instead (the "Project
  // plan" button), so this gates the cross-project app, not a project's
  // schedule. GROUPED UNDER PROJECTS now, which is where it actually belongs —
  // it sat under Operations only because that is where it was built.
  { key: "projects.planner", group: "Projects", label: "Planner", verbs: ["view", "edit"] },

  // The controlled-document register.
  //
  // NO `setup`. It was declared for managing the studio's document taxonomy —
  // the types, their prefixes and the department codes every document number is
  // built from — and that taxonomy was never built. There is no types
  // collection, no codes registry and no screen: mintCode() takes the prefix and
  // department straight off the request body and defaults to "DOC".
  //
  // It survived this long by looking alive. `canSetup` computed it into the
  // quality context, which was enough for the architectural check to count the
  // key as referenced — but its only consumer was a `setup` branch of
  // qualityGuard that no route ever called. A mention is not enforcement, and
  // the check could not tell the difference. Deleting the dead guard during the
  // wrapper conversion left the key with nothing at all, and the check fired.
  //
  // Second one of these, after `share` below. Both were rights somebody could
  // grant in good faith believing they conferred something.
  //
  // Review, approve, publish and withdraw are deliberately ABSENT until the
  // transitions that exercise them exist. A right nothing can act on is the
  // dead capability this catalogue is built to avoid.
  // REVIEW AND APPROVE ARE TWO RIGHTS, not one, because they are two people.
  // Folding them together would let the same person sign both halves, and a
  // revision signed twice by one hand has been reviewed by nobody.
  //
  // PUBLISH is separate again: signing off on the text and deciding the day a
  // company starts working to it are different acts, and the second one is
  // usually somebody else's to time.
  // MOVED TO ENGINEERING & DOCUMENTS — the register is the technical truth now
  // (blueprint §3.4); Quality & HSE keeps the evidence (inspections, NCRs,
  // audits, incidents, permits), not the record itself. Relabelled to match
  // engineering-docs-register, "Document register", in keys.ts's SECTION_DEFS.
  { key: "engineeringDocs.register", group: "Engineering & Documents", label: "Document register", verbs: ["view", "create", "edit", "delete"],
    extra: [
      { key: "review", label: "Sign as reviewer" },
      { key: "approve", label: "Sign as approver" },
      { key: "publish", label: "Issue a revision" },
      { key: "obsolete", label: "Withdraw a document" },
      // NO `share`. External share links were declared here, given a key
      // builder (ix:qshare), a collection (qualityShareLinks) and a reserved
      // route prefix (/q) — and nothing was ever written to read or write any
      // of them. So the right appeared on the access grid, could be granted,
      // and granted nothing.
      //
      // That is precisely the dead capability this catalogue's own rule
      // forbids, and it is worse than a missing feature: somebody could hand
      // out what they believed was the power to publish a controlled document
      // externally. It returns when the transition that exercises it exists.
    ] },

  { key: "tasks.board", group: "Tasks", label: "Task board", verbs: ["view", "create", "edit", "delete"] },
  { key: "tasks.settings", group: "Tasks", label: "Settings", verbs: ["view", "edit"] },

  // "PEOPLE", NOT "PEOPLE & ACCESS" ANY MORE. This area covered both screens
  // while Access had no right of its own; now that it does, a label claiming
  // access would have two areas answering for the same word on the grid
  // somebody grants from.
  { key: "administration.members", group: "Administration & Settings", label: "People", verbs: ["view", "edit"] },
  // ROLES ARE A GRANT NOW, not an admin-only screen. `canAdminister` remains
  // the owner/admin shortcut inside the resolver and still short-circuits
  // everything; what changes is that opening this screen no longer DEPENDS on
  // it, so a studio can delegate role management without handing over
  // everything else being an admin carries. escalates() is untouched and still
  // refuses anybody a grant they do not hold themselves — widening who may
  // open the screen does not widen what any of them may hand out.
  { key: "administration.access", group: "Administration & Settings", label: "Roles and access", verbs: ["view", "edit"] },
  { key: "administration.settings", group: "Administration & Settings", label: "Studio settings", verbs: ["view", "edit"] },
  // MASTER DATA, AND THE SCREEN ARRIVED WITH IT. This key was declared once
  // before and deleted in the same restructure, because `administration-master`
  // rendered nothing: a right over a screen that does not exist is invariant
  // 16's dead capability, and the note here said it would come back WITH the
  // screen rather than ahead of it. This is that commit.
  //
  // FULL CRUD, unlike its three siblings, because master data is records rather
  // than a settings form — locations are created and deleted, not toggled. The
  // rest of the blueprint's master data (currencies, UoM, numbering series,
  // cost codes, the industry taxonomy, the flow templates) is not here: four of
  // those already live in Studio settings and move in their own change, and
  // three have no records at all yet. A tab per absent record would be the same
  // dead capability wearing a screen.
  { key: "administration.master", group: "Administration & Settings", label: "Master data", verbs: ["view", "create", "edit", "delete"] },


  // THE ENGAGEMENT VIEW. One key, and deliberately unscoped: what a person sees
  // inside an engagement is decided stage by stage by the permission each stage
  // already declares in platform/engagement/registry.ts, so an own/department/all
  // dimension here would be a second mechanism for the same thing.
  //
  // DELETE AND LOCK ARE SEPARATE POWERS, the same split crmSales.quotations
  // already makes and for a sharper reason. Deleting a deal takes its tickets,
  // RFQs, quotations, project, sheets and invoices with it — so the lock is the
  // interlock, and holding the power to delete must not by itself hand somebody
  // the power to take the safety off. `lock` covers both directions: whoever may
  // lock a deal may unlock it, because re-locking is the safe half and splitting
  // them would leave a deal nobody could shut again.
  //
  // GROUPED UNDER MAIN, not a section of its own — the engagement view is
  // deliberately NOT one of the fifteen sections (giving Main a nav child would
  // gate the parent and hide Main from every member without the right; see
  // docs/progress.md). "Main" here is only the access-grid's grouping label,
  // the same as any other area's `group`, and carries no nav nesting with it —
  // the screen itself is reached from a nav entry beside Main, not under it.
  { key: "engagements", group: "Main", label: "Engagements", verbs: ["view", "delete"],
    extra: [{ key: "lock", label: "Lock and unlock a deal" }] },
] as const;

export const AREAS: readonly Area[] = [...DASHBOARD_AREAS, ...OWN_AREAS];

// EVERY KEY THIS PRODUCT RECOGNISES, as a type.
//
// This is what the whole file was `as const` for. `requirePermission(access,
// "crmSales.tickets.viw")` is now a compile error rather than a runtime
// `unknown-permission` that only fires if the line is reached — which for a
// guard on a rare branch can be a long time.
//
// Derived from the same two arrays the runtime list is built from, so the two
// cannot disagree: there is no way to add an area except through OWN_AREAS or
// DASHBOARD_MODULES, and both feed both.
type PermsOf<A> = A extends Area
  ? `${A["key"]}.${A["verbs"][number]}`
    | (A extends { extra: readonly { key: string }[] } ? `${A["key"]}.${A["extra"][number]["key"]}` : never)
  : never;

export type PermissionKey =
  | `${DashboardModule}.dashboard.view`
  | PermsOf<(typeof OWN_AREAS)[number]>;

// The same set as a value: "crmSales.tickets.view", "hr.employees.salary".
//
// The cast is the one seam between the type and the runtime, and it is narrow
// by construction: this flattens exactly the arrays PermissionKey is derived
// from. Widening it — a second source of areas, a key built anywhere else —
// makes the cast a lie, which is why there is no other way to declare an area.
export const ALL_PERMISSIONS = AREAS.flatMap((a) => [
  ...a.verbs.map((v) => `${a.key}.${v}`),
  ...(a.extra || []).map((x) => `${a.key}.${x.key}`),
]) as PermissionKey[];

const KNOWN: ReadonlySet<string> = new Set(ALL_PERMISSIONS);

// A TYPE GUARD, not a boolean. This is the border: everything on the far side
// of it — a role's stored permissions, an override, a request body — is a
// string from Redis, and this is the single place a string becomes a
// PermissionKey. Typing it `key is PermissionKey` is what lets cleanPermissions
// below return the union without a cast of its own.
export const isPermission = (key: unknown): key is PermissionKey =>
  KNOWN.has(String(key ?? ""));

export const areaOf = (key: string | null | undefined): Area | null =>
  AREAS.find((a) => String(key || "").startsWith(`${a.key}.`)) || null;

// Only known keys survive, and duplicates collapse. A permission the product
// does not recognise cannot be stored, whatever a request says.
export function cleanPermissions(list: unknown): PermissionKey[] {
  return [...new Set((Array.isArray(list) ? list : []).map(String).filter(isPermission))];
}

// THE RUNGS THIS AREA ACTUALLY HAS. An area with no delete verb — a sales
// ticket, which is closed rather than erased — has no "full" distinct from
// "edit", and offering both would be two buttons that do the same thing.
// A rung only exists if it grants something the rung below it does not.
export function levelsFor(area: Area): Level[] {
  const out: Level[] = [];
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
export function levelOf(area: Area, held: ReadonlySet<string>): Level {
  const rungs = levelsFor(area);
  for (let i = rungs.length - 1; i > 0; i -= 1) {
    const wanted = LEVEL_VERBS[rungs[i]].filter((v) => area.verbs.includes(v));
    if (wanted.length && wanted.every((v) => held.has(`${area.key}.${v}`))) return rungs[i];
  }
  return "none";
}

// The keys a ladder rung means for one area — what the segmented control writes.
export function keysForLevel(area: Area, level: Level): string[] {
  return (LEVEL_VERBS[level] || []).filter((v) => area.verbs.includes(v)).map((v) => `${area.key}.${v}`);
}

export const GROUPS = [...new Set(AREAS.map((a) => a.group))];

// ---- proof that the union is load-bearing ----------------------------------
// A type nobody checks is decoration. These four lines are checked by both
// tsconfigs on every build, and the two `@ts-expect-error` directives are the
// interesting half: tsc reports an UNUSED directive as an error, so if
// PermissionKey ever went slack enough to accept a typo, the build fails on the
// comment rather than silently letting the typo through.
type Assert<T extends true> = T;

export type _RealKeyIsAccepted = Assert<"crmSales.tickets.view" extends PermissionKey ? true : false>;
export type _ExtraKeyIsAccepted = Assert<"hr.employees.salary" extends PermissionKey ? true : false>;
export type _DashboardKeyIsAccepted = Assert<"finance.dashboard.view" extends PermissionKey ? true : false>;

// @ts-expect-error a typo is not a permission
export type _TypoIsRejected = Assert<"crmSales.tickets.viw" extends PermissionKey ? true : false>;
// @ts-expect-error `delete` is not a verb tickets have — they close, never erase
export type _UndeclaredVerbIsRejected = Assert<"crmSales.tickets.delete" extends PermissionKey ? true : false>;
