// WHEN A STUDIO ITS OWNER DELETED IS ACTUALLY DELETED. Pure — the job and the
// settings screen both read this one file, so the countdown the owner watches
// and the moment the data goes can never disagree.
//
// THIRTY DAYS OF GRACE (the owner's rule). Asking to delete a studio changes
// nothing for thirty days: everything keeps working, and cancelling undoes it
// completely. On the thirtieth day the studio and its data go.
//
// UNTIL 24/09/2026 THE SECOND HALF DID NOT EXIST. The screen counted down to a
// date and nothing acted on it — no job read `deletionRequestedAt`, and the
// cascade that deletes a studio had no caller at all — so a studio "deleted"
// months ago was still whole. The owner believed it was built; it was a clock.

export const STUDIO_DELETION_GRACE_DAYS = 30;
const GRACE_MS = STUDIO_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;

/** The instant a requested deletion takes effect, or "" when none was requested. */
export function deletionFinalisesAt(requestedAt: unknown): string {
  const t = Date.parse(String(requestedAt || ""));
  return Number.isFinite(t) ? new Date(t + GRACE_MS).toISOString() : "";
}

export type DueStudio = { id: string; name: string; slug: string; requestedAt: string; finalisesAt: string };

/**
 * THE STUDIOS WHOSE THIRTY DAYS ARE UP, oldest request first. A studio with no
 * request, or an unreadable one, is never due: a malformed date must fail
 * towards keeping a customer's data, not towards deleting it.
 */
export function dueForDeletion(
  studios: readonly { id?: unknown; name?: unknown; slug?: unknown; deletionRequestedAt?: unknown }[],
  nowMs: number,
): DueStudio[] {
  return studios
    .map((s) => {
      const finalisesAt = deletionFinalisesAt(s.deletionRequestedAt);
      return {
        id: String(s.id || ""), name: String(s.name || ""), slug: String(s.slug || ""),
        requestedAt: String(s.deletionRequestedAt || ""), finalisesAt,
      };
    })
    .filter((s) => s.id && s.finalisesAt && Date.parse(s.finalisesAt) <= nowMs)
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
}
