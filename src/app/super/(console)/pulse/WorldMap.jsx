"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  WORLD_CAMERA, MAX_ZOOM, project, countryBoxes, boxOf, trafficBox, cameraFor, clampCamera, zoomAt,
} from "@/lib/data/pulseMap";
import { heatLevel } from "@/lib/data/pulse";

// THE DOTTED WORLD MAP, on two stacked canvases, behind a camera.
//
// `base` holds the land and whatever the current mode draws over it, redrawn
// only when the data, the mode, the theme, the size or the CAMERA changes. `fx`
// holds the ripples and the arc flights, and runs a requestAnimationFrame loop
// ONLY while one of them is in the air. They are separate because redrawing
// 3,518 dots sixty times a second to move four particles is how a wall display
// heats a room.
//
// THE GRID IS FETCHED, NOT IMPORTED. It is ~50 kB of coordinates that never
// change; importing it would inline every byte into this route's first-load
// JavaScript, where the bundle budget would rightly object. Fetched from
// /public it is one cacheable request. Since 28/09/2026 every dot also carries
// its COUNTRY (scripts/generate/pulse-dots.mjs), which is what selection,
// the country tint and the camera's framing are all built on.
//
// WHAT THIS MAP MAY SAY. Traffic is counted per continent, per country (from
// 28/09/2026; earlier days from their placed cities, and the legend says how
// many) and per city where the edge could place one. It never knows where a
// person is: a city is a centroid rounded to ~1 km, and nothing is keyed to a
// visitor.
//
// THE CAMERA MOVES ONLY WHEN SOMEBODY MOVES IT — the owner asked, 28/09/2026,
// for a map that "expands and contracts based on statistics". That was not
// built, deliberately: a frame re-fitted on every poll moves under a wall's
// viewers once a minute, makes two moments incomparable, and lets one outlier
// visit drag it across an ocean. Where the traffic is shows in the COUNTRY TINT
// at rest, and "Fit traffic" frames it on request (lib/data/pulseMap says how).
// Selecting a country frames it with its neighbourhood and opens its card;
// deselecting flies back to where the viewer was.
//
// CENTROIDS COME OUT OF THE GRID ITSELF rather than from a table of capital
// cities. A bubble for Africa should sit on the Africa that is drawn, and any
// hand-typed coordinate is one more thing that can disagree with the dots.

const HQ = { lat: 31.95, lng: 35.93 };   // Amman — where the company is
const RAMP_ALPHA = [0.22, 0.38, 0.56, 0.78, 1];
const GRID_STEP = 5.83;                  // 2.1 degrees, in grid units
const FLY_MS = 520;

// A token as canvas-ready rgba. The console stores colours as space-separated
// RGB triples ("37 99 235") precisely so an alpha can be applied at the point of
// use, which is exactly what a heat ramp needs.
function rgba(triple, alpha = 1) {
  const [r, g, b] = String(triple || "").trim().split(/\s+/);
  if (!r || !g || !b) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

function readTokens(el) {
  const cs = getComputedStyle(el);
  const v = (name) => cs.getPropertyValue(name);
  return {
    land: v("--ad-border-rgb"),
    ink: v("--ad-muted-foreground-rgb"),
    fg: v("--ad-foreground-rgb"),
    hot: v("--ad-primary-rgb"),
    warm: v("--ad-warning-rgb"),
    live: v("--ad-success-rgb"),
    card: v("--ad-card-rgb"),
  };
}

// A city's own coordinate, projected. `cities` carries the centroid the edge
// reported, so there is no lookup table here and nothing to keep in step.
//
// JITTERED BY A HASH OF THE NAME, deterministically, up to about a third of a
// degree. Two cities close together at 2dp would otherwise draw one dot on a
// 1000-unit map and read as half the traffic; and a stable offset means the same
// city sits in the same place on every render rather than shimmering between
// polls. It moves a point by roughly a city's own width — it does not pretend to
// locate anybody, which the 2dp rounding already settled at ingest.
function cityPoint(city) {
  const p = project(city.lng, city.lat);
  let h = 0;
  for (let i = 0; i < city.city.length; i += 1) h = (h * 31 + city.city.charCodeAt(i)) | 0;
  return { x: p.x + ((h % 7) - 3) * 0.45, y: p.y + (((h >> 3) % 7) - 3) * 0.45 };
}

const FLIGHT_OUT = 2200;   // origin to HQ
const FLIGHT_FADE = 1000;  // the trail fading once it has landed

// A point on the quadratic from (px,py) to (hx,hy), lifted perpendicular to
// the chord — the one curve both the still arcs and the flights follow.
function arcPoint(px, py, hx, hy, u) {
  const mx = (px + hx) / 2;
  const my = (py + hy) / 2 - Math.hypot(hx - px, hy - py) * 0.28;
  const v = 1 - u;
  return [v * v * px + 2 * v * u * mx + u * u * hx, v * v * py + 2 * v * u * my + u * u * hy];
}

const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

export default function WorldMap({
  mode, continents, cities, countries = [], countryName = (c) => c, selected = null, onSelect = () => {},
  ripples, flights = [], reducedMotion, rangeLabel,
}) {
  const wrapRef = useRef(null);
  const baseRef = useRef(null);
  const fxRef = useRef(null);
  const [grid, setGrid] = useState(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [theme, setTheme] = useState(0);
  const [hover, setHover] = useState(null);
  const [cam, setCam] = useState(WORLD_CAMERA);
  const camRef = useRef(WORLD_CAMERA);
  const flyRaf = useRef(0);
  const beforeSelect = useRef(null);
  const drag = useRef(null);
  const [grabbing, setGrabbing] = useState(false);

  // ---- the grid, once ------------------------------------------------------
  useEffect(() => {
    let live = true;
    fetch("/pulse-dots.json", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && d) setGrid(d); })
      .catch(() => { /* the wall renders without a map rather than not at all */ });
    return () => { live = false; };
  }, []);

  // ---- size ----------------------------------------------------------------
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- theme ---------------------------------------------------------------
  // The canvas reads tokens rather than classes, so it has to be told when they
  // change. Both doors: the console's own .dark toggle (a class on <html>) and
  // the OS, for a viewer who never touches the toggle.
  useEffect(() => {
    const bump = () => setTheme((n) => n + 1);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", bump);
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => { mq.removeEventListener("change", bump); mo.disconnect(); };
  }, []);

  const stride = grid?.stride || 3;

  // ---- geometry ------------------------------------------------------------
  // Centroids are the mean position of every dot of a continent, so a bubble
  // sits on the land it stands for. Computed once per grid, not per frame.
  const centroids = useMemo(() => {
    if (!grid) return {};
    const sums = {};
    for (let i = 0; i < grid.dots.length; i += stride) {
      const idx = grid.dots[i + 2];
      if (idx < 0) continue;
      const name = grid.continents[idx];
      const acc = sums[name] || (sums[name] = { x: 0, y: 0, n: 0 });
      acc.x += grid.dots[i] / grid.scale;
      acc.y += grid.dots[i + 1] / grid.scale;
      acc.n += 1;
    }
    const out = {};
    for (const [name, a] of Object.entries(sums)) out[name] = { x: a.x / a.n, y: a.y / a.n };
    return out;
  }, [grid, stride]);

  const boxes = useMemo(() => countryBoxes(grid), [grid]);

  // The whole-world fit: pixels per grid unit at z = 1.
  const baseS = useMemo(() => {
    const { w, h } = box;
    if (!w || !h) return 0;
    return Math.min((w - 24) / 1000, (h - 24) / 500);
  }, [box]);

  // The camera as drawn: clamped to the CURRENT frame, so a resize can never
  // leave the world dragged off-screen, and derived rather than stored.
  const view = useMemo(() => {
    if (!baseS) return null;
    const c = clampCamera(cam, box.w, box.h, baseS);
    const S = baseS * c.z;
    return { ...c, S, w: box.w, h: box.h };
  }, [cam, box, baseS]);

  const byName = useMemo(() => {
    const m = new Map();
    for (const c of continents || []) m.set(c.name, c);
    return m;
  }, [continents]);

  const peak = useMemo(
    () => (continents || []).reduce((n, c) => Math.max(n, c.visits || 0), 0),
    [continents],
  );

  // COUNTRY LEVELS tint the land. Where no country is known at all — a range
  // entirely from before the city counters — the continent tint is the
  // fallback, so the map still says something true rather than going blank.
  const byCountry = useMemo(() => new Map(countries.map((c) => [c.code, c.visits])), [countries]);
  const countryPeak = useMemo(() => countries.reduce((m, c) => Math.max(m, c.visits), 0), [countries]);

  // ---- the camera ------------------------------------------------------------
  // Every move goes through here: a tween in rAF, or one frame under reduced
  // motion (a jump, not a slower glide). Always in a callback, never
  // synchronously, so a selection effect calling it renders once.
  const flyTo = useCallback((target) => {
    cancelAnimationFrame(flyRaf.current);
    const from = camRef.current;
    const start = performance.now();
    const step = (now) => {
      const u = reducedMotion ? 1 : Math.min(1, (now - start) / FLY_MS);
      const e = ease(u);
      // Zoom interpolates in LOG space, so a 1x -> 8x flight does not spend
      // its first half barely moving and its second half lurching.
      const next = {
        cx: from.cx + (target.cx - from.cx) * e,
        cy: from.cy + (target.cy - from.cy) * e,
        z: Math.exp(Math.log(from.z) + (Math.log(target.z) - Math.log(from.z)) * e),
      };
      camRef.current = next;
      setCam(next);
      if (u < 1) flyRaf.current = requestAnimationFrame(step);
    };
    flyRaf.current = requestAnimationFrame(step);
  }, [reducedMotion]);

  const setNow = useCallback((next) => {
    cancelAnimationFrame(flyRaf.current);
    camRef.current = next;
    setCam(next);
  }, []);

  useEffect(() => () => cancelAnimationFrame(flyRaf.current), []);

  // SELECTING FRAMES THE COUNTRY; DESELECTING GOES BACK to the camera the
  // viewer had before, not to the world — they may have been looking at the
  // Gulf and clicked into Jordan, and "back" means the Gulf.
  useEffect(() => {
    if (!baseS) return;
    if (selected) {
      const b = boxOf(selected, boxes, cities || []);
      if (!b) return;   // no dot and no city: the card still opens, the map stays
      if (!beforeSelect.current) beforeSelect.current = camRef.current;
      flyTo(cameraFor(b, box.w, box.h, baseS));
    } else if (beforeSelect.current) {
      flyTo(beforeSelect.current);
      beforeSelect.current = null;
    }
    // The frame size is deliberately not a dependency: a resize must not
    // re-fly the camera, only re-clamp it, which `view` already does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, boxes, baseS]);

  const zoomBy = (factor) => {
    if (!view) return;
    setNow(zoomAt(camRef.current, factor, box.w / 2, box.h / 2, box.w, box.h, baseS));
  };
  const fitTraffic = () => {
    const b = trafficBox(countries, boxes, cities || []);
    if (b && baseS) { beforeSelect.current = null; onSelect(null); flyTo(cameraFor(b, box.w, box.h, baseS, 120, 0.12)); }
  };
  const world = () => { beforeSelect.current = null; onSelect(null); flyTo(WORLD_CAMERA); };

  // ---- the wheel ---------------------------------------------------------------
  // Registered by hand because React's onWheel is PASSIVE, and a passive
  // listener cannot stop the wall's own scroll container from scrolling too.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !baseS) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      setNow(zoomAt(camRef.current, Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top, box.w, box.h, baseS));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [baseS, box, setNow]);

  // ---- the base layer ------------------------------------------------------
  useEffect(() => {
    const canvas = baseRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !grid || !view) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = box.w * dpr;
    canvas.height = box.h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.w, box.h);

    const t = readTokens(wrap);
    const { cx, cy, S, z } = view;
    const at = (x, y) => [box.w / 2 + (x - cx) * S, box.h / 2 + (y - cy) * S];
    const r = Math.max(0.7, S * 1.05);
    const byCountryTint = countries.length > 0;
    const selIdx = selected && grid.countries ? grid.countries.indexOf(selected) : -1;

    // LAND FIRST, ALWAYS. Every mode draws the same world; what changes is what
    // is laid over it. A mode that redrew the coastline differently would make
    // switching modes look like switching maps.
    for (let i = 0; i < grid.dots.length; i += stride) {
      const [px, py] = at(grid.dots[i] / grid.scale, grid.dots[i + 1] / grid.scale);
      // Off-frame dots cost nothing once zoomed in.
      if (px < -r || py < -r || px > box.w + r || py > box.h + r) continue;
      const cIdx = grid.dots[i + 2];
      const kIdx = stride > 3 ? grid.dots[i + 3] : -1;
      let level = -1;
      if (byCountryTint) {
        const code = kIdx >= 0 ? grid.countries[kIdx] : "";
        level = code ? heatLevel(byCountry.get(code) || 0, countryPeak) : -1;
      } else {
        const row = cIdx >= 0 ? byName.get(grid.continents[cIdx]) : null;
        level = row ? row.level : -1;
      }

      // In the two modes that tint the land, land with no traffic keeps the
      // plain colour — level -1 means "nothing to say", not "coldest".
      const tints = (mode === "dots" || mode === "heat") && level >= 0;
      let colour = t.land;
      let alpha = 1;
      if (tints) { colour = mode === "heat" ? t.warm : t.hot; alpha = RAMP_ALPHA[level]; }
      // A SELECTION DIMS THE REST rather than hiding it: the country is read
      // against its neighbours, which is why the camera frames them too.
      if (selIdx >= 0) {
        if (kIdx === selIdx) { if (!tints) { colour = t.hot; alpha = 0.55; } }
        else alpha *= 0.32;
      }
      ctx.fillStyle = rgba(colour, alpha);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      if (selIdx >= 0 && kIdx === selIdx) {
        ctx.strokeStyle = rgba(t.fg, 0.55);
        ctx.lineWidth = Math.max(0.6, r * 0.22);
        ctx.stroke();
      }
    }

    // ---- city points -------------------------------------------------------
    // THE CITIES ARE DRAWN IN EVERY MODE THAT HAS THEM, over the land rather
    // than instead of it. The two are different populations: a visit whose
    // edge headers carried no city is in the country total and in no point, so
    // a map showing only points would quietly under-report.
    //
    // A point grows a little as the camera zooms (by the square root, capped),
    // enough to be found in a neighbourhood view without becoming a disc that
    // covers the country it is in.
    const points = cities || [];
    const cityPeak = points.reduce((m, c) => Math.max(m, c.visits), 0);
    const grow = Math.min(2.4, Math.sqrt(z));
    if (points.length && (mode === "dots" || mode === "heat" || mode === "bubbles")) {
      for (const city of points) {
        const p = cityPoint(city);
        const [px, py] = at(p.x, p.y);
        if (px < -40 || py < -40 || px > box.w + 40 || py > box.h + 40) continue;
        const share = city.visits / (cityPeak || 1);
        const dim = selected && city.country !== selected ? 0.35 : 1;
        if (mode === "heat") {
          // A soft glow that ADDS where cities overlap, which is what makes a
          // cluster read as a cluster rather than as several equal dots.
          const radius = (6 + 26 * Math.sqrt(share)) * grow;
          const g = ctx.createRadialGradient(px, py, 0, px, py, radius);
          g.addColorStop(0, rgba(t.warm, 0.75 * dim));
          g.addColorStop(1, rgba(t.warm, 0));
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
        } else {
          const radius = (mode === "bubbles" ? 3 + 20 * Math.sqrt(share) : 1.6 + 3.4 * Math.sqrt(share)) * grow;
          ctx.fillStyle = rgba(t.hot, (mode === "bubbles" ? 0.28 : 0.95) * dim);
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
          if (mode === "bubbles") {
            ctx.strokeStyle = rgba(t.hot, 0.9 * dim);
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
        // ZOOMED IN, A CITY IS NAMED. At the world view three hundred labels
        // would be a texture; framed on a country they are the reading.
        if (z >= 3 && (!selected || city.country === selected) && share > 0.02) {
          ctx.fillStyle = rgba(t.fg, 0.85);
          ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(`${city.city} · ${city.visits}`, px + 6, py - 5);
        }
      }
    }

    if (mode === "bubbles" && !points.length) {
      // CONTINENT BUBBLES ARE THE FALLBACK, not the design. Before the city
      // counters existed there was nothing finer to draw, and every day of
      // history from before 08/09/2026 is still like that — so a range reaching
      // back into it still gets a readable map instead of an empty one.
      for (const [name, c] of Object.entries(centroids)) {
        const row = byName.get(name);
        if (!row || !row.visits) continue;
        const [px, py] = at(c.x, c.y);
        // Area, not radius, carries the number — a radius scaled linearly
        // exaggerates the big continent by its own square.
        const rad = 6 + 34 * Math.sqrt(row.visits / (peak || 1));
        ctx.fillStyle = rgba(t.hot, 0.22);
        ctx.strokeStyle = rgba(t.hot, 0.9);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = rgba(t.ink, 1);
        ctx.font = "600 11px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(row.visits), px, py + 4);
      }
    }

    if (mode === "arcs") {
      const hq = project(HQ.lng, HQ.lat);
      const [hx, hy] = at(hq.x, hq.y);
      // STILL ARCS ONLY UNDER REDUCED MOTION. Otherwise an arc is a FLIGHT,
      // drawn on the effects layer when a visit arrives (the owner,
      // 28/09/2026: not "continuously drawing arcs and movement"); a viewer
      // who asked for no motion gets the same answer as a still picture.
      for (const [name, c] of reducedMotion ? Object.entries(centroids) : []) {
        const row = byName.get(name);
        if (!row || !row.visits) continue;
        const [px, py] = at(c.x, c.y);
        const share = row.visits / (peak || 1);
        ctx.strokeStyle = rgba(t.hot, 0.2 + 0.6 * share);
        ctx.lineWidth = 1 + 1.5 * share;
        ctx.beginPath();
        ctx.moveTo(px, py);
        // Lifted perpendicular to the chord, so an arc bows away from the line
        // rather than always upwards — otherwise arcs from the south cross the
        // ones from the north and the picture stops reading.
        ctx.quadraticCurveTo((px + hx) / 2, (py + hy) / 2 - Math.hypot(hx - px, hy - py) * 0.28, hx, hy);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(t.warm, 1);
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [grid, stride, view, box, mode, byName, centroids, peak, theme, cities, reducedMotion, countries, byCountry, countryPeak, selected]);

  // ---- the effects layer ---------------------------------------------------
  useEffect(() => {
    const canvas = fxRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !view) return undefined;
    // REDUCED MOTION GETS A STILL WALL, not a slower one. Nothing here conveys
    // information the base layer does not already carry, so the honest response
    // to the preference is to draw none of it.
    if (reducedMotion) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return undefined;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = box.w * dpr;
    canvas.height = box.h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const t = readTokens(wrap);
    const { cx, cy, S } = view;
    const at = (x, y) => [box.w / 2 + (x - cx) * S, box.h / 2 + (y - cy) * S];
    const hq = project(HQ.lng, HQ.lat);
    const [hx, hy] = at(hq.x, hq.y);
    let raf = 0;
    let wake = 0;

    const frame = (now) => {
      ctx.clearRect(0, 0, box.w, box.h);

      // Ripples: one expanding ring per arrival, 2.2s, fading as it grows.
      for (const rip of ripples) {
        const age = (now - rip.t) / 2200;
        if (age < 0 || age > 1) continue;
        const c = centroids[rip.continent];
        if (!c) continue;
        const [px, py] = at(c.x, c.y);
        ctx.strokeStyle = rgba(rip.kind === "studio" ? t.live : t.hot, (1 - age) * 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 6 + age * 46, 0, Math.PI * 2);
        ctx.stroke();
        // A studio signing up gets a second ring. It is the one arrival that
        // means money, and on a wall seen from across a room a colour alone is
        // not enough to tell two events apart.
        if (rip.kind === "studio") {
          ctx.beginPath();
          ctx.arc(px, py, 6 + age * 30, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // FLIGHTS: one per new visit, from its city when that is known and its
      // continent otherwise. The trail draws itself out to HQ, lands with a
      // small ring, and fades — then nothing is left moving on the map.
      let busy = ripples.some((rip) => now - rip.t < 2200);
      let nextAt = Infinity;
      if (mode === "arcs") {
        for (const f of flights) {
          const age = now - f.t;
          if (age > FLIGHT_OUT + FLIGHT_FADE) continue;
          if (age < 0) { nextAt = Math.min(nextAt, f.t); continue; }
          busy = true;
          const from = f.city ? cityPoint(f.city) : centroids[f.continent];
          if (!from) continue;
          const [px, py] = at(from.x, from.y);
          const u = Math.min(1, age / FLIGHT_OUT);
          const eased = 1 - (1 - u) ** 3;
          const fade = age > FLIGHT_OUT ? 1 - (age - FLIGHT_OUT) / FLIGHT_FADE : 1;
          ctx.strokeStyle = rgba(t.hot, 0.75 * fade);
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(px, py);
          for (let k = 1; k <= 24; k += 1) {
            const [qx, qy] = arcPoint(px, py, hx, hy, (k / 24) * eased);
            ctx.lineTo(qx, qy);
          }
          ctx.stroke();
          const [bx, by] = arcPoint(px, py, hx, hy, eased);
          ctx.fillStyle = rgba(t.warm, fade);
          ctx.beginPath();
          ctx.arc(bx, by, 2.6, 0, Math.PI * 2);
          ctx.fill();
          if (age > FLIGHT_OUT) {
            ctx.strokeStyle = rgba(t.warm, fade * 0.8);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(hx, hy, 5 + (1 - fade) * 14, 0, Math.PI * 2);
            ctx.stroke();
          }
          // The origin blinks once as the flight leaves, so the eye finds it.
          if (age < 600) {
            ctx.fillStyle = rgba(t.hot, 1 - age / 600);
            ctx.beginPath();
            ctx.arc(px, py, 3 + (age / 600) * 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      // THE LOOP STOPS WHEN NOTHING IS MOVING and starts again when a ripple
      // or a flight arrives (both are props, so the effect re-runs). A wall is
      // idle most of the time, and an idle wall should cost nothing.
      if (!busy) {
        raf = 0;
        // A flight staggered later in the minute wakes the loop when it is
        // due, rather than the loop spinning empty until then.
        if (nextAt < Infinity) wake = setTimeout(() => { raf = requestAnimationFrame(frame); }, nextAt - now);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // A hidden tab paints nothing, and rAF is already throttled there — but a
    // wall left on a second monitor behind a screensaver would otherwise keep a
    // core warm for nobody.
    const onVis = () => {
      cancelAnimationFrame(raf);
      clearTimeout(wake);
      raf = document.hidden ? 0 : requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); clearTimeout(wake); document.removeEventListener("visibilitychange", onVis); };
  }, [view, box, mode, ripples, flights, centroids, reducedMotion, theme]);

  // ---- hit testing ---------------------------------------------------------
  // A CITY WINS OVER A COUNTRY, and a country over a continent. The point is
  // the most precise answer, so it is what a pointer near it should name; the
  // country is what you get on its land; the continent only in the open sea
  // near its centroid, where its own total is the only thing to say.
  const hitAt = (mx, my) => {
    if (!view || !grid) return null;
    const { cx, cy, S } = view;
    const toScreen = (x, y) => [box.w / 2 + (x - cx) * S, box.h / 2 + (y - cy) * S];

    let city = null;
    for (const c of cities || []) {
      const p = cityPoint(c);
      const [px, py] = toScreen(p.x, p.y);
      const d = Math.hypot(px - mx, py - my);
      if (d < 12 && (!city || d < city.d)) city = { kind: "city", c, d, x: px, y: py };
    }
    if (city) return city;

    if (stride > 3) {
      const reach = Math.max(6, GRID_STEP * S * 0.75);
      let best = null;
      for (let i = 0; i < grid.dots.length; i += stride) {
        const k = grid.dots[i + 3];
        if (k < 0) continue;
        const [px, py] = toScreen(grid.dots[i] / grid.scale, grid.dots[i + 1] / grid.scale);
        const d = Math.hypot(px - mx, py - my);
        if (d < reach && (!best || d < best.d)) best = { kind: "country", code: grid.countries[k], d, x: px, y: py };
      }
      if (best) return best;
    }

    let best = null;
    for (const [name, c] of Object.entries(centroids)) {
      const [px, py] = toScreen(c.x, c.y);
      const d = Math.hypot(px - mx, py - my);
      if (d < 44 && (!best || d < best.d)) best = { kind: "continent", name, d, x: px, y: py };
    }
    return best;
  };

  const local = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const [mx, my] = local(e);
    drag.current = { x: mx, y: my, cam: camRef.current, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const [mx, my] = local(e);
    const d = drag.current;
    if (d && view) {
      if (!d.moved && Math.hypot(mx - d.x, my - d.y) > 4) { d.moved = true; setGrabbing(true); }
      if (d.moved) {
        setHover(null);
        setNow(clampCamera({ ...d.cam, cx: d.cam.cx - (mx - d.x) / view.S, cy: d.cam.cy - (my - d.y) / view.S }, box.w, box.h, baseS));
        return;
      }
    }
    const hit = hitAt(mx, my);
    if (!hit) { setHover(null); return; }
    if (hit.kind === "city") {
      setHover({ x: hit.x, y: hit.y, name: `${hit.c.city}, ${countryName(hit.c.country)}`, visits: hit.c.visits });
    } else if (hit.kind === "country") {
      setHover({ x: hit.x, y: hit.y, name: countryName(hit.code), visits: byCountry.get(hit.code) || 0, hint: selected === hit.code ? "" : "click for detail" });
    } else {
      setHover({ x: hit.x, y: hit.y, name: hit.name, visits: byName.get(hit.name)?.visits || 0 });
    }
  };

  const onPointerUp = (e) => {
    const d = drag.current;
    drag.current = null;
    setGrabbing(false);
    if (!d || d.moved) return;
    const [mx, my] = local(e);
    const hit = hitAt(mx, my);
    const code = hit?.kind === "city" ? hit.c.country : hit?.kind === "country" ? hit.code : null;
    // Clicking the open sea, or the selected country again, deselects.
    onSelect(code && code !== selected ? code : null);
  };

  const onDoubleClick = (e) => {
    const [mx, my] = local(e);
    setNow(zoomAt(camRef.current, 2, mx, my, box.w, box.h, baseS));
  };

  const zoomed = view && (view.z > 1.01);
  const ctl = "flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[12px] font-700 transition-colors disabled:opacity-40";

  return (
    <div className="relative h-full w-full">
      <div
        ref={wrapRef}
        className={`absolute inset-0 touch-none select-none ${grabbing ? "cursor-grabbing" : hover ? "cursor-pointer" : "cursor-grab"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onDoubleClick={onDoubleClick}
      >
        <canvas ref={baseRef} className="absolute inset-0 h-full w-full" style={{ width: box.w, height: box.h }} />
        <canvas ref={fxRef} className="pointer-events-none absolute inset-0 h-full w-full" style={{ width: box.w, height: box.h }} />
      </div>
      {hover ? (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-md border px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: hover.x, top: hover.y - 10,
            background: "var(--ad-card)", borderColor: "var(--ad-border)", color: "var(--ad-foreground)",
          }}
        >
          <span className="font-600">{hover.name}</span>
          <span className="num ms-2">{hover.visits.toLocaleString("en-US")}</span>
          <span style={{ color: "var(--ad-muted-foreground)" }} className="ms-1">visits · {rangeLabel}</span>
          {hover.hint ? <span className="ms-1.5" style={{ color: "var(--ad-primary-ink)" }}>· {hover.hint}</span> : null}
        </div>
      ) : null}

      {/* THE CAMERA'S CONTROLS, bottom corner opposite the legend. Wheel,
          drag and double-click do the same things; these are the door for a
          wall's remote, a trackpad-less screen, and the keyboard. */}
      <div
        className="absolute bottom-3 end-3 z-10 flex flex-col gap-1 rounded-lg border p-1 shadow-lg"
        style={{ background: "rgb(var(--ad-card-rgb) / 0.9)", borderColor: "var(--ad-border)", color: "var(--ad-foreground)" }}
        role="group"
        aria-label="Map view"
      >
        <button type="button" className={ctl} onClick={() => zoomBy(1.6)} disabled={!view || view.z >= MAX_ZOOM - 0.01} aria-label="Zoom in" title="Zoom in (wheel, double-click)">+</button>
        <button type="button" className={ctl} onClick={() => zoomBy(1 / 1.6)} disabled={!zoomed} aria-label="Zoom out" title="Zoom out">−</button>
        <span className="mx-1 h-px" style={{ background: "var(--ad-border)" }} />
        <button type="button" className={`${ctl} text-[10px]`} onClick={fitTraffic} disabled={!countries.length} title="Frame the countries holding most of the traffic">Fit traffic</button>
        <button type="button" className={`${ctl} text-[10px]`} onClick={world} disabled={!zoomed && !selected} title="Whole world (0)">World</button>
      </div>
    </div>
  );
}
