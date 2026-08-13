import {
  operationsGuard, listLocations, listPermits, listShifts, operationsProjects,
  schedulablePeople, weekWindow, summarise, listPositions,
  readOperationsSettings, saveOperationsSettings,
  LOCATION_KINDS, PERMIT_TYPES, EXPIRY_WINDOW_DAYS,
} from "@/lib/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (r) => { try { return await r.json(); } catch { return {}; } };

// One read for the whole Operations screen. Permit validity and shift hours are
// computed from their dates here, never stored.
export async function GET(request, ctx) {
  const g = await operationsGuard(ctx.params);
  if (g.fail) return g.fail;

  const window = weekWindow();
  const [locations, permits, shifts, projects, people, positions] = await Promise.all([
    listLocations(g), listPermits(g), listShifts(g), operationsProjects(g), schedulablePeople(g),
    listPositions(g),
  ]);

  return Response.json({
    canManage: g.canManage,
    canManageTracking: g.canManageTracking,
    canManageSettings: g.canManageSettings,
    nav: g.nav,
    me: { collaboratorId: g.collaborator.id },
    locations, permits, shifts, projects, people, window, positions,
    settings: readOperationsSettings(g.settingsSection),
    summary: summarise(permits, shifts, locations, window),
    vocabulary: { locationKinds: LOCATION_KINDS, permitTypes: PERMIT_TYPES, expiryWindowDays: EXPIRY_WINDOW_DAYS },
  });
}

// Operations Settings — the work schedule, the calendar legend and the roster
// prefix. Gated on the Settings sub-section's own Manage grant.
export async function PATCH(request, ctx) {
  const g = await operationsGuard(ctx.params);
  if (g.fail) return g.fail;
  if (!g.canManageSettings) return Response.json({ error: "read-only" }, { status: 403 });

  const result = await saveOperationsSettings(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, settings: result.settings });
}
