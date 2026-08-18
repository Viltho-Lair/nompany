import {
  qualityGuard, moveRevision, startRevision, setSigners,
  listRevisions, listAudit, TRANSITIONS,
} from "@/lib/quality";
import { can } from "@/lib/access";
import { listCollaborators } from "@/lib/data/collaborators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

const status = (error) => {
  if (error === "forbidden") return 403;
  if (error === "unknown-permission") return 500;
  if (error === "notfound" || error === "no-revision") return 404;
  // Every one of these is the DATA saying no, not the request being malformed:
  // the revision is not in a state this move applies to, one is already open,
  // the document is withdrawn, or the person is about to sign their own review.
  if (["wrong-state", "already-open", "obsolete", "same-signer"].includes(error)) return 409;
  return 400;
};

// The workflow panel's one read: every revision, the trail, and — the part that
// matters — WHICH MOVES ARE AVAILABLE TO THIS PERSON RIGHT NOW.
//
// Computed here from the same TRANSITIONS table the service enforces, so a
// button is only ever drawn where pressing it would succeed. A screen that
// works out for itself what ought to be possible is a second copy of the rules,
// and the two copies disagree the first time either changes.
export async function GET(request, ctx) {
  const g = await qualityGuard(ctx.params);
  if (g.fail) return g.fail;

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "missing" }, { status: 400 });

  const [revisions, trail, people] = await Promise.all([
    listRevisions(g, id), listAudit(g, id), listCollaborators(g.studio.id),
  ]);
  const open = revisions.find((r) => !["effective", "superseded"].includes(r.state));
  const effective = revisions.find((r) => r.state === "effective");
  const state = open?.state || (effective ? "effective" : "");

  const available = Object.entries(TRANSITIONS)
    .filter(([, move]) => move.from.includes(state) && can(g.access, move.permission))
    .map(([action, move]) => ({ action, label: move.label }));

  return Response.json({
    revisions: revisions.map((r) => ({
      id: r.id, rev: r.rev, state: r.state, updatedAt: r.updatedAt, effectiveDate: r.effectiveDate || "",
      review: r.review || null, approval: r.approval || null, rejection: r.rejection || null,
    })),
    trail: trail.slice(0, 80),
    available,
    // Somebody who may start the next revision, on a document that has one
    // issued and nothing open. Separate from `available` because it creates a
    // revision rather than moving one.
    canStartRevision: Boolean(effective && !open && can(g.access, "quality.documents.edit")),
    people: people.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" })),
  });
}

export async function POST(request, ctx) {
  const g = await qualityGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  if (b.action === "start-revision") {
    const result = await startRevision(g, b.id);
    if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
    return Response.json({ ok: true, revision: result.revision }, { status: 201 });
  }

  if (b.action === "signers") {
    const result = await setSigners(g, b.id, b);
    if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
    return Response.json({ ok: true, document: result.document });
  }

  const result = await moveRevision(g, b.id, b.action, b);
  if (result.error) {
    return Response.json({ error: result.error, state: result.state }, { status: status(result.error) });
  }
  return Response.json({ ok: true, revision: result.revision });
}
