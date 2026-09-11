// THE STUDIO'S PLACES ON ONE MAP, each pin opening the way there.
//
// Drawn through the app's single Google loader (lib/googleMaps) — a script tag
// at runtime, so this file ships a few kilobytes and the map itself none. It is
// behind a `nextDynamic` boundary in LocationsPanel regardless, so a studio
// with no pinned place never downloads even that.
//
// NO CLUSTERING YET. A studio's registered places number in the tens, which a
// map shows legibly as they are; clustering is a library and a decision for
// the day Maintenance puts every asset on here too.
"use client";
import { useEffect, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
import { loadGoogleMaps, defaultMapOptions, NOT_CONFIGURED } from "@/lib/googleMaps";
import { navigationLinks } from "@/shared/places";
import { Empty } from "@/components/studio2/ui";

// THE POPUP IS BUILT FROM NODES, NEVER FROM A STRING. A place's name is
// whatever the tenant typed, and InfoWindow.setContent takes HTML — handed a
// template literal it would render a name like `<img onerror=…>` as markup.
// `textContent` cannot.
function popup(place, dir) {
  const root = document.createElement("div");
  root.dir = dir;
  root.style.cssText = "min-width:170px;font:13px/1.45 system-ui,sans-serif;color:#0f172a";
  const name = document.createElement("div");
  name.textContent = place.name;
  name.style.fontWeight = "700";
  const kind = document.createElement("div");
  kind.textContent = place.kind || "";
  kind.style.color = "#64748b";
  // WHAT IS AT THIS PLACE — one line each, as text nodes like everything else
  // here. Maintenance hands in its open work orders; Master data hands none.
  const lines = document.createElement("div");
  for (const t of place.lines || []) {
    const d = document.createElement("div");
    d.textContent = t;
    d.style.cssText = "margin-top:3px";
    lines.append(d);
  }
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:12px;margin-top:6px";
  const links = navigationLinks(place.at);
  for (const [label, href] of [["Google Maps", links.google], ["Waze", links.waze]]) {
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = label;
    a.style.cssText = "color:#1d4ed8;font-weight:600;text-decoration:none";
    row.append(a);
  }
  root.append(name, kind, lines, row);
  return root;
}

export default function PlacesMap({ slug, places }) {
  const locale = useStudioLocale();
  const tr = operationsDict(locale);
  const box = useRef(null);
  const gRef = useRef(null);
  const mapRef = useRef(null);
  const infoRef = useRef(null);
  const markers = useRef([]);
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");
  // REDRAWN WHEN THE PLACES CHANGE, NOT WHEN THE PARENT RENDERS. A caller
  // builds `places` fresh each render, so keying the redraw on the array
  // re-fitted the map on every keystroke in a dialog beside it and threw away
  // wherever the reader had panned to. The signature is what the pins actually
  // show; the latest array is read through a ref.
  const latest = useRef(places);
  useEffect(() => { latest.current = places; });
  const signature = JSON.stringify(places.map((p) => [p.id, p.at.lat, p.at.lng, p.name, p.kind || "", p.lines || []]));

  useEffect(() => {
    let alive = true;
    loadGoogleMaps(slug, { language: locale })
      .then((g) => {
        if (!alive || !box.current) return;
        gRef.current = g;
        mapRef.current = new g.maps.Map(box.current, defaultMapOptions());
        infoRef.current = new g.maps.InfoWindow();
        setReady(true);
      })
      .catch((e) => {
        if (!alive) return;
        if (e?.code === NOT_CONFIGURED) setConfigured(false);
        else setError(e.message);
      });
    return () => { alive = false; };
  }, [slug, locale]);

  // REDRAWN WHOLE, not diffed. Tens of pins, redrawn only when the list
  // changes; keeping a marker per id in step with edits is bookkeeping that
  // buys nothing at this size.
  useEffect(() => {
    const g = gRef.current, map = mapRef.current;
    if (!ready || !g || !map) return;
    for (const m of markers.current) m.setMap(null);
    markers.current = [];
    const bounds = new g.maps.LatLngBounds();
    const dir = locale === "ar" ? "rtl" : "ltr";
    const places = latest.current;
    for (const place of places) {
      const position = { lat: place.at.lat, lng: place.at.lng };
      const marker = new g.maps.Marker({ map, position, title: place.name });
      marker.addListener("click", () => {
        infoRef.current.setContent(popup(place, dir));
        infoRef.current.open({ anchor: marker, map });
      });
      markers.current.push(marker);
      bounds.extend(position);
    }
    // ONE PLACE IS A STREET, NOT A CONTINENT. fitBounds on a single point zooms
    // to the API's maximum, which shows a rooftop and nothing around it.
    if (places.length === 1) { map.setCenter(bounds.getCenter()); map.setZoom(15); }
    else if (places.length > 1) map.fitBounds(bounds, 60);
  }, [ready, signature, locale]);

  if (!configured) return <Empty title={tr.noMapConfigured} body={tr.listBelowStillWorks} />;
  return (
    <>
      <div ref={box} className="h-[360px] w-full overflow-hidden rounded-geex" />
      {error && <p className="p-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </>
  );
}
