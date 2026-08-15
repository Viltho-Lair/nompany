import { currentSuperAdmin } from "@/lib/superAuth";
import { readPlatformSince, latestPlatformId, isCursor } from "@/lib/data/events";
import { subscribe, CH } from "@/lib/data/bus";
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
export async function GET(request) {
  const admin = await currentSuperAdmin();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });

  return sseResponse(request, async (conn) => {
    const since = resumeCursor(request);
    let cursor = since;

    if (isCursor(since)) {
      for (let page = 0; page < 10 && conn.open; page++) {
        const out = await readPlatformSince(cursor);
        cursor = out.cursor || cursor;
        for (const e of out.events) conn.send("change", e, e.id);
        if (!out.truncated) break;
      }
    } else {
      cursor = await latestPlatformId();
    }

    conn.send("ready", { cursor }, cursor);
    if (!conn.open) return null;

    // One channel carries both: platform events (what happened) and owner
    // notifications (what someone should be told about it). They are told apart
    // by `kind`, because every owner is entitled to both and splitting them
    // across two channels would double the subscriptions for no gain.
    return subscribe(CH.super, (e) => {
      if (!conn.open) return;
      conn.send(e?.kind === "notif" ? "notif" : "change", e, e.id);
    });
  });
}
