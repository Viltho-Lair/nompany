// WHO MAY TOUCH A CHAT ROOM. Server-only; the two sides of a conversation
// authenticate against two different identities, so each gets its own guard.
//
// The routes are split by namespace for the same reason — /api/chat/* is the
// studio's, /api/super/chat/* is the console's. One shared namespace would have
// to guess which identity a request meant, and it would guess wrong exactly
// when it matters: a nompany owner has a super session AND a user session in
// the same browser, so "try super first" would post their studio-side replies
// as nompany.
//
// There is no room token. The old public widget needed one because its visitor
// was anonymous; here both sides are already signed in, so the room is bound to
// a UserID and the session is the credential. That also means a reload resumes
// the conversation with nothing kept in the browser.

import { currentUser } from "@/lib/identity";
import { getRoom } from "@/lib/data/chat";

// The person who opened the room, and nobody else — not their studio's admins,
// not the studio's owner. A support conversation belongs to the two people
// having it.
export async function studioSide(roomId) {
  const user = await currentUser();
  if (!user) return { status: 401, error: "unauthorized" };
  const room = await getRoom(roomId);
  if (!room) return { status: 404, error: "not-found" };
  if (room.userId !== user.id) return { status: 403, error: "forbidden" };
  return { room, user };
}

// Any super admin may READ the queue and a room; taking one is a separate,
// first-wins step (acceptRoom), and replying is gated on holding it.
//
// THE SESSION LOOKUP IS GONE FROM HERE. This used to call currentSuperAdmin()
// itself, which meant every console chat route resolved the same admin twice —
// once for the route's gate and once again here. The route wrapper already
// holds it, so this is now only what its name should always have meant: find
// the room, or say it is not there.
export async function nompanyRoom(roomId) {
  const room = await getRoom(roomId);
  if (!room) return { error: "not-found" };
  return { room };
}
