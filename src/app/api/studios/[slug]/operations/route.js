import { route } from "@/platform/http/route";
import {
  operationsContext, listLocations, listPermits, listShifts, operationsProjects,
  schedulablePeople, weekWindow, summarise, listPositions,
  readOperationsSettings, saveOperationsSettings,
  LOCATION_KINDS, PERMIT_TYPES, EXPIRY_WINDOW_DAYS,
} from "@/modules/operations/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Operations screen. Permit validity and shift hours are
// computed from their dates here, never stored.
// mon/tue/… with open/from/to is how the studio stores its week; the calendar
// wants Sunday-first full names with `on`. One translation, in one place.
const STUDIO_DAY_KEYS = { Sunday: "sun", Monday: "mon", Tuesday: "tue", Wednesday: "wed", Thursday: "thu", Friday: "fri", Saturday: "sat" };
function scheduleFromStudio(studio) {
  const hours = studio?.workingHours || null;
  const out = {};
  for (const [name, key] of Object.entries(STUDIO_DAY_KEYS)) {
    const row = hours?.[key];
    out[name] = row
      ? { on: Boolean(row.open), from: row.from || "09:00", to: row.to || "17:00" }
      // No hours set yet: assume a working day rather than shading the whole
      // grid, which would read as "this studio never works".
      : { on: true, from: "09:00", to: "17:00" };
  }
  return out;
}

const spec = { auth: "studio", context: operationsContext, name: "operations" };

export const GET = route(spec, async (g) => {
  const window = weekWindow();
  const [locations, permits, shifts, projects, people, positions] = await Promise.all([
    listLocations(g), listPermits(g), listShifts(g), operationsProjects(g), schedulablePeople(g),
    listPositions(g),
  ]);

  return {
    canManage: g.canManage,
    canViewDashboard: g.canViewDashboard,
    canManageTracking: g.canManageTracking,
    canManageSettings: g.canManageSettings,
    nav: g.nav,
    // Manage per section key, so each screen can ask about itself rather
    // than being handed the parent section's answer.
    manage: g.manage,
    me: { collaboratorId: g.collaborator.id },
    locations, permits, shifts, projects, people, window, positions,
    // The week comes from STUDIO SETTINGS. Operations used to keep its own
    // copy, which meant one studio could describe two different working
    // weeks depending on which screen you asked.
    settings: { ...readOperationsSettings(g.settingsSection), workSchedule: scheduleFromStudio(g.studio) },
    summary: summarise(permits, shifts, locations, window),
    vocabulary: { locationKinds: LOCATION_KINDS, permitTypes: PERMIT_TYPES, expiryWindowDays: EXPIRY_WINDOW_DAYS },
  };
});

// Operations Settings — the work schedule, the calendar legend and the roster
// prefix. Gated on the Settings sub-section's own Manage grant.
export const PATCH = route({ ...spec, body: true }, async (g) => {
  if (!g.canManageSettings) return { error: "read-only" };

  const result = await saveOperationsSettings(g, g.body);
  if (result.error) return result;
  return { ok: true, settings: result.settings };
});
