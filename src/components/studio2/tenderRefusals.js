// THE WORDS FOR EVERY REFUSAL TENDERING SENDS, in one place.
//
// It lived inside StudioTenders until the bid review arrived and a SECOND
// screen started receiving the same tokens: the register refuses a stage move,
// the bill refuses a signature, and several tokens are now sent by both. A copy
// per screen is one screen quietly falling behind the server's vocabulary — a
// token with no case falls through and the studio is shown `not-approved`,
// which is not a sentence in either language.
//
// TOKENS, TRANSLATED ON DISPLAY. The server sends `bill-incomplete`, never a
// sentence, because it writes English and the studio is bilingual — the same
// rule stages and statuses follow.
"use client";

export function refusal(tr, token) {
  switch (token) {
    // ---- the stage ladder ----
    case "already-decided": return tr.refuseAlreadyDecided;
    case "not-submitted": return tr.refuseNotSubmitted;
    case "already-submitted": return tr.refuseAlreadySubmitted;
    case "reason-required": return tr.refuseReasonRequired;

    // ---- the bid review ----
    case "not-approved": return tr.refuseNotApproved;
    case "bill-incomplete": return tr.refuseBillIncomplete;
    case "already-approved": return tr.refuseAlreadyApproved;
    case "same-signer": return tr.cannotSignOwnBid;
    // The three ways a plan fails to resolve, kept apart because they send
    // whoever hits them to different places: Studio settings, nowhere (wait for
    // rates), and a chain nobody configured.
    case "no-studio-currency": return tr.refuseNoStudioCurrency;
    case "unquoted": return tr.refuseUnquoted;
    case "no-chain": return tr.refuseNoChain;

    // ---- the pack ----
    case "in-chain": return tr.cannotDeleteInChain;
    case "superseded-replacement":
    case "already-superseded": return tr.cannotSupersede;

    default: return token;
  }
}
