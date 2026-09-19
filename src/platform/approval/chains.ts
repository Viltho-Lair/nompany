// WHAT AN APPROVAL CHAIN WAS — the vocabulary and the seeds of the engine that
// signed bills, bids, requisitions and stock adjustments until 19/09/2026.
// Spec: docs/superpowers/specs/2026-09-03-approval-workflow-engine-design.md
//
// EVERY ONE OF THOSE IS ANSWERED ON THE APPROVALS PAGE NOW (modules/approvals),
// by named people in steps. What is left here is read for ONE thing: a type's
// DEFAULT steps until a studio saves it in Approvals settings — the rights
// each step named, and the amount it started at (`defaultSetting`, model.ts).
// The walker, the validator and the editor are gone with the engine.
//
// WHY THIS EXISTS AT ALL. Every approval in the product was one step, and one
// step cannot express a limit: a 200-unit stationery bill and a 2,000,000
// subcontractor bill took the same path through approveBill, so the only way a
// studio could say "the FD sees the big ones" was to withhold approval from
// everybody who handles the small ones — a bottleneck, not a control.

/** One step: who may clear it, and the amount at which it starts applying. */
export type ApprovalStep = {
  /** A permission catalogue key. Not a role and not a person — spec D2. */
  permission: string;
  /**
   * The amount AT OR ABOVE which this step applies, in the STUDIO's currency.
   * `0` means "always". A chain whose steps are all 0 is an ordered list with
   * no value logic at all, which is why thresholds live on steps rather than
   * selecting between whole chains by band: the simple case stays simple, and
   * "who signs a 60k bill" is answered by reading one list.
   */
  from: number;
  /** What the studio calls this step. Tenant-authored, so never translated. */
  label: string;
};

export type ApprovalChain = {
  /** The document type this governs. "bill" is the only one built — spec D1. */
  type: string;
  /** In the order they must be walked. */
  steps: ApprovalStep[];
  /**
   * NOTHING BELOW THE FIRST THRESHOLD NEEDS APPROVING — said out loud.
   *
   * `chainProblems` refuses a chain whose lowest step starts above zero,
   * because that leaves an amount nobody signs for and its own message calls
   * it "a hole rather than a policy". The distinction is real and the numbers
   * cannot express it: a hole is an oversight, a policy is a decision. This
   * flag is how a chain says which.
   *
   * IT WAS UNEXPRESSIBLE UNTIL THE STOCK ADJUSTMENT CHAIN NEEDED IT. Counting
   * a shelf and correcting it by one is routine work that happens dozens of
   * times a week; requiring a signature for that means either a queue nobody
   * clears or a studio turning the control off altogether. So the product
   * shipped a seeded chain its own editor would have refused — the validator
   * and the seed contradicting each other, with the test caught in between.
   *
   * Absent means the guard applies, which is the right default: a studio
   * hand-editing a chain has no way to say "I meant that" and should be told.
   */
  noApprovalBelowFirstStep?: boolean;
};

// THE BUILT-IN, WHICH A STUDIO OVERRIDES RATHER THAN FORKS. Finance sees every
// bill; the second step is the studio's own dial and 50000 is only where it
// starts. Stored overrides merge OVER this (modules/finance/finance.ts), so a
// correction here still reaches every studio that never touched it.
export const SEEDED_CHAINS: Record<string, ApprovalChain> = {
  bill: {
    type: "bill",
    steps: [
      { permission: "finance.payables.approve", from: 0, label: "Finance" },
      { permission: "finance.payables.approveHigh", from: 50000, label: "Above the limit" },
    ],
  },
  // THE SECOND TYPE, AND THE ONE THAT MOVED THE STORE (see ./store).
  //
  // A BID IS THE OPPOSITE END OF A BILL and takes the same shape for a
  // different reason. A bill asks "we owe this, may I pay it"; a bid asks "may
  // we promise to do this work for this money" — and the second is the one a
  // studio cannot take back. The first step is always-on because somebody other
  // than the estimator should read every bid; 500000 is only where the second
  // starts, and it is the studio's dial like Finance's 50000.
  tender: {
    type: "tender",
    steps: [
      { permission: "tendering.tenders.approve", from: 0, label: "Estimating" },
      { permission: "tendering.tenders.approveHigh", from: 500000, label: "Above the limit" },
    ],
  },
  // THE THIRD TYPE, AND THE FIRST ONE THAT GUARDS A SPEND BEFORE IT HAPPENS.
  //
  // A bill asks "we owe this, may I pay it" and a bid asks "may we promise
  // this" — both after the fact of the commitment. A requisition asks BEFORE
  // there is one, which is the only point at which the answer can still be no
  // without a conversation with a supplier. Its first step is always-on for the
  // same reason Finance sees every bill: the control is that somebody other
  // than the requester says yes, whatever the amount. 10000 is where the second
  // starts and it is the studio's dial, lower than a bill's 50000 because this
  // is where the money is stopped rather than where it is paid.
  // A STOCK ADJUSTMENT IS THE ONE WRITE THAT NEEDS NO DOCUMENT BEHIND IT.
  // A bill has a supplier's invoice and a requisition has somebody asking; an
  // adjustment is a person typing a number into the ledger every on-hand figure
  // in the section is summed from. `adjustStock`'s own comment says as much —
  // it was the one write in that file with no guard of its own.
  //
  // ITS FIRST STEP IS NOT ALWAYS-ON, unlike a bill's or a requisition's, and
  // that is the difference worth stating. Counting a shelf and correcting it by
  // one is routine work that happens dozens of times a week; a signature for
  // that means either a queue nobody clears or a studio turning the control
  // off. 1000 is where a correction stops being a correction and starts being a
  // write-off, and it is the studio's dial like every other threshold here.
  adjustment: {
    type: "adjustment",
    // THE ONE SEEDED CHAIN THAT DELIBERATELY SIGNS NOTHING AT THE BOTTOM. The
    // paragraph above argues why; this is the field that lets it say so rather
    // than being a chain the product ships and its own editor would refuse.
    noApprovalBelowFirstStep: true,
    steps: [
      { permission: "inventory.stock.approve", from: 1000, label: "Stock control" },
      { permission: "inventory.stock.approveHigh", from: 25000, label: "Above the limit" },
    ],
  },
  requisition: {
    type: "requisition",
    steps: [
      { permission: "procurement.requisitions.approve", from: 0, label: "Procurement" },
      { permission: "procurement.requisitions.approveHigh", from: 10000, label: "Above the limit" },
    ],
  },
};
