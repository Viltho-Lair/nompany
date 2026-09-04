import { route } from "@/platform/http/route";
import { isSharing, setSharing } from "@/platform/auth/calendarShare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE PERSON'S OWN CONSENT, IN ONE STUDIO. "Let colleagues here see when I am
// busy" — never what, never where, and never on somebody else's behalf.
//
// NO PERMISSION KEY, DELIBERATELY. Membership plus this flag IS the gate, and a
// grantable right here would be a second gate free to disagree with the first:
// somebody could hold "may share availability" while their flag is off, or lose
// the right while their flag stays on, and there would be no correct answer for
// which one the availability route should believe. Invariant 16 asks the same
// question from the other end — a right nothing can exercise is a bug — and a
// right whose only job is to duplicate a flag exercises nothing.
//
// THE COLLABORATORID COMES FROM THE RESOLVED CONTEXT AND NOWHERE ELSE. Not the
// body, not the query, not a header. This is the security property of the whole
// file: `auth: "studio"` resolved who is asking and which collaborator row is
// theirs in THIS studio (invariant 6 — CollaboratorID is the identity inside a
// studio), and reading the id from anywhere the caller can write would let one
// person publish another person's availability. That is the exact inverse of
// what this feature promises, and it would look like a working feature from
// every screen.

const NAME = "studios/[slug]/calendar-share";

export const GET = route({ auth: "studio", name: NAME }, async ({ studio, collaborator }) => ({
  sharing: await isSharing(String(studio.id), String(collaborator.id)),
}));

export const PUT = route({ auth: "studio", body: true, name: NAME }, async ({ studio, collaborator, body }) => {
  // A MISSING OR NON-BOOLEAN `sharing` IS REFUSED, NOT COERCED. `Boolean(body
  // .sharing)` would read an absent field as "turn it off", so a client that
  // sent the wrong field name would silently revoke somebody's consent and
  // report success. `invalid` is 400 through the existing status table.
  if (typeof body?.sharing !== "boolean") return { error: "invalid" };

  const collaboratorId = String(collaborator.id);
  // The list that comes back is the one that was actually written (setSharing
  // is compare-and-set), so the answer describes the stored state rather than
  // the state this request asked for — two colleagues toggling at once both
  // get told the truth.
  const sharers = await setSharing(String(studio.id), collaboratorId, body.sharing);
  return { sharing: sharers.includes(collaboratorId) };
});
