# The mobile field view and the customer's signature

One technician's round, on the phone they are holding, and the mark the customer leaves on
it. A tab on the Schedule (`/<slug>/field-service-schedule`), and a field on the job.

## What it is

**A job could be marked complete and nothing recorded who said so.** `status` went to
`completed` and `completedAt` was stamped, both by the studio's own technician — so the
only evidence a job was done was the word of the person who did it. Deliveries have the
same hole from the other end: `receivedBy` is a typed NAME, which anybody can type, for
anybody.

**No permission key and no collection.** Reading asks `fieldService.schedule.view` and
signing asks `.edit`, the right that already changes a job. `signoffs` is an array on the
job itself.

**The caller never names themselves.** `assignedToCollaboratorIds` holds CollaboratorIDs
(invariant 6) and the route reads the caller's own, so "my round" needs no parameter —
which is also what stops one technician asking for another's.

### A signature is not a status

Completing a job and being signed off for it are different facts: a technician finishes a
boiler service with the householder out, and the job is genuinely complete and genuinely
unsigned. Folding the two together would either block completion on somebody being present
or claim a signature that does not exist, and both are lies about the same afternoon. So
`setJobStatus` is untouched and the two buttons stand side by side.

**Appended, never replaced.** A captured signature stands; re-signing would let somebody
overwrite the evidence, which is the one thing evidence must not allow. A second visit is a
second signature rather than a correction to the first, and the array is written under a
FUNCTION patch (invariant 8) so two people signing two visits cannot drop one.

**Both halves are required and neither substitutes for the other.** A drawn squiggle nobody
can read is not evidence of WHO signed; a typed name with no mark is exactly the
`receivedBy` field this replaces, and it was never a signature.

**Not while it is still scheduled.** A signature is somebody saying the work in front of
them is done; taking one before the crew has started is a signature on nothing, and it is
the shape that turns a sign-off sheet into a formality signed at the depot in the morning.
A cancelled job cannot be signed for either — there is no work to accept.

### `awaitingSignature` is the state nothing could name

A completed job with no sign-off is not a failure and not a gap in the data: it is work
that has been done and cannot be proved. It is what a business chases, and before this
nothing in the product could list it.

### The mark

A canvas, three pointer handlers and `toBlob` — **not a library**. It goes to
`/api/media?kind=private&slug=…`, which verifies membership before it writes and again
before it serves; the blob URL is never given to a client and only the media id is stored.

Two things the pad gets right because they were got wrong first:

- **Pointer positions are scaled.** The canvas is 480 wide and drawn at whatever the phone
  is; without the ratio the stroke lands short of the finger by the difference, which on a
  320-pixel phone is a third of the way across.
- **The canvas is primed white.** `toBlob` captures the canvas and not the CSS behind it,
  so a transparent PNG of a near-black mark is invisible the moment anything renders it on
  a dark background — and a signature nobody can see is the one failure this cannot have.

## What building it found

**`PATCH /operations/jobs` was dead.** It passed the whole request body where
`setJobStatus` takes a status string, so `isStatus` was asked of an object, answered false,
and every transition returned `{ error: "status" }`. No job in this product could ever
leave `scheduled`: `completedAt` was never stamped and Template D's signoff billing trigger
could never fire.

**It is the change order's bug a second time** — there, the whole body went where
`answerChangeOrder` expects a boolean, and an object being truthy meant a REJECTION
approved the variation. Same shape, opposite symptom: one failed loudly for everybody, the
other silently for one caller. Neither is reachable by the compiler, because a route
handler's `body` is not statically typed.

**So `tests/restructure.mjs` refuses the shape**, and it found a THIRD instance on its
first run: `answerTimesheet(ctx, id, body)` where the parameter is a boolean — rejecting a
timesheet approved it. All three are fixed.

## Not built yet

- **No photos.** A technician cannot attach a picture of what they found, which is the
  next thing anybody asks for after a signature.
- **No parts or time recorded on site.** `workDone` is a field on the Service orders engine
  type, not on this screen; a job card is not filled in here.
- **No offline.** Every action is a fetch. In a basement with no signal the screen is
  useless, and nothing queues.
- **Delivery POD still has no signature.** `receivedBy` on a delivery note remains a typed
  name — the mechanism now exists and is not wired to it.
- **Nothing renders a stored signature but this screen's caption.** No printed job sheet,
  no PDF, and the mark is not shown on the job anywhere else.
- **`gone` is unreachable for a serial and a signature is never deleted** — deliberate, but
  it means a signature taken in error can only be superseded by another.
