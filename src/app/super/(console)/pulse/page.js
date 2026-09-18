import { readPulse, readPulseLive } from "@/lib/data/pulseRead";
import PulseWall from "./PulseWall";
import { withRequest } from "@/platform/http/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Pulse" };

// THE PULSE WALL, full-bleed.
//
// THE GATE IS THE LAYOUT'S NOW. This page called `currentSuperAdmin()` itself,
// with a warning that a page added beside it without the same call would be
// served to anybody who typed the URL — which was right while `(full)` was the
// group holding the SIGN-IN and could not gate anything. Nine screens moved in
// beside it, so the check lives in `(console)/layout.js`: one door for the group,
// rather than nine chances to forget one silently.
//
// IT PAINTS WITH REAL NUMBERS, not skeletons. A wall spends its life on a screen
// nobody is touching; two seconds of empty panels on every reload is two seconds
// of looking broken, to a room. Both payloads are read here and handed down, and
// the client island polls from there.
//
// Reading them directly rather than fetching this app's own routes: a Server
// Component fetching its own API pays an HTTP hop to talk to itself. The
// composition lives in lib/data/pulseRead so the first paint and every refresh
// after it are computed by the same code.
//
// INSIDE withRequest, WHICH IS WHAT MAKES THE LINE ABOVE TRUE. readPulse's
// readers ask for the same day keys several times over and rely on the request
// cache to collapse them — but only API routes opened one, so on this page every
// duplicate went to the database (ten queries where two would do). The page
// opens the same scope the /api/super/pulse refresh already had. Still no
// skeleton, for the reason above; the wall is fast because it stopped asking the
// same question twice, not because it shows less.
export default async function PulsePage() {
  const [initial, initialLive] = await withRequest("super-pulse", () =>
    Promise.all([readPulse("30d"), readPulseLive()]));
  return <PulseWall initial={initial} initialLive={initialLive} />;
}
