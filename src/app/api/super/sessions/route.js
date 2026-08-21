import { cookies } from "next/headers";
import { route } from "@/lib/route";
import { listSuperSessions, revokeSuperSession, SUPER_COOKIE } from "@/lib/superAuth";
import { hashToken } from "@/lib/passwords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHERE THIS CONSOLE IS SIGNED IN, and a way to end any of it.
//
// superAuth has kept `sessionTokens` with digests and expiries since C-5, which
// is the data a real list needs — and nothing has ever rendered it. The console's
// Security tab showed three hardcoded rows instead, which is worse than showing
// nothing: a list of sessions that is not the sessions reads as reassurance.
//
// THE COOKIE IS READ HERE, not passed by the wrapper. The wrapper resolves the
// ADMIN — who you are — and deliberately hands the handler nothing that could
// authenticate on its own. But "which of these rows is the browser I am reading
// this on" can only be answered by the token itself, so this route asks the jar
// for it and compares digests. Nothing about the token leaves the server.
const spec = { auth: "super", name: "super/sessions" };

const currentToken = async () => (await cookies()).get(SUPER_COOKIE)?.value || "";

export const GET = route(spec, async ({ admin }) => ({
  sessions: await listSuperSessions(admin.id, await currentToken()),
}));

export const DELETE = route({ ...spec, body: true }, async ({ admin, body }) => {
  const tokenHash = String(body.tokenHash || "");
  if (!tokenHash) return { error: "missing" };

  // ENDING YOUR OWN CURRENT SESSION IS ALLOWED — it is just signing out, and
  // refusing it would be a rule with no reason behind it. The client is told
  // which one it was so it can send the person back to the door rather than
  // leaving them on a console they no longer have.
  const isCurrent = tokenHash === hashToken(await currentToken());

  // Scoped to this admin inside revokeSuperSession, not here: one console owner
  // must not be able to sign another out by naming a digest they saw.
  const done = await revokeSuperSession(admin.id, tokenHash);
  if (!done) return { error: "notfound" };

  return { ok: true, wasCurrent: isCurrent };
});
