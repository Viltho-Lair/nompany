"use client";

// Single Google Maps JS loader for the whole app — inject the script once and
// resolve to `window.google`. The key is a NEXT_PUBLIC_ env var; it is a browser
// key restricted by HTTP referrer in the Cloud Console, never a server secret.
// If a map is ever needed elsewhere, import this — do not add a second <script>
// or a second key.
//
// UNLIKE THE OLD SYSTEM, there is no hard geographic clamp. That product served
// one company in one city and pinned every map inside Riyadh; this one is
// multi-tenant, and a studio in Jeddah or Dubai would find its own people
// unplottable. The map opens on whatever it is given and lets the viewer move.

// Held so concurrent callers share one script tag, and nulled on failure so a
// later attempt can retry rather than resolving forever against a script that
// never loaded.
let promise: Promise<unknown> | null = null;

export function googleMapsKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

// `window.google` IS INJECTED BY A SCRIPT TAG, so nothing in this repository
// declares it. Narrowed at the one place that reads it rather than declared
// globally: a global would let any file assume Maps had loaded, which is the
// thing this loader exists to make impossible.
type MapsWindow = Window & { google?: { maps?: unknown } };

export function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps can only load in the browser."));
  const w = window as MapsWindow;
  if (w.google && w.google.maps) return Promise.resolve(w.google);
  if (promise) return promise;

  const key = googleMapsKey();
  if (!key) return Promise.reject(new Error("Google Maps is not configured."));

  promise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
    s.async = true;
    s.defer = true;
    s.onload = () => (w.google && w.google.maps
      ? resolve(w.google)
      : reject(new Error("Google Maps failed to initialise.")));
    // Null the promise on failure so a later attempt can retry rather than
    // resolving forever against a script that never loaded.
    s.onerror = () => { promise = null; reject(new Error("Failed to load Google Maps.")); };
    document.head.appendChild(s);
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
