// THE STORE HALF OF ./leases — the lease register, filed under Fixed assets
// (`leases`), because a right-of-use asset is an asset. It answers to the
// assets rights: `view` reads, `create` registers a lease (and recognises it),
// `edit` runs the month and removes a lease nothing has run for — the same
// split the depreciation run already has.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { autoPost, autoReverse } from "./posting";
import { storedMoneyAccounts, moneyAccountProblem } from "./ledger";
import { cleanLease, leaseSchedule } from "./leases";
import type { Lease } from "./leases";
import type { FinanceContext, JournalEntry } from "./types";

type LeaseRecord = Lease & { id: string; createdAt: string; createdByCollaboratorId: string };

const Leases = repo<LeaseRecord>("leases");
const Entries = repo<JournalEntry>("journalEntries");
const scope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.assetsSection });
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function posted(entries: JournalEntry[]) {
  const recognised = new Set<string>();
  const months = new Map<string, Set<string>>();
  for (const e of entries) {
    if (e.reversedByEntryId) continue;
    const id = String(e.source?.id || "");
    if (e.source?.kind === "lease") recognised.add(id);
    if (e.source?.kind === "lease-month") {
      const [lid, period] = id.split(":");
      if (!months.has(lid)) months.set(lid, new Set());
      months.get(lid)!.add(period);
    }
  }
  return { recognised, months };
}

export async function leasesView(ctx: FinanceContext) {
  const denied = requirePermission(ctx.access, "finance.assets.view");
  if (denied) return denied;
  const [rows, entries, accounts] = await Promise.all([
    Leases.find(scope(ctx)), Entries.find({ studio: ctx.studio, section: ctx.ledgerSection }), storedMoneyAccounts(ctx),
  ]);
  const { recognised, months } = posted(entries);
  const now = new Date().toISOString().slice(0, 7);
  return {
    leases: rows.sort((a, b) => b.start.localeCompare(a.start)).map((l) => {
      const s = leaseSchedule(l, ctx.studio.currency);
      const done = months.get(l.id) || new Set<string>();
      const lastDone = [...s.months].reverse().find((m) => done.has(m.period));
      return {
        ...l,
        initial: s.initial,
        recognised: recognised.has(l.id),
        monthsDone: done.size,
        // WHAT IS STILL OWED, from the last month in the books — the liability
        // the balance sheet shows for this lease.
        liability: lastDone ? lastDone.closing : s.initial,
        due: s.months.filter((m) => m.period <= now && !done.has(m.period)).length,
        end: s.months[s.months.length - 1]?.period || "",
      };
    }),
    moneyAccounts: accounts.map((a) => ({ id: a.id, code: a.code, name: a.name })),
    canCreate: !requirePermission(ctx.access, "finance.assets.create"),
    canRun: !requirePermission(ctx.access, "finance.assets.edit"),
  };
}

/** Register a lease and recognise it on its start date. */
export async function createLease(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.assets.create");
  if (denied) return denied;
  const cleaned = cleanLease(body);
  if ("problems" in cleaned) return { error: "refused" as const, detail: cleaned.problems.join("; ") };
  const wrong = await moneyAccountProblem(ctx, cleaned.lease.accountId);
  if (wrong) return { error: wrong };
  const lease = await Leases.create(scope(ctx), {
    ...cleaned.lease, createdAt: new Date().toISOString(), createdByCollaboratorId: ctx.collaborator.id,
  });
  // THE STUDIO'S AUTHORITY, like an asset's acquisition: registering the lease
  // is the decision, and recognising it is the consequence.
  const posting = await autoPost(ctx, "lease", lease.id);
  return { lease, posting };
}

/**
 * THE MONTH'S LEASES — previewed, or posted: each lease's months due by the
 * end of `period` and not yet in the books, oldest first. A lease whose
 * recognition never reached the books posts that first.
 */
export async function runLeases(ctx: FinanceContext, body: Record<string, unknown>) {
  const post = body?.post === true;
  const denied = requirePermission(ctx.access, post ? "finance.assets.edit" : "finance.assets.view");
  if (denied) return denied;
  const period = String(body?.period ?? "");
  if (!PERIOD_RE.test(period)) return { error: "period" };
  const [rows, entries] = await Promise.all([Leases.find(scope(ctx)), Entries.find({ studio: ctx.studio, section: ctx.ledgerSection })]);
  const { recognised, months } = posted(entries);
  const out: { leaseId: string; name: string; period: string; payment: number; interest: number; depreciation: number; state: string }[] = [];
  for (const l of rows) {
    if (post && !recognised.has(l.id)) {
      const r = await autoPost(ctx, "lease", l.id);
      if (!r.posted && r.reason !== "already-posted") {
        out.push({ leaseId: l.id, name: l.name, period: l.start.slice(0, 7), payment: 0, interest: 0, depreciation: 0, state: r.reason });
        continue;
      }
    }
    const done = months.get(l.id) || new Set<string>();
    for (const m of leaseSchedule(l, ctx.studio.currency).months) {
      if (m.period > period || done.has(m.period)) continue;
      let state = "due";
      if (post) {
        const r = await autoPost(ctx, "lease-month", `${l.id}:${m.period}`);
        state = r.posted ? "posted" : r.reason;
      }
      out.push({ leaseId: l.id, name: l.name, period: m.period, payment: m.payment, interest: m.interest, depreciation: m.depreciation, state });
    }
  }
  return { period, rows: out };
}

/** Remove a lease no month has been posted for; its recognition is reversed. */
export async function removeLease(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.assets.edit");
  if (denied) return denied;
  const [rows, entries] = await Promise.all([Leases.find(scope(ctx)), Entries.find({ studio: ctx.studio, section: ctx.ledgerSection })]);
  const lease = rows.find((l) => l.id === id);
  if (!lease) return { error: "notfound" };
  if ((posted(entries).months.get(id) || new Set()).size) return { error: "months-posted" };
  const reversed = await autoReverse(ctx, "lease", id, `Lease removed — ${lease.name}`);
  if (!reversed.posted && reversed.reason !== "notfound") return { error: reversed.reason };
  return (await Leases.remove(scope(ctx), id)) ? { removed: id } : { error: "notfound" };
}
