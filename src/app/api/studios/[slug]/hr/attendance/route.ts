import { route, refused } from "@/platform/http/route";
import { hrContext } from "@/modules/hr/hr";
import { attendanceFor, markAttendance } from "@/modules/hr/attendanceService";
import type { HrContext } from "@/modules/hr/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHO WAS THERE. One day's sheet, one month's totals, and a sweep that marks
// many people at once — a supervisor marks a whole team at the start of a
// shift, so a per-row endpoint would be the same feature at forty times the
// cost, paid by the person standing in a yard on a phone.
const spec = { auth: "studio", context: hrContext, body: true, name: "hr/attendance" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const url = new URL(c.request.url);
  // THE DAY AND THE MONTH COME FROM THE CALLER, and today is the fallback read
  // on the SERVER: the records are dated in UTC and a browser's idea of today
  // is not, so a sheet defaulting to the viewer's clock would be a different
  // day either side of midnight.
  const today = new Date().toISOString().slice(0, 10);
  const asked = url.searchParams.get("day") || "";
  const day = /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today;
  const askedPeriod = url.searchParams.get("period") || "";
  const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(askedPeriod) ? askedPeriod : day.slice(0, 7);

  const result = await attendanceFor(c as HrContext, { day, period });
  return refused(result) ? result : { ok: true, today, ...result };
});

export const POST = route(spec, async (c) => {
  const result = await markAttendance(c as HrContext, c.body);
  return refused(result) ? result : { ok: true, ...result };
});
