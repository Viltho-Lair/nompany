import { route } from "@/platform/http/route";
import { listRooms } from "@/lib/data/chat";
import { summarize, WAITING, ACTIVE } from "@/lib/chatConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The console's queue, in the three piles it is actually worked in:
//
//   waiting — nobody has taken it. These are the rows that get highlighted and
//             carry an Accept button; they are NOT openable, because reading a
//             conversation you have not committed to answering is how a chat
//             sits half-attended.
//   mine    — this admin accepted it. Open and answerable.
//   taken   — another admin holds it. Listed so the queue is honest about what
//             is in flight, with the holder named and no way in.
//
// Rows carry the last line and a count, never the thread — polling the queue
// must not re-send every open conversation.
export const GET = route({ auth: "super", name: "super/chat/rooms" }, async ({ admin }) => {
  const rooms = await listRooms();
  type Row = ReturnType<typeof summarize>;
  const waiting: Row[] = [];
  const mine: Row[] = [];
  const taken: Row[] = [];
  for (const room of rooms) {
    const row = summarize(room);
    if (room.status === WAITING) waiting.push(row);
    else if (room.status === ACTIVE && room.adminId === admin.id) mine.push(row);
    else taken.push(row);
  }
  return { waiting, mine, taken, adminId: admin.id };
});
