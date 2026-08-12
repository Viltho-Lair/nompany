import { currentUser } from "@/lib/identity";
import { studioContext, canAdminister, canViewSection } from "@/lib/studios";
import { listSections, listGrants } from "@/lib/data/sections";
import { readSince, latestId, isCursor, SCOPE } from "@/lib/data/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHAT CHANGED SINCE I LAST LOOKED.
//
// The client holds a cursor and asks this route what has happened after it. The
// answer carries NO record data — only "something in this section changed" —
// so the client decides whether to refetch the section it is actually showing.
// That is the whole point: one small request replaces re-fetching every board
// on a timer, and a page only reloads when its own data really moved.
//
// Called with no cursor, it returns the CURRENT position and no events, so a
// freshly opened page starts from "now" instead of replaying history.
//
// PERMISSIONS ARE APPLIED PER EVENT, not per studio. The log is studio-wide but
// the audience is not: someone with no grant on Finance must not learn that
// Finance is busy. Section events are gated by the same canViewSection() the
// section's own API uses, and people/permission events are admin-only.
export async function GET(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) {
    return Response.json(
      { error: context.error },
      { status: context.error === "notfound" ? 404 : context.error === "unauthorized" ? 401 : 403 },
    );
  }
  const { studio, collaborator } = context;

  const since = new URL(request.url).searchParams.get("since") || "";
  // A malformed cursor is treated as "no cursor" rather than an error: the
  // client recovers by adopting the position we hand back.
  if (since && !isCursor(since)) {
    return Response.json({ cursor: await latestId(studio.id), events: [], reset: true });
  }
  if (!since) {
    return Response.json({ cursor: await latestId(studio.id), events: [] });
  }

  const [sections, grants] = await Promise.all([listSections(studio.id), listGrants(studio.id)]);
  const admin = canAdminister(studio, collaborator);
  const viewable = new Set(
    sections.filter((s) => canViewSection(studio, collaborator, s.id, grants)).map((s) => s.id),
  );
  // SectionID → key, so the client can match an event to the board it renders
  // without having to know the studio's section ids.
  const keyOf = new Map(sections.map((s) => [s.id, s.key]));

  const { cursor, events, truncated } = await readSince(studio.id, since, (e) =>
    e.scope === SCOPE.PEOPLE ? admin : viewable.has(e.sectionId),
  );

  return Response.json({
    cursor,
    truncated,
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      scope: e.scope,
      section: keyOf.get(e.sectionId) || "",
      collection: e.collection,
      at: e.at,
    })),
  });
}
