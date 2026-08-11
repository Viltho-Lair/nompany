import { currentUser, saveQuestionnaire, getQuestionnaire } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The user's personal questionnaire — 1:1, stored under u:<UserID>:questionnaire
// and reachable by nobody else.
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json((await getQuestionnaire(user.id)) || {});
}

export async function POST(request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const result = await saveQuestionnaire(user.id, body);
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, questionnaire: result.questionnaire });
}
