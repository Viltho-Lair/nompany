import { route } from "@/platform/http/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE MAPS KEY, HANDED TO A MEMBER RATHER THAN BUILT INTO THE BUNDLE.
//
// IT MOVED OUT OF OPERATIONS, and membership is now the whole gate. It lived at
// `operations/maps-key` behind `operationsContext` while Tracking was the only
// map — which meant a map anywhere else in the studio had no key for anybody
// Field Operations was not granted to. Master data's locations draw one now, a
// person who may edit the studio's places need hold no rota rights at all, and
// Maintenance will draw the next. A key per department would be the same key
// behind several doors; the studio guard every shell request already passes is
// the door.
//
// THAT WIDENING GIVES NOTHING AWAY, because this is not tenant data (invariant
// 2 is about a studio's CONTENTS). The key is the platform's, identical for
// every studio, and it was never secret: the Maps JavaScript API takes it as a
// URL parameter on a script tag, so it is in the network tab of anyone who
// opens a map. What this route prevents is the NEXT_PUBLIC_ prefix inlining it
// into the static bundle for anybody who could fetch a JS file. The control
// that actually protects it is the HTTP-referrer restriction on the key in
// Google Cloud Console.
//
// DELIBERATELY NOT `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: that prefix is precisely
// what makes Next inline a value at build time. Renaming it back would re-open
// the bundle and leave this route answering with an empty string.
export const GET = route({ auth: "studio", name: "studios/maps-key" }, async () => ({
  // "" RATHER THAN A REFUSAL when the variable is unset. A studio with no key
  // is a studio with no map, and every map screen already renders that state;
  // turning a missing setting into an error would break a list that works fine
  // without it.
  key: process.env.NEXT_GOOGLE_MAPS_API_KEY || "",
}));
