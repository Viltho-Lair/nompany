// WHERE A PLACE IS, asserted without a database or a map.
//
// Every assertion here is a way a pin ends up somewhere it is not: a pasted
// link read for the wrong pair of numbers, a street number mistaken for a
// coordinate, a phone's (0, 0) saved as a site in the Gulf of Guinea. The map
// cannot show any of these as wrong — it draws a pin wherever it is told.
import {
  parseCoordinates, validLatLng, roundCoord, isShortMapsLink,
  navigationLinks, placeCoordinates, geoPatch, formatLatLng,
} from "../src/shared/places.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};
const at = (p) => (p ? `${p.lat},${p.lng}` : "null");
const is = (p, lat, lng) => Boolean(p) && Math.abs(p.lat - lat) < 1e-9 && Math.abs(p.lng - lng) < 1e-9;

// ---- what counts as a coordinate --------------------------------------------
ok("an ordinary pair is valid", is(validLatLng(31.9539, 35.9106), 31.9539, 35.9106));
ok("latitude beyond 90 is refused", validLatLng(91, 35) === null);
ok("longitude beyond 180 is refused", validLatLng(31, 181) === null);
ok("a non-number is refused", validLatLng("north", 35) === null);
// NULL ISLAND. (0, 0) is what a broken capture or an unset field hands back,
// and nobody runs a site in the sea off West Africa — refusing it costs no
// real studio anything and catches every silent default.
ok("(0, 0) is refused as the tell of a default, not a place", validLatLng(0, 0) === null);
ok("numeric strings are read as numbers", is(validLatLng("31.95", "35.91"), 31.95, 35.91));
ok("six decimals are kept, the seventh is not", roundCoord(31.95391234) === 31.953912);

// ---- typed text ---------------------------------------------------------------
ok("\"lat, lng\" is read", is(parseCoordinates("31.9539, 35.9106"), 31.9539, 35.9106));
ok("a space-separated pair is read", is(parseCoordinates("31.9539 35.9106"), 31.9539, 35.9106));
// THE ARABIC COMMA. An Arabic keyboard types ، where an English one types a
// comma, so a pair typed in Arabic must read the same as one typed in English.
ok("an Arabic comma separates a pair too", is(parseCoordinates("31.9539، 35.9106"), 31.9539, 35.9106));
ok("negative coordinates are read", is(parseCoordinates("-33.8688, 151.2093"), -33.8688, 151.2093));
// AN ADDRESS IS NOT A COORDINATE. "Building 12, 45 Mecca Street" has two
// numbers in it, and reading them as a pin would put a site at (12, 45) —
// somewhere in the Horn of Africa — with no error anywhere.
ok("numbers inside an address are not a coordinate", parseCoordinates("Building 12, 45 Mecca Street") === null);
ok("a pair out of range is not a coordinate", parseCoordinates("120, 35") === null);
ok("empty text is nothing", parseCoordinates("") === null && parseCoordinates("   ") === null);

// ---- pasted links -------------------------------------------------------------
ok("a Google directions link is read", is(parseCoordinates(
  "https://www.google.com/maps/dir/?api=1&destination=31.9539,35.9106"), 31.9539, 35.9106));
ok("a Google search link with q= is read", is(parseCoordinates(
  "https://maps.google.com/?q=31.9539,35.9106"), 31.9539, 35.9106));
ok("an encoded comma is read", is(parseCoordinates(
  "https://www.google.com/maps/search/?api=1&query=31.9539%2C35.9106"), 31.9539, 35.9106));
ok("a viewport link (@lat,lng,zoom) is read", is(parseCoordinates(
  "https://www.google.com/maps/@31.9539,35.9106,15z"), 31.9539, 35.9106));
// THE PIN BEATS THE VIEWPORT. A place link carries both the camera (@...) and
// the place itself (!3d...!4d...); the camera is wherever the sharer had
// scrolled to, which can be streets away from the building.
ok("a place link is read for the PIN, not the camera", is(parseCoordinates(
  "https://www.google.com/maps/place/Rainbow+St/@31.9500,35.9000,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d31.9539!4d35.9106"),
  31.9539, 35.9106), at(parseCoordinates("https://www.google.com/maps/place/Rainbow+St/@31.9500,35.9000,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d31.9539!4d35.9106")));
ok("a Waze link is read", is(parseCoordinates("https://waze.com/ul?ll=31.9539,35.9106&navigate=yes"), 31.9539, 35.9106));
ok("an Apple Maps link is read", is(parseCoordinates("https://maps.apple.com/?daddr=31.9539,35.9106&dirflg=d"), 31.9539, 35.9106));
ok("a geo: URI is read", is(parseCoordinates("geo:31.9539,35.9106;u=20"), 31.9539, 35.9106));
ok("a link with no scheme is still read", is(parseCoordinates("maps.google.com/?q=31.9539,35.9106"), 31.9539, 35.9106));
// A SEARCH BY NAME CARRIES NO PLACE. Guessing from it would be geocoding, which
// is a different service with different terms; the honest answer is "none".
ok("a link that searches by name has no coordinate", parseCoordinates("https://maps.google.com/?q=Rainbow+Street+Amman") === null);
ok("a malformed percent-escape does not throw", parseCoordinates("https://maps.google.com/?q=%E0%A4%A") === null);

// ---- short links --------------------------------------------------------------
ok("a maps.app.goo.gl link is a short link", isShortMapsLink("https://maps.app.goo.gl/AbCdEf123"));
ok("a goo.gl/maps link is a short link", isShortMapsLink("https://goo.gl/maps/AbCdEf123"));
// ONLY THESE HOSTS. The server follows a short link to read the coordinates
// out of where it points, so anything else answering true here is a request
// the server makes to a host a tenant chose.
ok("a look-alike host is not a short link", !isShortMapsLink("https://maps.app.goo.gl.evil.example/x"));
ok("plain http is not followed", !isShortMapsLink("http://maps.app.goo.gl/AbCdEf123"));
ok("a full Google link is not a short link", !isShortMapsLink("https://www.google.com/maps/@31.95,35.91,15z"));

// ---- navigating there ---------------------------------------------------------
const links = navigationLinks({ lat: 31.9539, lng: 35.9106 });
ok("Google directions use api=1 and the destination",
  links.google === "https://www.google.com/maps/dir/?api=1&destination=31.9539,35.9106", links.google);
ok("Waze navigates straight away", links.waze === "https://waze.com/ul?ll=31.9539,35.9106&navigate=yes", links.waze);
ok("Apple Maps asks for driving directions", links.apple === "https://maps.apple.com/?daddr=31.9539,35.9106&dirflg=d", links.apple);
ok("the geo: URI is plain", links.geo === "geo:31.9539,35.9106", links.geo);
// NOTHING A TENANT TYPED GOES INTO THE URL. These links are opened on Google's,
// Waze's and Apple's servers; a site's name or its client's would be written
// into their logs.
ok("no link carries a label", Object.values(navigationLinks({ lat: 1.5, lng: 2.5, name: "Client HQ" })).every((u) => !/Client/.test(u)));
ok("coordinates format to six decimals at most", formatLatLng({ lat: 31.953912345, lng: 35.91 }) === "31.953912, 35.91");

// ---- where a stored location is ---------------------------------------------
ok("stored coordinates win", is(placeCoordinates({ lat: 31.9, lng: 35.9, mapUrl: "https://maps.google.com/?q=30,30" }), 31.9, 35.9));
// A LINK TYPED BEFORE COORDINATES EXISTED STILL PLACES THE SITE. Every studio
// that already pasted a map link gets its pin without a migration; the next
// save stores it.
ok("an older location with only a map link is placed from the link",
  placeCoordinates({ mapUrl: "https://maps.google.com/?q=31.9539,35.9106" })?.source === "link");
ok("a location with neither is not on the map", placeCoordinates({ name: "Head office" }) === null);
ok("cleared coordinates (null) fall back to the link", is(placeCoordinates({ lat: null, lng: null, mapUrl: "geo:31.5,35.5" }), 31.5, 35.5));

// ---- what a write stores ------------------------------------------------------
{
  const r = geoPatch({ lat: "31.95391234", lng: 35.9106, accuracyM: 12.6, geoSource: "gps" });
  ok("a captured fix is stored rounded, with its accuracy and source",
    !r.error && r.patch.lat === 31.953912 && r.patch.lng === 35.9106 && r.patch.accuracyM === 13 && r.patch.geoSource === "gps",
    JSON.stringify(r));
}
ok("an unknown source is stored as typed", geoPatch({ lat: 31.9, lng: 35.9, geoSource: "satellite" }).patch?.geoSource === "typed");
ok("accuracy is dropped for a pin — a pin has none", geoPatch({ lat: 31.9, lng: 35.9, accuracyM: 30, geoSource: "pin" }).patch?.accuracyM === null);
ok("half a pair is refused", geoPatch({ lat: 31.9 }).error === "coordinates");
ok("an impossible pair is refused", geoPatch({ lat: 95, lng: 35.9 }).error === "coordinates");
{
  const r = geoPatch({ lat: null, lng: null });
  ok("both null clears the pin, and everything that described it",
    !r.error && r.patch.lat === null && r.patch.lng === null && r.patch.accuracyM === null && r.patch.geoSource === null, JSON.stringify(r));
}
// EMPTIED BESIDE A LINK IS THE LINK'S. `placeCoordinates` falls back to the
// link on read, so storing "no pin" here would give a row that says No pin
// while the map draws one from its link — two answers to one question.
ok("emptied coordinates beside a link take the link's pin, as the map would",
  geoPatch({ lat: "", lng: "", mapUrl: "https://maps.google.com/?q=31.9539,35.9106" }).patch?.geoSource === "link");
ok("a body that says nothing about place changes nothing", Object.keys(geoPatch({ name: "Yard" }).patch || {}).length === 0);
{
  // A LINK WITH NOTHING ELSE derives the pin — the API caller who only ever
  // sent `mapUrl` gets the same site as the screen that fills the pair in.
  const r = geoPatch({ mapUrl: "https://waze.com/ul?ll=31.9539,35.9106&navigate=yes" });
  ok("a link alone derives the pin, marked as from a link",
    !r.error && r.patch.lat === 31.9539 && r.patch.geoSource === "link", JSON.stringify(r));
}
ok("a link beside explicit coordinates does not overrule them",
  geoPatch({ lat: 31, lng: 35, mapUrl: "https://maps.google.com/?q=30,30" }).patch?.lat === 31);
ok("directions are trimmed and capped at 500", geoPatch({ directions: `  ${"x".repeat(600)}  ` }).patch?.directions.length === 500);

console.log(fails ? `\nplaces model: ${fails} failure(s)` : "\nplaces model: all passed");
process.exit(fails ? 1 : 0);
