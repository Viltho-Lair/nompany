// WHAT A PROJECT MAY BILL, WHAT IT HAS BILLED, AND WHAT IS BEING HELD BACK —
// pure, so the screen and the server arrive at the same figures from the same
// function.
//
// THE GAP THIS CLOSES, and it is the mirror of the one `costing.ts` opens with.
// Four slices built the COST side of a project in full: an allowance per code,
// what has been ordered, what has been invoiced, and earned value over the top
// of all three. The REVENUE side stayed a single number — `value`, set at
// handover or when the project opened — with nothing saying when any of it
// might be claimed. So a project could tell a studio it was twelve per cent
// over on Plant and could not tell it what had been billed, which is the half
// that decides whether there is any money to be over WITH.
//
// AND RETENTION EXISTED NOWHERE AT ALL. Money earned, invoiced, and
// deliberately not yet payable is a state a single `value` cannot express, and
// a studio that reads its invoiced total as its expected cash is wrong by
// exactly the amount its clients are holding.
//
// NO IMPORTS, deliberately, and asserted by a test.

export type Milestone = {
  id?: unknown;
  code?: unknown;
  name?: unknown;
  amount?: unknown;
  dueDate?: unknown;
  status?: unknown;
  sortOrder?: unknown;
};

/** Only what an invoice has to expose for this to sum. */
export type BilledInvoice = {
  milestoneId?: unknown;
  /** The progress claim it bills (tier 6), when it bills one. */
  claimId?: unknown;
  projectId?: unknown;
  status?: unknown;
  total?: unknown;
};

/**
 * A MILESTONE THAT MAY BE CLAIMED. `Ready` is the studio saying the work behind
 * this line is done; `Pending` is everything before that. There is deliberately
 * no `Invoiced` value — whether a milestone has been billed is DERIVED from the
 * invoices that name it, never stored, because a stored flag and a real invoice
 * are two answers and they part company the first time one is cancelled.
 */
export const MILESTONE_STATUSES = ["Pending", "Ready"] as const;

/**
 * AN INVOICE THAT IS NOT A CLAIM. `Draft` has been shown to nobody and
 * `Cancelled` was withdrawn, so counting either would tell a studio it had
 * asked for money it has not asked for. Mirrors `NOT_SPEND` on the cost side,
 * for the same reason and with the same two members.
 */
const NOT_CLAIMED = new Set(["Draft", "Cancelled"]);

/** Money actually in the bank, as opposed to money asked for. */
const SETTLED = new Set(["Paid"]);

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const text = (v: unknown) => String(v ?? "");

export const isClaimed = (inv: BilledInvoice | null | undefined): boolean =>
  Boolean(inv) && !NOT_CLAIMED.has(text(inv?.status));

export const isSettled = (inv: BilledInvoice | null | undefined): boolean =>
  Boolean(inv) && SETTLED.has(text(inv?.status));

export type MilestoneRollUp = {
  id: string;
  code: string;
  name: string;
  amount: number;
  dueDate: string;
  /** What the studio stored: Pending or Ready. */
  status: string;
  /** Billed against this milestone, excluding drafts and cancellations. */
  invoiced: number;
  /** Of that, settled. */
  paid: number;
  /** Amount less invoiced. NEGATIVE when more was billed than the line allows. */
  remaining: number;
  /** Nothing billed yet, part billed, or billed in full. Derived, never stored. */
  billed: "none" | "part" | "full";
  /**
   * Marked Ready and not yet billed in full — work the studio has done and not
   * asked to be paid for. This is the number the screen exists to surface.
   */
  claimable: number;
  /**
   * Past its due date and not billed in full. NOT an error: a milestone slips
   * for real reasons. It is separated from `claimable` because the two are
   * acted on differently — one is an invoice to raise, the other a date to
   * explain.
   */
  overdue: boolean;
};

export type Retention = {
  /** The agreed percentage, 0 when the contract has none. */
  percent: number;
  /**
   * Withheld from what has been billed. ZERO IS A REAL ANSWER here — a contract
   * with no retention withholds nothing — which is why this is not nullable the
   * way `releasable` is.
   */
  held: number;
  /** Invoiced less held: what the studio can actually expect to be paid. */
  net: number;
  /**
   * Held money the studio may now ask for, or NULL when nobody has said when
   * that is. Null rather than 0 because "nothing is due yet" and "we do not
   * know when anything is due" are different answers and a screen showing 0 for
   * both would say the first while meaning the second.
   */
  releasable: number | null;
  /** The defects-liability end, as stored. */
  releaseDate: string;
  /** Why `releasable` is null, or null. */
  blocked: "no-release-date" | null;
};

export type ProjectBilling = {
  milestones: MilestoneRollUp[];
  /** The project's own value, for what the schedule is measured against. */
  value: number;
  /** The sum of the milestone amounts. */
  scheduled: number;
  /**
   * Value less scheduled. Positive means the schedule does not yet account for
   * the whole job; negative means more has been scheduled than the job is
   * worth, which somebody should be looking at rather than an error. The exact
   * counterpart of `unallocated` on the cost side.
   */
  unscheduled: number;
  /** Marked Ready and not billed in full, across every milestone. */
  claimable: number;
  /** Everything billed on this project, whether or not it names a milestone. */
  invoiced: number;
  /**
   * Billed against PROGRESS CLAIMS (tier 6) — filed, just not against a
   * milestone, so it is neither schedule money nor `unattributed`.
   */
  claims: number;
  /** Of that, settled. */
  paid: number;
  /** Invoiced and not yet settled — what the client owes today. */
  outstanding: number;
  /**
   * Billed against this project and naming no milestone — or naming one
   * somebody has since deleted. REAL MONEY, and shown in its own right rather
   * than dropped: an invoice raised before the schedule existed is still an
   * invoice, and a report that hid it would understate what a client has been
   * asked for by however much nobody had filed. The counterpart of `uncoded`,
   * and it takes the same line about deletion — removing a milestone does not
   * cascade, and the invoices against it rejoin here.
   */
  unattributed: number;
  /** How much of the schedule has been billed, 0-1, or null when there is none. */
  billedFraction: number | null;
  retention: Retention;
  /** True when every Ready milestone is billed and nothing is unattributed. */
  clean: boolean;
  /**
   * Why the schedule cannot be reported on, or null. `no-schedule` means no
   * milestone has been written; the project's invoices are still summed and
   * still true, so this is a partial state rather than an empty one — the same
   * discipline `earnedValue` follows.
   */
  blocked: "no-schedule" | null;
};

export type BillingInput = {
  milestones?: readonly Milestone[];
  /** ALREADY THIS PROJECT'S — see the note on `projectBilling`. */
  invoices?: readonly BilledInvoice[];
  value?: unknown;
  retentionPercent?: unknown;
  retentionReleaseDate?: unknown;
  /** When this answer is true. Nothing here reads its own clock. */
  asOf?: unknown;
};

/**
 * WHAT IS BEING HELD BACK, AND WHETHER IT CAN BE ASKED FOR YET.
 *
 * RELEASING IT IS FINANCE'S ACT, NOT THIS FILE'S and not Projects'. Retention
 * becomes money by somebody raising an invoice for it, and Finance already owns
 * that door; growing a second invoicing path out of a project screen would be
 * two ways to bill one client. So this reports the position and names who has
 * to act on it.
 */
export function retentionOn(
  invoiced: number,
  percent: unknown,
  releaseDate: unknown,
  asOf: string,
): Retention {
  // CLAMPED, because a stored percentage is a number somebody typed. Over 100
  // would report the client withholding more than the whole invoice.
  const pct = Math.min(100, Math.max(0, num(percent)));
  const held = money(money(invoiced) * (pct / 100));
  const when = text(releaseDate).slice(0, 10);
  return {
    percent: pct,
    held,
    net: money(money(invoiced) - held),
    releasable: !when ? null : asOf && asOf >= when ? held : 0,
    releaseDate: when,
    blocked: when ? null : "no-release-date",
  };
}

/**
 * ONE PROJECT'S BILLING POSITION.
 *
 * `invoices` IS ALREADY THIS PROJECT'S, on the same terms `projectCosting`
 * states for bills: filtering by project here as well would make the caller's
 * `where` look optional, and a caller that then dropped it would report the
 * whole studio's revenue against one job.
 *
 * RETENTION IS TAKEN ON WHAT HAS BEEN BILLED, not on what has been scheduled.
 * A percentage of the schedule would report money as withheld before anybody
 * had been asked for it, which is the same error as counting an unplaced order
 * as committed.
 */
export function projectBilling(input: BillingInput): ProjectBilling {
  const rows = Array.isArray(input?.milestones) ? input.milestones : [];
  const all = Array.isArray(input?.invoices) ? input.invoices : [];
  const claimed = all.filter(isClaimed);
  const value = money(num(input?.value));
  const asOf = text(input?.asOf).slice(0, 10);

  const invoicedBy = new Map<string, number>();
  const paidBy = new Map<string, number>();
  let unattributed = 0;
  let claims = 0;
  for (const inv of claimed) {
    const id = text(inv.milestoneId);
    const amount = money(num(inv.total));
    // AN INVOICE FOR A PROGRESS CLAIM IS FILED — against the claim. Counting it
    // as unattributed would warn a studio about every certificate it billed.
    if (text(inv.claimId)) { claims = money(claims + amount); continue; }
    if (!id) { unattributed = money(unattributed + amount); continue; }
    invoicedBy.set(id, money((invoicedBy.get(id) || 0) + amount));
    if (isSettled(inv)) paidBy.set(id, money((paidBy.get(id) || 0) + amount));
  }

  // BILLED AGAINST A MILESTONE THAT NO LONGER EXISTS IS STILL BILLED. Deleting
  // a milestone cascades nothing, so its invoices keep the id and their money
  // rejoins `unattributed` — visible, rather than vanishing from the total and
  // making a project look under-billed for having tidied a list.
  const known = new Set(rows.map((m) => text(m.id)));
  for (const [id, amount] of invoicedBy) {
    if (!known.has(id)) unattributed = money(unattributed + amount);
  }

  const milestones: MilestoneRollUp[] = rows.map((m) => {
    const id = text(m.id);
    const amount = money(num(m.amount));
    const invoiced = invoicedBy.get(id) || 0;
    const status = text(m.status) || "Pending";
    const dueDate = text(m.dueDate);
    const billed: MilestoneRollUp["billed"] =
      invoiced <= 0 ? "none" : invoiced >= amount ? "full" : "part";
    return {
      id,
      code: text(m.code),
      name: text(m.name),
      amount,
      dueDate,
      status,
      invoiced,
      paid: paidBy.get(id) || 0,
      remaining: money(amount - invoiced),
      billed,
      // READY AND NOT BILLED IN FULL. A Pending milestone is not claimable
      // however overdue it is: the studio has not said the work is done.
      claimable: status === "Ready" && billed !== "full"
        ? Math.max(0, money(amount - invoiced))
        : 0,
      // A milestone with no due date cannot be late. Compared as ISO dates,
      // which sort lexically, so no parsing and no timezone.
      overdue: Boolean(dueDate) && Boolean(asOf) && dueDate < asOf && billed !== "full",
    };
  });

  const scheduled = money(milestones.reduce((n, m) => n + m.amount, 0));
  const invoiced = money(
    milestones.reduce((n, m) => n + m.invoiced, 0) + unattributed + claims);
  const paid = money(claimed.filter(isSettled).reduce((n, i) => n + num(i.total), 0));
  const claimable = money(milestones.reduce((n, m) => n + m.claimable, 0));

  return {
    milestones,
    value,
    scheduled,
    unscheduled: money(value - scheduled),
    claimable,
    invoiced,
    claims,
    paid,
    outstanding: money(invoiced - paid),
    unattributed,
    // NULL, NOT ZERO, with nothing scheduled. Nought billed against nought
    // scheduled is not "0% billed" — it is a project nobody has written a
    // payment schedule for, and an empty progress bar says the opposite.
    billedFraction: scheduled > 0 ? invoiced / scheduled : null,
    retention: retentionOn(invoiced, input?.retentionPercent, input?.retentionReleaseDate, asOf),
    clean: unattributed === 0 && claimable === 0,
    // A PARTIAL STATE, NOT AN EMPTY ONE. With no milestones the invoice totals
    // above are still real and still correct; only the schedule half is
    // missing, so it says so and returns the rest.
    blocked: rows.length ? null : "no-schedule",
  };
}
