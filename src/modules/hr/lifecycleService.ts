// THE STORE HALF OF `./lifecycle` — the employment spine: contracts, the moves
// somebody's employment makes, and the settlement that ends it.
//
// TWO PLACES THE STATE LIVES AND ONE PLACE IT IS DECIDED. `employmentStatus`
// sits on the collaborator row so payroll and leave can read it without
// replaying anything; the event log records every move that got it there. Both
// are written by `moveEmployment` and by nothing else, which is what stops the
// two disagreeing — the exact failure `editTicket` was split up to prevent when
// the sales pipeline shipped.
//
// WHY THE SETTLEMENT NEEDS A PAY RIGHT AND THE EXIT DOES NOT. An end-of-service
// award is a multiple of somebody's monthly wage, so a reader who is shown the
// award has been shown the wage — divide by the months and it is on the screen.
// Recording that somebody left is an HR act; learning what they earn is not. So
// `hr.lifecycle.offboard` books the exit and `hr.employees.salary` (or payroll's
// own right) is what computes and stores the money, and an offboarder without it
// gets the exit, the service years and the leave days with no amounts at all.

import { requirePermission, scopeFor, can } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators, getCollaborator, updateCollaborator } from "@/platform/auth/collaborators";
import { subtreeIds } from "@/shared/departments/tree";
import { codeOfCountry } from "@/shared/countries";
import { notifyCollaborators, NOTIFY } from "@/platform/notify/notifications";

import {
  EMPLOYMENT_STATUSES, EXIT_REASONS, MOVES, MOVE_KEYS, RECORD_EVENTS,
  attentionList, cleanContract, contractAt, contractProblems, contractsOf,
  daysBetween, employmentPackFor, moveProblem, movesFrom, noticeEndsOn,
  probationEndsOn, settlement, statusOf,
} from "./lifecycle";
import type { EmploymentContract, EmploymentStatus, LifecycleEvent, Move, Settlement } from "./lifecycle";
import { listDepartments, leaveOpenDays, DEFAULT_LEAVE_TYPE } from "./hr";
import { employmentRulesOf, leaveBalances } from "./leaveBalance";
import { statutoryRulesOf } from "./statutory";
import { payRecordOf } from "./payrollService";
import type { HrContext } from "./types";
import type { Vacation } from "./schema";

const Contracts = repo<EmploymentContract>("employmentContracts");
const Events = repo<LifecycleEvent>("lifecycleEvents");
const Vacations = repo<Vacation>("vacations");

const scope = (ctx: HrContext) => ({ studio: ctx.studio, section: ctx.lifecycleSection });
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "";
const today = () => new Date().toISOString().slice(0, 10);

type PersonRow = {
  id: string; alias?: string; userId?: unknown; departmentId?: unknown; dateOfJoin?: unknown;
  employmentStatus?: unknown; exitDate?: unknown; exitReason?: unknown;
  noticeGivenOn?: unknown; noticeEndsOn?: unknown; leaveAllowances?: unknown;
};

/**
 * WHOSE EMPLOYMENT THIS READER MAY TOUCH — the same walk `listEmployees` makes,
 * asked of this area's own scope rather than of Employees': a studio may
 * legitimately let a line manager read their team's records while keeping every
 * contract in the company to HR.
 *
 * MY OWN ROW IS ALWAYS IN, which is what makes a self-service view of your own
 * contract possible without a second mechanism.
 */
async function visible(ctx: HrContext, people: readonly PersonRow[]): Promise<Set<string>> {
  const s = scopeFor(ctx, "hr.lifecycle");
  if (s === "all") return new Set(people.map((p) => p.id));
  const meId = ctx.collaborator.id;
  if (s !== "department") return new Set([meId]);
  const departments = await listDepartments(ctx);
  const me = people.find((p) => p.id === meId);
  const mine = subtreeIds(departments, String(me?.departmentId || ""));
  return new Set(people.filter((p) => p.id === meId || mine.has(String(p.departmentId || ""))).map((p) => p.id));
}

/** The pack in force for this studio on a day — the country's, or the fallback. */
function packOn(ctx: HrContext, on: string) {
  const raw = String((ctx.studio as { country?: unknown }).country || "");
  const code = raw.length === 2 ? raw.toUpperCase() : codeOfCountry(raw);
  return employmentPackFor(code, on);
}

// ---- reading ------------------------------------------------------------------

/**
 * THE WHOLE LIFECYCLE SCREEN IN ONE READ. Everybody in scope with the state they
 * are in and the contract they are on, the attention queue, and the vocabulary
 * the screen offers — which comes from the PACK, so an Emirati studio is never
 * offered a permanent contract its own law does not recognise.
 */
export async function lifecycleView(ctx: HrContext) {
  const denied = requirePermission(ctx.access, "hr.lifecycle.view");
  if (denied) return denied;

  const asOf = today();
  const [rawPeople, contracts, events] = await Promise.all([
    listCollaborators(ctx.studio.id),
    Contracts.find(scope(ctx)),
    Events.find(scope(ctx)),
  ]);
  const people = rawPeople as unknown as PersonRow[];
  const seen = await visible(ctx, people);
  const mine = people.filter((p) => seen.has(p.id));

  const pack = packOn(ctx, asOf);

  const rows = mine.map((p) => {
    const status = statusOf(p);
    const current = contractAt(contracts, p.id, asOf);
    return {
      collaboratorId: p.id,
      alias: String(p.alias || "Unnamed"),
      departmentId: String(p.departmentId || ""),
      status,
      dateOfJoin: String(p.dateOfJoin || ""),
      exitDate: String(p.exitDate || ""),
      exitReason: String(p.exitReason || ""),
      noticeGivenOn: String(p.noticeGivenOn || ""),
      noticeEndsOn: String(p.noticeEndsOn || ""),
      // THE CONTRACT AS IT STANDS TODAY, and how many versions there have been —
      // the count is what tells a reader an amendment exists without this read
      // carrying every superseded row's terms to the browser.
      contract: current,
      versions: contractsOf(contracts, p.id).length,
      probationEndsOn: status === "Probation" ? probationEndsOn(current) : "",
      /** What this reader may do to this person, so the screen offers no button the service refuses. */
      moves: movesFrom(status),
    };
  }).sort((a, b) => a.alias.localeCompare(b.alias));

  return {
    asOf,
    // THE STUDIO'S OWN CURRENCY, so a settlement snapshot on the timeline is
    // printed in the money it was calculated in rather than the reader's guess.
    currency: String((ctx.studio as { currency?: unknown }).currency || ""),
    people: rows,
    // EVERY VERSION, for the one person a screen opens. Sent whole because the
    // chain is a handful of rows per employee and a second round trip per
    // profile would cost more than the bytes.
    contracts: contracts.filter((c) => seen.has(c.collaboratorId)),
    events: events
      .filter((e) => seen.has(e.collaboratorId))
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.createdAt.localeCompare(a.createdAt)),
    attention: attentionList(mine, contracts, asOf),
    pack: {
      country: pack.country,
      source: pack.source,
      probation: pack.probation,
      notice: pack.notice,
      contractTypes: pack.contractTypes,
    },
    vocabulary: {
      statuses: EMPLOYMENT_STATUSES,
      moves: MOVE_KEYS.map((m) => ({ key: m, to: MOVES[m].to, from: MOVES[m].from })),
      recordEvents: Object.keys(RECORD_EVENTS),
      exitReasons: EXIT_REASONS,
    },
    canManage: !requirePermission(ctx.access, "hr.lifecycle.edit"),
    canCreate: !requirePermission(ctx.access, "hr.lifecycle.create"),
    canOffboard: !requirePermission(ctx.access, "hr.lifecycle.offboard"),
    /** Whether this reader may be shown any money at all — see the file header. */
    canSeePay: canSeePay(ctx),
    me: { collaboratorId: ctx.collaborator.id },
  };
}

const canSeePay = (ctx: HrContext) =>
  can(ctx.access, "hr.employees.salary") || can(ctx.access, "hr.payroll.view");

// ---- contracts ------------------------------------------------------------------

/**
 * SIGN A CONTRACT OR AMEND ONE. An amendment is a NEW ROW naming the one it
 * supersedes — never an edit — so what somebody was on last May keeps answering
 * after this May's rise.
 *
 * THE PACK IS RESOLVED FROM THE CONTRACT'S OWN START DATE, not from today. A
 * contract backdated to 2019 is judged by 2019's probation limit, which is the
 * whole reason `employmentPackFor` takes a date.
 */
export async function saveContract(ctx: HrContext, body: Record<string, unknown>) {
  const amending = Boolean(str(body?.supersedesId, 60));
  const denied = requirePermission(ctx.access, amending ? "hr.lifecycle.edit" : "hr.lifecycle.create");
  if (denied) return denied;

  const collaboratorId = str(body?.collaboratorId, 60);
  const person = await getCollaborator(ctx.studio.id, collaboratorId);
  if (!person) return { error: "notfound" };
  const people = await listCollaborators(ctx.studio.id) as unknown as PersonRow[];
  if (!(await visible(ctx, people)).has(collaboratorId)) return { error: "forbidden" };

  const pack = packOn(ctx, day(body?.startDate) || today());
  const problems = contractProblems(body, pack);
  if (problems.length) return { error: problems[0], problems };

  const contracts = await Contracts.find(scope(ctx));
  if (amending) {
    const prior = contracts.find((c) => c.id === str(body.supersedesId, 60));
    // AMENDING A ROW THAT IS ALREADY SUPERSEDED would fork the chain: two
    // versions claiming the same predecessor, and no way to say which is
    // current. The same rule the tender pack's revisions follow, for the same
    // reason — the refusal is at the WRITE, so the fork never exists.
    if (!prior || prior.collaboratorId !== collaboratorId) return { error: "supersedes" };
    if (contracts.some((c) => c.supersedesId === prior.id)) return { error: "superseded" };
  }

  const contract = await Contracts.create(scope(ctx), {
    ...cleanContract(body, pack),
    collaboratorId,
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
  });

  await writeEvent(ctx, {
    collaboratorId,
    type: amending ? "amendment" : "contract",
    effectiveDate: contract.startDate,
    note: str(body?.note, 500),
    payload: { contractId: contract.id, type: contract.type, jobTitle: contract.jobTitle },
  });

  return { contract };
}

// ---- the moves --------------------------------------------------------------------

type MoveBody = {
  collaboratorId?: unknown; move?: unknown; effectiveDate?: unknown; note?: unknown;
  reason?: unknown; deductions?: unknown; toDepartmentId?: unknown; lastWorkingDay?: unknown;
};

/**
 * ONE PERSON'S EMPLOYMENT MOVES ONE STEP. The single writer of
 * `employmentStatus`, and the only thing that appends a move to the log.
 *
 * ENDING AN EMPLOYMENT IS ITS OWN RIGHT. `giveNotice` and `exit` answer to
 * `hr.lifecycle.offboard` while every other move answers to `edit`, because
 * recording a promotion and ending somebody's job are not the same power — the
 * same split `projects.costs` drew through a project and `tendering.tenders.
 * approve` drew through a bid.
 */
export async function moveEmployment(ctx: HrContext, body: MoveBody) {
  const move = str(body?.move, 30) as Move;
  const leaving = move === "exit" || move === "giveNotice";
  const denied = requirePermission(ctx.access, leaving ? "hr.lifecycle.offboard" : "hr.lifecycle.edit");
  if (denied) return denied;

  const collaboratorId = str(body?.collaboratorId, 60);
  const person = await getCollaborator(ctx.studio.id, collaboratorId);
  if (!person) return { error: "notfound" };
  const people = await listCollaborators(ctx.studio.id) as unknown as PersonRow[];
  if (!(await visible(ctx, people)).has(collaboratorId)) return { error: "forbidden" };

  const status = statusOf(person as PersonRow);
  const problem = moveProblem(status, move);
  // THE REFUSAL CARRIES THE STATE IT WAS REFUSED FROM, so the screen can say
  // "they are already on notice" rather than "that did not work" — the shape
  // `already-decided` uses on a leave request.
  if (problem) return { error: problem, status };

  const effectiveDate = day(body?.effectiveDate) || today();
  const contracts = await Contracts.find(scope(ctx));
  const current = contractAt(contracts, collaboratorId, effectiveDate);
  const pack = packOn(ctx, effectiveDate);

  const patch: Record<string, unknown> = { employmentStatus: MOVES[move].to };
  const payload: Record<string, unknown> = {};

  if (move === "giveNotice") {
    // THE LAST DAY IS THE CONTRACT'S UNLESS SOMEBODY SAYS OTHERWISE. Notice is
    // routinely waived or extended by agreement, so a typed `lastWorkingDay`
    // wins — and what the contract WOULD have required is kept on the event,
    // because the difference between the two is exactly what the settlement
    // pays or claws back.
    const required = noticeEndsOn(effectiveDate, current, pack, status);
    const ends = day(body?.lastWorkingDay) || required;
    patch.noticeGivenOn = effectiveDate;
    patch.noticeEndsOn = ends;
    patch.exitReason = reasonOr(body?.reason);
    payload.noticeDays = current?.noticeDays ?? pack.notice.days;
    payload.noticeEndsOn = ends;
    payload.noticeDueOn = required;
  }

  if (move === "withdrawNotice") {
    patch.noticeGivenOn = "";
    patch.noticeEndsOn = "";
    patch.exitReason = "";
  }

  if (move === "exit") {
    const reason = reasonOr(body?.reason);
    patch.exitDate = effectiveDate;
    patch.exitReason = reason;
    payload.reason = reason;
    // THE SETTLEMENT IS SNAPSHOTTED ONTO THE EVENT, the way a payroll run
    // freezes its lines: the wage, the leave balance and the pack all move
    // afterwards, and "what were they paid on leaving" has to keep answering.
    // Absent — not nought — where this actor may not see pay at all.
    const calculated = canSeePay(ctx)
      ? await settlementFor(ctx, { collaboratorId, lastWorkingDay: effectiveDate, reason, deductions: body?.deductions })
      : null;
    if (calculated && !("error" in calculated)) payload.settlement = calculated.settlement;
  }

  if (move === "hire") {
    // A REHIRE IS A NEW EMPLOYMENT, so the old one's leaving fields are cleared
    // rather than left to read as though this person is still gone, and service
    // restarts from today — which is what every country pack here assumes when
    // it counts an award by years of service.
    //
    // THE OLD DATES GO ONTO THE EVENT FIRST. Clearing a field that decided money
    // without recording what it held would make the first spell unanswerable,
    // and this log is the only thing that can answer it.
    payload.previousDateOfJoin = String(person.dateOfJoin || "");
    payload.previousExitDate = String((person as PersonRow).exitDate || "");
    payload.previousExitReason = String((person as PersonRow).exitReason || "");
    patch.exitDate = "";
    patch.exitReason = "";
    patch.noticeGivenOn = "";
    patch.noticeEndsOn = "";
    patch.dateOfJoin = effectiveDate;
  }

  await updateCollaborator(ctx.studio.id, collaboratorId, patch);
  const event = await writeEvent(ctx, {
    collaboratorId, type: move, status: MOVES[move].to, effectiveDate,
    note: str(body?.note, 500), payload,
  });

  // THEY ARE TOLD WHAT HAPPENED TO THEIR OWN EMPLOYMENT — nobody should learn
  // they are on notice from a payslip. Not for a move they made themselves,
  // which would be the product telling somebody what they just did.
  //
  // THE SETTLEMENT IS NOT IN IT. A notification is a line of text in a bell that
  // several screens render; the money stays behind the right that gates it.
  if (collaboratorId !== ctx.collaborator.id) {
    const userIdOf = (id: string) => String(people.find((p) => p.id === id)?.userId || "") || undefined;
    await notifyCollaborators(ctx.studio.id, [collaboratorId], {
      type: NOTIFY.employmentChanged,
      title: MOVES[move].label,
      body: `${MOVES[move].label} — ${effectiveDate}`,
      href: `/${ctx.studio.slug}/hr-lifecycle`,
      params: { move: MOVES[move].label, date: effectiveDate },
    }, { userIdOf }).catch(() => { /* a notification must never fail the move that caused it */ });
  }

  return { ok: true, status: MOVES[move].to, event };
}

const reasonOr = (v: unknown) =>
  (EXIT_REASONS as readonly string[]).includes(String(v || "")) ? String(v) : "Termination";

/**
 * A TRANSFER, A PROMOTION OR A NOTE — history without a state change. A transfer
 * MOVES the person, which is why it writes the department onto the row as well
 * as into the log: an event nothing acts on is a diary entry.
 *
 * CHANGING SOMEBODY'S DEPARTMENT WIDENS WHAT THEIR MANAGER CAN SEE (`subtreeIds`
 * drives the `department` scope), which is why the target is validated against
 * the stored org chart exactly as `saveEmployment` validates it.
 */
export async function recordEvent(ctx: HrContext, body: MoveBody & { type?: unknown }) {
  const denied = requirePermission(ctx.access, "hr.lifecycle.edit");
  if (denied) return denied;

  const type = str(body?.type, 30);
  if (!(type in RECORD_EVENTS) || type === "contract" || type === "amendment") return { error: "type" };

  const collaboratorId = str(body?.collaboratorId, 60);
  const person = await getCollaborator(ctx.studio.id, collaboratorId);
  if (!person) return { error: "notfound" };
  const people = await listCollaborators(ctx.studio.id) as unknown as PersonRow[];
  if (!(await visible(ctx, people)).has(collaboratorId)) return { error: "forbidden" };

  const payload: Record<string, unknown> = {};
  if (type === "transfer") {
    const to = str(body?.toDepartmentId, 60);
    const departments = await listDepartments(ctx);
    if (to && !departments.some((d) => d.id === to)) return { error: "department" };
    payload.fromDepartmentId = String((person as PersonRow).departmentId || "");
    payload.toDepartmentId = to;
    await updateCollaborator(ctx.studio.id, collaboratorId, { departmentId: to });
  }

  const event = await writeEvent(ctx, {
    collaboratorId, type, effectiveDate: day(body?.effectiveDate) || today(),
    note: str(body?.note, 500), payload,
  });
  return { event };
}

async function writeEvent(ctx: HrContext, input: {
  collaboratorId: string; type: string; status?: EmploymentStatus;
  effectiveDate: string; note: string; payload?: Record<string, unknown>;
}) {
  return Events.create(scope(ctx), {
    collaboratorId: input.collaboratorId,
    type: input.type,
    ...(input.status ? { status: input.status } : {}),
    effectiveDate: input.effectiveDate,
    note: input.note,
    payload: input.payload && Object.keys(input.payload).length ? input.payload : undefined,
    actorCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
  });
}

// ---- the settlement ---------------------------------------------------------------

/**
 * WHAT SOMEBODY WOULD BE OWED ON A GIVEN LAST DAY. Read-only and recomputed on
 * every ask, so an offboarding screen can show the figure moving as the date is
 * changed — the STORED copy is the snapshot `exit` writes onto its event.
 *
 * FOUR SOURCES AND EVERY ONE OF THEM ALREADY EXISTED: the end-of-service rule
 * from the studio's statutory settings, the wage from the pay record, the unused
 * days from the leave balance, and the notice from the contract. Nothing new is
 * stored to answer this; what was missing was anything that could ASK.
 */
export async function settlementFor(ctx: HrContext, input: {
  collaboratorId: string; lastWorkingDay?: unknown; reason?: unknown; deductions?: unknown;
}): Promise<{ error: string } | { settlement: Settlement; alias: string; noticeDaysRequired: number; currency: string }> {
  if (!canSeePay(ctx)) return { error: "salary-forbidden" };

  const collaboratorId = str(input.collaboratorId, 60);
  const person = await getCollaborator(ctx.studio.id, collaboratorId) as unknown as PersonRow | null;
  if (!person) return { error: "notfound" };
  const people = await listCollaborators(ctx.studio.id) as unknown as PersonRow[];
  if (!(await visible(ctx, people)).has(collaboratorId)) return { error: "forbidden" };

  const lastWorkingDay = day(input.lastWorkingDay) || today();
  const reason = reasonOr(input.reason);
  const pack = packOn(ctx, lastWorkingDay);

  const [pay, contracts, vacations] = await Promise.all([
    payRecordOf(ctx, collaboratorId),
    Contracts.find(scope(ctx)),
    Vacations.find({ studio: ctx.studio, section: ctx.section }),
  ]);

  const basic = Number(pay?.basic || 0);
  const allowances = (pay?.components || [])
    .filter((c) => c.kind === "allowance")
    .reduce((t, c) => t + Number(c.amount || 0), 0);

  // THE ANNUAL BALANCE ALONE IS ENCASHED. Sick leave left over is not money —
  // it is an entitlement that lapses — and summing every type would pay a leaver
  // for the illness they did not have.
  const rules = employmentRulesOf(ctx.studio);
  const balances = leaveBalances({
    rules,
    person: { id: collaboratorId, dateOfJoin: person.dateOfJoin, leaveAllowances: person.leaveAllowances },
    vacations: vacations as never,
    year: Number(lastWorkingDay.slice(0, 4)),
    open: leaveOpenDays(ctx.studio),
  });
  const annual = balances.find((b) => b.type === DEFAULT_LEAVE_TYPE);

  const current = contractAt(contracts, collaboratorId, lastWorkingDay);
  const noticeDaysRequired = current?.noticeDays ?? pack.notice.days;
  const givenOn = day(person.noticeGivenOn);
  // NOTICE ACTUALLY SERVED, from the day it was given to the last working day.
  // No notice given means none served, which is the honest reading of somebody
  // walking out — not "the full period", which would quietly waive the shortfall.
  const noticeDaysServed = givenOn ? Math.max(0, daysBetween(givenOn, lastWorkingDay)) : 0;

  return {
    alias: String(person.alias || "Unnamed"),
    currency: String((ctx.studio as { currency?: unknown }).currency || ""),
    noticeDaysRequired,
    settlement: settlement({
      dateOfJoin: String(person.dateOfJoin || ""),
      lastWorkingDay,
      reason,
      basic,
      wage: basic + allowances,
      eosRule: statutoryRulesOf(ctx.studio).endOfService,
      // NULL, NOT NOUGHT, where the studio rules no annual leave at all: "they
      // are owed nothing for leave" and "we cannot say what they are owed" are
      // different answers, and only one of them should be paid out.
      unusedLeaveDays: annual ? annual.remaining : null,
      noticeDaysRequired,
      noticeDaysServed,
      deductions: Number(input.deductions) > 0 ? Number(input.deductions) : 0,
    }, (ctx.studio as { currency?: unknown }).currency),
  };
}
