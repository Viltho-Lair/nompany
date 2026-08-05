import { login, SESSION_COOKIE } from "@/lib/auth";
import { notifyLogin } from "@/lib/loginNotify";

export const runtime = "nodejs";

// 8 hours by default, 30 days when "Remember me" is checked.
const DEFAULT_MAX_AGE = 60 * 60 * 8;
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  // Accept both `userId` (new) and `username` (legacy client field name).
  const userId = body.userId ?? body.username;
  const { password, remember } = body;

  const user = await login(userId, password);
  if (!user) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Fire-and-forget: notify the user by email that their account was signed in.
  // Never awaited — mail delivery must not delay or block the login response.
  notifyLogin(user, request).catch(() => {});

  const maxAge = remember ? REMEMBER_MAX_AGE : DEFAULT_MAX_AGE;
  // Secure flag on production (HTTPS) — the local dev server runs on http, so
  // we detect the scheme rather than hardcode.
  const isHttps = request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
  const secureAttr = isHttps ? "; Secure" : "";
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${user.sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureAttr}`
  );
  return res;
}
