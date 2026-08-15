import { currentUser } from "@/lib/identity";
import { shouldPrompt, setRating, declineRating } from "@/lib/data/ratings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whether to ask this user what they think of nompany, and their answer.
//
// The ELIGIBILITY DECISION IS THE SERVER'S. The browser only asks "should I
// show it"; it never decides, so a user cannot summon the prompt or a stale tab
// re-ask somebody who has already answered.
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ prompt: false });
  return Response.json({ prompt: await shouldPrompt(user) });
}

export async function POST(request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  // Declining is recorded too — it is what stops the prompt coming back — but
  // it is stored as a non-answer and never counts towards satisfaction.
  if (body?.decline) return Response.json(await declineRating(user.id));

  const out = await setRating(user.id, body?.stars);
  if (out.error) return Response.json(out, { status: 400 });
  return Response.json(out);
}
