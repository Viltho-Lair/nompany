import { route } from "@/platform/http/route";
import { listPresence } from "@/platform/auth/users";
import { listStudios } from "@/modules/main/studios";
import { activeNow, arrivalsFeed } from "@/lib/data/pulse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE PULSE WALL'S FAST HALF: who is here, and who has just arrived.
//
// SEPARATE FROM /api/super/pulse BECAUSE THE TWO MOVE AT DIFFERENT SPEEDS. The
// aggregate reads thirty day-hashes; re-reading all of them to learn one count
// would be the whole slow half paid again on every tick, which is how a wall
// left on all day turns into a load profile.
//
// AND IT IS STILL NOT A TWO-SECOND POLL. `lastSeenAt` is stamped on a THREE
// MINUTE throttle (SEEN_THROTTLE_MS) — that is the ceiling on how fresh this
// answer can be however often it is asked, so a two-second poll would read one
// document per user to re-learn a number that cannot have moved. The wall polls
// in tens of seconds and lets the ANIMATION carry the liveness: ripples, the
// clock and the eased numbers keep moving between reads, which is honest,
// because what is being animated is the arrival of information rather than a
// claim that it just happened.
//
// NO STREAM, NO SOCKET, NO SECOND REAL-TIME SYSTEM. The product's event stream
// (platform/realtime) is per-studio and carries tenant rows; a console screen
// watching every tenant's traffic would be a cross-tenant subscription built for
// a dashboard, which is a much larger decision than a wall.

export const GET = route({ auth: "super", name: "super/pulse/live" }, async () => {
  const [presence, studios] = await Promise.all([listPresence(), listStudios()]);

  const now = Date.now();
  return Response.json({
    asOf: new Date(now).toISOString(),
    // A real zero when nobody is around — this is a count of stamps inside a
    // window, and an empty product at 3am is a fact rather than a gap.
    activeNow: activeNow(presence.map((p) => p.lastSeenAt), now),
    people: presence.length,
    studios: studios.length,
    // Studio names are the companies' own; a person is a masked handle and never
    // an email. A wall is a screen in a room, and rooms have visitors.
    arrivals: arrivalsFeed(studios as { name?: unknown; createdAt?: unknown; country?: unknown }[], presence),
  });
});
