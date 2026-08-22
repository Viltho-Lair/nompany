import { refused } from "@/platform/http/route";
import { currentUser } from "@/platform/auth/identity";
import { createStudioForUser, studiosForUser } from "@/lib/studios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The studios this person can reach: the ONE they own + the ones they were
// approved into (derived from ix:collab — never a stored second copy).
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await studiosForUser(user.id));
}

// Create the studio this user owns. 0..1 per user, verified email required, and
// the slug (company code) must be free — all enforced in the data layer.
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }

  const result = await createStudioForUser(user, { name: body.name, slug: body.slug });
  if (refused(result)) {
    const status = result.error === "unverified" ? 403
      : result.error === "already-owner" || result.error === "slug-taken" ? 409
      : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json(
    { ok: true, studio: result.studio, sections: (result.sections || []).map((s) => ({ id: s.id, key: s.key, name: s.name })) },
    { status: 201 }
  );
}
