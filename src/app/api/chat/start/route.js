import { currentUser } from "@/lib/identity";
import { studioContext } from "@/lib/studios";
import { studioHasLiveChat } from "@/lib/plans";
import { getProfile } from "@/lib/data/users";
import { openRoom } from "@/lib/data/chat";
import { forStudio, chatDisplayName } from "@/lib/chatConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A studio opens a chat with nompany.
//
// THREE things have to be true, and all three are decided here rather than by
// the button that got us here: the caller is signed in, they are a member of
// the studio named in the request, and that studio is on a package that
// includes live chat. Hiding the widget is presentation; this is the gate.
//
// The DISPLAY NAME is resolved server-side and never taken from the request.
// The console decides who to answer partly on the strength of who is asking, so
// "Studio Name · User Name" has to be something the platform vouches for.
export async function POST(request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const slug = String(body.slug || "").trim();
  if (!slug) return Response.json({ error: "missing" }, { status: 400 });

  const context = await studioContext(user, slug);
  if (context.error) {
    return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  }
  const { studio, collaborator } = context;

  if (!(await studioHasLiveChat(studio))) {
    return Response.json({ error: "plan" }, { status: 403 });
  }

  const profile = await getProfile(user.id);
  const userName = chatDisplayName({ alias: collaborator.alias, profile, email: user.email });

  const room = await openRoom({ studio, userId: user.id, userName });
  return Response.json({ room: forStudio(room) });
}
