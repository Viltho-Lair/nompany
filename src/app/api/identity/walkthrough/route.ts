import { route } from "@/platform/http/route";
import { walkthroughFor, markTourSeen, setTourOff } from "@/platform/auth/walkthrough";
import { isTour } from "@/shared/walkthrough";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NOVA'S WALKTHROUGH. GET: whether each tour shows on this request. POST:
//   { tour, action: "seen" }  — shown in this sign-in; it returns at the next
//   { tour, action: "off" }   — "don't show this again", on the profile
//   { tour, action: "on" }    — turned back on, from the account or a studio
// The person's own preference about their own screens, so `auth: "user"` and
// nothing more — it touches no studio.
export const GET = route(
  { auth: "user", name: "identity/walkthrough" },
  async ({ user }) => walkthroughFor(user.id),
);

export const POST = route(
  { auth: "user", body: true, name: "identity/walkthrough" },
  async ({ user, body }) => {
    const { tour, action } = (body || {}) as { tour?: unknown; action?: unknown };
    if (!isTour(tour)) return { error: "bad-tour" };
    if (action === "seen") { await markTourSeen(tour); return { ok: true }; }
    if (action === "off" || action === "on") {
      return { ok: true, off: await setTourOff(user.id, tour, action === "off") };
    }
    return { error: "bad-action" };
  },
);
