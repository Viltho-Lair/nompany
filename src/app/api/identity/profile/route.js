import { currentUser, savePersonalInfo } from "@/lib/identity";
import { getProfile } from "@/lib/data/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The user's isolated, editable personal information (u:<UserID>:profile).
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json((await getProfile(user.id)) || {});
}

export async function PUT(request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const result = await savePersonalInfo(user.id, body);
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, profile: result.profile });
}
