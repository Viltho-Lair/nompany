import { cookies } from "next/headers";
import { logout, clearedSessionCookie, SESSION_COOKIE } from "@/platform/auth/identity";

export const runtime = "nodejs";

// Revokes only THIS session (other devices stay signed in) and clears the cookie.
export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await logout(token);
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", clearedSessionCookie());
  return res;
}
