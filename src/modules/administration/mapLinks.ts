// FOLLOWING A SHORT MAP LINK — the one part of placing a site that needs the
// network, and so the one part that is not in shared/places.
//
// Google Maps' Share button produces `https://maps.app.goo.gl/<id>`, which is
// the commonest thing anybody pastes and carries no coordinate at all until it
// is followed. The redirect's `Location` usually does (`?q=lat,lng` for a
// dropped pin, `!3d…!4d…` for a place). A share of a named business sometimes
// redirects to a search by name instead — then there is no pair to read, the
// link is kept, and the row says "no pin" rather than guessing.
//
// THIS IS A REQUEST OUR SERVER MAKES ON A TENANT'S SAY-SO, which is why it is
// narrow in every direction:
//
// - it starts only from a URL `isShortMapsLink` accepts — two exact hosts, https;
// - it never follows a redirect automatically (`redirect: "manual"`), and
//   continues only to Google's own map hosts, so a short link cannot be made to
//   point the server at anything else;
// - it reads a HEADER and never a body;
// - it gives up after two hops and 2.5 seconds each, because it runs inside a
//   save and a slow link must cost the person saving a moment, not a timeout.
//
// A failure of any kind is "no coordinate", never an error: the location saves
// either way, and the link is still there to click.
import { isShortMapsLink, parseCoordinates, type LatLng } from "@/shared/places";

const FOLLOW = new Set(["maps.app.goo.gl", "goo.gl", "maps.google.com", "www.google.com", "google.com"]);
const HOPS = 2;
const TIMEOUT_MS = 2500;

export async function resolveShortMapsLink(url: string): Promise<LatLng | null> {
  if (!isShortMapsLink(url)) return null;
  let current = url;
  for (let hop = 0; hop < HOPS; hop++) {
    let next: string | null;
    try {
      const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
      next = res.headers.get("location");
      // Nothing of the body is wanted; release the connection rather than
      // leaving it for the garbage collector.
      await res.body?.cancel().catch(() => {});
    } catch {
      return null;
    }
    if (!next) return null;
    const found = parseCoordinates(next);
    if (found) return found;
    let u: URL;
    try { u = new URL(next, current); } catch { return null; }
    if (u.protocol !== "https:" || !FOLLOW.has(u.hostname)) return null;
    current = u.toString();
  }
  return null;
}
