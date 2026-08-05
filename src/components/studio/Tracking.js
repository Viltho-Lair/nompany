"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { loadGoogleMaps, riyadhMapOptions, insideRiyadh, googleMapsKey } from "@/lib/googleMaps";

const card = "rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const STALE_MS = 5 * 60 * 1000; // a fix older than this is "stale"

const toneClass = {
  live: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  stop: "text-red-600 dark:text-red-400",
  idle: "text-slate-500 dark:text-slate-400",
};
const ageText = (iso) => {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
};

export default function Tracking() {
  const [tab, setTab] = useState("main");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/users/me", { cache: "no-store" });
        const me = r.ok ? (await r.json())?.user : null;
        setIsAdmin(Array.isArray(me?.tags) && me.tags.includes("admin"));
      } catch { /* fail closed for the Map tab */ }
      finally { setLoading(false); }
    })();
  }, []);

  // Non-admins can never sit on the Map tab.
  useEffect(() => { if (!isAdmin && tab === "map") setTab("main"); }, [isAdmin, tab]);

  if (loading) return <div className="p-10 text-center text-sm text-slate-400">Loading…</div>;

  return (
    <div className="-mb-8 flex h-[calc(100vh-5rem)] min-h-[520px] flex-col gap-4">
      <div className="min-w-0 flex-1 overflow-hidden">
        {tab === "map" && isAdmin ? <MapSheet /> : <MainSheet />}
      </div>

      {/* Sheet tabs */}
      <div className="z-10 flex shrink-0 flex-wrap items-center gap-1 rounded-t-geex border border-b-0 border-slate-200/70 bg-white p-2 shadow-[0_-8px_22px_-14px_rgba(20,30,72,0.16)] dark:border-white/10 dark:bg-[#20202c]">
        {[{ key: "main", label: "Main" }, ...(isAdmin ? [{ key: "map", label: "Map" }] : [])].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-t-md border px-4 py-1.5 text-sm font-600 transition-colors ${tab === t.key ? "border-brand-500 bg-brand-500/10 text-brand-800 dark:border-brand-400 dark:text-brand-200" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:bg-[#191921] dark:text-slate-300 dark:hover:bg-white/5"}`}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function KeyMissing() {
  return (
    <div className={`${card} flex h-full items-center justify-center p-10 text-center text-sm text-slate-500 dark:text-slate-400`}>
      Google Maps isn&apos;t configured yet. Set <code className="mx-1 rounded bg-slate-100 px-1 dark:bg-white/10">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> (referrer-restricted) to enable the map.
    </div>
  );
}

// ---- Main: the user's own location -----------------------------------------
function MainSheet() {
  const mapRef = useRef(null);
  const gRef = useRef(null);
  const mapObj = useRef(null);
  const marker = useRef(null);
  const circle = useRef(null);
  const watchId = useRef(null);
  const lastSent = useRef(0);
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState({ text: "Waiting for permission", tone: "idle" });
  const [fix, setFix] = useState(null);
  const [mapError, setMapError] = useState("");

  // Create the Riyadh map on mount (before any geolocation).
  useEffect(() => {
    let alive = true;
    loadGoogleMaps()
      .then((g) => {
        if (!alive || !mapRef.current) return;
        gRef.current = g;
        mapObj.current = new g.maps.Map(mapRef.current, riyadhMapOptions());
      })
      .catch((e) => alive && setMapError(e.message));
    return () => { alive = false; };
  }, []);

  const draw = useCallback((lat, lng, accuracy) => {
    const g = gRef.current, map = mapObj.current;
    if (!g || !map) return;
    const point = { lat, lng };
    if (!marker.current) {
      marker.current = new g.maps.Marker({
        map, position: point, title: "You",
        icon: { path: g.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#059669", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      });
      circle.current = new g.maps.Circle({
        map, center: point, radius: accuracy || 0,
        strokeColor: "#059669", strokeOpacity: 0.5, strokeWeight: 1, fillColor: "#059669", fillOpacity: 0.12, clickable: false,
      });
      map.panTo(point);
    } else {
      marker.current.setMap(map);
      marker.current.setPosition(point);
      circle.current.setCenter(point);
      circle.current.setRadius(accuracy || 0);
    }
  }, []);

  const send = useCallback((lat, lng, accuracy) => {
    if (Date.now() - lastSent.current < 10000) return; // ≤ 1 write / 10s
    lastSent.current = Date.now();
    fetch("/api/tracking-positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, accuracy, timestamp: Date.now() }),
      keepalive: true,
    }).catch(() => { /* retry on next fix */ });
  }, []);

  const onFix = useCallback((pos) => {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    setFix({ lat, lng, accuracy, at: pos.timestamp });
    if (!insideRiyadh(lat, lng)) {
      setStatus({ text: "Outside the Riyadh coverage area", tone: "warn" });
      if (marker.current) marker.current.setMap(null);
      return;
    }
    setStatus({ text: "Live", tone: "live" });
    draw(lat, lng, accuracy);
    send(lat, lng, accuracy);
  }, [draw, send]);

  const onFail = useCallback((err) => {
    const msg = { 1: "Permission denied — enable location for this site.", 2: "Position unavailable — no GPS or network fix.", 3: "Timed out waiting for a fix." };
    setStatus({ text: msg[err.code] || "Location error", tone: "stop" });
  }, []);

  const beginWatch = useCallback(() => {
    if (!("geolocation" in navigator)) { setStatus({ text: "This browser doesn't support location.", tone: "stop" }); return; }
    if (!window.isSecureContext) { setStatus({ text: "Location needs HTTPS.", tone: "stop" }); return; }
    setStatus({ text: "Acquiring signal…", tone: "warn" });
    watchId.current = navigator.geolocation.watchPosition(onFix, onFail, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
  }, [onFix, onFail]);

  const start = () => { setStarted(true); beginWatch(); };

  // Pause the watch when the page is hidden; resume when visible again.
  useEffect(() => {
    if (!started) return;
    const onVis = () => {
      if (document.hidden) {
        if (watchId.current !== null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
        setStatus({ text: "Paused — page not in focus", tone: "warn" });
      } else if (watchId.current === null) {
        beginWatch();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [started, beginWatch]);

  // Cleanup on unmount.
  useEffect(() => () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); }, []);

  if (!googleMapsKey()) return <KeyMissing />;

  return (
    <div className={`${card} relative flex h-full flex-col overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <h2 className="font-display text-base font-700 text-slate-900 dark:text-white">My location</h2>
        <span className={`text-sm font-600 ${toneClass[status.tone]}`}>{status.text}</span>
      </div>

      <div className="relative flex-1">
        <div ref={mapRef} className="absolute inset-0" />
        {mapError && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-600 dark:text-red-400">{mapError}</div>}
        {!started && !mapError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-6">
            <div className="max-w-sm rounded-geex border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-white/10 dark:bg-[#20202c]">
              <h3 className="mb-2 font-display text-lg font-700 text-slate-900 dark:text-white">Share your location</h3>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">This shows your position on the Riyadh map and sends it to dispatch while this page is open. Nothing is collected when the page is closed.</p>
              <button onClick={start} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-600 text-white transition-colors hover:bg-brand-950">Start sharing</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-5 border-t border-slate-200 px-4 py-2.5 text-sm tabular-nums text-slate-500 dark:border-white/10 dark:text-slate-400">
        <span>Latitude <b className="font-600 text-slate-800 dark:text-slate-100">{fix ? fix.lat.toFixed(5) : "—"}</b></span>
        <span>Longitude <b className="font-600 text-slate-800 dark:text-slate-100">{fix ? fix.lng.toFixed(5) : "—"}</b></span>
        <span>Accuracy <b className="font-600 text-slate-800 dark:text-slate-100">{fix ? `${Math.round(fix.accuracy)} m` : "—"}</b></span>
        <span>Updated <b className="font-600 text-slate-800 dark:text-slate-100">{fix ? new Date(fix.at).toLocaleTimeString("en-GB") : "—"}</b></span>
      </div>
    </div>
  );
}

// ---- Map: the team dispatch view (admin) -----------------------------------
function MapSheet() {
  const mapRef = useRef(null);
  const gRef = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef({}); // userRef -> google Marker
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let alive = true;
    loadGoogleMaps()
      .then((g) => {
        if (!alive || !mapRef.current) return;
        gRef.current = g;
        mapObj.current = new g.maps.Map(mapRef.current, riyadhMapOptions());
      })
      .catch((e) => alive && setMapError(e.message));
    return () => { alive = false; };
  }, []);

  const render = useCallback((list) => {
    const g = gRef.current, map = mapObj.current;
    if (!g || !map) return;
    const seen = new Set();
    for (const r of list) {
      if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
      seen.add(r.userRef);
      const stale = Date.now() - new Date(r.recordedAt).getTime() > STALE_MS;
      const color = stale ? "#9ca3af" : "#059669";
      const title = `${r.name} — ${stale ? `stale · ${ageText(r.recordedAt)}` : "live"}`;
      const pos = { lat: r.lat, lng: r.lng };
      let m = markers.current[r.userRef];
      if (!m) {
        m = new g.maps.Marker({ map, position: pos });
        markers.current[r.userRef] = m;
      }
      m.setPosition(pos);
      m.setTitle(title);
      m.setLabel({ text: r.name, fontSize: "11px", fontWeight: "700", color: stale ? "#6b7280" : "#065f46" });
      m.setIcon({ path: g.maps.SymbolPath.CIRCLE, scale: 8, fillColor: color, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 });
    }
    // Drop markers for users no longer present.
    for (const id of Object.keys(markers.current)) {
      if (!seen.has(id)) { markers.current[id].setMap(null); delete markers.current[id]; }
    }
  }, []);

  const fetchLatest = useCallback(async () => {
    try {
      const r = await fetch("/api/tracking-positions/latest", { cache: "no-store" });
      if (r.status === 403) { setError("Dispatch map is admin-only."); return; }
      if (!r.ok) throw new Error("Could not load positions.");
      const list = await r.json();
      setRows(list);
      setError("");
      render(list);
    } catch (e) { setError(e.message); }
  }, [render]);

  // Poll on load + every 20s.
  useEffect(() => {
    fetchLatest();
    const t = setInterval(fetchLatest, 20000);
    return () => clearInterval(t);
  }, [fetchLatest]);

  if (!googleMapsKey()) return <KeyMissing />;

  return (
    <div className={`${card} relative flex h-full flex-col overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <h2 className="font-display text-base font-700 text-slate-900 dark:text-white">Dispatch map</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">{rows.length} team member{rows.length === 1 ? "" : "s"} · refreshes every 20s</span>
        {error && <span className="text-sm font-600 text-red-600 dark:text-red-400">{error}</span>}
      </div>

      <div className="relative flex-1">
        <div ref={mapRef} className="absolute inset-0" />
        {mapError && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-600 dark:text-red-400">{mapError}</div>}
      </div>

      {/* Roster with live/stale + age */}
      <div className="max-h-40 shrink-0 overflow-auto border-t border-slate-200 dark:border-white/10">
        {rows.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-400">No positions reported yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {[...rows].sort((a, b) => (b.recordedAt || "").localeCompare(a.recordedAt || "")).map((r) => {
              const stale = Date.now() - new Date(r.recordedAt).getTime() > STALE_MS;
              return (
                <li key={r.userRef} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stale ? "bg-slate-400" : "bg-emerald-500"}`} />
                    <span className="truncate font-600 text-slate-800 dark:text-slate-100">{r.name}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-600 ${stale ? "text-slate-400" : "text-emerald-600 dark:text-emerald-400"}`}>{stale ? `stale · ${ageText(r.recordedAt)}` : `live · ${ageText(r.recordedAt)}`}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
