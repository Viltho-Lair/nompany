// THE STORE HALF OF `./attendance`.
//
// MARKING IS A SWEEP, NOT A FORM. A supervisor marks a whole team at the start
// of a shift, so the write takes a LIST and upserts each row — one round trip
// for forty people rather than forty. A per-row endpoint would be the same
// feature at forty times the cost, and the cost lands on the person standing in
// a yard on a phone.
//
// SCOPED, like the employee record it sits beside. `hr.attendance` resolves
// through `scopeFor`, so a supervisor marks their own department's subtree and
// nobody else's — the same walk `listEmployees` uses, shared rather than copied
// so the two cannot disagree about anybody's reach.

import { requirePermission, scopeFor } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { subtreeIds } from "@/shared/departments/tree";
import {
  attendanceProblems, cleanAttendance, daySheet, monthSummary,
} from "./attendance";
import type { AttendanceRow } from "./attendance";
import type { HrContext } from "./types";

const Attendance = repo<AttendanceRow>("attendance");
const Departments = repo<{ id: string; name?: string; parentId?: string }>("departments");

const scope = (ctx: HrContext) => ({ studio: ctx.studio, section: ctx.employeesSection });
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Everybody this caller may mark. */
async function reachable(ctx: HrContext) {
  const [people, departments] = await Promise.all([
    listCollaborators(ctx.studio.id),
    ctx.masterSection
      ? Departments.find({ studio: ctx.studio, section: ctx.masterSection })
      : Promise.resolve([]),
  ]);
  const reach = scopeFor(ctx, "hr.attendance");
  if (reach === "all") return people;

  const me = people.find((c) => String(c.id) === ctx.collaborator.id);
  // `scope === "department"` RESOLVES TO THE DEPARTMENT AND ITS DESCENDANTS,
  // not to one id — the fix `listEmployees` already carries, where an
  // Operations Manager over three sites could otherwise see none of the three.
  const mine = reach === "department"
    ? subtreeIds(departments, String((me as { departmentId?: unknown })?.departmentId || ""))
    : null;
  return people.filter((c) => String(c.id) === ctx.collaborator.id
    || Boolean(mine && mine.has(String((c as { departmentId?: unknown }).departmentId || ""))));
}

/** One day's sheet, and one month's totals beside it. */
export async function attendanceFor(ctx: HrContext, { day, period }: { day: string; period: string }) {
  const denied = requirePermission(ctx.access, "hr.attendance.view");
  if (denied) return denied;

  const [rows, people] = await Promise.all([Attendance.find(scope(ctx)), reachable(ctx)]);
  const [y, m] = PERIOD_RE.test(period) ? period.split("-").map(Number) : [0, 0];
  const daysInMonth = y ? new Date(Date.UTC(y, m, 0)).getUTCDate() : 0;

  return {
    day,
    period,
    sheet: daySheet(people as { id: string; alias?: string }[], rows, day),
    month: people.map((p) => ({
      ...monthSummary(rows, String(p.id), period, daysInMonth),
      alias: String(p.alias || "Unnamed"),
    })),
    canManage: !requirePermission(ctx.access, "hr.attendance.edit"),
  };
}

/**
 * MARK A DAY for one or many people.
 *
 * ONE ROW PER PERSON PER DAY, enforced here rather than hoped for: an existing
 * row is UPDATED and a new one created, so marking the same sheet twice
 * corrects it instead of doubling it. Two rows for one person on one day is two
 * answers to "were they in", and every figure downstream picks whichever it
 * reads first.
 *
 * NOBODY OUTSIDE THE CALLER'S REACH, checked against the same list the sheet
 * was drawn from — a scoped supervisor cannot mark a person they cannot see by
 * naming them in the body.
 */
export async function markAttendance(ctx: HrContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "hr.attendance.edit");
  if (denied) return denied;

  const day = String(body?.day ?? "").trim();
  if (!DAY_RE.test(day)) return { error: "day" };

  const marks = Array.isArray(body?.marks) ? body.marks : [];
  if (!marks.length) return { error: "nothing" };
  // CAPPED at a sensible sweep. A studio marking more than 500 people in one
  // request is not taking a sheet; it is importing, which is a different
  // feature with a different shape.
  if (marks.length > 500) return { error: "too-many" };

  const people = await reachable(ctx);
  const allowed = new Set(people.map((c) => String(c.id)));

  const existing = await Attendance.find(scope(ctx));
  const byKey = new Map(existing.map((r) => [`${r.collaboratorId}|${r.day}`, r]));

  const saved: AttendanceRow[] = [];
  const refused: { collaboratorId: string; detail: string }[] = [];

  for (const raw of marks) {
    const mark: Record<string, unknown> = { ...(raw as Record<string, unknown>), day };
    const who = String(mark.collaboratorId ?? "");
    if (!allowed.has(who)) { refused.push({ collaboratorId: who, detail: "out of reach" }); continue; }

    const problems = attendanceProblems(mark);
    if (problems.length) { refused.push({ collaboratorId: who, detail: problems.join("; ") }); continue; }

    const clean = cleanAttendance(mark);
    const row = byKey.get(`${who}|${day}`);
    const out = row
      ? await Attendance.update(scope(ctx), row.id, clean)
      : await Attendance.create(scope(ctx), clean);
    if (out) saved.push(out);
  }

  // PARTIAL IS REPORTED, NOT ROLLED BACK. A sheet of forty where one person's
  // hours were mistyped should record the thirty-nine and say which one it
  // could not — refusing the sweep would make the supervisor retype it all.
  return { saved: saved.length, refused };
}
