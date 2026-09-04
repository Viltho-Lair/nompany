import { refused } from "@/platform/http/route";
import { currentUser } from "@/platform/auth/identity";
import { createStudioForUser, studiosForUser } from "@/lib/studios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The studios this person can reach: the ones they OWN (derived from the registry
// row's ownerUserId) + the ones they were approved into (derived from ix:collab).
// Neither is a stored second copy.
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await studiosForUser(user.id));
}

// Create a studio this user will own. Two on the default package, unlimited on
// any other; verified email required; the slug (company code) must be free — all
// enforced in the data layer, none of it re-decided here.
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }

  const result = await createStudioForUser(user, { name: body.name, slug: body.slug });
  if (refused(result)) {
    const status = result.error === "unverified" ? 403
      : result.error === "free-studio-limit" || result.error === "slug-taken" ? 409
      : 400;
    // `limit` rides along on the cap refusal so the dialog can say what the
    // ceiling actually is rather than hardcoding a number that would drift —
    // the same shape the member-limit refusal uses.
    return Response.json(
      // `"limit" in result` rather than `result.limit !== undefined`. The two
      // refusal arms are a union and only ONE carries `limit`, so reading the
      // property to test it is an error on the arm that lacks it — tsc was red
      // on exactly this. The `in` operator narrows the union instead of
      // assuming every arm has the field.
      { error: result.error, ...("limit" in result ? { limit: result.limit } : {}) },
      { status },
    );
  }
  return Response.json(
    { ok: true, studio: result.studio, sections: (result.sections || []).map((s) => ({ id: s.id, key: s.key, name: s.name })) },
    { status: 201 }
  );
}
