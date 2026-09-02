import { route } from "@/platform/http/route";
import { operationsContext } from "@/modules/operations/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE MAPS KEY, HANDED TO A MEMBER RATHER THAN BUILT INTO THE BUNDLE.
//
// THIS DOES NOT MAKE THE KEY SECRET, and nothing here should be read as
// claiming it does. The Maps JavaScript API takes its key as a URL parameter on
// a script tag the browser fetches, so the key is in the network tab of anyone
// who opens the map. What this route changes is WHO can pick it up: with the
// NEXT_PUBLIC_ prefix Next inlined the value into the static client bundle,
// readable by anyone who could fetch a JS file and never revocable without a
// rebuild. Now it leaves the server only for somebody operationsContext has
// already admitted to this studio's Operations section.
//
// The control that actually protects the key is still the HTTP-referrer
// restriction on it in Google Cloud Console. Treat this route as narrowing the
// audience, not as a secret store.
//
// DELIBERATELY NOT `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: that prefix is precisely
// what makes Next inline a value at build time, which is the thing this route
// exists to avoid. Renaming it back would re-open the bundle and leave this
// route answering with an empty string.
const spec = { auth: "studio", context: operationsContext, name: "field-service-maps-key" };

export const GET = route(spec, async () => ({
  // "" RATHER THAN A REFUSAL when the variable is unset. A studio with no key
  // is a studio with no map, and the screen already renders that state; turning
  // a missing setting into an error would break a screen whose list works fine
  // without it.
  key: process.env.NEXT_GOOGLE_MAPS_API_KEY || "",
}));
