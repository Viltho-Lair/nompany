import { redirect } from "next/navigation";
import { currentSuperAdmin } from "@/platform/auth/superAuth";
import { readPulse, readPulseLive } from "@/lib/data/pulseRead";
import PulseWall from "./PulseWall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Pulse" };

// THE PULSE WALL, full-bleed.
//
// IT GATES ITSELF, and that is the one thing to be careful about here. Every
// other console screen sits under (shell), whose layout calls currentSuperAdmin
// and redirects — but this is in (full), the group that also holds the SIGN-IN,
// so its layout deliberately checks nothing. A page added here without this call
// is a page served to anybody who types the URL.
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
  if (!(await currentSuperAdmin())) redirect("/super");

  const [initial, initialLive] = await Promise.all([readPulse("30d"), readPulseLive()]);
  return <PulseWall initial={initial} initialLive={initialLive} />;
}
