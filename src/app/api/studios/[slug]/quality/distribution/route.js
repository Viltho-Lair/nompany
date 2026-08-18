import {
  qualityGuard, setDistribution, distributionOf, acknowledge, markRead,
  createShareLink, revokeShareLink, listShareLinks, SHARE_DEFAULT_DAYS, SHARE_MAX_DAYS,
} from "@/lib/quality";
import { can } from "@/lib/access";
import { listCollaborators } from "@/lib/data/collaborators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

const status = (error) => {
  if (error === "forbidden") return 403;
  if (error === "unknown-permission") return 500;
  if (error === "notfound") return 404;
  // The document has never been issued, so there is nothing anybody outside the
  // studio should be given. The data saying no, not a malformed request.
  if (error === "not-issued" || error === "nothing-to-acknowledge") return 409;
  return 400;
};

export async function GET(request, ctx) {
  const g = await qualityGuard(ctx.params);
  if (g.fail) return g.fail;

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "missing" }, { status: 400 });

  const [distribution, links, people] = await Promise.all([
    distributionOf(g, id),
    can(g.access, "quality.documents.share") ? listShareLinks(g, id) : Promise.resolve([]),
    listCollaborators(g.studio.id),
  ]);

  // Opening the document is how `readAt` gets set. Separate from acknowledging,
  // which only ever happens because somebody said so.
  await markRead(g, id);

  const mine = distribution.recipients.find((r) => r.collaboratorId === g.collaborator.id);
  return Response.json({
    distribution,
    links: links.map((l) => ({
      id: l.id, rev: l.rev, createdAt: l.createdAt, expiresAt: l.expiresAt,
      revokedAt: l.revokedAt, expired: l.expired, accessCount: l.accessCount,
      lastAccessAt: l.lastAccessAt || "",
      // The token is handed back so the panel can show a copyable URL. It is
      // already a secret this person is allowed to mint, so showing it to them
      // gives away nothing they could not create for themselves.
      url: l.revokedAt || l.expired ? "" : `/q/${l.token}`,
    })),
    canShare: can(g.access, "quality.documents.share"),
    canDistribute: can(g.access, "quality.documents.edit"),
    // Whether THIS reader owes an acknowledgement on the current revision.
    mine: mine ? { assigned: true, readAt: mine.readAt, acknowledgedAt: mine.acknowledgedAt } : null,
    people: people.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" })),
    shareDays: { fallback: SHARE_DEFAULT_DAYS, max: SHARE_MAX_DAYS },
  });
}

export async function POST(request, ctx) {
  const g = await qualityGuard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  // ACKNOWLEDGING IS NOT A MANAGE ACTION. Anybody a document was distributed to
  // must be able to say they have read it, and needing an edit right to do so
  // would put the record out of reach of exactly the people it is about.
  if (b.action === "acknowledge") {
    const result = await acknowledge(g, b.id);
    if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
    return Response.json({ ok: true });
  }

  if (b.action === "distribute") {
    const result = await setDistribution(g, b.id, b);
    if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
    return Response.json({ ok: true });
  }

  if (b.action === "share") {
    const result = await createShareLink(g, b.id, b);
    if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
    return Response.json({ ok: true, url: `/q/${result.link.token}`, expiresAt: result.link.expiresAt }, { status: 201 });
  }

  if (b.action === "revoke") {
    const result = await revokeShareLink(g, b.linkId);
    if (result.error) return Response.json({ error: result.error }, { status: status(result.error) });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "unknown-action" }, { status: 400 });
}
