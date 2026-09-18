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
  bankRows, PERIOD_RE, periodRange,
} from "./payroll";
import type { PayRecord, PayslipLine, RunStatus } from "./payroll";
import type { HrContext } from "./types";
import { isAdministrator } from "@/platform/access";
import { notifyHolders, signatureNotice } from "@/modules/people/holders";
import { statutoryRulesOf, endOfService, sifFile } from "./statutory";
import { employedBetween, statusOf } from "./lifecycle";
import { officialForDocument } from "@/shared/compliance/resolve";
import { legalRowsBeside } from "@/shared/compliance/printing";

/** Somebody with a pay record who is not in this run, and why in words. */
export type Excluded = { collaboratorId: string; alias: string; reason: string };

type Run = {
  id: string;
  period: string;
  status: RunStatus;
  lines: PayslipLine[];
  /**
   * WHO WAS LEFT OUT, frozen with the lines. A run that silently omits somebody
   * is a run nobody can check: the question "why is this month short one
   * person" has to be answerable from the run itself, months later, without
   * replaying the employment records as they stand today.
   */
  excluded?: Excluded[];
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
      const status = statusOf(c as never);
      const exitDate = String((c as { exitDate?: unknown }).exitDate || "");
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
        // THE EMPLOYMENT, so the screen can say why somebody is not in the run
        // rather than leaving a clerk to wonder. The pay record is the terms;
        // this is whether they are live.
        employmentStatus: status,
        exitDate,
        // WHAT THEY WOULD BE OWED IF THEIR EMPLOYMENT ENDED TODAY, by termination —
        // the studio's liability, which it had no way to see. Null without a
        // rule, a pay record or a joining date, rather than a nought that reads
        // as "owed nothing".
        //
        // AND FOR SOMEBODY WHO HAS ALREADY GONE it is computed to their LAST
        // DAY, not to today: their service stopped, and a liability that went on
        // growing after they left would overstate the provision every month for
        // ever.
        endOfService: rules.endOfService && pay && dateOfJoin
          ? endOfService(rules.endOfService, {
            dateOfJoin, asOf: status === "Exited" && exitDate ? exitDate : today,
            basic: pay.basic, wage: pay.basic + allowances, reason: "termination",
          }, ctx.studio.currency)
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

  const clean = cleanPay(body, ctx.studio.currency);
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
  const byId = new Map(people.map((c) => [String(c.id), c]));

  // THE STUDIO'S SCHEME AS SAVED TODAY, applied and then frozen with the lines —
  // a rate change next year must not rewrite this month's deduction.
  const ss = statutoryRulesOf(ctx.studio).socialSecurity;

  // WHO IS IN THE RUN IS AN EMPLOYMENT QUESTION, NOT A PAY-RECORD ONE, and until
  // the lifecycle shipped this loop could not ask it: every pay record became a
  // payslip, so somebody who left in March was paid in full in April and every
  // month after, for as long as their record sat there. The record is the
  // TERMS; whether those terms were live in this period is `employedBetween`.
  const [first, last] = periodRange(period);
  const lines: PayslipLine[] = [];
  const excluded: Excluded[] = [];
  for (const pay of records) {
    const who = alias[pay.collaboratorId] || "Unnamed";
    const person = byId.get(pay.collaboratorId);
    // A PAY RECORD WHOSE PERSON IS GONE FROM THE STUDIO is not a payslip. It
    // cannot be, and it is reported rather than paid to a name nobody holds.
    if (!person) {
      excluded.push({ collaboratorId: pay.collaboratorId, alias: who, reason: "no-collaborator" });
      continue;
    }
    const window = employedBetween(person as never, first, last);
    if (!window.days) {
      excluded.push({ collaboratorId: pay.collaboratorId, alias: who, reason: window.reason });
      continue;
    }
    lines.push(payslipFor(pay, {
      alias: who,
      period,
      unpaidDays: unpaidDaysIn(vacations, pay.collaboratorId, period),
      ss,
      employedDays: window.days,
    }, ctx.studio.currency));
  }
  // NOBODY AT ALL IS STILL A REFUSAL, and it now carries who was considered —
  // "nobody" on a studio of forty reads as a broken run rather than as forty
  // people none of whom were employed this month.
  if (!lines.length) return { error: "nobody", excluded };

  const run = await Runs.create(scope(ctx), {
    period,
    status: "Draft",
    // FROZEN HERE. Everything below is a copy of what the pay records said the
    // moment the run was prepared.
    lines,
    excluded,
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
 * ONE PERSON'S PAYSLIP, as a document to print — the line the run FROZE, with
 * the employer's heading around it.
 *
 * THE FIGURES ARE THE RUN'S, never recomputed: a payslip is evidence of what
 * was paid, and a rise next month must not rewrite it (the header of this file).
 *
 * THE HEADING IS TODAY'S. The employer's name and its official values
 * (shared/compliance — whichever fields the country's file marks for a payslip,
 * printed only when filled and applicable) are read as they stand now, because
 * they describe the employer rather than the pay, and a corrected PAYE reference
 * should reach a reprint. The legal rows follow, less any repeating one of
 * them — the same rule every printed document keeps.
 *
 * THE SAME RIGHT AS THE RUN (`hr.payroll.view`). Somebody's own payslip for
 * somebody without it is self-service, which is not built.
 */
export async function payslipDocument(ctx: HrContext, runId: string, collaboratorId: string) {
  const denied = requirePermission(ctx.access, "hr.payroll.view");
  if (denied) return denied;
  const run = (await Runs.find(scope(ctx))).find((r) => r.id === runId);
  if (!run) return { error: "notfound" };
  const line = run.lines.find((l) => l.collaboratorId === collaboratorId);
  if (!line) return { error: "notfound" };

  const studio = ctx.studio as { name?: unknown; location?: unknown; city?: unknown; currency?: unknown; legalInfo?: unknown };
  const official = officialForDocument(ctx.studio, "payslip", { sectionOn: ctx.on });
  const [from, to] = periodRange(run.period);
  return {
    payslip: {
      runId: run.id,
      period: run.period,
      range: from ? { from, to } : null,
      status: run.status,
      approvedAt: run.approvedAt || "",
      paidAt: run.paidAt || "",
      // THE STUDIO'S CURRENCY TODAY. A run stores none, because the studio has
      // one currency and payroll is paid in it.
      currency: String(studio.currency || ""),
      employer: {
        name: String(studio.name || ""),
        address: [studio.location, studio.city].map((v) => String(v || "").trim()).filter(Boolean).join(", "),
        official: official.map((p) => ({ key: p.key, label: p.label, value: p.value })),
        legal: legalRowsBeside(studio.legalInfo as { key?: unknown; value?: unknown }[] | undefined, official)
          .map((r) => ({ key: String(r.key ?? ""), value: String(r.value ?? "") })),
      },
      line,
    },
  };
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

/**
 * ONE PERSON'S PAY RECORD, for a caller that needs the wage to compute
 * something else — the final settlement is the only one today.
 *
 * EITHER PAY RIGHT OPENS IT, and that is deliberate rather than lax. The two
 * are different powers over different scopes — `hr.employees.salary` reveals one
 * person's pay to somebody who may already read their record, `hr.payroll.view`
 * opens the company's wage bill — and both are, unambiguously, permission to see
 * what this person earns. Requiring the payroll right alone would mean an HR
 * officer entitled to read somebody's salary could not compute their settlement
 * from it; requiring the employees right alone would lock out the payroll clerk.
 */
export async function payRecordOf(ctx: HrContext, collaboratorId: string): Promise<PayRecord | null> {
  if (requirePermission(ctx.access, "hr.employees.salary") && requirePermission(ctx.access, "hr.payroll.view")) {
    return null;
  }
  const records = await Pay.find(scope(ctx), { where: { collaboratorId } });
  return records[0] || null;
}
