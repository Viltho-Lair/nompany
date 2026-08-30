// OPERATIONS — where the work happens, who is on site when, and what paperwork
// says they are allowed to be there.
//
// Rows live under the studio's *operations section*:
//   s:<StudioID>:sec:<SectionID>:c:locations
//   s:<StudioID>:sec:<SectionID>:c:permits
//   s:<StudioID>:sec:<SectionID>:c:shifts
//
// This module deliberately does NOT hold a second to-do list: discrete work
// items are Tasks. Operations answers a different question — coverage. A shift
// says a person is at a place for a stretch of time, which is why it can clash
// with another shift, or with leave that HR has already approved.
//
// Permit validity and shift hours are DERIVED from their dates, never stored,
// so neither can quietly go stale.

import { requirePermission, sectionManageable } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { getSectionByKey, updateSection } from "@/platform/db/sections";
import { moduleContext } from "../context";

import { listCollaborators } from "@/platform/auth/collaborators";
import { nextReference } from "@/modules/main/references";
import { DAYS, DEFAULT_LEGEND, normalizeLegend, normalizeSchedule } from "./operationsCalendar";
import type { WorkingWeek } from "./operationsCalendar";
import type {
  Location, Permit, Position, Shift, PermitView, ShiftView, OperationsContext, PlannerContext, ScheduleContext,
} from "./types";
import type { Vacation } from "@/modules/hr/types";

const LOCATIONS = "locations";
const PERMITS = "permits";
const SHIFTS = "shifts";
const POSITIONS = "trackingPositions";
const VACATIONS = "vacations";
const PROJECTS = "projects";

// THE COLLECTIONS THIS MODULE QUERIES, named once. A repository binds a
// collection, not a scope — the studio and section arrive per call, which is
// what stops a query naming another tenant's keys and what lets one object
// answer for a sibling department's rows as easily as its own.
const Locations = repo<Location>(LOCATIONS);
const Permits = repo<Permit>(PERMITS);
const Positions = repo<Position>(POSITIONS);
const Projects = repo(PROJECTS);
const Shifts = repo<Shift>(SHIFTS);
// HR'S RECORD, READ FROM OPERATIONS. The type comes from the module that owns
// it rather than being restated here — a second declaration of somebody else's
// row is a second thing to keep in step, and this is exactly the cross-module
// read the departmental structure is meant to make explicit rather than hide.
const Vacations = repo<Vacation>(VACATIONS);

export const LOCATION_KINDS = ["Site", "Office", "Warehouse", "Client premises"];
export const PERMIT_TYPES = ["Work permit", "Hot work", "Height work", "Confined space", "Electrical", "Vehicle access", "Other"];
// How far ahead a permit counts as "expiring", so it can be renewed in time.
export const EXPIRY_WINDOW_DAYS = 30;

const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");
const clock = (v: unknown) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v ?? "").trim()) ? String(v).trim() : "");
const today = () => new Date().toISOString().slice(0, 10);

export const operationsContext = moduleContext<OperationsContext>({
  root: "field-service",
  sub: { tracking: "field-service-tracking", settings: "field-service-settings" },
  // HR, because a shift must not be scheduled over leave HR has approved, and
  // Projects because a shift is worked against one.
  foreign: { hr: "hr", projectsList: ["projects-list", "projects"] },
  flags: ["tracking", "settings"],
  extend: ({ settingsSection }) => ({
    settings: (settingsSection as { settings?: Record<string, unknown> })?.settings || {},
  }),
});

// THE PLANNER RESOLVES ON ITS OWN KEY, not the operations root. It is a
// sub-section with its own grant (operations.planner), and a person may hold it
// without the rest of Operations — so gating it through operationsContext, which
// refuses anyone the operations root is not granted to, would lock out exactly
// the people it was granted to. Its section carries the new-plan presets on its
// own `settings`, so extend surfaces them the way operationsContext does its own.
export const plannerContext = moduleContext<PlannerContext>({
  root: "projects-planner",
  extend: ({ section }) => ({
    presets: (section as { settings?: Record<string, unknown> })?.settings || {},
  }),
});

// THE SCHEDULE SCREEN RESOLVES ON ITS OWN GRANT (operations.schedule), the same
// reasoning as the planner: a person may hold the rota without the rest of
// Operations, so gating it through operationsContext — which refuses anyone the
// operations root is not granted to — would lock out exactly the people it was
// granted to. It owns no collection; the shifts and locations it reads and
// writes live under the operations ROOT section, surfaced here as the foreign
// `operationsMainSection`, and the leave check needs HR.
export const scheduleContext = moduleContext<ScheduleContext>({
  root: "field-service-schedule",
  foreign: {
    operationsMain: "field-service", settings: "field-service-settings",
    hr: "hr", projectsList: ["projects-list", "projects"],
  },
});

// mon/tue/… with open/from/to is how the STUDIO stores its week (studio.working
// Hours, set in Studio settings); the calendar wants Sunday-first full names
// with `on`. One translation, in one place, shared by the operations screen and
// the schedule screen so a studio can never describe two different weeks.
const STUDIO_DAY_KEYS = { Sunday: "sun", Monday: "mon", Tuesday: "tue", Wednesday: "wed", Thursday: "thu", Friday: "fri", Saturday: "sat" } as const;
export function scheduleFromStudio(studio: Record<string, unknown>) {
  type Hours = Record<string, { open?: unknown; from?: string; to?: string } | undefined>;
  const hours = (studio?.workingHours || null) as Hours | null;
  const out: Record<string, { on: boolean; from: string; to: string }> = {};
  for (const [name, key] of Object.entries(STUDIO_DAY_KEYS)) {
    const row = hours?.[key];
    // No hours set yet: assume a working day rather than shading the whole grid.
    out[name] = row
      ? { on: Boolean(row.open), from: row.from || "09:00", to: row.to || "17:00" }
      : { on: true, from: "09:00", to: "17:00" };
  }
  return out;
}

// THE SCHEDULE SCREEN'S ONE READ — the rota, the places it points at, the people
// it can name, the week it plans over, and the studio's working week the grid is
// drawn against. Reads the shifts and locations from the operations ROOT section
// (this sub-section owns no collection) and the legend from operations-settings.
export async function scheduleView(ctx: ScheduleContext) {
  const window = weekWindow();
  const section = ctx.operationsMainSection;
  // Permits and Locations are read HERE now — they moved off the Operations
  // landing to sit under Schedule with the rota, all three read through this one
  // door. Like the shifts, their rows live under the operations ROOT section, so
  // they are read from `section` (the foreign operationsMainSection), not a
  // collection of the schedule sub-section's own.
  const [shifts, locations, permits, people, projects] = await Promise.all([
    listShifts({ studio: ctx.studio, section }),
    listLocations({ studio: ctx.studio, section }),
    listPermits({ studio: ctx.studio, section }),
    schedulablePeople(ctx),
    operationsProjects({ studio: ctx.studio }),
  ]);
  // WHO MAY MANAGE the permits and locations shown here. Their write routes still
  // answer to the operations ROOT section (that is where the rows live and where
  // the guard sits), so the button-gating must ask the SAME question those routes
  // do — may this caller manage the operations root — rather than the schedule
  // grant that gates the rota. `ctx.canManage` is the schedule answer; this is the
  // places answer, and the two can differ.
  const canManagePlaces = sectionManageable(ctx.access, "field-service", ctx.sections.map((s) => s.key));
  return {
    canManage: ctx.canManage,
    canManagePlaces,
    nav: ctx.nav,
    me: { collaboratorId: ctx.collaborator.id },
    shifts, locations, permits, people, projects, window,
    settings: {
      ...readOperationsSettings(ctx.settingsSection),
      workSchedule: scheduleFromStudio(ctx.studio),
    },
    vocabulary: { locationKinds: LOCATION_KINDS, permitTypes: PERMIT_TYPES, expiryWindowDays: EXPIRY_WINDOW_DAYS },
  };
}

// Operations Settings live on the operations-settings sub-section's own
// `settings` object, so they need no key of their own and die with it.
// Patch semantics: only the keys present in the body are touched.
export async function saveOperationsSettings(ctx: OperationsContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "fieldService.settings.edit");
  if (denied) return denied;

  const { studio, settingsSection } = ctx;
  const next = { ...(settingsSection.settings || {}) };

  // The weekly schedule the calendar is drawn against: seven named days, each
  // worked or not, each with a start and an end.
  if (body?.workSchedule !== undefined) {
    const ws = (body.workSchedule && typeof body.workSchedule === "object"
      ? body.workSchedule
      : {}) as WorkingWeek;
    next.workSchedule = Object.fromEntries(DAYS.map((d) => {
      const v = ws[d] || {};
      return [d, { on: !!v.on, from: clock(v.from), to: clock(v.to) }];
    }));
  }
  // Recolourable and renamable, but the SET is fixed — a bar whose kind has no
  // legend entry would have no colour to be drawn in.
  if (body?.legend !== undefined) {
    const byId = Object.fromEntries((Array.isArray(body.legend) ? body.legend : [])
      .map((t) => [str(t?.id, 40), t]));
    next.legend = normalizeLegend(DEFAULT_LEGEND.map((d) => {
      const given = byId[d.id];
      return {
        id: d.id,
        label: str(given?.label, 60) || d.label,
        // Hex only. Anything else falls back to the default rather than being
        // written into a style attribute unchecked.
        color: /^#[0-9a-fA-F]{6}$/.test(String(given?.color || "")) ? given.color : d.color,
      };
    }));
  }
  if (body?.showWorkingHoursOnly !== undefined) next.showWorkingHoursOnly = !!body.showWorkingHoursOnly;
  if (body?.rosterPrefix !== undefined) next.rosterPrefix = str(body.rosterPrefix, 500);

  const updated = await updateSection(studio.id, settingsSection.id, { settings: next });
  return updated ? { settings: readOperationsSettings({ settings: next }) } : { error: "notfound" };
}

export function readOperationsSettings(settingsSection: { settings?: Record<string, unknown> } | null | undefined) {
  const s = settingsSection?.settings || {};
  return {
    workSchedule: normalizeSchedule(s.workSchedule),
    legend: normalizeLegend(s.legend),
    showWorkingHoursOnly: !!s.showWorkingHoursOnly,
    rosterPrefix: str(s.rosterPrefix, 500),
  };
}

// ---- tracking ---------------------------------------------------------------
// WHERE PEOPLE ARE RIGHT NOW, and deliberately nothing more. There is ONE ROW
// PER PERSON and each fix overwrites it, so this is a last-known position and
// never a movement history — a trail of where somebody has been all week is a
// different and far more invasive product, and it is not this one. Nothing is
// recorded at all unless that person has the page open and has agreed to share.
export async function listPositions({ studio, trackingSection }: Pick<OperationsContext, "studio" | "trackingSection">) {
  const [rows, people] = await Promise.all([
    Positions.find({ studio, section: trackingSection }),
    listCollaborators(studio.id),
  ]);
  const aliasOf = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));
  return [...rows]
    .filter((r) => aliasOf[String(r.collaboratorId)]) // somebody who has left stops being plotted
    .map((r) => ({ ...r, alias: aliasOf[String(r.collaboratorId)] }))
    .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
}

// A person reports only their OWN position: the collaborator id comes from the
// session, never the payload, so no one can place somebody else on the map.
export async function reportPosition(ctx: OperationsContext, body: Record<string, unknown>) {
  const { studio, trackingSection, collaborator } = ctx;
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: "coords" };
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { error: "coords" };

  const accuracy = Number(body?.accuracy);
  const row = {
    collaboratorId: collaborator.id,
    lat: Math.round(lat * 1e6) / 1e6,
    lng: Math.round(lng * 1e6) / 1e6,
    accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? Math.round(accuracy) : 0,
    at: new Date().toISOString(),
  };

  const rows = await Positions.find({ studio, section: trackingSection });
  const mine = rows.find((r) => r.collaboratorId === collaborator.id);
  const position = mine
    ? await Positions.update({ studio, section: trackingSection }, mine.id, row)
    : await Positions.create({ studio, section: trackingSection }, row);
  return { position };
}

// Stop being on the map. Anyone may clear their own; managing tracking lets you
// clear somebody else's, which is what you need when a phone is left logged in.
export async function clearPosition(ctx: OperationsContext, collaboratorId: string) {
  const { studio, trackingSection, collaborator, canManageTracking } = ctx;
  const target = str(collaboratorId, 60) || collaborator.id;
  if (target !== collaborator.id && !canManageTracking) return { error: "forbidden" };

  const rows = await Positions.find({ studio, section: trackingSection });
  const mine = rows.find((r) => r.collaboratorId === target);
  if (!mine) return { ok: true };
  const removed = await Positions.remove({ studio, section: trackingSection }, mine.id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- locations -------------------------------------------------------------
export async function listLocations({ studio, section }: Pick<OperationsContext, "studio" | "section">) {
  const rows = await Locations.find({ studio, section });
  return [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function createLocation(ctx: OperationsContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "fieldService.tracking.create");
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
    createdAt: new Date().toISOString(),
  });
  return { location };
}

export async function editLocation(ctx: OperationsContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "fieldService.tracking.edit");
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

// Refuses while permits or shifts still point at it — deleting would leave a
// rota and a stack of paperwork referring to a place that no longer exists.
export async function removeLocation(ctx: OperationsContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "fieldService.tracking.delete");
  if (denied) return denied;

  const { studio, section } = ctx;
  const [permits, shifts] = await Promise.all([
    Permits.find({ studio, section }),
    Shifts.find({ studio, section }),
  ]);
  const p = permits.filter((x) => x.locationId === id).length;
  const s = shifts.filter((x) => x.locationId === id).length;
  if (p || s) return { error: "in-use", permits: p, shifts: s };

  const removed = await Locations.remove({ studio, section }, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- permits ---------------------------------------------------------------
// Validity is computed from the dates every time it is read.
export function permitState(permit: Permit, when = today()) {
  if (permit.validFrom && when < permit.validFrom) return "Not yet valid";
  if (!permit.validTo) return "Valid";
  if (when > permit.validTo) return "Expired";
  const limit = new Date(`${when}T00:00:00`);
  limit.setDate(limit.getDate() + EXPIRY_WINDOW_DAYS);
  return new Date(`${permit.validTo}T00:00:00`) <= limit ? "Expiring" : "Valid";
}

export async function listPermits({ studio, section }: Pick<OperationsContext, "studio" | "section">) {
  const [permits, locations, people, projects] = await Promise.all([
    Permits.find({ studio, section }),
    Locations.find({ studio, section }),
    listCollaborators(studio.id),
    projectRows({ studio }),
  ]);
  const locName = Object.fromEntries(locations.map((l) => [l.id, l.name]));
  const alias = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));
  const projectNumber = Object.fromEntries(projects.map((p) => [p.id, p.number]));
  const now = today();

  return [...permits]
    .sort((a, b) => (a.validTo || "9999").localeCompare(b.validTo || "9999"))
    .map((p) => ({
      ...p,
      locationName: locName[String(p.locationId || "")] || "",
      projectNumber: projectNumber[String(p.projectId || "")] || "",
      holderAliases: (p.holderCollaboratorIds || []).map((id) => alias[String(id)] || "—"),
      state: permitState(p, now),
      daysLeft: p.validTo
        ? Math.ceil((new Date(`${p.validTo}T00:00:00`).getTime() - new Date(`${now}T00:00:00`).getTime()) / 86400000)
        : null,
    }));
}

export async function createPermit(ctx: OperationsContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "fieldService.tracking.create");
  if (denied) return denied;

  const { studio, section, collaborator } = ctx;
  const title = str(body?.title, 200);
  if (!title) return { error: "title" };

  const locationId = str(body?.locationId, 60);
  if (locationId) {
    const locations = await Locations.find({ studio, section });
    if (!locations.some((l) => l.id === locationId)) return { error: "location" };
  }
  const projectId = str(body?.projectId, 60);
  if (projectId) {
    const projects = await projectRows(ctx);
    if (!projects.some((p) => p.id === projectId)) return { error: "project" };
  }

  const validFrom = day(body?.validFrom);
  const validTo = day(body?.validTo);
  if (validFrom && validTo && validTo < validFrom) return { error: "range" };

  const permits = await Permits.find({ studio, section });
  const permit = await Permits.create({ studio, section }, {
    // Derived from the highest already issued, so removing a permit cannot hand
    // its reference to the next one. See modules/main/references.js.
    reference: await nextReference(studio.id, { rows: permits, field: "reference", prefix: "PMT" }),
    title,
    type: PERMIT_TYPES.includes(String(body?.type)) ? String(body?.type) : PERMIT_TYPES[0],
    number: str(body?.number, 80),
    issuer: str(body?.issuer, 160),
    locationId, projectId,
    validFrom, validTo,
    holderCollaboratorIds: await validHolders(studio.id, body?.holderCollaboratorIds),
    notes: str(body?.notes, 1000),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { permit };
}

export async function editPermit(ctx: OperationsContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "fieldService.tracking.edit");
  if (denied) return denied;

  const { studio, section } = ctx;
  const rows = await Permits.find({ studio, section });
  const current = rows.find((p) => p.id === id);
  if (!current) return { error: "notfound" };

  const patch: Record<string, unknown> = {};
  if (body?.title !== undefined) { const v = str(body.title, 200); if (!v) return { error: "title" }; patch.title = v; }
  if (body?.type !== undefined && PERMIT_TYPES.includes(String(body.type))) patch.type = body.type;
  if (body?.number !== undefined) patch.number = str(body.number, 80);
  if (body?.issuer !== undefined) patch.issuer = str(body.issuer, 160);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 1000);
  if (body?.locationId !== undefined) {
    const locationId = str(body.locationId, 60);
    if (locationId) {
      const locations = await Locations.find({ studio, section });
      if (!locations.some((l) => l.id === locationId)) return { error: "location" };
    }
    patch.locationId = locationId;
  }
  if (body?.holderCollaboratorIds !== undefined) {
    patch.holderCollaboratorIds = await validHolders(studio.id, body.holderCollaboratorIds);
  }
  if (body?.validFrom !== undefined || body?.validTo !== undefined) {
    const validFrom = body?.validFrom !== undefined ? day(body.validFrom) : current.validFrom;
    const validTo = body?.validTo !== undefined ? day(body.validTo) : current.validTo;
    if (validFrom && validTo && validTo < validFrom) return { error: "range" };
    patch.validFrom = validFrom;
    patch.validTo = validTo;
  }

  const permit = await Permits.update({ studio, section }, id, patch);
  return permit ? { permit } : { error: "notfound" };
}

export async function removePermit(ctx: OperationsContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "fieldService.tracking.delete");
  if (denied) return denied;

  const removed = await Permits.remove({ studio: ctx.studio, section: ctx.section }, id);
  return removed ? { ok: true } : { error: "notfound" };
}

async function validHolders(studioId: string, ids: unknown) {
  const people = await listCollaborators(studioId);
  const known = new Set(people.map((c) => c.id));
  return (Array.isArray(ids) ? ids : []).map((x) => str(x, 60)).filter((x) => known.has(x)).slice(0, 100);
}

// ---- shifts (the rota) -----------------------------------------------------
export function shiftHours(shift: Shift) {
  if (!shift.startTime || !shift.endTime) return 0;
  const [sh, sm] = shift.startTime.split(":").map(Number);
  const [eh, em] = shift.endTime.split(":").map(Number);
  // An end time before the start means the shift runs past midnight.
  const minutes = (eh * 60 + em) - (sh * 60 + sm) + (eh * 60 + em <= sh * 60 + sm ? 24 * 60 : 0);
  return Math.round((minutes / 60) * 100) / 100;
}

export async function listShifts(
  { studio, section }: Pick<OperationsContext, "studio" | "section">,
  { from = "", to = "" }: { from?: string; to?: string } = {},
) {
  const [shifts, locations, people] = await Promise.all([
    Shifts.find({ studio, section }),
    Locations.find({ studio, section }),
    listCollaborators(studio.id),
  ]);
  const locName = Object.fromEntries(locations.map((l) => [l.id, l.name]));
  const alias = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));

  return [...shifts]
    .filter((s) => (!from || (s.date || "") >= from) && (!to || (s.date || "") <= to))
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.startTime || "").localeCompare(b.startTime || ""))
    .map((s) => ({
      ...s,
      locationName: locName[String(s.locationId || "")] || "",
      alias: alias[String(s.collaboratorId || "")] || "Unknown",
      hours: shiftHours(s),
    }));
}

export async function createShift(ctx: ScheduleContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "fieldService.schedule.create");
  if (denied) return denied;

  // The rota lives under the operations ROOT section, not the schedule section.
  const { studio, operationsMainSection: section, collaborator } = ctx;
  const date = day(body?.date);
  if (!date) return { error: "date" };

  const collaboratorId = str(body?.collaboratorId, 60);
  const people = await listCollaborators(studio.id);
  if (!people.some((c) => c.id === collaboratorId)) return { error: "person" };

  const locationId = str(body?.locationId, 60);
  if (locationId) {
    const locations = await Locations.find({ studio, section });
    if (!locations.some((l) => l.id === locationId)) return { error: "location" };
  }

  const startTime = clock(body?.startTime);
  const endTime = clock(body?.endTime);
  if (!startTime || !endTime) return { error: "time" };

  // Two shifts for the same person at the same time is a scheduling mistake,
  // not something to silently accept.
  const shifts = await Shifts.find({ studio, section });
  const clash = shifts.find((s) => s.collaboratorId === collaboratorId && s.date === date
    && overlaps(s.startTime || "", s.endTime || "", startTime, endTime));
  if (clash) return { error: "clash", startTime: clash.startTime, endTime: clash.endTime };

  // Scheduling someone HR has already approved leave for is the same kind of
  // mistake, so it is caught here rather than discovered on the day.
  const onLeave = await approvedLeaveOn(ctx, collaboratorId, date);
  if (onLeave) return { error: "on-leave", from: onLeave.from, to: onLeave.to, type: onLeave.type };

  const shift = await Shifts.create({ studio, section }, {
    date, collaboratorId, locationId, startTime, endTime,
    role: str(body?.role, 120),
    notes: str(body?.notes, 500),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { shift: { ...shift, hours: shiftHours(shift) } };
}

export async function editShift(ctx: ScheduleContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "fieldService.schedule.edit");
  if (denied) return denied;

  const { studio, operationsMainSection: section } = ctx;
  const rows = await Shifts.find({ studio, section });
  const current = rows.find((s) => s.id === id);
  if (!current) return { error: "notfound" };

  const date = body?.date !== undefined ? day(body.date) : current.date;
  const startTime = body?.startTime !== undefined ? clock(body.startTime) : current.startTime;
  const endTime = body?.endTime !== undefined ? clock(body.endTime) : current.endTime;
  if (!date || !startTime || !endTime) return { error: "time" };

  const clash = rows.find((s) => s.id !== id && s.collaboratorId === current.collaboratorId
    && s.date === date && overlaps(s.startTime || "", s.endTime || "", startTime, endTime));
  if (clash) return { error: "clash", startTime: clash.startTime, endTime: clash.endTime };

  const patch: Partial<Shift> = { date, startTime, endTime };
  if (body?.role !== undefined) patch.role = str(body.role, 120);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 500);
  if (body?.locationId !== undefined) {
    const locationId = str(body.locationId, 60);
    if (locationId) {
      const locations = await Locations.find({ studio, section });
      if (!locations.some((l) => l.id === locationId)) return { error: "location" };
    }
    patch.locationId = locationId;
  }

  const shift = await Shifts.update({ studio, section }, id, patch);
  return shift ? { shift: { ...shift, hours: shiftHours(shift) } } : { error: "notfound" };
}

export async function removeShift(ctx: ScheduleContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "fieldService.schedule.delete");
  if (denied) return denied;

  const removed = await Shifts.remove({ studio: ctx.studio, section: ctx.operationsMainSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// Half-open comparison: a shift ending at 12:00 and one starting at 12:00 do
// not overlap. Overnight shifts are compared on a 48-hour line so the wrap is
// handled without special cases.
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const m = (t: string) => { const [h, min] = t.split(":").map(Number); return h * 60 + min; };
  const span = (s: string, e: string) => { const a = m(s); let b = m(e); if (b <= a) b += 24 * 60; return [a, b]; };
  const [a1, a2] = span(aStart, aEnd);
  const [b1, b2] = span(bStart, bEnd);
  return a1 < b2 && b1 < a2;
}

// HR owns leave. Operations reads it to avoid scheduling over it — naming
// someone's approved absence is not the same as being allowed to open HR.
async function approvedLeaveOn(
  { studio }: Pick<OperationsContext, "studio">,
  collaboratorId: string,
  date: string,
) {
  const hr = await getSectionByKey(studio.id, "hr");
  if (!hr) return null;
  const rows = await Vacations.find({ studio, section: hr });
  return rows.find((v) => v.collaboratorId === collaboratorId && v.status === "Approved"
    && (v.from || "") <= date && (v.to || "") >= date) || null;
}

// Cross-section reads resolve the sub-section that OWNS the collection, falling
// back to the parent so a studio predating the sub-section model still works.
async function ownerOf(studioId: string, childKey: string, parentKey: string) {
  return (await getSectionByKey(studioId, childKey)) || (await getSectionByKey(studioId, parentKey));
}

async function projectRows({ studio }: Pick<OperationsContext, "studio">) {
  const owner = await ownerOf(studio.id, "projects-list", "projects");
  if (!owner) return [];
  return Projects.find({ studio, section: owner });
}

export async function operationsProjects(ctx: Pick<OperationsContext, "studio">) {
  const rows = await projectRows(ctx);
  return rows.filter((p) => p.stage !== "Completed").map((p) => ({ id: p.id, number: p.number }));
}

export async function schedulablePeople({ studio }: Pick<OperationsContext, "studio">) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" }));
}

// The week a rota is usually planned around: today plus the next six days.
//
// Parsed as UTC, not local. "2026-08-11T00:00:00" is local midnight, and
// converting that back with toISOString() shifts the date backwards anywhere
// east of Greenwich — which quietly made the window six days long instead of
// seven. Dates here are calendar days, so they are handled in one zone
// throughout.
export function weekWindow(from = today()) {
  const end = new Date(`${from}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return { from, to: end.toISOString().slice(0, 10) };
}

export function summarise(
  permits: PermitView[],
  shifts: ShiftView[],
  locations: Location[],
  window: { from: string; to: string },
) {
  const thisWeek = shifts.filter((s) => (s.date || "") >= window.from && (s.date || "") <= window.to);
  return {
    locations: locations.length,
    permitsExpiring: permits.filter((p) => p.state === "Expiring").length,
    permitsExpired: permits.filter((p) => p.state === "Expired").length,
    shiftsThisWeek: thisWeek.length,
    hoursThisWeek: Math.round(thisWeek.reduce((n, s) => n + s.hours, 0) * 100) / 100,
  };
}
