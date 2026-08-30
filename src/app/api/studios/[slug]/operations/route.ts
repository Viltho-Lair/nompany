import { route, refused } from "@/platform/http/route";
import {
  operationsContext, listLocations, listPermits, listShifts, operationsProjects,
  schedulablePeople, weekWindow, summarise, listPositions,
  readOperationsSettings, saveOperationsSettings, scheduleFromStudio,
  LOCATION_KINDS, PERMIT_TYPES, EXPIRY_WINDOW_DAYS,
} from "@/modules/operations/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Operations screen. Permit validity and shift hours are
// computed from their dates here, never stored. The working week comes from the
// studio (scheduleFromStudio) — the rota/schedule screen lives on its own
// sub-section now, but the dashboard here still summarises shifts.
const spec = { auth: "studio", context: operationsContext, name: "field-service" };

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
  if (refused(result)) return result;
  return { ok: true, settings: result.settings };
});
