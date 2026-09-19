// WHERE A STUDIO'S APPROVAL CHAINS LIVED — one place, for every document type.
//
// READ-ONLY SINCE 19/09/2026. The four types they governed moved onto the
// Approvals page, and the Studio settings editor that wrote them went with the
// last of them. A chain a studio stored is still READ, for one purpose: a type's
// default steps in Approvals settings keep the limits that studio had moved,
// until it saves the type there (`defaultSetting`, modules/approvals/model).
//
// THEY USED TO LIVE IN FINANCE'S SETTINGS, and that was correct while bills
// were the only type there was. `docs/functionality/approvals.md` named the
// move point exactly: *"a chain governing a record outside Finance does not
// belong in Finance's settings, and that is the commit where this becomes a
// store of its own."* A tender is that record. Leaving it where it was would
// mean giving whoever sets "bids over a million need the MD" the right to edit
// Finance's settings, which is a power they were never meant to hold.
//
// ON THE STUDIO RECORD, beside `currency`. Three reasons, and the third is the
// one that decided it:
//
//   - Approval policy is the company's, not a department's. "Which signatures
//     does this need" is the same kind of statement as "what currency are we",
//     and approval already depends on that one.
//   - `studio` is on EVERY module context already, so a department asking for
//     its own chain costs no section lookup and no round trip. A chain kept in
//     a section would need a foreign-section read from every department that
//     ever approves anything.
//   - It is one right — `administration.settings.edit` — rather than one per
//     department, so a studio cannot end up with two people who each control
//     half of its approval policy and neither of whom can see the other half.

import { SEEDED_CHAINS, type ApprovalChain } from "./chains";

// A BAG WITH AN INDEX SIGNATURE, not `{ approvalChains?: unknown }`. StudioRef
// is `{ id: string } & Row`, and a declared optional property has NO overlap
// with that — the compiler rejects the studio outright rather than reading the
// field off its index signature. `studio.currency` is read the same way
// throughout payables for the same reason.
type WithChains = { readonly [key: string]: unknown } | null | undefined;

const usable = (chain: unknown): chain is ApprovalChain =>
  Boolean(chain && typeof chain === "object" && Array.isArray((chain as ApprovalChain).steps)
    && (chain as ApprovalChain).steps.length);

/**
 * THE CHAINS THIS STUDIO USES — the seeds, as it has edited them.
 *
 * STORED AS OVERRIDES, NEVER AS A FULL COPY, which is flows.ts's rule and is
 * here for its two reasons: a later correction to a built-in still reaches
 * every studio that never touched it, and a studio's stored data is exactly
 * what it changed rather than a snapshot of everything that existed the day it
 * first opened the screen.
 *
 * `legacy` IS FINANCE'S OLD BLOB, AND IT IS READ RATHER THAN MIGRATED. A studio
 * that configured a bill chain before this moved keeps it working with nobody
 * running anything — which matters because a manual backfill gets forgotten
 * (`administration-access` shipped and was still missing from two of three live
 * studios two days later, with nothing complaining). It sits BELOW the studio's
 * own, so the first edit in Studio settings becomes the answer and stays it.
 *
 * A stored chain with no steps is not an override, it is a broken row, and
 * honouring it would leave the studio approving nothing — the exact hole
 * `chainProblems` refuses on write. The layer beneath stands instead.
 */
export function approvalChainsFor(
  studio: WithChains,
  legacy?: Record<string, unknown> | null,
): Record<string, ApprovalChain> {
  const out: Record<string, ApprovalChain> = { ...SEEDED_CHAINS };
  for (const source of [legacy, studio?.approvalChains]) {
    const overrides = (source && typeof source === "object" ? source : {}) as Record<string, unknown>;
    for (const [type, chain] of Object.entries(overrides)) {
      if (usable(chain)) out[type] = chain;
    }
  }
  return out;
}
