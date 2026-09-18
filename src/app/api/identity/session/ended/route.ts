import { route } from "@/platform/http/route";
import { endedReason } from "@/platform/auth/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHY THIS BROWSER WAS SIGNED OUT, when it was ended rather than expired — "this
// account signed in on another device" is what the sign-in page says. Public:
// the browser asking is no longer signed in, and all it learns is the fate of
// the session its own cookie names.
export const GET = route({ auth: "public", name: "identity/session/ended" }, async () => ({
  ok: true, ended: await endedReason(),
}));
