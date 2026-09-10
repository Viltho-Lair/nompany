import { readPulse, readPulseLive } from "@/lib/data/pulseRead";
import PulseWall from "./PulseWall";

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
export default async function PulsePage() {
  const [initial, initialLive] = await Promise.all([readPulse("30d"), readPulseLive()]);
  return <PulseWall initial={initial} initialLive={initialLive} />;
}
