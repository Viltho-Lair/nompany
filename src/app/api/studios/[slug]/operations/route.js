import {
  operationsGuard, listLocations, listPermits, listShifts, operationsProjects,
  schedulablePeople, weekWindow, summarise,
  LOCATION_KINDS, PERMIT_TYPES, EXPIRY_WINDOW_DAYS,
} from "@/lib/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Operations screen. Permit validity and shift hours are
// computed from their dates here, never stored.
export async function GET(request, ctx) {
  const g = await operationsGuard(ctx.params);
  if (g.fail) return g.fail;

  const window = weekWindow();
  const [locations, permits, shifts, projects, people] = await Promise.all([
    listLocations(g), listPermits(g), listShifts(g), operationsProjects(g), schedulablePeople(g),
  ]);

  return Response.json({
    canManage: g.canManage,
    nav: g.nav,
    me: { collaboratorId: g.collaborator.id },
    locations, permits, shifts, projects, people, window,
    summary: summarise(permits, shifts, locations, window),
    vocabulary: { locationKinds: LOCATION_KINDS, permitTypes: PERMIT_TYPES, expiryWindowDays: EXPIRY_WINDOW_DAYS },
  });
}
