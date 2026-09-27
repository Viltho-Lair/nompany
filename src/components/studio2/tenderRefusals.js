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
    case "cannot-unsubmit": return tr.refuseCannotUnsubmit;
    case "unknown-stage": return tr.refuseUnknownStage;

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
    // Asking for a bid's approval (19/09/2026): nobody named, or only the asker.
    case "not-configured": return tr.refuseNotConfigured;
    case "no-approver": return tr.refuseNoApprover;
    case "already-pending": return tr.refuseAlreadyPending;
    // Sent both by a context whose section is not planted and by Approvals
    // when its page is absent, so the words name neither.
    case "no-section": return tr.refuseNoSection;

    // ---- the handover ----
    case "not-won": return tr.refuseNotWon;
    case "no-projects": return tr.refuseNoProjects;
    case "no-customers": return tr.refuseNoCustomers;
    case "no-tendering": return tr.refuseNoTendering;
    // The POST's word for a tender that does not exist.
    case "tender": return tr.refuseNoTender;
    // `already` IS SAFE TO CLAIM HERE and would not be in a product-wide
    // mapper: openProject sends it for a second project on one QUOTATION too,
    // but no tendering screen ever opens a project from a quotation, so within
    // this file it can only mean a tender handed over twice.
    case "already": return tr.refuseAlreadyHandedOver;
    // Its own token rather than the bare `forbidden` every route sends, so a
    // shared mapper cannot answer an unrelated refusal with this sentence.
    case "handover-forbidden":
    case "read-only": return tr.refuseHandoverForbidden;

    // ---- the dialog's pickers ----
    case "client": return tr.refuseClient;
    case "client-create": return tr.refuseClientCreate;
    case "assignee": return tr.refuseAssignee;

    // A bill frozen because its tender became a project, or — from Submitted
    // on — because the bid has gone out.
    case "handed-over": return tr.refuseHandedOver;
    case "bill-locked": return tr.refuseBillLocked;

    // ---- the pack ----
    case "in-chain": return tr.cannotDeleteInChain;
    case "superseded-replacement":
    case "already-superseded": return tr.cannotSupersede;
    case "self": return tr.refuseSelf;
    case "other-tender": return tr.refuseOtherTender;

    // ---- what any form or load can meet ----
    case "title": return tr.refuseTitle;
    case "deadline": return tr.refuseDeadline;
    case "description": return tr.refuseDescription;
    case "question": return tr.refuseQuestion;
    case "code": return tr.refuseCode;
    case "duplicate": return tr.duplicateCode;
    case "nothing": return tr.refuseNothing;
    case "notfound": return tr.refuseNotFound;
    case "missing": return tr.refuseMissing;
    // The bare `forbidden` every route sends when a right is missing. Safe to
    // word generically here because the handover's own refusal is
    // `handover-forbidden`, kept apart precisely so this case could exist.
    case "forbidden": return tr.refuseForbidden;
    case "unauthorized":
    case "session-locked": return tr.refuseSignedOut;

    // NEVER THE TOKEN ITSELF. This used to fall through to `return token`, so
    // any refusal without a case reached the studio as `no-studio-currency` —
    // not a sentence in either language. An unknown token now reads as a
    // plain failure; the switch above is where a new one gets its words.
    default: return tr.refuseFailed;
  }
}
