// DEPARTMENTS — the studio's own org chart, stored under Master data.
//
// Rows live under the studio's *administration-master section*:
//   s:<StudioID>:sec:<SectionID>:c:departments
//
// WHAT THIS REPLACES, and why the replacement is not a step backwards. HR once
// kept a `departments` collection; it was deleted because every studio wrote
// its structure down twice — once as the nav, once as an HR list — and the two
// only agreed on the day somebody typed them. That diagnosis was right and the
// fix over-corrected: it deleted the org unit rather than giving each list its
// own job. A SECTION is a product surface and an access boundary. A DEPARTMENT
// is an org unit — who reports to whom, whose headcount, whose cost centre.
// Identity between them cannot express any of the three shapes a real company
// has: two departments inside one section (Structural and MEP both live in
// Engineering & Documents), one department across several (Operations spans
// Projects, Field Ops and Logistics), and a department with no section at all
// (Legal, Estimation, a branch office).
//
// What stops the two lists drifting apart this time is `sectionKeys`: the link
// is stored ON the department, chosen from the sections that actually exist,
// and it is many-to-one rather than an equality.
//
// WHY MASTER DATA OWNS IT AND NOT HR, which is where somebody is assigned to
// one. HR reads it, Projects stamps it on an assignment and Quality stamps it
// on a controlled document — reference data three departments read belongs to
// none of them, the same argument that moved locations here.
//
// And there is a sharper reason than tidiness. `parentId` drives the
// `department` access scope, so RE-PARENTING WIDENS WHAT A MANAGER CAN SEE. If
// this CRUD sat on hr.employees.*, an HR clerk could enlarge a manager's reach
// over employee records and leave without holding administration.access and
// without escalates() ever being asked — invariant 5 through a side door. So
// the register answers to administration.master.* and putting a PERSON in a
// department stays on hr.employees.edit. A studio that wants its HR lead to own
// both grants them the master-data right; that is a decision, not a default.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { ID, SECTION_DEFS } from "@/platform/db/keys";
import { NO_SCREEN_YET } from "@/platform/access";
import { listCollaborators } from "@/platform/auth/collaborators";
import { departmentsForField, UNIVERSAL_DEPARTMENTS } from "@/shared/departments/starters";
import { wouldCycle, depthOf, MAX_DEPARTMENT_DEPTH } from "@/shared/departments/tree";
import type { Department, MasterContext } from "./types";
import type { StudioRef } from "../context";
import type { Section } from "@/platform/db/sections";

const DEPARTMENTS = "departments";

const Departments = repo<Department>(DEPARTMENTS);

const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

/**
 * Sections a department may say it works in.
 *
 * NOT `ALL_SECTION_KEYS`. Three kinds of key are excluded, and each one is a
 * row that appeared in the old derived list and should never have:
 *
 *   main            the studio's home screen, not somewhere anybody works
 *   tasks           a cross-cutting control rather than a section at all
 *   NO_SCREEN_YET   four sections that render nothing — Manufacturing, Assets,
 *                   Reports, Quality & HSE. Offering a department the choice of
 *                   a screen that does not exist is the dead capability this
 *                   product keeps deleting.
 *
 * Sub-sections are excluded too: a department works in Projects, not in
 * `projects-planner`. The list is the top-level operating sections and nothing
 * else, which is what made the old screen offer sixteen departments.
 *
 * TOP-LEVEL IS READ FROM SECTION_DEFS, not guessed from the key's punctuation.
 * This filtered `!key.includes("-")` to drop sub-sections, and that silently
 * dropped THREE REAL TOP-LEVEL SECTIONS with hyphens in their names —
 * `crm-sales`, `engineering-docs` and `field-service`. The picker never offered
 * them, and because `cleanSectionKeys` filters writes through the same list,
 * every seeded chart quietly lost its links to them: a contractor's Site
 * Execution kept `projects` and lost `field-service`, and Business Development
 * stored an empty list. Nothing failed; the links were just never there. Found
 * by opening the screen and seeing a raw `crm-sales` where a name belonged.
 *
 * THE FOUR PLACEHOLDERS COME BACK ON THEIR OWN. This reads NO_SCREEN_YET rather
 * than restating it, so the day Manufacturing gets a screen it becomes
 * assignable without anybody remembering this file — the same reason
 * tests/restructure.mjs stopped keeping a hand-typed copy of that list.
 */
const NEVER_A_DEPARTMENTS_SECTION = new Set(["main", "tasks"]);

// Widened to `readonly string[]` on purpose: NO_SCREEN_YET is a tuple of
// literals, which is what makes it useful to the resolver and useless to a
// membership test against an arbitrary key.
const NO_SCREEN: readonly string[] = NO_SCREEN_YET;

export const assignableSectionKeys = (): string[] =>
  SECTION_DEFS.map((d) => d.key)
    .filter((k) => !NEVER_A_DEPARTMENTS_SECTION.has(k) && !NO_SCREEN.includes(k));

const cleanSectionKeys = (v: unknown): string[] => {
  const allowed = new Set(assignableSectionKeys());
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of Array.isArray(v) ? v : []) {
    const key = String(k ?? "");
    if (allowed.has(key) && !seen.has(key)) { seen.add(key); out.push(key); }
  }
  return out;
};

// ---- seeding -----------------------------------------------------------------

/**
 * Write the starter org chart for this studio's field of work.
 *
 * ONE WRITE, NOT ONE PER ROW. The ids are minted here rather than by the store,
 * which is what lets a child's `parentId` be resolved from its parent's CODE
 * before anything is written — `createMany` then lands the whole chart in a
 * single compare-and-set round instead of one contended round per department.
 *
 * IT ADDS, AND NEVER REMOVES OR RENAMES. Called on an empty register it seeds
 * it; called again — which is what the screen's "add the standard departments"
 * action does after a studio changes its field of work — it adds only what is
 * missing BY CODE and leaves every existing row exactly as the studio edited
 * it. That courtesy is the one `nextPool` already extends to service actions,
 * and it is the reason changing the field of work can never cost a studio the
 * org chart it typed.
 */
async function seedDepartments(
  scope: { studio: StudioRef; section: Section },
  field: string,
  existing: readonly Department[],
): Promise<Department[]> {
  // A STUDIO WITH NO FIELD OF WORK STILL GETS A CHART, and this fallback is the
  // difference between the register being useful on day one and being empty.
  // `createStudio` has never set a field, so "not chosen yet" is the state every
  // studio starts in — and an empty register means an empty DEPARTMENT dropdown
  // and nobody placeable at all, which is worse than the sixteen wrong
  // departments this replaced.
  //
  // What it falls back to is not a guess about a trade: Finance, HR and
  // Administration were identical in all twenty-five fields, which is why they
  // were factored out of the starters in the first place. The operating line
  // still waits until the studio says what it does, and the screen then offers
  // it as an addition.
  const seeds = departmentsForField(field);
  const chart = seeds.length ? seeds : UNIVERSAL_DEPARTMENTS.map((d) => ({ ...d }));
  if (!chart.length) return [];

  const heldCodes = new Set(existing.map((d) => String(d.code || "").toUpperCase()));
  const wanted = chart.filter((s) => !heldCodes.has(s.code.toUpperCase()));
  if (!wanted.length) return [];

  // Codes to ids, for THIS batch plus whatever the studio already holds — so a
  // seeded child re-parents onto the studio's existing row rather than being
  // written flat when only half the chart is missing.
  const idByCode = new Map<string, string>(
    existing.map((d) => [String(d.code || "").toUpperCase(), d.id]),
  );
  for (const s of wanted) idByCode.set(s.code.toUpperCase(), ID.row(DEPARTMENTS));

  const now = new Date().toISOString();
  const rows = wanted.map((s) => ({
    id: idByCode.get(s.code.toUpperCase()) as string,
    name: s.name,
    code: s.code,
    // A parent naming a code this field does not hold is impossible —
    // departmentSeedProblems asserts it — so the fallback is "" rather than a
    // throw: a seed that half-refuses would leave a studio with no chart at all.
    parentId: (s.parent && idByCode.get(s.parent.toUpperCase())) || "",
    managerCollaboratorId: "",
    sectionKeys: cleanSectionKeys(s.sectionKeys),
    createdAt: now,
  }));

  return Departments.createMany(scope, rows);
}

// ---- reading -----------------------------------------------------------------

/**
 * The studio's departments, seeding the starter chart the first time it is
 * empty.
 *
 * SEEDED LAZILY ON FIRST READ, exactly the way `listRoles` and
 * `ensureDefaultPlan` already self-seed: a studio that existed before this
 * feature gets its chart the first time anybody looks, with no migration to
 * remember. The write happens once and only for a studio holding zero rows.
 *
 * A studio whose field of work is `Other`, unset, or a trade this file has
 * never heard of seeds NOTHING and gets an empty register with an explanation —
 * `departmentsForField` returns nothing, mirroring `actionsForField`. Inventing
 * a generic chart would be the product guessing at a trade it was never told.
 */
export async function listDepartments(
  scope: Pick<MasterContext, "studio" | "section">,
): Promise<Department[]> {
  return (await departmentsState(scope)).departments;
}

/**
 * The register, plus whether this studio is waiting to be migrated.
 *
 * THE SEED REFUSES TO FIRE OVER AN UN-MIGRATED STUDIO, and this is the guard
 * that makes the rollout order safe by construction rather than by somebody
 * remembering it.
 *
 * The hazard it closes: while departments were derived from the nav, a person's
 * `departmentId` held a SECTION KEY. If the register seeds a trade chart before
 * those people are re-pointed, the studio ends up in a mixed state — a fresh
 * org chart beside an old one nobody can see — and the migration then has to
 * decide which seeded department each legacy key belongs to. It cannot: FIVE
 * seeded departments claim "crm-sales" across the starter charts, so any
 * matching rule that looked at the section link filed a contractor's sales team
 * into Business Development, silently. That rule is gone, and this stops the
 * state that made it tempting from arising at all.
 *
 * SO AN UN-MIGRATED STUDIO READS AS EMPTY, deliberately, and the screen says
 * why rather than showing a picker with nothing in it. Empty is honest here:
 * this studio HAS an org chart, it is just still written in the old vocabulary,
 * and inventing a second one beside it is the thing to avoid.
 *
 * THE EXTRA READ IS PAID ONLY WHILE THE REGISTER IS EMPTY. Once a studio has
 * departments — seeded or migrated — the first line returns and nothing else
 * runs. A studio in the waiting state pays one collaborators read per load,
 * which the request-scoped cache mostly absorbs because HR reads the same list
 * anyway, and which stops entirely the moment the migration runs.
 */
export async function departmentsState(
  { studio, section }: Pick<MasterContext, "studio" | "section">,
): Promise<{ departments: Department[]; awaitingMigration: boolean }> {
  const rows = await Departments.find({ studio, section });
  if (rows.length) return { departments: sorted(rows), awaitingMigration: false };

  // The register is empty, so no stored departmentId can name a row in it —
  // which makes any non-empty value a legacy section key by definition.
  const people = await listCollaborators(studio.id);
  if (people.some((c) => String(c.departmentId || ""))) {
    return { departments: [], awaitingMigration: true };
  }

  const seeded = await seedDepartments({ studio, section }, str(studio.fieldOfWork, 200), rows);
  if (!seeded.length) return { departments: [], awaitingMigration: false };
  return { departments: sorted(await Departments.find({ studio, section })), awaitingMigration: false };
}

const sorted = (rows: Department[]) =>
  [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

/**
 * The register as another department's context sees it — nullable section,
 * seeding when there is one.
 *
 * HR calls this rather than `departmentsAsStored` because HR's screen is where
 * most studios first meet their org chart, and a picker that is empty until
 * somebody visits Master data would send every new studio to a second screen
 * before it could place its first employee.
 */
export async function listDepartmentsIn(
  studio: StudioRef,
  masterSection: Section | null,
): Promise<Department[]> {
  if (!masterSection) return [];
  return listDepartments({ studio, section: masterSection });
}

/**
 * The register, read and never written — and a studio with no Master data
 * section reads as having no departments rather than failing.
 *
 * THE NON-SEEDING READER, and it exists for the same reason `sectionsAsStored`
 * does. Three modules other than Master data want this list: HR for the picker,
 * Projects to name an assignment's department, Quality to name a document's
 * owner. Only the first is a place anybody manages the register, so only the
 * first should be able to trigger a WRITE — a Projects list route that seeds an
 * org chart as a side effect of being read is the shape of thing R2 was about.
 *
 * The migration's dry run reads through here too: a rehearsal that plants the
 * rows it is reporting is not a rehearsal.
 */
export async function departmentsAsStored(
  studio: StudioRef,
  masterSection: Section | null,
): Promise<Department[]> {
  if (!masterSection) return [];
  return sorted(await Departments.find({ studio, section: masterSection }));
}

/**
 * What the standard chart for this studio's trade would ADD, without adding it.
 *
 * This is the whole of the "field of work changed" story in slice 1, and it is
 * deliberately not a diff UI. Re-seeding on a field change would destroy an
 * edited org chart; a silent one-shot would never reach a studio that switched
 * trades. So the screen offers the names, the studio presses the button, and
 * nothing is ever removed or renamed on its behalf.
 */
export function missingStarters(field: string, existing: readonly Department[]): string[] {
  const held = new Set(existing.map((d) => String(d.code || "").toUpperCase()));
  return departmentsForField(field)
    .filter((s) => !held.has(s.code.toUpperCase()))
    .map((s) => s.name);
}

export async function addMissingStarters(ctx: MasterContext) {
  const denied = requirePermission(ctx.access, "administration.master.create");
  if (denied) return denied;

  const { studio, section } = ctx;
  const existing = await Departments.find({ studio, section });
  // THE SAME SEED BY ANOTHER DOOR, so it takes the same guard. Adding the trade
  // chart to a studio whose people are still on section keys creates exactly
  // the mixed state departmentsState exists to prevent — and this one is a
  // button, so it would be reached deliberately rather than by accident.
  if (!existing.length) {
    const people = await listCollaborators(studio.id);
    if (people.some((c) => String(c.departmentId || ""))) return { error: "awaiting-migration" };
  }
  const added = await seedDepartments({ studio, section }, str(studio.fieldOfWork, 200), existing);
  return { added: added.length, departments: sorted(await Departments.find({ studio, section })) };
}

// ---- writing -----------------------------------------------------------------

/**
 * Validate a name and a code against the rest of the register.
 *
 * A BLANK CODE IS ALLOWED AND A DUPLICATE ONE IS NOT. A code is what a report
 * keys off, so two departments sharing one makes both unfindable; but forcing
 * every studio to invent one before it can name a department is a field nobody
 * asked for standing between them and the screen.
 */
function conflicts(rows: readonly Department[], id: string, name: string, code: string) {
  const others = rows.filter((d) => d.id !== id);
  if (others.some((d) => (d.name || "").toLowerCase() === name.toLowerCase())) return "duplicate";
  if (code && others.some((d) => (d.code || "").toUpperCase() === code.toUpperCase())) return "duplicate-code";
  return "";
}

export async function createDepartment(ctx: MasterContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "administration.master.create");
  if (denied) return denied;

  const { studio, section } = ctx;
  const name = str(body?.name, 60);
  if (!name) return { error: "name" };
  const code = str(body?.code, 12).toUpperCase();

  const rows = await Departments.find({ studio, section });
  const clash = conflicts(rows, "", name, code);
  if (clash) return { error: clash };

  const parentId = str(body?.parentId, 60);
  if (parentId) {
    const parent = rows.find((d) => d.id === parentId);
    if (!parent) return { error: "parent" };
    // Depth is checked against the PARENT's depth plus this row, because this
    // row does not exist yet to be measured.
    if (depthOf(rows, parentId) + 1 > MAX_DEPARTMENT_DEPTH) return { error: "too-deep" };
  }

  const department = await Departments.create({ studio, section }, {
    name,
    code,
    parentId,
    managerCollaboratorId: str(body?.managerCollaboratorId, 60),
    sectionKeys: cleanSectionKeys(body?.sectionKeys),
    createdAt: new Date().toISOString(),
  });
  return { department };
}

export async function editDepartment(ctx: MasterContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "administration.master.edit");
  if (denied) return denied;

  const { studio, section } = ctx;
  const rows = await Departments.find({ studio, section });
  const current = rows.find((d) => d.id === id);
  if (!current) return { error: "notfound" };

  const patch: Record<string, unknown> = {};
  const name = body?.name !== undefined ? str(body.name, 60) : current.name;
  const code = body?.code !== undefined ? str(body.code, 12).toUpperCase() : String(current.code || "");
  if (!name) return { error: "name" };
  const clash = conflicts(rows, id, name, code);
  if (clash) return { error: clash };
  if (body?.name !== undefined) patch.name = name;
  if (body?.code !== undefined) patch.code = code;

  if (body?.parentId !== undefined) {
    const parentId = str(body.parentId, 60);
    if (parentId && !rows.some((d) => d.id === parentId)) return { error: "parent" };
    // A LOOP IS REFUSED AT THE DOOR rather than detected afterwards by a walk
    // that has to guess which link to break — the same argument the tender
    // document chain makes. It is also what keeps the scope walk bounded.
    if (wouldCycle(rows, id, parentId)) return { error: "cycle" };
    const moved = rows.map((d) => (d.id === id ? { ...d, parentId } : d));
    const deepest = Math.max(...moved
      .filter((d) => subtreeHas(moved, id, d.id))
      .map((d) => depthOf(moved, d.id)));
    if (deepest > MAX_DEPARTMENT_DEPTH) return { error: "too-deep" };
    patch.parentId = parentId;
  }

  if (body?.managerCollaboratorId !== undefined) {
    patch.managerCollaboratorId = str(body.managerCollaboratorId, 60);
  }
  if (body?.sectionKeys !== undefined) patch.sectionKeys = cleanSectionKeys(body.sectionKeys);

  const department = await Departments.update({ studio, section }, id, patch);
  return department ? { department } : { error: "notfound" };
}

// Whether `descendant` sits at or under `root`, over rows already in hand.
// Local rather than exported from the tree module: it exists to measure the
// depth of a MOVE that has not happened yet, on a mutated copy.
function subtreeHas(rows: readonly Department[], root: string, descendant: string): boolean {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const seen = new Set<string>();
  let cursor: string | undefined = descendant;
  while (cursor && !seen.has(cursor)) {
    if (cursor === root) return true;
    seen.add(cursor);
    cursor = byId.get(cursor)?.parentId || "";
  }
  return false;
}

/**
 * Delete a department, unless anything still stands in it.
 *
 * REFUSED WITH THE COUNTS, not with a bare "no" — the shape `removeLocation`
 * already uses, and for the same reason: the screen can say what to re-file
 * first. Two things block a delete:
 *
 *   people   their `departmentId`, on the studio-local collaborator row
 *   children a department under this one, which would be orphaned
 *
 * A PROJECT ASSIGNMENT OR A CONTROLLED DOCUMENT STAMPED WITH IT DOES NOT, and
 * that is a decision rather than an oversight. Both are historical records of
 * where work sat at the time; blocking a reorganisation until every past
 * assignment is re-filed would punish exactly the studio doing its housekeeping
 * — the same argument the cost breakdown makes about a deleted cost code. They
 * keep the id and read as unplaced, which is what `departmentName` has always
 * returned for an id naming nothing.
 *
 * NOTHING IS CASCADED. Deleting a department must not silently rewrite a
 * person's placement or a document's owner: that is data the studio would have
 * to reconstruct, and a delete that quietly edits records elsewhere is the kind
 * nobody can undo.
 */
export async function removeDepartment(ctx: MasterContext, id: string) {
  const denied = requirePermission(ctx.access, "administration.master.delete");
  if (denied) return denied;

  const { studio, section } = ctx;
  const [rows, people] = await Promise.all([
    Departments.find({ studio, section }),
    listCollaborators(studio.id),
  ]);
  if (!rows.some((d) => d.id === id)) return { error: "notfound" };

  const children = rows.filter((d) => d.parentId === id).length;
  const staff = people.filter((c) => String(c.departmentId || "") === id).length;
  if (children || staff) return { error: "in-use", children, people: staff };

  const removed = await Departments.remove({ studio, section }, id);
  return removed ? { ok: true } : { error: "notfound" };
}
