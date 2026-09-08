"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// THE DOTTED WORLD MAP, on two stacked canvases.
//
// `base` holds the land and whatever the current mode draws over it, redrawn
// only when the data, the mode, the theme or the size changes. `fx` holds the
// ripples and the arc particles and runs a requestAnimationFrame loop. They are
// separate because redrawing 3,518 dots sixty times a second to move four
// particles is how a wall display heats a room.
//
// THE GRID IS FETCHED, NOT IMPORTED. It is 40 kB of coordinates that never
// change; importing it would inline every byte into this route's first-load
// JavaScript, where the bundle budget would rightly object. Fetched from
// /public it is one cacheable request.
//
// WHAT THIS MAP MAY SAY is settled elsewhere and is worth repeating here,
// because a map is the most confident-looking thing on a wall: /api/track maps
// the edge's country header to a CONTINENT and throws the country away. There
// are no cities, no countries and no coordinates in the traffic data — so
// nothing here is drawn at a point. Everything is drawn per continent, and the
// legend says so in words.
//
// CENTROIDS COME OUT OF THE GRID ITSELF rather than from a table of capital
// cities. A bubble for Africa should sit on the Africa that is drawn, and any
// hand-typed coordinate is one more thing that can disagree with the dots.

const HQ = { lat: 31.95, lng: 35.93 };   // Amman — where the company is
const RAMP_ALPHA = [0.22, 0.38, 0.56, 0.78, 1];

// Equirectangular, the projection the grid was generated in: x = (lng+180)/360,
// y = (90-lat)/180, both scaled into the grid's own 1000x500 space.
const project = (lng, lat) => ({ x: ((lng + 180) / 360) * 1000, y: ((90 - lat) / 180) * 500 });

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
    hot: v("--ad-primary-rgb"),
    warm: v("--ad-warning-rgb"),
    live: v("--ad-success-rgb"),
    card: v("--ad-card-rgb"),
  };
}

export default function WorldMap({ mode, continents, ripples, reducedMotion, rangeLabel }) {
  const wrapRef = useRef(null);
  const baseRef = useRef(null);
  const fxRef = useRef(null);
  const [grid, setGrid] = useState(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [theme, setTheme] = useState(0);
  const [hover, setHover] = useState(null);

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

  // ---- geometry ------------------------------------------------------------
  // Centroids are the mean position of every dot of a continent, so a bubble
  // sits on the land it stands for. Computed once per grid, not per frame.
  const centroids = useMemo(() => {
    if (!grid) return {};
    const sums = {};
    for (let i = 0; i < grid.dots.length; i += 3) {
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
  }, [grid]);

  const fit = useMemo(() => {
    const { w, h } = box;
    if (!w || !h) return null;
    const s = Math.min((w - 24) / 1000, (h - 24) / 500);
    return { s, dx: (w - 1000 * s) / 2, dy: (h - 500 * s) / 2 };
  }, [box]);

  const byName = useMemo(() => {
    const m = new Map();
    for (const c of continents || []) m.set(c.name, c);
    return m;
  }, [continents]);

  const peak = useMemo(
    () => (continents || []).reduce((n, c) => Math.max(n, c.visits || 0), 0),
    [continents],
  );

  // ---- the base layer ------------------------------------------------------
  useEffect(() => {
    const canvas = baseRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !grid || !fit) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = box.w * dpr;
    canvas.height = box.h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.w, box.h);

    const t = readTokens(wrap);
    const { s, dx, dy } = fit;
    const at = (x, y) => [dx + x * s, dy + y * s];
    const r = Math.max(0.7, s * 1.05);

    // LAND FIRST, ALWAYS. Every mode draws the same world; what changes is what
    // is laid over it. A mode that redrew the coastline differently would make
    // switching modes look like switching maps.
    for (let i = 0; i < grid.dots.length; i += 3) {
      const idx = grid.dots[i + 2];
      const name = idx >= 0 ? grid.continents[idx] : "";
      const row = name ? byName.get(name) : null;
      const level = row ? row.level : -1;

      let fill = rgba(t.land, 1);
      // In the two modes that tint the land, a continent with no traffic keeps
      // the plain land colour — level -1 means "nothing to say", not "coldest".
      if ((mode === "dots" || mode === "heat") && level >= 0) {
        fill = mode === "heat"
          ? rgba(t.warm, RAMP_ALPHA[level])
          : rgba(t.hot, RAMP_ALPHA[level]);
      }
      ctx.fillStyle = fill;
      const [px, py] = at(grid.dots[i] / grid.scale, grid.dots[i + 1] / grid.scale);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (mode === "bubbles") {
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
      for (const [name, c] of Object.entries(centroids)) {
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
  }, [grid, fit, box, mode, byName, centroids, peak, theme]);

  // ---- the effects layer ---------------------------------------------------
  useEffect(() => {
    const canvas = fxRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !fit) return undefined;
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
    const { s, dx, dy } = fit;
    const at = (x, y) => [dx + x * s, dy + y * s];
    const hq = project(HQ.lng, HQ.lat);
    const [hx, hy] = at(hq.x, hq.y);
    let raf = 0;

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

      if (mode === "arcs") {
        for (const [name, c] of Object.entries(centroids)) {
          const row = byName.get(name);
          if (!row || !row.visits) continue;
          const [px, py] = at(c.x, c.y);
          // Phase-offset per continent so the particles do not march in step,
          // which reads as one animation rather than several journeys.
          const phase = ((now / 2600) + name.length * 0.13) % 1;
          const mx = (px + hx) / 2;
          const my = (py + hy) / 2 - Math.hypot(hx - px, hy - py) * 0.28;
          const u = 1 - phase;
          const bx = u * u * px + 2 * u * phase * mx + phase * phase * hx;
          const by = u * u * py + 2 * u * phase * my + phase * phase * hy;
          ctx.fillStyle = rgba(t.warm, 0.9);
          ctx.beginPath();
          ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // A hidden tab paints nothing, and rAF is already throttled there — but a
    // wall left on a second monitor behind a screensaver would otherwise keep a
    // core warm for nobody.
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVis); };
  }, [fit, box, mode, ripples, centroids, byName, reducedMotion, theme]);

  // ---- hover ---------------------------------------------------------------
  const onMove = (e) => {
    if (!fit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let best = null;
    for (const [name, c] of Object.entries(centroids)) {
      const px = fit.dx + c.x * fit.s;
      const py = fit.dy + c.y * fit.s;
      const d = Math.hypot(px - mx, py - my);
      if (d < 44 && (!best || d < best.d)) best = { name, d, x: px, y: py };
    }
    setHover(best ? { ...best, row: byName.get(best.name) } : null);
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <canvas ref={baseRef} className="absolute inset-0 h-full w-full" style={{ width: box.w, height: box.h }} />
      <canvas ref={fxRef} className="pointer-events-none absolute inset-0 h-full w-full" style={{ width: box.w, height: box.h }} />
      {hover?.row ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: hover.x, top: hover.y - 10,
            background: "var(--ad-card)", borderColor: "var(--ad-border)", color: "var(--ad-foreground)",
          }}
        >
          <span className="font-600">{hover.name}</span>
          <span className="num ms-2">{hover.row.visits.toLocaleString("en-US")}</span>
          <span style={{ color: "var(--ad-muted-foreground)" }} className="ms-1">visits · {rangeLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
