import { route } from "@/platform/http/route";
import { scheduleContext, scheduleView } from "@/modules/operations/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE SCHEDULE SCREEN'S DOOR — the rota and the working week, on its own grant
// (operations.schedule). It resolves on the schedule sub-section, like the
// planner does, so a person may hold the rota without the rest of Operations.
// It owns no collection: the shifts it reads live under the operations root
// section, reached through scheduleContext's foreign door.
const spec = { auth: "studio", context: scheduleContext, name: "operations-schedule" };

export const GET = route({ ...spec, body: false }, async (c) => scheduleView(c));
