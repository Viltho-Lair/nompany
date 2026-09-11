// DROP A PIN — the way to place a site nobody is standing at.
//
// "Use my location" answers only for somebody on the spot, and a typed pair
// needs a phone that was. This is for the office: click where the gate is,
// drag the pin until it sits on it. What it hands back is a coordinate the
// tenant chose, which is theirs to store outright — unlike a geocoded address.
"use client";
import { useEffect, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
import { loadGoogleMaps, defaultMapOptions, NOT_CONFIGURED } from "@/lib/googleMaps";
import { roundCoord } from "@/shared/places";

export default function PinPicker({ slug, value, around = [], onPick }) {
  const locale = useStudioLocale();
  const tr = operationsDict(locale);
  const box = useRef(null);
  const gRef = useRef(null);
  const mapRef = useRef(null);
  const pin = useRef(null);
  // THE LATEST HANDLER, read by listeners bound once. Rebinding the map's click
  // listener on every render would stack them; reading a stale closure would
  // hand the pick to a form state that no longer exists.
  const pick = useRef(onPick);
  useEffect(() => { pick.current = onPick; }, [onPick]);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let alive = true;
    loadGoogleMaps(slug, { language: locale })
      .then((g) => {
        if (!alive || !box.current) return;
        gRef.current = g;
        const map = new g.maps.Map(box.current, { ...defaultMapOptions(), draggableCursor: "crosshair" });
        mapRef.current = map;
        // WHERE TO OPEN: the pin being edited, else the studio's other places
        // (a new site is usually near the others), else the default view.
        if (value) { map.setCenter(value); map.setZoom(16); }
        else if (around.length) {
          const b = new g.maps.LatLngBounds();
          for (const p of around) b.extend(p);
          if (around.length === 1) { map.setCenter(b.getCenter()); map.setZoom(13); } else map.fitBounds(b, 40);
        }
        const hand = (e) => pick.current({ lat: roundCoord(e.latLng.lat()), lng: roundCoord(e.latLng.lng()) });
        map.addListener("click", hand);
        setReady(true);
      })
      .catch((e) => {
        if (!alive) return;
        setProblem(e?.code === NOT_CONFIGURED ? tr.listBelowStillWorks : e.message);
      });
    return () => { alive = false; };
    // Built once per open; `value` and `around` only choose the opening view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, locale]);

  // The pin follows the field, whichever way the field changed — a click here,
  // a drag, "Use my location", or a pair typed by hand.
  useEffect(() => {
    const g = gRef.current, map = mapRef.current;
    if (!ready || !g || !map) return;
    if (!value) { pin.current?.setMap(null); pin.current = null; return; }
    if (!pin.current) {
      pin.current = new g.maps.Marker({ map, position: value, draggable: true });
      pin.current.addListener("dragend", (e) => pick.current({ lat: roundCoord(e.latLng.lat()), lng: roundCoord(e.latLng.lng()) }));
    } else pin.current.setPosition(value);
  }, [ready, value]);

  if (problem) return <p className="text-sm text-slate-500 dark:text-slate-400">{problem}</p>;
  return (
    <div>
      <div ref={box} className="h-[280px] w-full overflow-hidden rounded-xl border border-slate-200 dark:border-white/10" />
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{tr.pickOnMapHint}</p>
    </div>
  );
}
