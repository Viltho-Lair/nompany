// MASTER DATA — the studio's own reference records, owned by no department.
//
// Rows live under the studio's *administration-master section*:
//   s:<StudioID>:sec:<SectionID>:c:locations
//
// WHY LOCATIONS ARE HERE AND NOT ON THE ROTA THAT USES THEM. A place the studio
// works from outlives any one rota. Field Operations drew the list because it
// was the first screen to need it, and a shift names one — but so does a permit
// to work, and Quality's inspections and Projects' sites will want the same
// list. Reference data that three departments read belongs to none of them.
//
// So this module OWNS the collection and Operations READS it, through a foreign
// section on its own context (modules/operations/operations.ts). Reading a
// collection is not owning it; what ownership decides is which section's
// deletion takes the rows with it.
//
// THE COUPLING THAT SURVIVES THE MOVE, and it is the one worth knowing: shifts
// and permits hold `locationId` into this collection, and they live under
// field-service. So deleting a location has to ask ANOTHER section whether
// anything still points at it — `removeLocation` reads across both, and
// cascadeDeleteSection on Master data would take locations out from under a
// rota that still names them. Nothing routes to that cascade today; it is
// written down here because the fold made Administration a real section and
// that is the moment such a thing stops being hypothetical.
//
// IT IS ONE TAB, DELIBERATELY. The blueprint's master data is currencies, UoM,
// numbering series, cost codes, the industry taxonomy and the flow templates
// as well. Four of those already exist and live in Studio settings — they move
// in their own change, because relocating a working screen is a visibility
// decision each time. The other two have no records at all yet, and a tab per
// absent record is the dead capability this catalogue keeps deleting.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { moduleContext } from "../context";
import type { Location, Permit, Shift } from "../operations/types";
// THE KINDS STAY WHERE THE VOCABULARY IS SERVED. Operations' own route hands
// `locationKinds` to the picker, so restating the list here would be a second
// copy free to disagree with the one the screen actually renders.
import { LOCATION_KINDS } from "../operations/operations";
import type { MasterContext } from "./types";

const LOCATIONS = "locations";

const Locations = repo<Location>(LOCATIONS);
// READ ACROSS THE BOUNDARY, deliberately. These two are Field Operations' rows,
// and this module reads them for exactly one question: is anything still
// pointing at the place somebody is trying to delete. That is a scope, not a
// second owner — the same shape Finance uses to read Projects.
const Permits = repo<Permit>("permits");
const Shifts = repo<Shift>("shifts");

const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

// FIELD SERVICE IS FOREIGN HERE, which is the mirror of Operations having
// Master data foreign. Nullable: a studio without Field Operations has no
// shifts or permits to be in the way, so a location deletes freely.
export const masterContext = moduleContext<MasterContext>({
  root: "administration-master",
  foreign: { fieldService: "field-service" },
});

export async function listLocations(
  { studio, section }: Pick<MasterContext, "studio" | "section">,
) {
  const rows = await Locations.find({ studio, section });
  return [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function createLocation(ctx: MasterContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "administration.master.create");
  if (denied) return denied;

  const { studio, section } = ctx;
  const name = str(body?.name, 160);
  if (!name) return { error: "name" };

  const rows = await Locations.find({ studio, section });
  if (rows.some((l) => l.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" };

  const location = await Locations.create({ studio, section }, {
    name,
    kind: LOCATION_KINDS.includes(String(body?.kind)) ? String(body?.kind) : LOCATION_KINDS[0],
    address: str(body?.address, 300),
    city: str(body?.city, 80),
    mapUrl: str(body?.mapUrl, 500),
    notes: str(body?.notes, 1000),
    // NO createdByCollaboratorId. The original writer did not record one and
    // the golden pins that; a module moving between sections is not a reason
    // for its response body to grow a field.
    createdAt: new Date().toISOString(),
  });
  return { location };
}

export async function editLocation(ctx: MasterContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "administration.master.edit");
  if (denied) return denied;

  const { studio, section } = ctx;
  const patch: Record<string, unknown> = {};
  if (body?.name !== undefined) {
    const name = str(body.name, 160);
    if (!name) return { error: "name" };
    const rows = await Locations.find({ studio, section });
    if (rows.some((l) => l.id !== id && l.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" };
    patch.name = name;
  }
  if (body?.kind !== undefined && LOCATION_KINDS.includes(String(body.kind))) patch.kind = body.kind;
  for (const f of ["address", "mapUrl"]) if (body?.[f] !== undefined) patch[f] = str(body[f], 500);
  if (body?.city !== undefined) patch.city = str(body.city, 80);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 1000);

  const location = await Locations.update({ studio, section }, id, patch);
  return location ? { location } : { error: "notfound" };
}

/**
 * Delete a place, unless a rota or a permit still names it.
 *
 * THE IN-USE CHECK CROSSES A SECTION BOUNDARY and that is the cost of the move.
 * Locations are Master data's; the shifts and permits that would be orphaned by
 * deleting one are Field Operations'. Refusing with the COUNTS rather than a
 * bare "no" is what lets the screen say which rota to fix first.
 *
 * A studio with no Field Operations section has nothing that could point at a
 * location, so the check is skipped rather than failed — `fieldServiceSection`
 * is nullable like every foreign section.
 */
export async function removeLocation(ctx: MasterContext, id: string) {
  const denied = requirePermission(ctx.access, "administration.master.delete");
  if (denied) return denied;

  const { studio, section, fieldServiceSection } = ctx;

  if (fieldServiceSection) {
    const [permits, shifts] = await Promise.all([
      Permits.find({ studio, section: fieldServiceSection }),
      Shifts.find({ studio, section: fieldServiceSection }),
    ]);
    const p = permits.filter((x) => x.locationId === id).length;
    const s = shifts.filter((x) => x.locationId === id).length;
    if (p || s) return { error: "in-use", permits: p, shifts: s };
  }

  const removed = await Locations.remove({ studio, section }, id);
  return removed ? { ok: true } : { error: "notfound" };
}
