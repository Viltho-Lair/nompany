// GOODS RECEIVED NOTES AND THE THREE-WAY MATCH — what was ordered, what turned
// up, and what the supplier is charging for.
//
// TWO OF THE THREE LEGS ALREADY EXISTED and one did not. A purchase order has
// carried `lines[].qty` since it was built, and a bill has carried `orderId`
// since Payables shipped. What was missing is the middle: receiving incremented
// `line.received` and wrote a stock movement, so the studio knew a RUNNING
// TOTAL and nothing about the events that produced it. "What arrived on
// Tuesday, who signed for it, and was any of it damaged" had no answer, and a
// receipt entered by mistake could not be corrected — `receiveOrder` only ever
// adds, and refuses over-receipt outright.
//
// THE MATCH IS A JOIN, NOT NEW DATA, exactly as earned value was. Nothing here
// is stored: the three legs are read and compared on every request, because a
// stored verdict is a verdict that goes stale the moment a credit note lands.
//
// NO IMPORTS, deliberately, and asserted by a test — the screen flags what the
// server flags, with one implementation between them.

export type ReceiptLine = {
  itemId?: unknown;
  qty?: unknown;
  /** Rejected on arrival: damaged, wrong item, short-dated. Never added to stock. */
  rejected?: unknown;
  note?: unknown;
};

export type GoodsReceipt = {
  id?: unknown;
  reference?: unknown;
  orderId?: unknown;
  /** The supplier's own delivery-note number, so the two can be reconciled. */
  supplierRef?: unknown;
  receivedAt?: unknown;
  receivedByCollaboratorId?: unknown;
  lines?: unknown;
  notes?: unknown;
  /** A correction reverses an earlier receipt; its quantities are negative. */
  correctionOf?: unknown;
};

export type MatchableOrderLine = {
  itemId?: unknown;
  description?: unknown;
  qty?: unknown;
  unitPrice?: unknown;
  received?: unknown;
};

export type MatchableOrder = {
  id?: unknown;
  reference?: unknown;
  vendorId?: unknown;
  status?: unknown;
  lines?: unknown;
};

export type MatchableBillLine = {
  qty?: unknown;
  unitPrice?: unknown;
};

export type MatchableBill = {
  id?: unknown;
  reference?: unknown;
  orderId?: unknown;
  status?: unknown;
  lines?: unknown;
};

const text = (v: unknown) => String(v ?? "");
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
/** Money, to the cent. Compared, so it must round the same way every time. */
const money = (n: number) => Math.round(n * 100) / 100;
/** Quantities carry three decimals here, matching `receiveOrder`. */
const q3 = (n: number) => Math.round(n * 1000) / 1000;

/** A bill that no longer stands. Cancelled money is not billed money. */
const DEAD_BILL = new Set(["Cancelled", "Draft"]);

/**
 * WHAT A BILL IS CHARGING, SUMMED FROM ITS LINES.
 *
 * NOT `bill.total`, WHICH IS NOT A STORED FIELD. `InvoiceLineSchema`'s own
 * comment says it: the total is derived on the way out and never written down,
 * so a stored bill read straight from the repository has no `total` at all —
 * reading one gives `undefined`, which sums as nought, which makes every order
 * look under-billed and the over-billed flag unreachable. Gate A caught exactly
 * that; a unit test handed a `total` could not have.
 *
 * AND SUMMING THE LINES IS THE RIGHT COMPARISON ANYWAY, not merely the
 * available one. It is NET OF VAT, and the received leg is quantity times the
 * order's unit price, which is also net. Comparing a tax-inclusive total
 * against a tax-exclusive delivery would flag every order in a VAT-charging
 * studio as over-billed by exactly the tax.
 */
function billValue(bill: MatchableBill): number {
  const lines = (Array.isArray(bill?.lines) ? bill.lines : []) as MatchableBillLine[];
  return money(lines.reduce((s, l) => s + num(l.qty) * num(l.unitPrice), 0));
}

/**
 * WHAT A RECEIPT MAY RECORD.
 *
 * A correction is the one thing allowed to be negative, and it must say which
 * receipt it corrects — a bare negative line is indistinguishable from a typo,
 * and the whole reason this record exists is that the running total could not
 * be walked back.
 */
export function receiptProblem(
  receipt: GoodsReceipt,
  order: MatchableOrder | null | undefined,
): string | null {
  if (!order) return "notfound";
  const status = text(order.status);
  if (status === "Draft") return "not-ordered";
  if (status === "Cancelled") return "cancelled";

  const lines = (Array.isArray(receipt?.lines) ? receipt.lines : []) as ReceiptLine[];
  const real = lines.filter((l) => num(l.qty) !== 0 || num(l.rejected) !== 0);
  if (!real.length) return "nothing";

  const correction = Boolean(text(receipt?.correctionOf));
  for (const l of real) {
    // A NEGATIVE QUANTITY IS A CORRECTION AND NOTHING ELSE. Allowing one on an
    // ordinary receipt would make "we got ten" and "cancel the ten I typed"
    // the same document, and the register could no longer be read as a history
    // of what turned up.
    if (!correction && (num(l.qty) < 0 || num(l.rejected) < 0)) return "negative";
    if (correction && num(l.qty) > 0) return "correction-positive";
  }
  if (!text(receipt?.receivedAt)) return "date";
  return null;
}

export type MatchedLine = {
  itemId: string;
  description: string;
  orderedQty: number;
  receivedQty: number;
  rejectedQty: number;
  unitPrice: number;
  /** Ordered value, and the value of what actually arrived and was accepted. */
  orderedValue: number;
  receivedValue: number;
  outstandingQty: number;
  /** Received beyond what was ordered. Nought is the ordinary case. */
  overReceivedQty: number;
};

export type MatchFlag =
  | "over-billed"
  | "billed-not-received"
  | "over-received"
  | "received-not-billed"
  | "no-bill"
  | "part-delivered";

export type ThreeWayMatch = {
  orderId: string;
  reference: string;
  vendorId: string;
  lines: MatchedLine[];
  orderedValue: number;
  receivedValue: number;
  /**
   * What the supplier has actually invoiced against this order, cancelled and
   * draft bills excluded. NULL when no bill names the order at all — "nothing
   * has been invoiced" and "invoiced for nought" are different facts, and only
   * the second is a mistake.
   */
  billedValue: number | null;
  billCount: number;
  /** billed − received, positive when the supplier is charging for more than turned up. */
  variance: number | null;
  /** True only when all three legs agree to the cent. */
  matched: boolean;
  flags: MatchFlag[];
  rejectedQty: number;
  fullyReceived: boolean;
};

/**
 * ORDER, RECEIPTS AND BILLS, COMPARED.
 *
 * THE RECEIVED LEG IS SUMMED FROM THE RECEIPTS, not read off `line.received`.
 * The order carries a running total and the receipts are the events that
 * produced it; reading the total here would make the match blind to exactly the
 * bug it exists to catch — two records of one quantity drifting apart. A test
 * asserts they agree, which is the only way that check means anything.
 *
 * REJECTED GOODS ARE NOT RECEIVED GOODS. Something turned away at the gate was
 * never accepted, so it is excluded from the received value and reported
 * separately: an invoice covering it is over-billing, and a match that counted
 * it would say the paperwork was fine.
 */
export function threeWayMatch(
  order: MatchableOrder,
  receipts: unknown,
  bills: unknown,
): ThreeWayMatch {
  const orderId = text(order?.id);
  const orderLines = (Array.isArray(order?.lines) ? order.lines : []) as MatchableOrderLine[];

  const mine = (Array.isArray(receipts) ? receipts : [])
    .filter((r) => text((r as GoodsReceipt)?.orderId) === orderId) as GoodsReceipt[];

  const receivedBy = new Map<string, number>();
  const rejectedBy = new Map<string, number>();
  for (const r of mine) {
    for (const l of (Array.isArray(r.lines) ? r.lines : []) as ReceiptLine[]) {
      const id = text(l.itemId);
      receivedBy.set(id, q3((receivedBy.get(id) || 0) + num(l.qty)));
      rejectedBy.set(id, q3((rejectedBy.get(id) || 0) + num(l.rejected)));
    }
  }

  const lines: MatchedLine[] = orderLines.map((l) => {
    const itemId = text(l.itemId);
    const orderedQty = num(l.qty);
    const receivedQty = receivedBy.get(itemId) || 0;
    const rejectedQty = rejectedBy.get(itemId) || 0;
    const unitPrice = num(l.unitPrice);
    return {
      itemId,
      description: text(l.description),
      orderedQty,
      receivedQty,
      rejectedQty,
      unitPrice,
      orderedValue: money(orderedQty * unitPrice),
      receivedValue: money(receivedQty * unitPrice),
      outstandingQty: q3(Math.max(0, orderedQty - receivedQty)),
      overReceivedQty: q3(Math.max(0, receivedQty - orderedQty)),
    };
  });

  const live = (Array.isArray(bills) ? bills : [])
    .filter((b) => text((b as MatchableBill)?.orderId) === orderId)
    .filter((b) => !DEAD_BILL.has(text((b as MatchableBill)?.status))) as MatchableBill[];

  const orderedValue = money(lines.reduce((s, l) => s + l.orderedValue, 0));
  const receivedValue = money(lines.reduce((s, l) => s + l.receivedValue, 0));
  const billedValue = live.length
    ? money(live.reduce((s, b) => s + billValue(b), 0))
    : null;

  const flags: MatchFlag[] = [];
  const rejectedQty = q3([...rejectedBy.values()].reduce((s, n) => s + n, 0));
  const fullyReceived = lines.length > 0 && lines.every((l) => l.outstandingQty === 0);

  if (billedValue === null) {
    // NOT A FAULT. Goods arrive before the invoice does, every time.
    flags.push("no-bill");
    if (receivedValue > 0) flags.push("received-not-billed");
  } else {
    if (billedValue > receivedValue) {
      // THE FLAG THE WHOLE CONTROL EXISTS FOR: being charged for more than
      // turned up. Reported whether the excess is over-delivery, a rejected
      // pallet, or an invoice for goods still on a lorry.
      flags.push("over-billed");
      if (receivedValue === 0) flags.push("billed-not-received");
    }
  }
  if (lines.some((l) => l.overReceivedQty > 0)) flags.push("over-received");
  if (!fullyReceived && receivedValue > 0) flags.push("part-delivered");

  return {
    orderId,
    reference: text(order?.reference),
    vendorId: text(order?.vendorId),
    lines,
    orderedValue,
    receivedValue,
    billedValue,
    billCount: live.length,
    variance: billedValue === null ? null : money(billedValue - receivedValue),
    // MATCHED MEANS ALL THREE AGREE. An order with no bill is not matched — it
    // is unfinished, which is a different thing and reads differently on screen.
    matched: billedValue !== null
      && billedValue === receivedValue
      && fullyReceived
      && rejectedQty === 0,
    flags,
    rejectedQty,
    fullyReceived,
  };
}

/**
 * THE QUANTITY A RECEIPT MAY STILL ACCEPT on one line, given what the receipts
 * so far have already taken. Shared with the screen so it offers exactly what
 * the server will accept.
 *
 * OVER-RECEIPT IS STILL REFUSED AT THE WRITE, by `receiveOrder`, and that
 * decision is not overturned here: its own comment says a mismatch with the
 * delivery note is something a human needs to look at, which is right. What
 * this model does is REPORT it, because the stored data can still reach that
 * state — a correction against one line and a fresh receipt against another
 * get there without any single write ever exceeding what was outstanding. A
 * report that could not describe a state the store can hold would be the
 * blind spot, not the guard.
 */
export function remainingOn(order: MatchableOrder, receipts: unknown, itemId: unknown): number {
  const match = threeWayMatch(order, receipts, []);
  const line = match.lines.find((l) => l.itemId === text(itemId));
  return line ? line.outstandingQty : 0;
}
