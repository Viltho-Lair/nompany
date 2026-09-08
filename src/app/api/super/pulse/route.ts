import { route } from "@/platform/http/route";
import { readPulse } from "@/lib/data/pulseRead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE PULSE WALL'S SLOW HALF: everything measured in days.
//
// A NEW READ OF DATA THAT ALREADY EXISTED, not new collection — the same
// `stat:day:*` hashes /api/track has written all along, plus the studio
// registry. Nothing was added to what this product records about anybody in
// order to draw the wall.
//
// The composition lives in lib/data/pulseRead so that the Server Component
// painting the wall's first frame and this route refreshing it afterwards
// cannot drift apart about what any figure means.
export const GET = route({ auth: "super", name: "super/pulse" }, async ({ request }) => {
  const range = new URL(request.url).searchParams.get("range");
  return Response.json(await readPulse(range));
});
