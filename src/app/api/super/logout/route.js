import { cookies } from "next/headers";
import { route } from "@/lib/route";
import { logoutSuper, clearedSuperCookie, SUPER_COOKIE } from "@/lib/superAuth";

export const runtime = "nodejs";

// Revokes only THIS session's token (other devices stay signed in) and clears
// the cookie, so the next /super request fails the gate and lands on sign-in.
//
// PUBLIC RATHER THAN super, deliberately. Signing out must work even when the
// session is already invalid — asking for a valid one first would answer 401 to
// somebody trying to clear a cookie, which is the one moment that answer helps
// nobody.
export const POST = route({ auth: "public", name: "super/logout" }, async () => {
  const token = (await cookies()).get(SUPER_COOKIE)?.value;
  if (token) await logoutSuper(token);

  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", clearedSuperCookie());
  return res;
});
