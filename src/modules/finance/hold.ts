// THE PAYMENT HOLD — may this bill be paid, and if not, in one sentence, why.
//
// ONE SEAM, TWO CALLERS, AND BOTH EXPENSIVE HALVES WERE ALREADY WRITTEN.
// Procurement computes whether an order's three documents agree
// (`threeWayMatch`) and whether a supplier's paperwork is in date
// (`supplierQualification`). Finance pays. Nothing joined them, so both were
// advisory and the one act that moves money asked neither — Inventory refused to
// PLACE an order with a lapsed supplier while Finance would happily PAY one.
//
// A POLICY OVER TWO ANSWERS, NOT A THIRD COMPUTATION. This takes the RESULTS of
// those two functions rather than the documents behind them, so it reimplements
// neither and has no imports at all: the payables service reads the records and
// asks both, and this decides what their answers mean for a payment. Pure, so
// `tests/hold-model.mjs` asserts it without a database and the screen shows
// exactly what the pay door refuses.

export const HOLD_MODES = ["off", "warn", "block"] as const;
export type HoldMode = (typeof HOLD_MODES)[number];

export type HoldSettings = { mode: HoldMode; tolerancePct: number; toleranceAmount: number };

/**
 * OFF BY DEFAULT, and that is the whole rollout decision.
 *
 * Every precedent in this codebase says so and each was paid for:
 * `supplierQualification` makes an unassessed supplier USABLE, because refusing
 * to buy from any of them would break every existing studio's purchasing on the
 * day it shipped; a blank expiry does not expire; the period lock refuses the
 * posting, not the document. A hold that defaulted to `block` would stop real
 * payments in live studios over paperwork nobody had yet been asked to file.
 * `warn` is what makes it adoptable — the studio sees what WOULD be held first.
 */
export const DEFAULT_HOLD: Readonly<HoldSettings> = Object.freeze({ mode: "off", tolerancePct: 0, toleranceAmount: 0 });

/**
 * WHY A PAYMENT IS HELD.
 *
 * THE SUPPLIER REASONS ARE INVENTORY'S REFUSAL, VERBATIM. `createOrder` answers
 * `supplier-${qualification.reason}`, so a studio meets one vocabulary for a
 * blocked supplier whichever end of the flow it hits — a second word for the
 * same fact is how two screens come to disagree about whether a supplier is
 * usable. The match reasons are `threeWayMatch`'s own flag names, prefixed.
 */
export type HoldReason =
  | "supplier-suspended"
  | "supplier-rejected"
  | "supplier-document-expired"
  | "match-billed-not-received"
  | "match-over-billed";

export type HoldRelease = { byCollaboratorId: string; reason: string; at: string; reasons: HoldReason[] };

export type PaymentHold = {
  mode: HoldMode;
  /** Everything against this bill, whatever the mode — `warn` shows these without refusing. */
  reasons: HoldReason[];
  /** Block mode, at least one reason, and no release covering every one of them. */
  held: boolean;
  /** A release stands and covers every current reason. */
  released: boolean;
  /** Who gave that release — the one person who may not now record the payment. */
  releasedBy: string;
  /** Billed minus received, when there was an order to match and it was over. */
  variance: number | null;
  /** The tolerance that applied to that variance. */
  allowed: number | null;
};

export type HoldInput = {
  bill: { orderId?: unknown; holdRelease?: unknown };
  /**
   * `supplierQualification`'s answer for the supplier the bill names, or null
   * when it names none the register knows — a typed name with no register row
   * is not evidence against anybody, so it is not held.
   */
  qualification: { usable: boolean; reason: string } | null;
  /** `threeWayMatch`'s answer for the bill's order, or null when there is no order to match. */
  match: { flags: readonly string[]; variance: number | null; receivedValue: number } | null;
  settings: HoldSettings;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => (v === "" || v === null || v === undefined ? 0 : Number(v));
const text = (v: unknown) => String(v ?? "").trim();

/** What is wrong with a submitted hold setting, as sentences — empty when nothing is. */
export function holdProblems(input: unknown): string[] {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: string[] = [];
  if (!(HOLD_MODES as readonly string[]).includes(text(o.mode))) {
    out.push(`The payment hold must be one of ${HOLD_MODES.join(", ")}.`);
  }
  const pct = num(o.tolerancePct);
  if (!(Number.isFinite(pct) && pct >= 0 && pct <= 100)) out.push("The percentage tolerance must be between 0 and 100.");
  const amt = num(o.toleranceAmount);
  if (!(Number.isFinite(amt) && amt >= 0)) out.push("The amount tolerance cannot be negative.");
  return out;
}

/** A hold setting as it is stored — unknown modes fall to `off`, bad numbers to nought. */
export function cleanHold(input: unknown): HoldSettings {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const mode = (HOLD_MODES as readonly string[]).includes(text(o.mode)) ? (text(o.mode) as HoldMode) : "off";
  const pct = num(o.tolerancePct);
  const amt = num(o.toleranceAmount);
  return {
    mode,
    tolerancePct: Number.isFinite(pct) && pct >= 0 && pct <= 100 ? round2(pct) : 0,
    toleranceAmount: Number.isFinite(amt) && amt >= 0 ? round2(amt) : 0,
  };
}

/** The studio's hold, off Finance settings — the default when it has never set one. */
export function readHold(section: { settings?: Record<string, unknown> } | null | undefined): HoldSettings {
  const raw = section?.settings?.paymentHold;
  return raw ? cleanHold(raw) : { ...DEFAULT_HOLD };
}

function readRelease(v: unknown): HoldRelease | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const by = text(r.byCollaboratorId);
  const reasons = Array.isArray(r.reasons) ? r.reasons.map(String) : [];
  if (!by || !reasons.length) return null;
  return { byCollaboratorId: by, reason: text(r.reason), at: text(r.at), reasons: reasons as HoldReason[] };
}

/**
 * WHAT STANDS BETWEEN THIS BILL AND ITS PAYMENT.
 */
export function paymentHold(input: HoldInput): PaymentHold {
  const { bill, settings } = input;
  const out: PaymentHold = {
    mode: settings.mode, reasons: [], held: false, released: false, releasedBy: "", variance: null, allowed: null,
  };
  if (settings.mode === "off") return out;

  // THE SUPPLIER, WHENEVER THE BILL NAMES ONE — with or without an order. A
  // subcontractor is invoiced on a bill typed by hand with no purchase order
  // behind it; confining this check to bills that answer an order would miss
  // exactly the case it exists for, paying somebody whose insurance has lapsed.
  // An unassessed supplier is usable (see `supplierQualification`), so a studio
  // that has never touched the register is held over nothing.
  if (input.qualification && !input.qualification.usable) {
    out.reasons.push(`supplier-${input.qualification.reason}` as HoldReason);
  }

  // THE MATCH, ONLY WHEN THERE IS AN ORDER TO MATCH. Three-way matching needs
  // three documents; rent, utilities and every expense a studio pays without a
  // purchase order have one, and holding those would stop a studio's ordinary
  // payments on the morning this is switched on.
  if (text(bill.orderId) && input.match) {
    const m = input.match;
    if (m.flags.includes("billed-not-received")) {
      // NOTHING HAS ARRIVED, so no tolerance applies: a percentage of nought is
      // nought, and an absolute allowance would let a small invoice for goods
      // that never came through on the strength of being small.
      out.reasons.push("match-billed-not-received");
    } else if (m.variance !== null && m.variance > 0) {
      // TWO DIALS, AND THE VARIANCE PASSES INSIDE EITHER — the greater of the
      // two. A percentage alone lets a large order drift by a lot of money; an
      // absolute alone is wrong across order sizes. The floor absorbs rounding
      // on a small order and a large one is still held to a proportion. Only
      // OVER-billing is held: a supplier charging less than was delivered is
      // somebody else's problem to chase.
      const allowed = Math.max(settings.toleranceAmount, round2(m.receivedValue * (settings.tolerancePct / 100)));
      out.variance = m.variance;
      out.allowed = allowed;
      if (m.variance > allowed) out.reasons.push("match-over-billed");
    }
  }

  // A RELEASE COVERS THE REASONS IT WAS GIVEN FOR AND NO OTHERS. A supplier
  // whose certificate lapses after somebody released an over-billing is held
  // again, because nobody signed for that.
  const release = readRelease(bill.holdRelease);
  if (release && out.reasons.length && out.reasons.every((r) => release.reasons.includes(r))) {
    out.released = true;
    out.releasedBy = release.byCollaboratorId;
  }
  out.held = settings.mode === "block" && out.reasons.length > 0 && !out.released;
  return out;
}

/**
 * WHY THIS RELEASE IS REFUSED, or null.
 *
 * A reason is required — the period-reopening rule exactly: a hold overridden
 * without one is a hold that never happened, and the reason is the only thing
 * that makes the override auditable afterwards. `warn` has nothing to release.
 */
export function releaseProblem(hold: PaymentHold, reason: unknown): string | null {
  if (hold.mode !== "block" || !hold.reasons.length) return "not-held";
  if (hold.released) return "already-released";
  if (!text(reason)) return "reason";
  return null;
}

/**
 * WHY THIS PAYMENT IS REFUSED, or null.
 *
 * A RELEASE AND A PAYMENT ARE TWO SIGNATURES, and one person giving both is one
 * signature. The archetypes already keep the rights apart (`money` pays,
 * `department-head` releases); this holds the line on the record too, the way
 * invariant 7 is enforced at the transition rather than in the permission model
 * — holding both rights is legitimate, using both on one bill is not.
 */
export function payProblem(hold: PaymentHold, payerCollaboratorId: string): string | null {
  if (hold.held) return "held";
  if (hold.released && hold.releasedBy === payerCollaboratorId) return "released-by-payer";
  return null;
}
