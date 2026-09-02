"use client";

// Single Google Maps JS loader for the whole app — fetch the key, inject the
// script once, resolve to `window.google`. If a map is ever needed elsewhere,
// import this — do not add a second <script> or a second key.
//
// THE KEY IS FETCHED FROM THE SERVER, NOT INLINED. It used to be
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, and that prefix is what makes Next bake a
// value into the static client bundle — readable by anyone who could fetch a JS
// file, and not revocable without a rebuild. It now comes from
// `/api/studios/<slug>/operations/maps-key`, which answers only somebody the
// operations context has already admitted to the studio.
//
// THAT DOES NOT MAKE IT SECRET. The Maps JS API takes the key as a URL
// parameter on a script tag, so it is in the network tab of everybody who sees
// a map. The narrowing is real (anonymous visitors and the bundle no longer
// have it) and the protection is still the HTTP-referrer restriction on the key
// in Google Cloud Console.
//
// UNLIKE THE OLD SYSTEM, there is no hard geographic clamp. That product served
// one company in one city and pinned every map inside Riyadh; this one is
// multi-tenant, and a studio in Jeddah or Dubai would find its own people
// unplottable. The map opens on whatever it is given and lets the viewer move.

// Held so concurrent callers share one script tag, and nulled on failure so a
// later attempt can retry rather than resolving forever against a script that
// never loaded.
let promise: Promise<unknown> | null = null;

/**
 * WHY A STUDIO'S SCREEN ASKS FOR THE KEY rather than reading it: the route that
 * answers is membership-gated, so the slug is what makes the question
 * answerable at all. Memoised per page load — one fetch however many maps the
 * screen builds — and nulled on failure so a retry is a retry rather than a
 * cached refusal.
 */
let keyPromise: Promise<string> | null = null;

export function googleMapsKey(slug: string): Promise<string> {
  if (keyPromise) return keyPromise;
  keyPromise = (async () => {
    const res = await fetch(`/api/studios/${encodeURIComponent(slug)}/operations/maps-key`, { cache: "no-store" });
    // A REFUSAL IS NOT "UNCONFIGURED". 403 means this person may not see the
    // map, which is a different thing from the studio not having one, and
    // flattening the two would tell somebody a map exists nowhere when it
    // exists everywhere but for them.
    if (!res.ok) throw new Error("Google Maps could not be loaded.");
    const data = (await res.json()) as { key?: unknown };
    return String(data?.key || "");
  })();
  keyPromise = keyPromise.catch((e) => { keyPromise = null; throw e; });
  return keyPromise;
}

/**
 * The refusal a caller must be able to tell apart: the studio has no key, so
 * there is no map to build and nothing has gone wrong. The screen renders its
 * "no map configured" panel on this and an error on anything else.
 */
export const NOT_CONFIGURED = "maps/not-configured";
const notConfigured = () =>
  Object.assign(new Error("Google Maps is not configured."), { code: NOT_CONFIGURED });

// `window.google` IS INJECTED BY A SCRIPT TAG, so nothing in this repository
// declares it. Narrowed at the one place that reads it rather than declared
// globally: a global would let any file assume Maps had loaded, which is the
// thing this loader exists to make impossible.
type MapsWindow = Window & { google?: { maps?: unknown } };

// The callback slot is written by NAME, so it needs an index signature — but
// putting one on MapsWindow would make every `window.anything` typed as
// `unknown` rather than an error, which is a worse trade than one narrow view
// used by the two lines that need it.
type NamedGlobals = Record<string, unknown>;

// THE READY SIGNAL, and why it is a callback rather than `script.onload`.
//
// `loading=async` (below) is not the same thing as `script.async = true`. The
// attribute tells the BROWSER not to block parsing; the parameter tells the
// MAPS API to bootstrap its libraries asynchronously — which is what stops the
// console warning, and which also means `onload` now fires while
// `window.google.maps` is still being assembled. The one caller does
// `new g.maps.Map(...)` on the resolved value, so resolving a moment early
// would be a TypeError rather than a slow map.
//
// `callback=` is the documented signal for exactly that, and it needs a name on
// `window` because the API calls it by string. The name is unique per attempt so
// a retry after a failed load cannot be resolved by the previous script tag.
let callbackSeq = 0;

export function loadGoogleMaps(slug: string) {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps can only load in the browser."));
  const w = window as MapsWindow;
  if (w.google && w.google.maps) return Promise.resolve(w.google);
  if (promise) return promise;

  promise = new Promise((resolve, reject) => {
    const cb = `__nompanyMapsReady${++callbackSeq}`;
    const globals = w as unknown as NamedGlobals;
    const done = () => { delete globals[cb]; };
    // Null the promise on any failure so a later attempt can retry rather than
    // resolving forever against a script that never loaded.
    const fail = (err: Error) => { done(); promise = null; reject(err); };

    googleMapsKey(slug).then((key) => {
      if (!key) return fail(notConfigured());

      globals[cb] = () => {
        done();
        if (w.google && w.google.maps) resolve(w.google);
        else fail(new Error("Google Maps failed to initialise."));
      };

      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${cb}`;
      s.async = true;
      s.defer = true;
      s.onerror = () => fail(new Error("Failed to load Google Maps."));
      document.head.appendChild(s);
    }, fail);
  });
  return promise;
}

// A sensible starting view when nothing has reported a position yet: zoomed
// out far enough to be honest about knowing nothing, rather than pointing
// confidently at the wrong city.
export function defaultMapOptions(extra = {}) {
  return {
    center: { lat: 24.7136, lng: 46.6753 },
    zoom: 5,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    ...extra,
  };
}
