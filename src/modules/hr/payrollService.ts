// THE STORE HALF OF `./payroll`.
//
// TWO RIGHTS, AND THEY ARE NOT THE SAME ONE. `hr.employees.salary` reveals ONE
// person's record to somebody who may already read it; `hr.payroll` opens the
// whole company's wage bill. A studio hands the first to a line manager and the
// second to whoever runs payroll, and they are rarely the same person.
//
// A RUN FREEZES WHAT IT PAID. The lines are computed when the run is prepared
// and STORED on it, so a rise next month cannot rewrite last month's payslip —
// the rule the approval engine follows by storing the FX rate on the bill it
// routed. Recomputing on read would make a payslip a live query, which is
// exactly what a payslip must not be.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import {
  payProblems, cleanPay, payslipFor, runTotals, runProblem, approvalProblem,
  bankRows, PERIOD_RE,
} from "./payroll";
import type { PayRecord, PayslipLine, RunStatus } from "./payroll";
import type { HrContext } from "./types";
import { isAdministrator } from "@/platform/access";
import { notifyHolders, signatureNotice } from "@/modules/people/holders";
import { statutoryRulesOf, endOfService, sifFile } from "./statutory";

type Run = {
  id: string;
  period: string;
  status: RunStatus;
  lines: PayslipLine[];
  totals: ReturnType<typeof runTotals>;
  preparedByCollaboratorId: string;
  preparedAt: string;
  approvedByCollaboratorId?: string;
  approvedAt?: string;
  paidAt?: string;
};

const Pay = repo<PayRecord & { id: string }>("payRecords");
const Runs = repo<Run>("payrollRuns");
const Vacations = repo<{ collaboratorId?: string; type?: string; status?: string; from?: string; to?: string }>("vacations");

const scope = (ctx: HrContext) => ({ studio: ctx.studio, section: ctx.employeesSection });
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * UNPAID DAYS INSIDE A PERIOD, from approved unpaid leave.
 *
 * ONLY `Unpaid` AND ONLY `Approved`. A pending request is not leave yet and
 * docking for it would take money off somebody for a day their manager might
 * refuse; annual leave is paid, which is what makes it annual leave.
 *
 * CLIPPED TO THE PERIOD, because a fortnight spanning the month end is two
 * different deductions on two different payslips, and counting it whole on
 * either would dock it twice across the pair.
 */
export function unpaidDaysIn(
  vacations: { collaboratorId?: string; type?: string; status?: string; from?: string; to?: string }[],
  collaboratorId: string,
  period: string,
): number {
  if (!PERIOD_RE.test(period)) return 0;
  const start = `${period}-01`;
  const [y, m] = period.split("-").map(Number);
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);

  let days = 0;
  for (const v of vacations) {
    if (v.collaboratorId !== collaboratorId) continue;
    if (v.type !== "Unpaid" || v.status !== "Approved") continue;
    const from = String(v.from || "");
    const to = String(v.to || from);
    if (!from || to < start || from > end) continue;
    const a = Date.parse(`${from < start ? start : from}T00:00:00Z`);
    const b = Date.parse(`${to > end ? end : to}T00:00:00Z`);
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) days += (b - a) / 86400000 + 1;
  }
  return days;
}

/** Every pay record, with the people they belong to. */
export async function listPay(ctx: HrContext) {
  const denied = requirePermission(ctx.access, "hr.payroll.view");
  if (denied) return denied;

  const [records, runs, people] = await Promise.all([
    Pay.find(scope(ctx)),
    Runs.find(scope(ctx)),
    listCollaborators(ctx.studio.id),
  ]);
  const alias = Object.fromEntries(people.map((c) => [String(c.id), String(c.alias || "Unnamed")]));
  const rules = statutoryRulesOf(ctx.studio);
  const today = new Date().toISOString().slice(0, 10);

  return {
    // EVERYBODY IN THE STUDIO, with or without a pay record. Somebody who has
    // never been given one is exactly who a payroll clerk is looking for, and a
    // list of only the paid would hide them.
    people: people.map((c) => {
      const pay = records.find((r) => r.collaboratorId === String(c.id));
      const dateOfJoin = String((c as { dateOfJoin?: unknown }).dateOfJoin || "");
      const allowances = (pay?.components || []).filter((x) => x.kind === "allowance").reduce((t, x) => t + x.amount, 0);
      return {
        collaboratorId: String(c.id),
        alias: alias[String(c.id)],
        basic: pay?.basic ?? null,
        components: pay?.components ?? [],
        iban: pay?.iban ?? "",
        bankName: pay?.bankName ?? "",
        ssCovered: pay?.ssCovered ?? null,
        ssEmployeePct: pay?.ssEmployeePct ?? null,
        ssEmployerPct: pay?.ssEmployerPct ?? null,
        labourCardId: pay?.labourCardId ?? "",
        agentId: pay?.agentId ?? "",
        dateOfJoin,
        // WHAT THEY WOULD BE OWED IF THEIR EMPLOYMENT ENDED TODAY, by termination —
        // the studio's liability, which it had no way to see. Null without a
        // rule, a pay record or a joining date, rather than a nought that reads
        // as "owed nothing".
        endOfService: rules.endOfService && pay && dateOfJoin
          ? endOfService(rules.endOfService, {
            dateOfJoin, asOf: today, basic: pay.basic, wage: pay.basic + allowances, reason: "termination",
          })
          : null,
      };
    }),
    // WHICH STATUTORY PARTS THIS STUDIO HAS SAVED, so the screen offers only
    // those fields and files.
    ssEnabled: Boolean(rules.socialSecurity),
    eosEnabled: Boolean(rules.endOfService),
    wpsEnabled: Boolean(rules.wps),
    sifReady: Boolean(rules.wps) && String((ctx.studio as { currency?: unknown }).currency || "").toUpperCase() === "AED",
    runs: [...runs]
      .sort((a, b) => String(b.period).localeCompare(String(a.period)))
      .map((r) => ({
        id: r.id, period: r.period, status: r.status, totals: r.totals,
        preparedByAlias: alias[r.preparedByCollaboratorId] || "",
        // SO THE SCREEN CAN SAY "needs another approver" instead of offering
        // a button the server would refuse.
        preparedByMe: r.preparedByCollaboratorId === ctx.collaborator.id,
      })),
    canManage: !requirePermission(ctx.access, "hr.payroll.edit"),
    canApprove: !requirePermission(ctx.access, "hr.payroll.approve"),
    isAdmin: isAdministrator(ctx.collaborator, ctx.roles),
  };
}

export async function savePay(ctx: HrContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "hr.payroll.edit");
  if (denied) return denied;

  const problems = payProblems(body);
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  const clean = cleanPay(body);
  const existing = (await Pay.find(scope(ctx))).find((r) => r.collaboratorId === clean.collaboratorId);
  // ONE RECORD PER PERSON, updated rather than appended. Two pay records for one
  // employee is two salaries, and the run would pay whichever it found first.
  if (existing) {
    const updated = await Pay.update(scope(ctx), existing.id, clean);
    return updated ? { pay: updated } : { error: "notfound" };
  }
  return { pay: await Pay.create(scope(ctx), clean) };
}

/**
 * PREPARE A RUN for a period.
 *
 * ONE RUN PER PERIOD. A second September is two wage bills for one month, and
 * whichever posted first would be the one the ledger believes.
 *
 * SOMEBODY WITH NO PAY RECORD IS NOT ON IT. They are not paid nothing — nothing
 * has been decided about their pay — and putting a nought line on the run would
 * produce a payslip saying they earned nothing, which is a statement the studio
 * has not made.
 */
export async function prepareRun(ctx: HrContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "hr.payroll.create");
  if (denied) return denied;

  const period = str(body?.period, 7);
  if (!PERIOD_RE.test(period)) return { error: "period" };

  const runs = await Runs.find(scope(ctx));
  if (runs.some((r) => r.period === period)) return { error: "duplicate", period };

  const [records, people, vacations] = await Promise.all([
    Pay.find(scope(ctx)),
    listCollaborators(ctx.studio.id),
    Vacations.find({ studio: ctx.studio, section: ctx.section }),
  ]);
  const alias = Object.fromEntries(people.map((c) => [String(c.id), String(c.alias || "Unnamed")]));

  // THE STUDIO'S SCHEME AS SAVED TODAY, applied and then frozen with the lines —
  // a rate change next year must not rewrite this month's deduction.
  const ss = statutoryRulesOf(ctx.studio).socialSecurity;
  const lines = records.map((pay) => payslipFor(pay, {
    alias: alias[pay.collaboratorId] || "Unnamed",
    period,
    unpaidDays: unpaidDaysIn(vacations, pay.collaboratorId, period),
    ss,
  }));
  if (!lines.length) return { error: "nobody" };

  const run = await Runs.create(scope(ctx), {
    period,
    status: "Draft",
    // FROZEN HERE. Everything below is a copy of what the pay records said the
    // moment the run was prepared.
    lines,
    totals: runTotals(lines),
    preparedByCollaboratorId: ctx.collaborator.id,
    preparedAt: new Date().toISOString(),
  });
  // WHOEVER APPROVES PAYROLL IS TOLD A RUN IS READY — not the preparer, who
  // knows. (An Admin may still approve their own run; see `approvalProblem`.)
  await notifyHolders(ctx.studio.id, "hr.payroll.approve", signatureNotice(period, "hr"), [ctx.collaborator.id]);
  return { run };
}

/** One run in full, with its payslips. */
export async function readRun(ctx: HrContext, id: string) {
  const denied = requirePermission(ctx.access, "hr.payroll.view");
  if (denied) return denied;
  const run = (await Runs.find(scope(ctx))).find((r) => r.id === id);
  return run ? { run } : { error: "notfound" };
}

/**
 * APPROVE OR PAY. Two transitions, one door, and the ladder never runs
 * backwards — a payroll that could be reopened after approval is a payroll
 * whose payslips are not evidence of anything.
 */
export async function moveRun(ctx: HrContext, id: string, next: RunStatus) {
  const denied = requirePermission(
    ctx.access, next === "Approved" ? "hr.payroll.approve" : "hr.payroll.edit",
  );
  if (denied) return denied;

  const run = (await Runs.find(scope(ctx))).find((r) => r.id === id);
  if (!run) return { error: "notfound" };

  const wrong = runProblem(run.status, next);
  if (wrong) return { error: wrong, from: run.status, to: next };

  if (next === "Approved") {
    // INVARIANT 7, at the transition: preparing payroll and authorising it are
    // the two halves of the oldest control there is, and holding both rights is
    // legitimate while using both on one run is not — EXCEPT for the Admin, who
    // may approve a run they prepared (see `approvalProblem`).
    const blocked = approvalProblem(run, ctx.collaborator.id, { admin: isAdministrator(ctx.collaborator, ctx.roles) });
    if (blocked) return { error: blocked };
  }

  const at = new Date().toISOString();
  const updated = await Runs.update(scope(ctx), id, {
    status: next,
    ...(next === "Approved" ? { approvedByCollaboratorId: ctx.collaborator.id, approvedAt: at } : {}),
    ...(next === "Paid" ? { paidAt: at } : {}),
  });
  return updated ? { run: updated } : { error: "notfound" };
}

/** The bank file's rows, and everybody it could not pay. */
export async function bankFile(ctx: HrContext, id: string) {
  const denied = requirePermission(ctx.access, "hr.payroll.view");
  if (denied) return denied;

  const run = (await Runs.find(scope(ctx))).find((r) => r.id === id);
  if (!run) return { error: "notfound" };
  // A DRAFT RUN HAS NO BANK FILE. Its amounts are still being edited, and a
  // payment file is the one artefact that must never be provisional.
  if (run.status === "Draft") return { error: "not-approved", status: run.status };

  // THE ACCOUNT IS READ LIVE, NOT FROZEN with the run. Everything else about a
  // payslip must not move after approval, but somebody who changed banks
  // between the approval and the payment should be paid at the new one — the
  // account is where the money goes, not what was decided.
  const records = await Pay.find(scope(ctx));
  const account = new Map(records.map((r) => [r.collaboratorId, { iban: r.iban || "", bank: r.bankName || "" }]));

  return { period: run.period, ...bankRows(run.lines, (cid) => account.get(cid) || null) };
}

/**
 * THE UAE'S WPS FILE for an approved run (statutory.sifFile). The same gates as
 * the CSV — `hr.payroll.view`, never a draft, accounts read live — plus the
 * studio's WPS identifiers and a currency of AED.
 */
export async function sifFileFor(ctx: HrContext, id: string) {
  const denied = requirePermission(ctx.access, "hr.payroll.view");
  if (denied) return denied;

  const run = (await Runs.find(scope(ctx))).find((r) => r.id === id);
  if (!run) return { error: "notfound" };
  if (run.status === "Draft") return { error: "not-approved", status: run.status };

  const records = await Pay.find(scope(ctx));
  const account = new Map(records.map((r) => [r.collaboratorId, {
    iban: r.iban || "", agentId: r.agentId || "", labourCardId: r.labourCardId || "",
  }]));
  return sifFile({
    wps: statutoryRulesOf(ctx.studio).wps,
    currency: String((ctx.studio as { currency?: unknown }).currency || ""),
    period: run.period,
    lines: run.lines,
    accountOf: (cid) => account.get(cid) || null,
    now: new Date(),
  });
}
