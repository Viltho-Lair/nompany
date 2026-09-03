// WHAT AN APPROVAL CHAIN IS — the vocabulary, the seeds, and what makes one
// impossible. Spec: docs/superpowers/specs/2026-09-03-approval-workflow-engine-design.md
//
// PURE, AND THAT IS THE POINT. Nothing here touches the store, so the settings
// screen imports this file and validates a studio's edit with THE SAME function
// the server refuses it with. A second copy of the rules is free to disagree
// with the first, and the copy is what goes stale — the same reasoning that
// keeps templateProblems in platform/engagement/templates.ts.
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
};

/**
 * WHY A CHAIN COULD NOT WORK — actionable sentences, never a boolean.
 *
 * Refused ON WRITE, never on read, for flows.ts's stated reason: a studio hears
 * about its own edit while it is still their edit and in words about the edit,
 * rather than discovering it on somebody else's screen at the worst moment.
 *
 * Each of these is invisible at runtime and none of them throws, which is
 * exactly why they are checked here.
 *
 * `knownKeys` is injected rather than imported so this file stays free of the
 * catalogue: a caller already holding ALL_PERMISSIONS passes it, and nothing
 * here has to know how permissions are assembled.
 */
export function chainProblems(
  chain: ApprovalChain | null | undefined,
  knownKeys: readonly string[],
): string[] {
  const out: string[] = [];
  const steps = chain?.steps || [];

  if (!steps.length) {
    out.push("An approval chain needs at least one step; an empty one would approve nothing.");
    return out;
  }

  const known = new Set(knownKeys);
  const seen = new Set<string>();
  let previousFrom = -1;

  for (const [i, step] of steps.entries()) {
    const at = `Step ${i + 1}`;

    if (!known.has(step.permission)) {
      // A step nobody can ever satisfy blocks every record that reaches it,
      // silently and forever. This is the refusal most worth having.
      out.push(`${at} names "${step.permission}", which is not a permission this product has.`);
    }
    if (seen.has(step.permission)) {
      out.push(`${at} names "${step.permission}" twice. One person may not sign two steps of one record, so a repeated right makes the chain unwalkable.`);
    }
    seen.add(step.permission);

    if (!Number.isFinite(step.from) || step.from < 0) {
      out.push(`${at} has no usable threshold. Use 0 for a step that always applies.`);
    } else if (step.from < previousFrom) {
      out.push(`${at} starts at ${step.from}, below the step before it (${previousFrom}). Thresholds must ascend, or the order is one nobody can read.`);
    } else {
      previousFrom = step.from;
    }
  }

  if (!steps.some((s) => s.from === 0)) {
    // Without one, an amount below the lowest threshold needs no approval at
    // all — a hole rather than a policy, and one nobody would notice until a
    // small bill sailed through.
    out.push("No step has `from: 0`, so an amount below the lowest threshold would need no approval at all.");
  }

  return out;
}
