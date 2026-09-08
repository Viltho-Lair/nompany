// THE CUSTOMER'S SIGNATURE ON A JOB.
//
// A JOB COULD BE MARKED COMPLETE AND NOTHING RECORDED WHO SAID SO. `status`
// went to `completed` and `completedAt` was stamped, both by the studio's own
// technician — so the only evidence a job was done was the word of the person
// who did it. Deliveries have the same hole from the other end: `receivedBy` is
// a typed NAME, which anybody can type, for anybody.
//
// A SIGNATURE IS NOT A STATUS, and that is the design. Completing a job and
// being signed off for it are different facts: a technician finishes a boiler
// service with the householder out, and the job is genuinely complete and
// genuinely unsigned. Folding the two together would either block completion on
// somebody being present or claim a signature that does not exist, and both are
// lies about the same afternoon. So `setJobStatus` is untouched; this appends.
//
// APPENDED, NEVER REPLACED. A captured signature stands. Re-signing would let
// somebody overwrite the evidence, which is the one thing evidence must not
// allow — and a second visit is a second signature rather than a correction to
// the first. Nothing here deletes one either.
//
// PURE. No imports, no store. The mark itself is a private media record and
// only its id is here: a signature drawn on a phone is a few kilobytes of PNG,
// and the store this product uses for bytes is Vercel Blob behind the media
// route, which checks membership before it writes and again before it serves.

export type SignoffInput = {
  signedByName?: unknown;
  signedByTitle?: unknown;
  mediaId?: unknown;
  notes?: unknown;
};

export type Signoff = {
  /** What the person wrote under the mark. */
  signedByName: string;
  /** Their role on the customer's side — "site foreman", "householder". */
  signedByTitle: string;
  /** The private media record holding the drawn mark. */
  mediaId: string;
  notes: string;
  /** The COLLABORATOR who captured it, never the customer — invariant 6. */
  capturedByCollaboratorId: string;
  at: string;
};

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** What is wrong with this sign-off, or an empty array. */
export function signoffProblems(input: SignoffInput): string[] {
  const problems: string[] = [];
  const name = str(input.signedByName, 160);
  const mediaId = str(input.mediaId, 80);

  // A NAME IS REQUIRED AND THE MARK IS REQUIRED, and neither substitutes for
  // the other. A drawn squiggle nobody can read is not evidence of who signed;
  // a typed name with no mark is exactly the `receivedBy` field this exists to
  // replace, and it was never a signature.
  if (!name) problems.push("a signature needs the name of the person signing");
  if (!mediaId) problems.push("a signature needs the mark itself");
  return problems;
}

/** The stored shape. Only called once validation has passed. */
export function cleanSignoff(
  input: SignoffInput,
  { capturedByCollaboratorId, at }: { capturedByCollaboratorId: string; at: string },
): Signoff {
  return {
    signedByName: str(input.signedByName, 160),
    signedByTitle: str(input.signedByTitle, 120),
    mediaId: str(input.mediaId, 80),
    notes: str(input.notes, 1000),
    capturedByCollaboratorId,
    at,
  };
}

/**
 * MAY THIS JOB BE SIGNED FOR? A reason, or null.
 *
 * NOT WHILE IT IS STILL SCHEDULED. A signature is somebody saying the work in
 * front of them is done; taking one before the crew has started is a signature
 * on nothing, and it is the shape that turns a sign-off sheet into a formality
 * signed at the depot in the morning.
 *
 * A CANCELLED JOB CANNOT BE SIGNED FOR either — there is no work to accept.
 */
export function signoffProblem(job: { status?: string }): string | null {
  if (job.status === "scheduled") return "not-started";
  if (job.status === "cancelled") return "cancelled";
  // AND NOTHING ELSE. A second signature is NOT refused: a revisit is signed
  // again and the list keeps both. A "already signed" refusal was written here
  // and taken out — it made the honest case (two visits, two customers, two
  // marks) impossible in order to prevent a double tap, which the screen
  // prevents by disabling its own button.
  return null;
}

/**
 * THE JOBS ONE PERSON IS OUT ON — the mobile view's whole list.
 *
 * IT IS NOT THE DISPATCH BOARD'S LANE. A dispatcher looks at everybody on one
 * day; a technician looks at themselves across the days that are still open,
 * because their afternoon runs past midnight and their Tuesday job does not
 * stop mattering at Tuesday's end. So this filters by PERSON and by whether the
 * work is still outstanding, and never by a single day.
 */
export function myJobs<T extends {
  status?: string; scheduledStart?: string; assignedToCollaboratorIds?: string[];
}>(jobs: T[], collaboratorId: string): T[] {
  return jobs
    .filter((j) =>
      (j.assignedToCollaboratorIds || []).includes(collaboratorId)
      && j.status !== "cancelled"
      && j.status !== "completed")
    // SOONEST FIRST, and a job with no time sorts LAST rather than first: an
    // unscheduled job is not urgent, and an empty string sorting before every
    // real date would put it at the top of every technician's day.
    .sort((a, b) => {
      const [x, y] = [String(a.scheduledStart || ""), String(b.scheduledStart || "")];
      if (!x && !y) return 0;
      if (!x) return 1;
      if (!y) return -1;
      return x.localeCompare(y);
    });
}

/**
 * WHAT A TECHNICIAN'S DAY LOOKS LIKE — done, outstanding, and awaiting a
 * signature.
 *
 * `awaitingSignature` IS THE ONE THAT EARNS ITS PLACE. A completed job with no
 * sign-off is not a failure and not a gap in the data: it is a real state a
 * business needs to chase, because it is work that has been done and cannot be
 * proved. Nothing in the product could name it before.
 */
export function fieldSummary<T extends { id: string; status?: string }>(
  jobs: T[],
  signoffs: Record<string, Signoff[]>,
): { outstanding: number; completed: number; awaitingSignature: T[] } {
  const completed = jobs.filter((j) => j.status === "completed");
  return {
    outstanding: jobs.filter((j) => j.status === "scheduled" || j.status === "in-progress").length,
    completed: completed.length,
    awaitingSignature: completed.filter((j) => (signoffs[j.id] || []).length === 0),
  };
}
