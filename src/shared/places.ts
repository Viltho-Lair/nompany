// WHERE A PLACE IS — pure, and shared by the screen and the server on purpose.
//
// A location in Master data held a name, an address and a free-text map link,
// and nothing a machine could navigate to. This file is what turns whatever a
// person has to hand — a pair typed from a phone, a link pasted from WhatsApp,
// a pin dropped on a map — into a coordinate, and a coordinate into the three
// links that open turn-by-turn directions.
//
// COORDINATES FIRST, ADDRESSES SECOND, and that order is the region's rather
// than a preference. Amman has had street names and building numbers since
// 2007 and people still navigate by landmark; an address geocodes to the wrong
// block often enough that a site visit planned from one is a phone call from
// the gate. So the pair is what navigation and the map read, and the address
// and the directions note are for the person reading the screen.
//
// NOTHING HERE GEOCODES. Turning "Rainbow Street" into a pin is a service with
// its own terms — Google's forbid storing the result beyond thirty days, or
// showing it on anybody else's map — and a pin read out of a link the tenant
// pasted, or captured from their own phone, belongs to the tenant outright.
//
// PURE, so the screen refuses exactly what the server refuses: the form and
// `createLocation` both read `geoPatch`, and a pair the dialog calls valid is a
// pair the route stores.

export type LatLng = { lat: number; lng: number };

/**
 * How the pair was obtained. Stored beside it because "somebody stood there
 * with a phone" and "somebody typed it from memory" are not equally
 * trustworthy, and only the first has an accuracy worth keeping.
 */
export const GEO_SOURCES = ["gps", "pin", "link", "typed"] as const;
export type GeoSource = (typeof GEO_SOURCES)[number];

/** Six decimals is ~0.11 m — finer than any phone fix, and what Tracking stores. */
export const roundCoord = (n: number) => Math.round(n * 1e6) / 1e6;

const blank = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

/**
 * A pair, or null. Accepts numeric strings because a form hands over strings.
 *
 * (0, 0) IS REFUSED. It is the tell of a default — an unset field, a phone that
 * reported before it had a fix — and nobody runs a site in the Gulf of Guinea.
 * Refusing it costs no real studio anything and catches every silent zero.
 */
export function validLatLng(lat: unknown, lng: unknown): LatLng | null {
  if (blank(lat) || blank(lng)) return null;
  const a = Number(lat), b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < -90 || a > 90 || b < -180 || b > 180) return null;
  if (a === 0 && b === 0) return null;
  return { lat: roundCoord(a), lng: roundCoord(b) };
}

const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";
// THE WHOLE TEXT MUST BE A PAIR. Matching a pair anywhere inside it would read
// "Building 12, 45 Mecca Street" as (12, 45) — a pin in the Horn of Africa,
// saved without a word. The Arabic comma is a separator because an Arabic
// keyboard types it where an English one types a comma.
const PLAIN = new RegExp(`^\\s*${NUM}\\s*(?:,|،|\\s)\\s*${NUM}\\s*$`);
// THE PIN BEATS THE CAMERA. A Google place link carries both the viewport
// (`@lat,lng,zoom`) and the place itself (`!3d<lat>!4d<lng>`); the viewport is
// wherever the sharer had scrolled to, which can be streets from the building.
const PLACE_PIN = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/;
// Every provider's "the destination is" parameter: Google (destination, q,
// query, ll, center), Apple (daddr, ll, sll) and Waze (ll).
const PARAM = new RegExp(`[?&](?:destination|daddr|q|query|ll|sll|center)=${NUM}\\s*,\\s*${NUM}`, "i");
const VIEWPORT = new RegExp(`@${NUM},${NUM}`);
const GEO_URI = /^\s*geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i;

/**
 * Read a coordinate out of whatever somebody pasted: a typed pair, a Google,
 * Apple or Waze link, or a `geo:` URI (RFC 5870). Null when there is none.
 *
 * A LINK THAT SEARCHES BY NAME HAS NO COORDINATE and gets none: guessing one
 * from "Rainbow Street Amman" is geocoding, which this file does not do.
 */
export function parseCoordinates(input: unknown): LatLng | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  // A malformed escape is the tenant's clipboard, not an error worth throwing;
  // the raw text is still searched.
  let text = raw;
  try { text = decodeURIComponent(raw.replace(/\+/g, " ")); } catch { /* keep raw */ }
  for (const re of [PLAIN, PLACE_PIN, PARAM, VIEWPORT, GEO_URI]) {
    const m = text.match(re);
    if (m) {
      const p = validLatLng(m[1], m[2]);
      if (p) return p;
    }
  }
  return null;
}

/**
 * A shortened Google Maps link — what the app's Share button produces, and so
 * the commonest thing anybody pastes. It carries no coordinate until followed,
 * which only the server does (modules/administration/mapLinks).
 *
 * THIS IS AN ALLOWLIST FOR A REQUEST THE SERVER MAKES. Anything answering true
 * here is a URL fetched from our infrastructure on a tenant's say-so, so the
 * host is compared exactly and plain http is refused.
 */
export function isShortMapsLink(input: unknown): boolean {
  let u: URL;
  try { u = new URL(String(input ?? "").trim()); } catch { return false; }
  if (u.protocol !== "https:") return false;
  if (u.hostname === "maps.app.goo.gl") return u.pathname.length > 1;
  return u.hostname === "goo.gl" && u.pathname.startsWith("/maps/");
}

/** "31.953912, 35.9106" — for a field's value and for the clipboard. */
export const formatLatLng = (p: LatLng) => `${roundCoord(p.lat)}, ${roundCoord(p.lng)}`;

/**
 * Turn-by-turn from wherever the reader is, in each app. None of these needs an
 * API key: they are ordinary URLs the apps register for.
 *
 * NOTHING A TENANT TYPED GOES INTO THEM. They are opened on Google's, Waze's
 * and Apple's servers, and a site's name — or its client's — would be written
 * into their logs for nothing: the coordinate is the whole instruction.
 */
export function navigationLinks(p: LatLng) {
  const at = `${roundCoord(p.lat)},${roundCoord(p.lng)}`;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${at}`,
    waze: `https://waze.com/ul?ll=${at}&navigate=yes`,
    // The legacy parameters still work everywhere; the 2025 "unified" form's
    // names were not confirmed from Apple's own page, so this does not use them.
    apple: `https://maps.apple.com/?daddr=${at}&dirflg=d`,
    // Android offers every installed map app for this; iOS Safari ignores it.
    geo: `geo:${at}`,
  };
}

type Placeable = { lat?: unknown; lng?: unknown; geoSource?: unknown; mapUrl?: unknown };

/**
 * Where a stored location is, for the map and for Navigate.
 *
 * A LINK TYPED BEFORE COORDINATES EXISTED STILL PLACES THE SITE. Every studio
 * that had pasted a map link gets its pin on the day this ships, without a
 * migration; the next save through the form stores the pair.
 */
export function placeCoordinates(loc: Placeable | null | undefined): (LatLng & { source: GeoSource }) | null {
  if (!loc) return null;
  const stored = validLatLng(loc.lat, loc.lng);
  if (stored) {
    const source = GEO_SOURCES.includes(loc.geoSource as GeoSource) ? (loc.geoSource as GeoSource) : "typed";
    return { ...stored, source };
  }
  const linked = parseCoordinates(loc.mapUrl);
  return linked ? { ...linked, source: "link" } : null;
}

export type GeoPatch =
  | { patch: Record<string, unknown>; error?: undefined }
  | { error: "coordinates"; patch?: undefined };

/**
 * What a write stores about where a place is — the one coercion both the
 * dialog and `createLocation`/`editLocation` apply.
 *
 * - A pair: stored rounded, with its source, and an accuracy ONLY for a GPS
 *   fix — a dropped pin or a typed pair has none, and a number there would
 *   claim a precision nobody measured.
 * - No pair (absent or emptied) but a link that carries one: the link's. This
 *   is the same answer `placeCoordinates` gives on read, so a row cannot say
 *   "no pin" while the map draws one from its link.
 * - No pair and no such link, when the caller SAID something about the pair:
 *   cleared, with everything that described it.
 * - Half a pair, or one out of range: refused, never half-stored.
 */
export function geoPatch(body: Record<string, unknown> | null | undefined): GeoPatch {
  const b = body || {};
  const has = (k: string) => b[k] !== undefined;
  const patch: Record<string, unknown> = {};
  const said = has("lat") || has("lng");

  if (said && !(blank(b.lat) && blank(b.lng))) {
    const p = validLatLng(b.lat, b.lng);
    if (!p) return { error: "coordinates" };
    const source: GeoSource = GEO_SOURCES.includes(b.geoSource as GeoSource) ? (b.geoSource as GeoSource) : "typed";
    const acc = Number(b.accuracyM);
    patch.lat = p.lat;
    patch.lng = p.lng;
    patch.geoSource = source;
    patch.accuracyM = source === "gps" && Number.isFinite(acc) && acc >= 0 ? Math.min(Math.round(acc), 100000) : null;
  } else {
    const linked = has("mapUrl") ? parseCoordinates(b.mapUrl) : null;
    if (linked) {
      Object.assign(patch, { lat: linked.lat, lng: linked.lng, geoSource: "link", accuracyM: null });
    } else if (said) {
      Object.assign(patch, { lat: null, lng: null, geoSource: null, accuracyM: null });
    }
  }

  if (has("directions")) patch.directions = String(b.directions ?? "").trim().slice(0, 500);
  return { patch };
}
