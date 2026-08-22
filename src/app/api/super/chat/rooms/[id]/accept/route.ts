import { route, refused } from "@/platform/http/route";
import { acceptRoom } from "@/lib/data/chat";
import { forNompany } from "@/lib/chatConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Take a waiting chat. FIRST WINS — the room store claims a key with NX, so two
// admins pressing Accept in the same second produce one holder and one 409
// naming them, rather than two people typing into the same thread.
//
// The admin's own address is the label. The studio never sees it (the studio
// side is answered by "nompany Support"); it exists so the console can say who
// is on which conversation.
export const POST = route(
  { auth: "super", name: "super/chat/accept" },
  async ({ params, admin }) => {
    const result = await acceptRoom(params.id, { adminId: admin.id, adminLabel: admin.email });

    // `taken` is not an error shape — it is a 409 that carries who holds it.
    if (result.taken) {
      return { status: 409, body: { taken: true, adminLabel: result.room?.adminLabel || "" } };
    }
    if (refused(result)) return result;
    // `taken` and the refusal are both handled above, so what is left is the
    // room this admin now holds.
    return { room: forNompany(result.room) };
  },
);
