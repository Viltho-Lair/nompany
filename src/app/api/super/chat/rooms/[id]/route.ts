import { route, refused } from "@/platform/http/route";
import { nompanyRoom } from "@/lib/chatAccess";
import { forNompany } from "@/lib/chatConstants";
import { WAITING } from "@/lib/data/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read one room. A WAITING room is deliberately not readable: the queue shows
// who is asking and from where, and that is all anyone gets until they accept.
// Accepting is the commitment, so it is also the moment the thread opens.
export const GET = route(
  { auth: "super", name: "super/chat/room" },
  async ({ params, admin }) => {
    const found = await nompanyRoom(params.id);
    if (refused(found)) return found;

    const { room } = found;
    if (room.status === WAITING) return { error: "not-accepted" };
    if (room.adminId && room.adminId !== admin.id) {
      return { error: "taken", adminLabel: room.adminLabel };
    }
    return { room: forNompany(room) };
  },
);
