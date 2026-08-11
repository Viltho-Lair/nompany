import { currentUser, changePassword, clearedSessionCookie } from "@/lib/identity";

export const runtime = "nodejs";

// Change password while signed in. Every session is revoked afterwards (all
// devices sign out), so this response also clears the caller's own cookie.
export async function PUT(request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const result = await changePassword(user.id, body.currentPassword, body.newPassword);
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "invalid" ? 401 : 400 });

  const res = Response.json({ ok: true, signedOut: true });
  res.headers.append("Set-Cookie", clearedSessionCookie());
  return res;
}
