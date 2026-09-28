import { route } from "@/platform/http/route";
import { readPlatformSince, latestPlatformId, isCursor } from "@/platform/realtime/events";
import { subscribe, CH } from "@/platform/realtime/bus";
import { sseResponse, resumeCursor } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// The console's live feed.
//
// Same machinery as a studio's stream, minus the hard part: there is no
// per-event permission filtering here because the audience is nompany's owners,
// who can already see every studio and every user. The console's whole purpose
// is the unfiltered view.
//
// The gate is the one that matters, though, and it is the same one the (shell)
// layout applies: a valid `nc_super` session, checked against the stored token
// list server-side. The edge only knows whether the cookie exists.
//
// THE HANDLER RETURNS A Response AND THE WRAPPER PASSES IT STRAIGHT THROUGH.
// That matters here: the body is a stream that stays open for minutes, so
// nothing may read or buffer it. The completion line therefore records when the
// connection was ESTABLISHED, not when it closed, which is the honest reading of
// a request whose response has barely begun when the handler returns.
export const GET = route({ auth: "super", name: "super/stream" }, async ({ request }) => {
  return sseResponse(request, async (conn) => {
    // LISTEN FIRST, DELIVER AFTER `ready` — the studio stream's fix, 28/09/2026,
    // for the same reason: a subscription starts from "now", so subscribing
    // after the replay let anything published during it reach nobody, and the
    // four-minute recycle opened that window on a schedule. Frames heard early
    // are held until `ready` has gone out; one the replay already carried is
    // dropped by id.
    let flowing = false;
    const held: Array<() => void> = [];
    const replayed = new Set<string>();

    // One channel carries both: platform events (what happened) and owner
    // notifications (what someone should be told about it). They are told apart
    // by `kind`, because every owner is entitled to both and splitting them
    // across two channels would double the subscriptions for no gain.
    const release = await subscribe(CH.super, (raw) => {
      // Platform events and owner notifications share the channel and are told
      // apart by `kind`; the bus hands over JSON and nothing more.
      const e = (raw || {}) as { kind?: string; id?: string };
      const send = () => {
        if (!conn.open) return;
        // A NOTIFICATION IS SENT WITHOUT A FRAME ID. Its `id` is `ntf_…`, not a
        // log cursor, and a frame id becomes the browser's Last-Event-ID: one
        // notice arriving made the next reconnect resume from a value
        // `isCursor` rejects, so the replay was skipped and every event in the
        // gap was lost.
        if (e.kind === "notif") return conn.send("notif", e);
        if (e.id && replayed.has(e.id)) return;
        conn.send("change", e, e.id);
      };
      if (flowing) send(); else held.push(send);
    });

    const since = resumeCursor(request);
    let cursor = since;

    if (isCursor(since)) {
      for (let page = 0; page < 10 && conn.open; page++) {
        const out = await readPlatformSince(cursor);
        cursor = out.cursor || cursor;
        for (const e of out.events) {
          if (e.id) replayed.add(e.id);
          conn.send("change", e, e.id);
        }
        if (!out.truncated) break;
      }
    } else {
      cursor = await latestPlatformId();
    }

    conn.send("ready", { cursor }, cursor);
    flowing = true;
    for (const fn of held.splice(0)) fn();
    return release;
  });
});
