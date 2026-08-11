import { currentUser } from "@/lib/identity";
import { requestJoinByCode } from "@/lib/studios";

export const runtime = "nodejs";

// Ask to join a studio by typing its COMPANY CODE (its slug). This only raises
// a request — the studio's approval is the gate, so a guessable code grants
// nothing on its own. No access tokens are involved anywhere.
export async function POST(request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const result = await requestJoinByCode(user, body.code);
  if (result.error) {
    const status = result.error === "notfound" ? 404
      : result.error === "pending" || result.error === "already-member" ? 409
      : 400;
    return Response.json({ error: result.error, studio: result.studio }, { status });
  }
  return Response.json({ ok: true, requested: true, studio: result.studio }, { status: 201 });
}
