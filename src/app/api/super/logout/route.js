import { cookies } from "next/headers";
import { logoutSuper, clearedSuperCookie, SUPER_COOKIE } from "@/lib/superAuth";

export const runtime = "nodejs";

// Revokes only THIS session's token (other devices stay signed in) and clears
// the cookie, so the next /super request fails the gate and lands on sign-in.
export async function POST() {
  const token = (await cookies()).get(SUPER_COOKIE)?.value;
  if (token) await logoutSuper(token);
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", clearedSuperCookie());
  return res;
}
