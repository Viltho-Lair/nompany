// THE STORE HALF OF ./schedules — deferral schedules, filed under the ledger
// (`deferralSchedules`). Reading is `finance.ledger.view`; creating, running and
// cancelling are `finance.ledger.post`, because every one of them writes to the
// books and nothing else.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { ledgerAccounts, postDeferral, postRecognition, reverseDocument } from "./ledger";
import { cleanSchedule, dueRecognitions, scheduleState } from "./schedules";
import type { Schedule } from "./schedules";
import type { FinanceContext, JournalEntry } from "./types";

type ScheduleRecord = Schedule & { id: string; status: "active" | "cancelled"; createdAt: string; createdByCollaboratorId: string };

const Schedules = repo<ScheduleRecord>("deferralSchedules");
const Entries = repo<JournalEntry>("journalEntries");
const scope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.ledgerSection });
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** For each schedule: whether its deferral is in the books, and which months are. */
function postedState(entries: JournalEntry[]) {
  const deferred = new Set<string>();
  const months = new Map<string, Set<string>>();
  for (const e of entries) {
    if (e.reversedByEntryId) continue;
    const id = String(e.source?.id || "");
    if (e.source?.kind === "deferral") deferred.add(id);
    if (e.source?.kind === "recognition") {
      const [sid, period] = id.split(":");
      if (!months.has(sid)) months.set(sid, new Set());
      months.get(sid)!.add(period);
    }
  }
  return { deferred, months };
}

export async function schedulesView(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.ledger.view");
  if (denied) return denied;
  const [rows, entries, chart] = await Promise.all([Schedules.find(scope(ctx)), Entries.find(scope(ctx)), ledgerAccounts(ctx)]);
  const { deferred, months } = postedState(entries);
  const now = new Date().toISOString().slice(0, 7);
  return {
    schedules: rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((s) => {
      const posted = months.get(s.id) || new Set<string>();
      return {
        ...s, deferred: deferred.has(s.id), ...scheduleState(s, posted, ctx.studio.currency),
        dueNow: s.status === "active" ? dueRecognitions(s, posted, now, ctx.studio.currency).length : 0,
      };
    }),
    accounts: chart.filter((a) => (a.type === "income" || a.type === "expense") && a.active !== false)
      .map((a) => ({ id: a.id, code: a.code, name: a.name, type: a.type })),
    canPost: !requirePermission(ctx.access, "finance.ledger.post"),
  };
}

/** Create a schedule and move its amount out of the P&L on its day. */
export async function createSchedule(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.ledger.post");
  if (denied) return denied;
  const cleaned = cleanSchedule(body, await ledgerAccounts(ctx));
  if ("problems" in cleaned) return { error: "refused" as const, detail: cleaned.problems.join("; ") };
  const schedule = await Schedules.create(scope(ctx), {
    ...cleaned.schedule, status: "active", createdAt: new Date().toISOString(), createdByCollaboratorId: ctx.collaborator.id,
  });
  // THE SCHEDULE STANDS EVEN IF ITS DEFERRAL IS REFUSED (a closed month): the
  // screen says it is not in the books, and the next run posts it first.
  const posting = await postDeferral(ctx, schedule.id);
  return { schedule, posting };
}

/**
 * THE MONTHLY RUN: every active schedule's shares due by the end of `period`,
 * oldest first — previewed, or posted. A schedule whose deferral never reached
 * the books posts that first; a month that is closed refuses by name and the
 * rest carry on.
 */
export async function runSchedules(ctx: FinanceContext, body: Record<string, unknown>) {
  const post = body?.post === true;
  const denied = requirePermission(ctx.access, post ? "finance.ledger.post" : "finance.ledger.view");
  if (denied) return denied;
  const period = String(body?.period ?? "");
  if (!PERIOD_RE.test(period)) return { error: "period" };
  const [rows, entries] = await Promise.all([Schedules.find(scope(ctx)), Entries.find(scope(ctx))]);
  const { deferred, months } = postedState(entries);
  const out: { scheduleId: string; description: string; period: string; share: number; state: string }[] = [];
  for (const s of rows.filter((r) => r.status === "active")) {
    if (post && !deferred.has(s.id)) {
      const d = await postDeferral(ctx, s.id) as { error?: string };
      if (d?.error && d.error !== "already-posted") {
        out.push({ scheduleId: s.id, description: s.description, period: s.deferredOn.slice(0, 7), share: s.amount, state: d.error });
        continue;
      }
    }
    for (const due of dueRecognitions(s, months.get(s.id) || new Set(), period, ctx.studio.currency)) {
      let state = "due";
      if (post) {
        const r = await postRecognition(ctx, `${s.id}:${due.period}`) as { error?: string };
        state = r?.error ? r.error : "posted";
      }
      out.push({ scheduleId: s.id, description: s.description || s.reference, period: due.period, share: due.share, state });
    }
  }
  return { period, rows: out };
}

/**
 * CANCEL A SCHEDULE NOTHING HAS BEEN RECOGNISED FROM: its deferral is reversed
 * on the day it was made, so the amount returns to the P&L where the document
 * put it. Once a month has been recognised, cancelling would rewrite reported
 * months — the honest correction is a manual entry, and the refusal says so.
 */
export async function cancelSchedule(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.ledger.post");
  if (denied) return denied;
  const [rows, entries] = await Promise.all([Schedules.find(scope(ctx)), Entries.find(scope(ctx))]);
  const s = rows.find((r) => r.id === id);
  if (!s) return { error: "notfound" };
  if (s.status === "cancelled") return { error: "status" };
  if ((postedState(entries).months.get(id) || new Set()).size) return { error: "recognised" };
  const reversed = await reverseDocument(ctx, "deferral", id, "Schedule cancelled", s.deferredOn);
  if ("error" in reversed && reversed.error) return reversed;
  const updated = await Schedules.update(scope(ctx), id, () => ({ status: "cancelled" as const }));
  return updated ? { schedule: updated } : { error: "notfound" };
}
