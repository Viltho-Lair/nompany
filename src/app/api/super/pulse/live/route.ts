import { route } from "@/platform/http/route";
import { readPulseLive } from "@/lib/data/pulseRead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE PULSE WALL'S FAST HALF: who is here, and who has just arrived.
//
// SEPARATE FROM /api/super/pulse BECAUSE THE HALVES MOVE AT DIFFERENT SPEEDS.
// The aggregate reads thirty day-hashes; re-reading them to learn one count
// would be the whole slow half paid again on every tick, which is what a wall
// left on all day would do to the store.
//
// AND IT IS STILL NOT A TWO-SECOND POLL. `lastSeenAt` is stamped on a THREE
// MINUTE throttle (SEEN_THROTTLE_MS) — the ceiling on how fresh this answer can
// be however often it is asked. The wall polls in tens of seconds and lets the
// ANIMATION carry the liveness, which is honest: what is animated is the
// arrival of information, not a claim that it just happened.
//
// NO STREAM, NO SOCKET, NO SECOND REAL-TIME SYSTEM. The product's event stream
// (platform/realtime) is per-studio and carries tenant rows; a console screen
// watching every tenant would be a cross-tenant subscription built for a
// dashboard, which is a far larger decision than a wall.
export const GET = route({ auth: "super", name: "super/pulse/live" }, async () => {
  return Response.json(await readPulseLive());
});
