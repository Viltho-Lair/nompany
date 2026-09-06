// DEPARTMENTS — the studio's org chart, Master data's collection.
//
// The route lives here because the collection does, the same rule that moved
// locations off `operations/locations`. HR reads the register through its own
// payload and places people in it; nothing in HR writes here.
//
// NO BLANKET `canManage` GATE. Each verb is left to its own service call and
// its own requirePermission — the shape the locations route beside this one
// uses, and the bills route before it. A studio may grant somebody
// administration.master.edit and nothing else, and that person must be able to
// re-file a department without holding the rest of Administration.
//
// THE GET IS HERE AND NOT ONLY ON HR, because Master data is a screen of its
// own and a studio may grant the register to somebody with no HR rights at all
// — which is most of the point of it living under administration.master.
import { route, refused } from "@/platform/http/route";
import { masterContext } from "@/modules/administration/master";
import {
  departmentsState, createDepartment, editDepartment, removeDepartment,
  addMissingStarters, missingStarters, assignableSectionKeys,
} from "@/modules/administration/departments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: masterContext, body: true, name: "administration/departments" };

export const GET = route({ ...spec, body: false }, async (master) => {
  const { departments, awaitingMigration } = await departmentsState(master);
  return {
    departments,
    // WHY THE REGISTER IS EMPTY, when it is. A studio whose people still hold
    // section keys is not a studio without an org chart — it has one, written
    // in the old vocabulary — so the seed refuses to fire over it and the
    // screen says so. An empty picker with no explanation reads as broken, and
    // that is how this feature has already misled somebody once.
    awaitingMigration,
    // WHAT THE STANDARD CHART WOULD ADD, offered and never applied. A studio
    // that changed its field of work sees the names it is missing and decides;
    // re-seeding on its behalf would destroy an org chart it had edited.
    missing: missingStarters(String(master.studio.fieldOfWork || ""), departments),
    // The sections a department may say it works in — top-level, with a screen,
    // AND NAMED. Served rather than derived on the client for two reasons: the
    // picker cannot offer a key the writer would silently drop, and a section's
    // name is the studio's own (it renames them), so the only correct source is
    // the section rows this context already holds.
    //
    // The screen used to build these names from `nav`, which does not carry
    // them — nav is a { key: boolean } visibility map, so `.map()` on it threw
    // and the page failed to load. Neither tsc nor next build catches that in an
    // untyped screen; it throws on the first request.
    sections: master.sections
      .filter((s) => assignableSectionKeys().includes(s.key))
      .map((s) => ({ key: s.key, name: s.name || s.key })),
    canManage: master.canManage,
  };
});

export const POST = route(spec, async (master) => {
  // One door, two acts: creating a department, and taking the ones this
  // studio's trade normally has. Both are administration.master.create, and
  // both are refused for the same person — so a second route would be a second
  // place to keep that in step.
  if (master.body.action === "add-standard") {
    const result = await addMissingStarters(master);
    if (refused(result)) return result;
    return { status: 201, body: { ok: true, ...result } };
  }

  const result = await createDepartment(master, master.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, department: result.department } };
});

export const PUT = route(spec, async (master) => {
  if (!master.body.id) return { error: "missing" };

  const result = await editDepartment(master, master.body.id, master.body);
  if (refused(result)) return result;
  return { ok: true, department: result.department };
});

// People stand in this department and departments sit under it — deleting it
// would leave both pointing at nothing. The refusal names the counts so the
// screen can say what to re-file first, exactly as the locations route does.
export const DELETE = route(spec, async (master) => {
  if (!master.body.id) return { error: "missing" };

  const result = await removeDepartment(master, master.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
