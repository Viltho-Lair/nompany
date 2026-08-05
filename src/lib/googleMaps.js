"use client";

// Single Google Maps JS loader for the whole app — inject the script once and
// resolve to `window.google`. The key is a NEXT_PUBLIC_ env var (same pattern as
// NEXT_PUBLIC_SITE_URL); it is a browser key restricted by HTTP referrer in the
// Cloud Console, never a server secret. If a Maps loader is ever needed
// elsewhere, import this — do not add a second <script> or key.
let promise = null;

export const RIYADH_BOUNDS = { north: 25.10, south: 24.30, east: 47.10, west: 46.35 };
export const RIYADH_CENTER = { lat: 24.7136, lng: 46.6753 };

export function googleMapsKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

export function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps can only load in the browser."));
  if (window.google && window.google.maps) return Promise.resolve(window.google);
  if (promise) return promise;
  const key = googleMapsKey();
  if (!key) return Promise.reject(new Error("Google Maps is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY."));
  promise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
    s.async = true;
    s.defer = true;
    s.onload = () => (window.google && window.google.maps ? resolve(window.google) : reject(new Error("Google Maps failed to initialise.")));
    s.onerror = () => { promise = null; reject(new Error("Failed to load Google Maps.")); };
    document.head.appendChild(s);
  });
  return promise;
}

// Shared map options — Riyadh-restricted, hard-clamped, min zoom 10.
export function riyadhMapOptions(extra = {}) {
  return {
    center: RIYADH_CENTER,
    zoom: 12,
    minZoom: 10,
    restriction: { latLngBounds: RIYADH_BOUNDS, strictBounds: true },
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    ...extra,
  };
}

export function insideRiyadh(lat, lng) {
  return lat >= RIYADH_BOUNDS.south && lat <= RIYADH_BOUNDS.north && lng >= RIYADH_BOUNDS.west && lng <= RIYADH_BOUNDS.east;
}
