import { route } from "@/platform/http/route";
import { changePassword, clearedSessionCookie } from "@/platform/auth/identity";

export const runtime = "nodejs";

// Change password while signed in. Every session is revoked afterwards (all
// devices sign out), so this response also clears the caller's own cookie.
export const PUT = route(
  {
    auth: "user",
    body: true,
    name: "identity/password",
    // `invalid` HERE MEANS "the current password you typed is wrong", which is
    // a 401 — the credential was rejected. Everywhere else in the product the
    // same name means "that field is malformed", which is a 400. The table
    // cannot be right for both, so this route keeps its own answer until the
    // service stops reusing one name for two meanings.
    status: { invalid: 401 },
  },
  async ({ user, body }) => {
    const result = await changePassword(user.id, body.currentPassword, body.newPassword);
    if (result.error) return result;

    const res = Response.json({ ok: true, signedOut: true });
    res.headers.append("Set-Cookie", clearedSessionCookie());
    return res;
  },
);
