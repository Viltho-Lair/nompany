import { currentUser } from "@/lib/identity";
import { studioContext, canAdminister } from "@/lib/studios";
import { effectivePermissions, sectionViewable } from "@/lib/access";
import { listRoles } from "@/lib/data/roles";
import { listSections } from "@/lib/data/sections";
import { readSince, latestId, isCursor, SCOPE, TYPE } from "@/lib/data/events";
import { subscribe, CH } from "@/lib/data/bus";
import { sseResponse, resumeCursor } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The connection is closed deliberately at 240s (see src/lib/sse.js), so this
// ceiling is headroom, not a target. It exists to stop a wedged connection
// living forever, not to size the normal one.
export const maxDuration = 300;

// WHAT CHANGED, PUSHED THE MOMENT IT CHANGES.
//
// This replaces the cursor-polling endpoint that used to answer the same
// question on a 30s timer. The question and the answer are unchanged — still
// "which sections moved", still no record data, still filtered per caller —
// only the timing is different: the studio's doorbell (src/lib/data/bus.js)
// wakes this connection instead of the client asking again and again.
//
// THE LOG IS STILL THE TRUTH. Pub/sub can drop a message; a stream cannot. So
// every frame carries its stream id, the browser sends that back as
// Last-Event-ID when it reconnects, and the first thing this route does is
// replay everything after it. That is what makes it safe to have removed
// polling entirely: a gap of any length — a recycle, a laptop lid, a tunnel —
// is closed by replay rather than by luck.
//
// PERMISSIONS ARE APPLIED PER EVENT, exactly as the polling route applied them.
// The log is studio-wide and the audience is not: someone with no grant on
// Finance must not learn that Finance is busy. The predicate is computed once
// at connect, because it is the same for every event on this connection — and
// when the thing it was computed from changes, the connection is closed rather
// than patched (see below).
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

  // The caller's authority, resolved once and then kept current. A connection
  // outlives the permissions it was opened with, so these are `let`: when the
  // studio's grants or membership change underneath it, they are re-resolved
  // rather than trusted (see the subscription below).
  let admin = false;
  let viewable = new Set();
  let keyOf = new Map();

  async function resolvePermissions(member) {
    const [sections, roles] = await Promise.all([
      listSections(studio.id), listRoles(studio.id),
    ]);
    // WHICH SECTIONS THIS CONNECTION MAY HEAR ABOUT. Resolved from permissions
    // like everything else — it read grants until now, so a member holding a
    // role but no legacy grant received no events at all and their screens
    // simply stopped updating, silently.
    //
    // Re-resolved on every call rather than captured once: the connection lives
    // for minutes, and access can be changed underneath it.
    const access = effectivePermissions({ studio, collaborator: member, roles });
    // Whether PEOPLE-scoped events reach this connection. Asked of the same
    // resolved set as everything else, so losing the Admin role mid-connection
    // silences them on the next re-resolve rather than leaving a stale flag on.
    admin = canAdminister(access);
    const keys = sections.map((x) => x.key);
    viewable = new Set(
      sections.filter((s) => sectionViewable(access, s.key, keys)).map((s) => s.id),
    );
    // SectionID → key, so the client can match an event to the board it renders
    // without having to know the studio's section ids. Re-read with the rest
    // because a section can be added or removed while the connection is open.
    keyOf = new Map(sections.map((s) => [s.id, s.key]));
  }

  await resolvePermissions(collaborator);

  const visible = (e) => (e.scope === SCOPE.PEOPLE ? admin : viewable.has(e.sectionId));

  // The wire shape is the polling route's shape, unchanged — the client that
  // consumed one consumes the other.
  const wire = (e) => ({
    id: e.id,
    type: e.type,
    scope: e.scope,
    section: keyOf.get(e.sectionId) || "",
    collection: e.collection,
    at: e.at,
  });

  return sseResponse(request, async (conn) => {
    // ---- catch up before listening ----------------------------------------
    // Done first so nothing that happened during the gap is missed, and so the
    // client has a cursor even if this studio never emits again.
    const since = resumeCursor(request);
    let cursor = since;

    if (isCursor(since)) {
      // Drain rather than read once: a client returning after a long absence
      // may be more than one page behind.
      for (let page = 0; page < 10 && conn.open; page++) {
        const out = await readSince(studio.id, cursor, visible);
        cursor = out.cursor || cursor;
        for (const e of out.events) conn.send("change", wire(e), e.id);
        if (!out.truncated) break;
        // More than the log will hand over at once — the client is further
        // behind than the log is long, so what it missed is partly gone.
        if (page === 9) conn.send("reset", { cursor });
      }
    } else {
      // No usable cursor: start from "now" rather than replaying history the
      // client never needed. Same rule the polling route used.
      cursor = await latestId(studio.id);
    }

    // `ready` carries the position AND stamps it as the frame id. That second
    // part matters more than it looks: Last-Event-ID is whatever id the browser
    // saw last, so without this a connection that received no changes before
    // being recycled would reconnect with no cursor and silently resume from
    // "now" — losing anything that happened in between.
    conn.send("ready", { cursor }, cursor);

    if (!conn.open) return null;

    // ---- notifications addressed to THIS person ----------------------------
    // A separate channel from the studio's, because the audience is different:
    // a studio event is "anyone here who may see this section", a notification
    // is one named person. Publishing it on the studio channel would hand a
    // copy to everyone else connected.
    const releaseNotifs = await subscribe(CH.user(user.id), (n) => {
      if (!conn.open) return;
      // Only this studio's — the same person may have a tab open on another
      // studio, and its notifications belong on that connection, not this one.
      if (n?.kind !== "notif" || (n.studioId && n.studioId !== studio.id)) return;
      conn.send("notif", n);
    });

    // ---- then listen -------------------------------------------------------
    // Permission changes are handled BEFORE the event that announced them is
    // forwarded, and serialised through this chain so two of them arriving
    // together cannot interleave their re-reads.
    let pending = Promise.resolve();

    const releaseEvents = await subscribe(CH.studio(studio.id), (e) => {
      if (!conn.open) return;

      // A grant or membership change invalidates the authority this connection
      // was opened with — including, possibly, the caller's right to be here at
      // all. Re-resolve it from the studio rather than trusting what we cached
      // at connect time.
      if (e.type === TYPE.grantsChanged || e.type === TYPE.peopleChanged) {
        pending = pending.then(async () => {
          if (!conn.open) return;
          const fresh = await studioContext(user, slug);
          // Removed from the studio, or the studio is gone: this connection has
          // no audience any more. Closing is the whole enforcement — a
          // reconnect will be turned away by the checks at the top of this
          // route.
          if (fresh.error) {
            conn.send("bye", { reason: "revoked" });
            conn.close();
            return;
          }
          await resolvePermissions(fresh.collaborator);
          if (visible(e)) conn.send("change", wire(e), e.id);
        }).catch((err) => {
          // We could not re-establish what this caller may see. Refusing to
          // guess is the only safe answer: close, and let the reconnect decide.
          console.error(`[stream] reauthorize failed on ${studio.id}: ${err.message}`);
          conn.send("bye", { reason: "reauthorize" });
          conn.close();
        });
        return;
      }

      if (visible(e)) conn.send("change", wire(e), e.id);
    });

    // Both subscriptions, released together. The bus refcounts per channel, so
    // this only really unsubscribes when the last connection on this instance
    // watching that channel has gone.
    return async () => {
      await releaseNotifs();
      await releaseEvents();
    };
  });
}
