// EVENTS & WEBINARS (modules/marketing/eventsService).
//
// PUT CARRIES ONE NAMED ACTION — `attendance`, the door — and otherwise edits.
// Marking who came is an edit of the EVENT, so it answers to the same right;
// the action exists because the whole list is sent at once rather than a field
// at a time, and routing that through the generic edit would let a body naming
// `attended` bypass the check that every id is a registration of this event's
// own form. Every right is asked inside the service.
//
// GET WITH AN `id` RETURNS THE REGISTRANTS, which is a different gate: their
// names are sealed form answers and answer to `marketing.forms.view`, never to
// the events right. The list without an id is the register and its counts.
import { route, refused } from "@/platform/http/route";
import { marketingContext } from "@/modules/marketing/campaigns";
import {
  listEvents, eventRegistrants, createEvent, editEvent, markAttendance, deleteEvent,
} from "@/modules/marketing/eventsService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: marketingContext, body: true, name: "marketing-events" };

export const GET = route({ ...spec, body: false }, async (m) => {
  const id = new URL(m.request.url).searchParams.get("id") || "";
  const result = id ? await eventRegistrants(m, id) : await listEvents(m);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (m) => {
  const result = await createEvent(m, m.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, event: result.event } };
});

export const PUT = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const id = String(m.body.id);
  const result = String(m.body.action || "") === "attendance"
    ? await markAttendance(m, id, m.body)
    : await editEvent(m, id, m.body);
  if (refused(result)) return result;
  return { ok: true, event: result.event, attended: "attended" in result ? result.attended : undefined };
});

export const DELETE = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await deleteEvent(m, String(m.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
