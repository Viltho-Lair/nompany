// A STUDIO'S SUBSCRIPTION, STORED. The rules are `shared/subscription` (pure);
// this file keeps one document per studio — the subscription and its history —
// and is the ONLY writer of either.
//
// THE HISTORY IS APPEND-ONLY AND LIVES IN THE SAME DOCUMENT, so applying an
// event and recording it are one compare-and-set (invariant 8). Two documents
// would be two writes, and a crash between them leaves a payment that moved
// `paidUntil` and appears nowhere, or a history line for a payment that did not.
//
// A STUDIO WITH NO DOCUMENT PREDATES SUBSCRIPTIONS and is planted
// COMPLIMENTARY on first read (the owner, 23/09/2026) — every studio catches up
// by itself rather than through a script. A studio created from now on gets its
// trial at creation (`startTrial`), so a missing document can only ever mean an
// old studio.

import { getJSON, getJSONMany, editJSON } from "@/platform/db/store";
import { BILLING } from "@/platform/db/keys";
import { getCatalogSettings } from "@/lib/data/catalog";
import {
  applyEvent, billingDay, complimentary, newTrial, subscriptionStatus,
  type BillingEvent, type Subscription,
} from "@/shared/subscription";

export type HistoryEntry = {
  id: string;
  type: BillingEvent["type"];
  at: string;
  /** Who did it: a console user's id, "system", or "provider". */
  by: string;
  /** What the event carried, minus its id and type. */
  detail: Record<string, unknown>;
  before: Pick<Subscription, "kind" | "paidUntil" | "cancelAt" | "seats">;
  after: Pick<Subscription, "kind" | "paidUntil" | "cancelAt" | "seats">;
};

type Doc = { subscription: Subscription; history: HistoryEntry[] };

const snap = (s: Subscription) => ({ kind: s.kind, paidUntil: s.paidUntil, cancelAt: s.cancelAt, seats: s.seats });

/** The subscription and its history, planting the complimentary one an old studio is owed. */
export async function getSubscription(studioId: string): Promise<Doc> {
  const stored = await getJSON<Doc>(BILLING.subscription(studioId));
  if (stored?.subscription) return stored;
  return editJSON<Doc, Doc>(BILLING.subscription(studioId), (cur) => {
    if (cur?.subscription) return { result: cur };
    const at = new Date().toISOString();
    const doc: Doc = { subscription: complimentary({ studioId, today: billingDay(at), at }), history: [] };
    return { next: doc, result: doc };
  });
}

/**
 * A NEW STUDIO'S TRIAL, written at creation. Never overwrites: a document that
 * is already there wins, so a retried creation cannot restart somebody's trial.
 *
 * ITS LENGTH IS THE PACKAGE'S OWN DURATION when the package has one, and the
 * catalogue's trial setting otherwise. The Free card on the pricing page says
 * "Free for 3 months" FROM that duration, so reading anything else here would
 * let the page promise one length and the studio get another.
 */
export async function startTrial(studioId: string, input: { free: boolean; seats?: number; months?: number }) {
  const settings = await getCatalogSettings();
  const trialMonths = Number(input.months) > 0 ? Math.trunc(Number(input.months)) : settings.trialMonths;
  const at = new Date().toISOString();
  return editJSON<Doc, Doc>(BILLING.subscription(studioId), (cur) => {
    if (cur?.subscription) return { result: cur };
    const doc: Doc = {
      subscription: newTrial({ studioId, today: billingDay(at), trialMonths, free: input.free, seats: input.seats, at }),
      history: [],
    };
    return { next: doc, result: doc };
  });
}

/**
 * ONE EVENT, APPLIED AND RECORDED TOGETHER. An event whose id was already
 * applied changes nothing and adds no line — a webhook delivered twice, or a
 * button pressed twice, is one payment.
 */
export async function recordEvent(studioId: string, event: BillingEvent, by: string) {
  await getSubscription(studioId);
  const { graceMonths } = await getCatalogSettings();
  const at = new Date().toISOString(); // outside the closure: editJSON re-runs it per CAS round.
  const today = billingDay(at);
  return editJSON<Doc, { subscription: Subscription; changed: boolean; problem: string }>(
    BILLING.subscription(studioId),
    (cur) => {
      const doc = cur?.subscription ? cur : null;
      if (!doc) return { result: { subscription: null as unknown as Subscription, changed: false, problem: "notfound" } };
      const out = applyEvent(doc.subscription, event, today, graceMonths, at);
      if (!out.changed) return { result: { subscription: doc.subscription, changed: false, problem: out.problem } };
      const { id, type, ...detail } = event;
      const entry: HistoryEntry = { id, type, at, by, detail, before: snap(doc.subscription), after: snap(out.sub) };
      return { next: { subscription: out.sub, history: [...doc.history, entry] }, result: { subscription: out.sub, changed: true, problem: "" } };
    },
  );
}

/**
 * EVERY STUDIO'S SUBSCRIPTION IN ONE READ, for the console's table. A studio
 * with no document is SHOWN complimentary without being written here — a list
 * page planting a document per row would be a burst of writes on a read — and
 * becomes one for real the first time its own subscription is read.
 */
export async function listSubscriptions(studioIds: string[]) {
  const [docs, { graceMonths }] = await Promise.all([
    getJSONMany<Doc>(studioIds.map((id) => BILLING.subscription(id))),
    getCatalogSettings(),
  ]);
  const at = new Date().toISOString();
  const today = billingDay(at);
  return studioIds.map((studioId, i) => {
    const sub = docs[i]?.subscription || complimentary({ studioId, today, at });
    return { studioId, subscription: sub, status: subscriptionStatus(sub, today, graceMonths) };
  });
}
