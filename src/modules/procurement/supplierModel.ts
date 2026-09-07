// WHETHER A SUPPLIER MAY BE USED, AND HOW THEY HAVE ACTUALLY PERFORMED.
//
// THE PAYOFF OF A DECISION MADE TWO SLICES AGO. `expediting.ts` refused to let
// a re-promise overwrite `expectedAt`, and said why: "that fact is the entire
// input to supplier rating". This is the file that spends it. On-time is
// measured against the ORIGINAL promise and never the revised one — measuring
// against the current promise would mean a supplier who re-promised four times
// scores a hundred per cent, and re-promising would become the way to look
// reliable rather than the way to be seen slipping.
//
// QUALIFICATION IS DERIVED, NEVER STORED. What a person decides is stored — an
// approval, a rejection, the reason. What that decision AMOUNTS TO today is
// computed at `asOf`, because a trade licence expires on its own and no
// business event fires when it does. A stored "Qualified" flag would need a
// nightly job to stay honest, and the day that job failed the studio would go
// on buying from a supplier whose insurance lapsed in March. There is no such
// job and there does not need to be.
//
// NO IMPORTS, deliberately, and asserted by a test — the screen decides what it
// may offer with the same function the server refuses with.

export type SupplierDocument = {
  /** Trade licence, insurance, an ISO certificate — the studio's own word for it. */
  kind?: unknown;
  reference?: unknown;
  issuedAt?: unknown;
  /** Blank means it does not expire. See `documentState`. */
  expiresAt?: unknown;
  /** The uploaded file, where there is one. */
  mediaId?: unknown;
};

export type QualifiableSupplier = {
  id?: unknown;
  name?: unknown;
  /** What a PERSON decided: Unassessed / Approved / Suspended / Rejected. */
  approvalStatus?: unknown;
  approvalReason?: unknown;
  approvedAt?: unknown;
  approvedByCollaboratorId?: unknown;
  documents?: unknown;
};

export type SupplierScorecard = {
  id?: unknown;
  vendorId?: unknown;
  periodEnd?: unknown;
  /** 1-5 each, or blank where nobody scored that axis. */
  workmanship?: unknown;
  hse?: unknown;
  responsiveness?: unknown;
  note?: unknown;
};

export type RateableOrder = {
  id?: unknown;
  vendorId?: unknown;
  status?: unknown;
  /** What was promised when the order was placed. Never overwritten. */
  expectedAt?: unknown;
  /** The current promise, where it moved. */
  promisedAt?: unknown;
  receivedAt?: unknown;
};

export const APPROVAL_STATUSES = ["Unassessed", "Approved", "Suspended", "Rejected"] as const;

/** A decision that stops the studio buying, as opposed to one that permits it. */
const BLOCKING = new Set(["Suspended", "Rejected"]);

const text = (v: unknown) => String(v ?? "");
const day = (v: unknown) => text(v).slice(0, 10);
const num = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * WHOLE DAYS BETWEEN TWO ISO DATES, positive when `to` is after `from`.
 * The same UTC-midnight parse `expediting.ts` uses and for the same reason: a
 * studio in Amman and a server in Iowa must agree about whether a licence
 * expired yesterday or expires today.
 */
export function daysUntil(from: unknown, to: unknown): number | null {
  const a = day(from);
  const b = day(to);
  if (!a || !b) return null;
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms / 86400000);
}

export type DocumentState = "valid" | "expiring" | "expired" | "undated";

export type AssessedDocument = {
  kind: string;
  reference: string;
  issuedAt: string;
  expiresAt: string;
  mediaId: string;
  /** Days until it expires, negative once it has. Null when it carries no date. */
  daysLeft: number | null;
  state: DocumentState;
};

/**
 * A BLANK EXPIRY DOES NOT EXPIRE, and that is a deliberate choice rather than
 * an oversight. Treating an absent date as lapsed would disqualify every
 * supplier in the register on the day this shipped, which is not a safety
 * feature — it is a screen nobody can act on. `undated` is its own state so a
 * studio can see the difference between a document that is in date and one
 * nobody put a date on.
 */
export function documentState(doc: SupplierDocument, asOf: unknown, expiringDays = 30): AssessedDocument {
  const expiresAt = day(doc?.expiresAt);
  const daysLeft = expiresAt ? daysUntil(asOf, expiresAt) : null;
  return {
    kind: text(doc?.kind),
    reference: text(doc?.reference),
    issuedAt: day(doc?.issuedAt),
    expiresAt,
    mediaId: text(doc?.mediaId),
    daysLeft,
    state: daysLeft === null
      ? "undated"
      : daysLeft < 0
        ? "expired"
        : daysLeft <= expiringDays
          ? "expiring"
          : "valid",
  };
}

export type QualificationState = "blocked" | "unassessed" | "lapsed" | "expiring" | "qualified";

export type Qualification = {
  state: QualificationState;
  /**
   * WHETHER AN ORDER MAY BE PLACED. `unassessed` is USABLE, which is the whole
   * rollout decision: a studio that has never opened this screen has a register
   * full of suppliers nobody has assessed, and refusing to buy from any of them
   * would break every existing studio's purchasing on the day this shipped.
   * Qualification only bites once somebody has actually used it — a supplier
   * SOMEBODY suspended, or one whose document lapsed after being approved.
   */
  usable: boolean;
  /** Why, as a token the screen turns into a sentence in its own language. */
  reason: "" | "suspended" | "rejected" | "never-assessed" | "document-expired" | "document-expiring";
  /** What the person who decided actually wrote, where they wrote anything. */
  note: string;
  documents: AssessedDocument[];
  expired: AssessedDocument[];
  expiring: AssessedDocument[];
  /** The soonest expiry still ahead, so a register sorts by what needs chasing. */
  nextExpiryAt: string;
  nextExpiryDays: number | null;
};

/**
 * WHAT A SUPPLIER'S PAPERWORK AND ASSESSMENT AMOUNT TO, as at `asOf`.
 *
 * A PERSON'S DECISION BEATS THE PAPERWORK IN ONE DIRECTION ONLY. Suspending or
 * rejecting blocks regardless of how good the documents are, because that is a
 * judgement about the supplier and not about their filing. Approving does NOT
 * override a lapsed document the other way: a studio that approved a supplier
 * in January did so on the strength of an insurance certificate, and the
 * approval cannot outlive the thing it was based on.
 */
export function supplierQualification(
  supplier: QualifiableSupplier | null | undefined,
  asOf: unknown,
  expiringDays = 30,
): Qualification {
  const status = text(supplier?.approvalStatus) || "Unassessed";
  const note = text(supplier?.approvalReason);
  const docs = (Array.isArray(supplier?.documents) ? supplier?.documents : []) as SupplierDocument[];
  const assessed = docs.map((d) => documentState(d, asOf, expiringDays));
  const expired = assessed.filter((d) => d.state === "expired");
  const expiring = assessed.filter((d) => d.state === "expiring");

  const ahead = assessed
    .filter((d) => d.daysLeft !== null && d.daysLeft >= 0)
    .sort((a, b) => (a.daysLeft as number) - (b.daysLeft as number));

  const base = {
    note,
    documents: assessed,
    expired,
    expiring,
    nextExpiryAt: ahead[0]?.expiresAt || "",
    nextExpiryDays: ahead[0]?.daysLeft ?? null,
  };

  if (BLOCKING.has(status)) {
    return {
      ...base,
      state: "blocked",
      usable: false,
      reason: status === "Rejected" ? "rejected" : "suspended",
    };
  }
  if (status !== "Approved") {
    return { ...base, state: "unassessed", usable: true, reason: "never-assessed" };
  }
  if (expired.length) {
    return { ...base, state: "lapsed", usable: false, reason: "document-expired" };
  }
  if (expiring.length) {
    // STILL USABLE. A certificate lapsing in three weeks is a reminder, not a
    // stop — refusing here would halt purchasing over paperwork that is still
    // valid today, which is the fastest way to have the whole feature switched
    // off by a studio that needs to buy something.
    return { ...base, state: "expiring", usable: true, reason: "document-expiring" };
  }
  return { ...base, state: "qualified", usable: true, reason: "" };
}

export type OnTimeRecord = {
  /** Orders with both an original promise and a receipt — the only judgeable ones. */
  judged: number;
  onTime: number;
  /** Null when nothing is judgeable. Nought is a real answer and means every order was late. */
  percent: number | null;
  /** Average days late across the judged orders, null when there are none. */
  averageDaysLate: number | null;
  worstDaysLate: number | null;
  /** Orders whose promise moved at least once, judged or not. */
  rePromised: number;
  /** Still open, so not yet judgeable either way. */
  outstanding: number;
};

/**
 * HOW OFTEN A SUPPLIER TURNED UP WHEN THEY SAID THEY WOULD.
 *
 * MEASURED AGAINST `expectedAt`, THE ORIGINAL PROMISE. See the file header:
 * measuring against `promisedAt` would score a supplier who re-promised four
 * times as perfectly punctual. `rePromised` is reported beside the percentage
 * rather than folded into it, because "arrived on the day they first said" and
 * "moved the date three times and then arrived on the last one" are different
 * facts and a single number cannot hold both.
 *
 * AN ORDER WITH NO ORIGINAL DATE IS NOT COUNTED AS LATE. Nobody promised
 * anything, so there is nothing to have missed, and counting it against the
 * supplier would punish the studio's own record-keeping.
 */
export function supplierOnTime(orders: unknown, vendorId: unknown): OnTimeRecord {
  const id = text(vendorId);
  const rows = (Array.isArray(orders) ? orders : []).filter(
    (o) => text((o as RateableOrder)?.vendorId) === id,
  ) as RateableOrder[];

  let judged = 0;
  let onTime = 0;
  let totalLate = 0;
  let worst: number | null = null;
  let rePromised = 0;
  let outstanding = 0;

  for (const o of rows) {
    const expectedAt = day(o.expectedAt);
    const promisedAt = day(o.promisedAt);
    const receivedAt = day(o.receivedAt);
    const status = text(o.status);

    if (promisedAt && expectedAt && promisedAt !== expectedAt) rePromised += 1;
    if (status === "Draft" || status === "Cancelled") continue;
    if (!receivedAt) {
      outstanding += 1;
      continue;
    }
    if (!expectedAt) continue;

    judged += 1;
    const late = daysUntil(expectedAt, receivedAt) ?? 0;
    if (late <= 0) {
      onTime += 1;
    } else {
      totalLate += late;
      if (worst === null || late > worst) worst = late;
    }
  }

  return {
    judged,
    onTime,
    // NULL RATHER THAN NOUGHT when nothing is judgeable. "No orders have landed
    // yet" and "every order was late" are opposite facts and read identically
    // as a 0% bar.
    percent: judged > 0 ? Math.round((onTime / judged) * 100) : null,
    averageDaysLate: judged > 0 ? Math.round((totalLate / judged) * 10) / 10 : null,
    worstDaysLate: worst,
    rePromised,
    outstanding,
  };
}

export type ScoreAxis = "workmanship" | "hse" | "responsiveness";
// THE TOKEN IS `workmanship`, NOT `quality`, AND THAT IS LOAD-BEARING.
// The other word is a RETIRED SECTION KEY, and `testNoRetiredSectionKeySurvivesInSource`
// greps every source file for the quoted literal — because one left behind in a
// module looks up a section that no longer exists, `getSectionByKey` returns
// null, and every call site reads that as an empty screen with no error. The
// grep cannot tell a scorecard axis from a section lookup and should not try.
// Renaming it back breaks the build; the English label is chosen freely on
// display, the way every status in this product is.
export const SCORE_AXES: ScoreAxis[] = ["workmanship", "hse", "responsiveness"];

export type ScoredRecord = {
  count: number;
  /** Mean per axis over every scorecard that scored it. Null where none did. */
  average: Record<ScoreAxis, number | null>;
  /** The most recent scorecard's own scores, so improvement is visible. */
  latest: Record<ScoreAxis, number | null>;
  latestPeriodEnd: string;
  /** Mean of whichever axes were scored at all, null when none were. */
  overall: number | null;
};

/**
 * WHAT PEOPLE THOUGHT, as opposed to what the orders show.
 *
 * THE AVERAGE AND THE LATEST ARE BOTH REPORTED, because an average over three
 * years cannot tell a studio that a supplier fixed itself in June. A register
 * showing only the mean keeps punishing a supplier for a bad year they have
 * already corrected, and one showing only the latest forgets a decade of
 * trouble because the last job went well.
 */
export function supplierScores(scorecards: unknown, vendorId: unknown): ScoredRecord {
  const id = text(vendorId);
  const rows = (Array.isArray(scorecards) ? scorecards : [])
    .filter((s) => text((s as SupplierScorecard)?.vendorId) === id)
    .slice()
    .sort((a, b) => day((a as SupplierScorecard)?.periodEnd)
      .localeCompare(day((b as SupplierScorecard)?.periodEnd))) as SupplierScorecard[];

  const average = {} as Record<ScoreAxis, number | null>;
  const latest = {} as Record<ScoreAxis, number | null>;
  const last = rows[rows.length - 1];

  for (const axis of SCORE_AXES) {
    const vals = rows.map((r) => num(r[axis])).filter((n): n is number => n !== null);
    average[axis] = vals.length
      ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      : null;
    latest[axis] = last ? num(last[axis]) : null;
  }

  const scored = SCORE_AXES.map((a) => average[a]).filter((n): n is number => n !== null);
  return {
    count: rows.length,
    average,
    latest,
    latestPeriodEnd: day(last?.periodEnd),
    overall: scored.length
      ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10
      : null,
  };
}

export type SupplierPosition = {
  vendorId: string;
  qualification: Qualification;
  onTime: OnTimeRecord;
  scores: ScoredRecord;
};

/**
 * EVERYTHING KNOWN ABOUT ONE SUPPLIER, and DELIBERATELY NOT ONE NUMBER.
 *
 * There is no blended score here and that is the design. "How often they turned
 * up" is measured from orders the studio placed; "what the site thought of the
 * work" is somebody's opinion typed into a scorecard. Averaging the two
 * produces a figure whose meaning depends on which half moved, which is the
 * same objection this codebase already records against showing `costing.
 * forecast` and `earned.eac` under one label. The register shows both columns.
 */
export function supplierPosition(
  supplier: QualifiableSupplier,
  orders: unknown,
  scorecards: unknown,
  asOf: unknown,
  expiringDays = 30,
): SupplierPosition {
  const vendorId = text(supplier?.id);
  return {
    vendorId,
    qualification: supplierQualification(supplier, asOf, expiringDays),
    onTime: supplierOnTime(orders, vendorId),
    scores: supplierScores(scorecards, vendorId),
  };
}

/**
 * WHAT THE SERVER REFUSES, so the screen can refuse the same things without a
 * second opinion about what is allowed.
 */
export function assessmentProblem(status: unknown, reason: unknown): string | null {
  const s = text(status);
  if (!(APPROVAL_STATUSES as readonly string[]).includes(s)) return "status";
  // A REJECTION MUST SAY WHY, the same rule a losing deal carries. A supplier
  // blocked for reasons nobody wrote down is one nobody can argue with later,
  // and the person who blocked them will have left.
  if (BLOCKING.has(s) && !text(reason).trim()) return "reason";
  return null;
}

export function documentProblem(doc: SupplierDocument): string | null {
  if (!text(doc?.kind).trim()) return "kind";
  const issued = day(doc?.issuedAt);
  const expires = day(doc?.expiresAt);
  // An expiry before the issue date is a typo every time, and stored it would
  // read as permanently lapsed with nothing to explain it.
  if (issued && expires && expires < issued) return "expiry-before-issue";
  return null;
}

export function scorecardProblem(card: SupplierScorecard): string | null {
  if (!day(card?.periodEnd)) return "period";
  const given = SCORE_AXES.map((a) => num(card[a])).filter((n): n is number => n !== null);
  // A SCORECARD THAT SCORES NOTHING is a note, and there is a field for that.
  if (!given.length) return "no-scores";
  if (given.some((n) => n < 1 || n > 5 || !Number.isInteger(n))) return "range";
  return null;
}
