import { refused, type Guarded } from "@/platform/http/route";
import type { StudioMembership } from "@/lib/studios";
import { currentUser } from "@/platform/auth/identity";
import {
  studioContext, canAdminister, listJoinRequests,
  approveJoinRequest, declineJoinRequest,
} from "@/lib/studios";
import { getUserById, getProfile } from "@/platform/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(slugPromise: Promise<Record<string, string>>): Promise<Guarded<StudioMembership>> {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await slugPromise;
  const context = await studioContext(user, slug);
  if (context.error) {
    return { fail: Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 }) };
  }
  if (!canAdminister(context.access)) {
    return { fail: Response.json({ error: "forbidden" }, { status: 403 }) };
  }
  return context;
}

// Pending requests to join this studio, with just enough about each requester
// for the owner to decide (name + email — nothing from their other studios).
export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;

  const pending = await listJoinRequests(g.studio.id);
  const requests = await Promise.all(pending.map(async (r) => {
    const [u, p] = await Promise.all([getUserById(r.userId), getProfile(r.userId)]);
    return { id: r.id, createdAt: r.createdAt, email: u?.email || "", fullName: p?.fullName || "" };
  }));
  return Response.json({ requests });
}

// Approve (creates the Collaborator row — their identity inside THIS studio)
// or decline. Only the owner or a studio admin may decide.
export async function POST(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }
  if (!body.requestId) return Response.json({ error: "missing" }, { status: 400 });

  // `actorAccess` travels so approval can refuse to hand out more than the
  // approver holds — the same escalation check the People screen applies.
  const common = {
    studio: g.studio, actingCollaborator: g.collaborator,
    actorAccess: g.access, requestId: String(body.requestId),
  };
  const result = body.action === "decline"
    ? await declineJoinRequest(common)
    : await approveJoinRequest({ ...common, alias: body.alias, role: body.role });

  if (refused(result)) {
    // `limit` rides along so the refusal can say what the ceiling actually is
    // instead of leaving the studio to guess.
    return Response.json(
      { error: result.error, ...(result.limit !== undefined ? { limit: result.limit } : {}) },
      { status: result.error === "notfound" ? 404 : result.error === "escalation" ? 403 : 400 },
    );
  }
  return Response.json({
    ok: true,
    approved: body.action !== "decline",
    collaborator: result.collaborator ? { id: result.collaborator.id, alias: result.collaborator.alias, role: result.collaborator.role } : null,
  });
}
