import { route, refused } from "@/platform/http/route";
import { mySessions, endMySession } from "@/platform/auth/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHERE THIS PERSON IS SIGNED IN — each session with its device, the one this
// request came from marked — and ending one of the others. Their own session
// ends by signing out; ending it here would be a sign-out with no redirect.
const spec = { auth: "user", name: "identity/sessions", status: { current: 409 } };

export const GET = route(spec, async ({ user }) => ({
  ok: true, sessions: await mySessions(user.id),
}));

export const DELETE = route({ ...spec, body: true }, async ({ user, body }) => {
  const result = await endMySession(user.id, body.id);
  if (refused(result)) return result;
  return { ok: true };
});
