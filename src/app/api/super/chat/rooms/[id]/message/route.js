import { route } from "@/platform/http/route";
import { nompanyRoom } from "@/lib/chatAccess";
import { addMessage, NOMPANY, ENDED } from "@/lib/data/chat";
import { forNompany } from "@/lib/chatConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reply from the console. Only the admin HOLDING the room may write to it —
// being a super admin is enough to see the queue, never enough to join somebody
// else's conversation mid-sentence.
export const POST = route(
  { auth: "super", body: true, name: "super/chat/message" },
  async ({ params, body, admin }) => {
    const found = await nompanyRoom(params.id);
    if (found.error) return found;

    const { room } = found;
    if (room.status === ENDED) return { error: "ended" };
    if (room.adminId !== admin.id) return { error: "not-yours", adminLabel: room.adminLabel };

    const text = String(body.text || "").trim();
    if (!text) return { error: "empty" };

    const updated = await addMessage(params.id, NOMPANY, text);
    if (!updated) return { error: "not-found" };
    return { room: forNompany(updated) };
  },
);
