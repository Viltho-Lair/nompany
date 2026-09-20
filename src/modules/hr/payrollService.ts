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
  payProblems, cleanPay, payslipFor, runTotals, runProblem,
  bankRows, PERIOD_RE, periodRange,
} from "./payroll";
import type { PayRecord, PayslipLine, RunStatus } from "./payroll";
import type { HrContext } from "./types";
import { approvalRows, requestApproval } from "@/modules/approvals/approvals";
import { approvalSummary } from "@/modules/approvals/reads";
import type { Refusal } from "@/modules/approvals/effects";
import type { Approval } from "@/modules/approvals/schema";
import type { StudioRef } from "@/modules/context";
import { statutoryRulesOf, endOfService, sifFile, wpsWithEmployer } from "./statutory";
import { employedBetween, statusOf } from "./lifecycle";
import { official, officialForDocument } from "@/shared/compliance/resolve";
import { legalRowsBeside } from "@/shared/compliance/printing";
import { studioWageProtection } from "@/shared/compliance/rules";

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

  const [records, runs, people, approvals] = await Promise.all([
    Pay.find(scope(ctx)),
    Runs.find(scope(ctx)),
    listCollaborators(ctx.studio.id),
    approvalRows(ctx.studio, ctx.approvalsSection),
  ]);
  const mayAsk = !requirePermission(ctx.access, "hr.payroll.edit");
  const alias = Object.fromEntries(people.map((c) => [String(c.id), String(c.alias || "Unnamed")]));
  const rules = statutoryRulesOf(ctx.studio);
  // The scheme the studio's COUNTRY runs, which decides whether its saved WPS
  // identifiers mean anything here at all.
  const scheme = studioWageProtection(ctx.studio);
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
    // AND ONLY WHERE THE COUNTRY RUNS THE SCHEME (20/09/2026). A studio that
    // saved WPS identifiers and has since moved to a country with no such
    // system is offered no file: the identifiers are another ministry's, and a
    // salary file built from them would be sent to a regulator that has never
    // heard of this employer. The CURRENCY is the scheme's too — AED was this
    // line's own constant, and it is the UAE's answer rather than every
    // country's.
    wpsEnabled: Boolean(rules.wps) && Boolean(scheme),
    sifReady: Boolean(rules.wps) && Boolean(scheme)
      && String((ctx.studio as { currency?: unknown }).currency || "").toUpperCase() === scheme!.fileCurrency.toUpperCase(),
    runs: [...runs]
      .sort((a, b) => String(b.period).localeCompare(String(a.period)))
      .map((r) => ({
        id: r.id, period: r.period, status: r.status, totals: r.totals,
        preparedByAlias: alias[r.preparedByCollaboratorId] || "",
        // HOW FAR ITS APPROVAL HAS GOT, read from the approval — answered on the
        // Approvals page since 19/09/2026 — and whether this reader may ask:
        // a draft nobody has asked about, or whose last request was turned down.
        ...(() => {
          const approval = approvalSummary(approvals, PAYROLL_APPROVAL, r.id);
          return { approval, canRequestApproval: mayAsk && r.status === "Draft" && (!approval || approval.rejected) };
        })(),
      })),
    canManage: mayAsk,
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
  // NOBODY IS TOLD YET: approving a run is asked for from the run (Request
  // approval), and whoever it names hears then.
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
 * PAY IT. The one move left on this door, and the ladder never runs backwards —
 * a payroll that could be reopened after approval is a payroll whose payslips
 * are not evidence of anything.
 *
 * APPROVING IS NOT A MOVE HERE (19/09/2026): it is asked for with
 * `requestRunApproval` and answered on the Approvals page, where preparing and
 * authorising stay two people (the Admin excepted — the owner's rule). A move
 * to Approved sent here is refused by name rather than routed around it.
 */
export async function moveRun(ctx: HrContext, id: string, next: RunStatus) {
  const denied = requirePermission(ctx.access, "hr.payroll.edit");
  if (denied) return denied;
  if (next === "Approved") return { error: "not-answerable" };

  const run = (await Runs.find(scope(ctx))).find((r) => r.id === id);
  if (!run) return { error: "notfound" };

  const wrong = runProblem(run.status, next);
  if (wrong) return { error: wrong, from: run.status, to: next };

  const at = new Date().toISOString();
  const updated = await Runs.update(scope(ctx), id, {
    status: next,
    ...(next === "Paid" ? { paidAt: at } : {}),
  });
  return updated ? { run: updated } : { error: "notfound" };
}

/** The approval type a payroll run asks for. Its key is stored — see modules/approvals/registry. */
export const PAYROLL_APPROVAL = "payroll";

/**
 * ASK FOR A RUN'S APPROVAL — the Request approval button on a draft run. The
 * approval carries the run's net, in the studio's currency; its people are
 * Approvals settings', and until the studio saves the type, whoever held
 * `hr.payroll.approve` plus the owner and Admins.
 */
export async function requestRunApproval(ctx: HrContext, id: string) {
  const denied = requirePermission(ctx.access, "hr.payroll.edit");
  if (denied) return denied;
  const run = await Runs.byId(scope(ctx), String(id));
  if (!run) return { error: "notfound" };
  if (run.status !== "Draft") return { error: "already-approved" };
  const asked = await requestApproval({ studio: ctx.studio, collaborator: ctx.collaborator, roles: ctx.roles }, {
    type: PAYROLL_APPROVAL,
    source: {
      sectionKey: "hr-payroll", recordId: run.id, ref: run.period,
      title: `Payroll ${run.period} · ${run.totals?.people ?? run.lines.length} people`, path: "hr-payroll",
    },
    amount: { value: Number(run.totals?.net) || 0, currency: String(ctx.studio.currency || "") },
  });
  if (asked.error) return { ...asked, error: asked.error };
  // UNDER EVERY LIMIT THE STUDIO SET, nothing is asked and it is approved as the
  // one who asked — what the last yes would have written.
  if (asked.notNeeded) {
    const run2 = await markRunApproved(scope(ctx), run.id, String(ctx.collaborator.id));
    return { run: run2 || run, approval: null };
  }
  return { run, approval: asked.approval ?? null };
}

/** Approved, once, and only from Draft. `approvedByCollaboratorId` is whoever gave the last yes. */
async function markRunApproved(where: { studio: StudioRef; section: HrContext["employeesSection"] }, id: string, by: string) {
  const at = new Date().toISOString();
  const run = await Runs.update(where, id, (cur) => ((cur as Run).status !== "Draft" ? cur : {
    ...cur, status: "Approved", approvedByCollaboratorId: by, approvedAt: at,
  }));
  return run && run.status === "Approved" && run.approvedAt === at ? run : null;
}

/** The run an approval names, in a context carrying the studio's authority. */
async function runFor(studio: StudioRef, approval: Approval, byCollaboratorId: string) {
  // IMPORTED WHEN NEEDED: ./hr imports the services beside it.
  const { hrContext } = await import("./hr");
  const ctx = await hrContext.asApprover(studio.id, byCollaboratorId);
  if (ctx.error) return { error: ctx.error } as Refusal;
  const run = await Runs.byId(scope(ctx), approval.source.recordId);
  return run ? { ctx, run } : ({ error: "notfound" } as Refusal);
}

/**
 * WHAT DECIDING A `payroll` APPROVAL DOES — see modules/approvals/effects. A
 * yes makes the run Approved, which is what the bank files and paying wait on;
 * a no leaves it a draft, read as turned down, to be prepared again or asked
 * about again.
 */
export const payrollApproval = {
  ready: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await runFor(studio, approval, by);
    if ("error" in found) return found;
    return found.run.status === "Draft" ? null : ({ error: "already-decided", status: found.run.status } as Refusal);
  },
  approved: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await runFor(studio, approval, by);
    if ("error" in found) return found;
    return (await markRunApproved(scope(found.ctx), found.run.id, by)) ? ("done" as const) : ({ error: "already-decided" } as Refusal);
  },
};

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
 * THE WAGE PROTECTION SALARY FILE for an approved run (statutory.sifFile). The
 * same gates as the CSV — `hr.payroll.view`, never a draft, accounts read
 * live — plus the studio's own identifiers and the scheme's currency.
 *
 * AND THE COUNTRY MUST RUN ONE. Refused by name otherwise, not merely absent
 * from the screen: the file carries a ministry's establishment id, and building
 * one for a country with no such ministry is the wrong country's document.
 */
export async function sifFileFor(ctx: HrContext, id: string) {
  const denied = requirePermission(ctx.access, "hr.payroll.view");
  if (denied) return denied;

  const scheme = studioWageProtection(ctx.studio);
  if (!scheme) return { error: "no-wps-here" };

  const run = (await Runs.find(scope(ctx))).find((r) => r.id === id);
  if (!run) return { error: "notfound" };
  if (run.status === "Draft") return { error: "not-approved", status: run.status };

  const records = await Pay.find(scope(ctx));
  const account = new Map(records.map((r) => [r.collaboratorId, {
    iban: r.iban || "", agentId: r.agentId || "", labourCardId: r.labourCardId || "",
  }]));
  return sifFile({
    // THE EMPLOYER ID IS AN OFFICIAL VALUE, and WHICH one is the scheme's to
    // say (`employerIdField`) rather than this line's: it was
    // `mohre_establishment_id`, hardcoded, which is the UAE's key and no
    // other country's. Read through the resolver like every other value; the
    // rest is Employment rules'.
    wps: wpsWithEmployer(statutoryRulesOf(ctx.studio).wps, official(ctx.studio, scheme.employerIdField)),
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
