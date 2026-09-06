// EXPEDITING — what is late, and who has been chased about it.
//
// GUARDED BY `procurement.expediting`, which has `view` and `edit` and nothing
// else: this screen owns no record. It reads purchase orders — which live in
// Inventory and are raised there — and appends a chase to one.
//
// THE ARITHMETIC IS IN ./expediting, which is pure, so the screen buckets the
// same orders the same way the server does.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { expediteOrders } from "./expediting";
import type { Order } from "@/modules/inventory/schema";
import type { ProcurementContext } from "./types";

const Orders = repo<Order>("materialOrders");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => str(v, 10);
const now = () => new Date().toISOString();

/**
 * WHAT IS OUTSTANDING, BUCKETED, WITH WHO HAS BEEN CHASED.
 *
 * Foreign and therefore nullable: a studio with no Inventory section has placed
 * no orders, so there is nothing to expedite — which is a real answer and not
 * an error. The screen reads as an empty board rather than a refusal.
 */
export async function listExpediting(ctx: ProcurementContext, soonDays = 7) {
  const denied = requirePermission(ctx.access, "procurement.expediting.view");
  if (denied) return denied;

  const { studio, ordersSection } = ctx;
  const asOf = now();
  if (!ordersSection) {
    return {
      view: expediteOrders([], asOf.slice(0, 10), soonDays),
      vendorNames: {},
      chasers: {},
      asOf,
      canChase: !requirePermission(ctx.access, "procurement.expediting.edit"),
    };
  }

  const [orders, people] = await Promise.all([
    Orders.find({ studio, section: ordersSection }),
    listCollaborators(studio.id),
  ]);

  // RESOLVED LIVE off the collaborator list rather than copied onto each chase:
  // somebody renamed after chasing a supplier still reads correctly on the
  // record, which a stored copy cannot do. Beside the ids, never instead.
  const chasers: Record<string, string> = {};
  for (const c of people as { id?: unknown; alias?: unknown }[]) {
    chasers[String(c?.id ?? "")] = String(c?.alias ?? "");
  }

  return {
    view: expediteOrders(orders, asOf.slice(0, 10), soonDays),
    // The chase log as stored, so the screen can show what was actually said.
    chaseLog: Object.fromEntries(orders.map((o) => [
      o.id,
      ((o as { chases?: unknown }).chases as unknown[] | undefined) || [],
    ])),
    chasers,
    // WHEN THIS ANSWER WAS TRUE. Lateness is a comparison against an instant and
    // it is this one, so the screen never reads its own clock and the same
    // request cannot disagree with itself about what is overdue.
    asOf,
    canChase: !requirePermission(ctx.access, "procurement.expediting.edit"),
  };
}

/**
 * RECORD THAT SOMEBODY CHASED, and what the supplier said.
 *
 * APPENDED, NEVER REWRITTEN, and under a FUNCTION patch (invariant 8) because
 * two people chasing the same order at once must both be recorded — a
 * read-modify-write would drop whichever landed second.
 *
 * A REVISED DATE MOVES `promisedAt` AND NEVER `expectedAt`. That is the whole
 * point of the record: the original promise is what makes the slip measurable,
 * and a supplier whose date was simply overwritten is indistinguishable from
 * one who was always on time.
 */
export async function recordChase(
  ctx: ProcurementContext, orderId: string, body: Record<string, unknown>,
) {
  const denied = requirePermission(ctx.access, "procurement.expediting.edit");
  if (denied) return denied;

  const { studio, ordersSection, collaborator } = ctx;
  if (!ordersSection) return { error: "no-inventory" };

  const order = await Orders.byId({ studio, section: ordersSection }, orderId);
  if (!order) return { error: "notfound" };

  // CHASING SOMETHING NOBODY IS WAITING FOR IS NOT A CHASE. A draft was never
  // placed, a cancelled order was withdrawn, and a received one has arrived —
  // recording a telephone call against any of the three would put a note on a
  // conversation that cannot have happened.
  const status = String(order.status || "");
  if (status === "Draft" || status === "Cancelled" || status === "Received") {
    return { error: "not-outstanding" };
  }

  const note = str(body?.note, 1000);
  const promisedAt = day(body?.promisedAt);
  // A CHASE THAT SAYS NOTHING AND MOVES NOTHING IS NOT A RECORD. Somebody who
  // rang and got no answer should write that down; a blank row teaches the next
  // reader nothing and inflates the chase count, which is a number this screen
  // asks people to act on.
  if (!note && !promisedAt) return { error: "empty" };

  // CAPTURED ONCE, outside the patch: `updateRow` may invoke the function more
  // than once under contention or once per store under NOMPANY_DB=parity, and a
  // fresh `new Date()` inside would disagree between invocations.
  const at = now();
  const chase = {
    at: at.slice(0, 10),
    byCollaboratorId: collaborator.id,
    note,
    promisedAt,
  };

  const updated = await Orders.update({ studio, section: ordersSection }, orderId, (current) => {
    const existing = ((current as { chases?: unknown }).chases as typeof chase[] | undefined) || [];
    return {
      chases: [...existing, chase],
      // ONLY WHERE THEY ACTUALLY PROMISED SOMETHING. A chase with no new date
      // leaves the promise where it was rather than blanking it, so "we rang and
      // they did not commit" does not silently un-date the order.
      ...(promisedAt ? { promisedAt } : {}),
    };
  });

  return updated ? { order: updated } : { error: "notfound" };
}
