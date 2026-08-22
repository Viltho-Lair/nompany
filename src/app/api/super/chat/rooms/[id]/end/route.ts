import { route, refused } from "@/platform/http/route";
import { nompanyRoom } from "@/lib/chatAccess";
import { endRoom } from "@/lib/data/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Close the conversation from the console. The holder only — the same rule as
// replying, for the same reason.
export const POST = route(
  { auth: "super", name: "super/chat/end" },
  async ({ params, admin }) => {
    const found = await nompanyRoom(params.id);

    // ENDING A ROOM THAT IS ALREADY GONE IS A SUCCESS, not a 404. The caller
    // wanted it closed and it is closed; answering "not found" would make a
    // double-click look like a failure.
    if (refused(found)) return { ok: true, status: "gone" };

    const { room } = found;
    if (room.adminId && room.adminId !== admin.id) {
      return { error: "not-yours", adminLabel: room.adminLabel };
    }

    await endRoom(params.id);
    return { ok: true, status: "ended" };
  },
);
