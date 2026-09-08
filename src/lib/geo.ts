// CITY GEOGRAPHY, as a stored key and back again.
//
// The edge hands us `x-vercel-ip-city` plus a latitude and longitude on every
// request, free and with no lookup. This module is the one place that decides
// what of it is kept, how it is written down, and how it is read back — so the
// ingest and the dashboard cannot disagree about the format, and the rounding
// rule lives in exactly one place.
//
// WHY A COMPOSITE FIELD NAME rather than a city table. A counter hash gives us
// one string per city per day; putting the country, the name and the centroid IN
// that string means the map needs a single read and there is no second structure
// to keep in step with whatever the edge decides to call a place. The cost is
// that a city whose centroid moves becomes a new field — which is the honest
// outcome, since it is then a different point on the map.
//
// TWO DECIMALS, AND THAT IS THE PRIVACY DECISION. It is roughly a kilometre, and
// it is not a rounded-off person: Vercel resolves an IP to the CITY CENTRE, so
// every visitor from one city already reports the same coordinate. Rounding
// keeps it that way when a provider gets more precise, so the stored point can
// never drift towards a household.

export const CITY_SEP = "|";

// A field name, or "" when the edge told us nothing useful. Nothing is invented:
// no city means no city, and the visit is still counted by continent above.
export function cityKeyFrom(
  country: unknown,
  city: unknown,
  latitude: unknown,
  longitude: unknown,
): string {
  const cc = String(country || "").trim().toUpperCase();
  // RFC3986-encoded by the edge, because a city name is not ASCII in most of the
  // world. Decoding can throw on a malformed sequence, which is a header we did
  // not write and must not take the request down.
  let name = "";
  try { name = decodeURIComponent(String(city || "")).trim(); } catch { name = String(city || "").trim(); }
  const lat = round2(latitude);
  const lng = round2(longitude);
  if (!/^[A-Z]{2}$/.test(cc) || !name || lat === null || lng === null) return "";
  // The separator cannot appear inside a segment, or the parse below would split
  // one city into two. A name carrying it is cleaned rather than dropped.
  const clean = name.split(CITY_SEP).join(" ").slice(0, 60);
  return `${cc}${CITY_SEP}${clean}${CITY_SEP}${lat}${CITY_SEP}${lng}`;
}

function round2(value: unknown): number | null {
  // EMPTY IS NOT ZERO, and `Number` disagrees: Number("") and Number(null) are
  // both 0, and 0 is a perfectly finite latitude. A missing header therefore
  // rounded to a point off the coast of Africa and was WRITTEN as one — the
  // Atlantic bug, arriving at ingest rather than at render, where no amount of
  // care in the reader could have caught it. Found by tests/geo-model.mjs
  // asserting the claim this module's own header makes.
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export type CityPoint = { country: string; city: string; lat: number; lng: number };

// The inverse, tolerant of anything already stored: a field that does not parse
// is skipped rather than drawn at (0, 0), which is a real place in the Atlantic
// and the classic way a broken map still looks like a map.
export function cityFromKey(key: unknown): CityPoint | null {
  const parts = String(key || "").split(CITY_SEP);
  if (parts.length !== 4) return null;
  const [country, city, latText, lngText] = parts;
  const lat = Number(latText);
  const lng = Number(lngText);
  if (!/^[A-Z]{2}$/.test(country) || !city) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { country, city, lat, lng };
}
