import { route } from "@/platform/http/route";
import { changePassword, setInitialPassword, clearedSessionCookie } from "@/platform/auth/identity";

export const runtime = "nodejs";

// Set or change the signed-in user's password. TWO PATHS, chosen by whether one
// exists — `user` here is the full record (currentUser), so `passwordHash` is in
// hand and no extra read is needed:
//
//   • HAS a password  → changePassword: the current password is verified, and a
//     successful change revokes every session and device, so this response also
//     clears the caller's own cookie (signedOut: true).
//   • has NONE (social sign-in) → setInitialPassword: no current password to
//     verify, and setting a first one is not a credential change, so the session
//     stays (signedOut: false).
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
    if (user.passwordHash) {
      const result = await changePassword(user.id, body.currentPassword, body.newPassword);
      if (result.error) return result;

      const res = Response.json({ ok: true, signedOut: true });
      res.headers.append("Set-Cookie", clearedSessionCookie());
      return res;
    }

    const result = await setInitialPassword(user.id, body.newPassword);
    if (result.error) return result;
    return { ok: true, signedOut: false };
  },
);
