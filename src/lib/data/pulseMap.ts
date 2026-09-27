// THE PULSE MAP'S ARITHMETIC, purely. No store, no canvas, no React.
//
// The map selects and zooms to countries (the owner, 28/09/2026), and every
// decision about WHERE the camera goes is made here so it can be asserted
// without a browser — the pane cannot run requestAnimationFrame at all, so a
// camera that flew to the wrong continent would look identical to one that
// never moved. WorldMap draws; this decides.
//
// THE CAMERA IS NEVER MOVED BY DATA. The request was a map that "expands and
// contracts based on statistics"; what is built instead is a map that stays
// still until somebody asks it to move. A frame that re-fit itself on every
// poll would shift under a wall's viewers once a minute, make yesterday's
// picture incomparable with today's, and let one visit from Auckland drag the
// whole frame out to the Pacific. `trafficBox` is the "fit to where the
// traffic is" answer, and it runs on a click.
//
// Coordinates are the grid's own: x 0..1000, y 0..500, equirectangular.

import { continentOf } from "@/lib/continents";

export const WORLD_W = 1000;
export const WORLD_H = 500;
export const MAX_ZOOM = 12;

export type Box = { minX: number; minY: number; maxX: number; maxY: number };
export type Camera = { cx: number; cy: number; z: number };
export type Grid = { scale: number; stride?: number; countries?: string[]; dots: number[] };
export type CityPoint = { country: string; city: string; lat: number; lng: number; visits: number };

export const WORLD_CAMERA: Camera = { cx: WORLD_W / 2, cy: WORLD_H / 2, z: 1 };

export const project = (lng: number, lat: number) =>
  ({ x: ((lng + 180) / 360) * WORLD_W, y: ((90 - lat) / 180) * WORLD_H });

// Every country's extent on the grid, built once per grid. A country is the
// dots the generator tagged with its code — the same dots the map draws, so a
// selection frames exactly the land it highlights.
export function countryBoxes(grid: Grid | null): Map<string, Box> {
  const out = new Map<string, Box>();
  if (!grid || !grid.countries) return out;
  const stride = grid.stride || 4;
  for (let i = 0; i < grid.dots.length; i += stride) {
    const idx = grid.dots[i + 3];
    if (idx == null || idx < 0) continue;
    const code = grid.countries[idx];
    const x = grid.dots[i] / grid.scale;
    const y = grid.dots[i + 1] / grid.scale;
    const b = out.get(code);
    if (!b) out.set(code, { minX: x, minY: y, maxX: x, maxY: y });
    else {
      b.minX = Math.min(b.minX, x); b.maxX = Math.max(b.maxX, x);
      b.minY = Math.min(b.minY, y); b.maxY = Math.max(b.maxY, y);
    }
  }
  return out;
}

// A country's box, falling back to its city points. The grid is a 2.1-degree
// lattice, and a country smaller than a cell — Bahrain, Singapore, Malta — has
// no dot at all; its visitors' cities still say where it is. Null when neither
// does, and the caller shows the numbers without moving.
export function boxOf(code: string, boxes: Map<string, Box>, cities: CityPoint[]): Box | null {
  const b = boxes.get(code);
  if (b) return b;
  const pts = cities.filter((c) => c.country === code).map((c) => project(c.lng, c.lat));
  if (!pts.length) return null;
  return {
    minX: Math.min(...pts.map((p) => p.x)), maxX: Math.max(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)), maxY: Math.max(...pts.map((p) => p.y)),
  };
}

export function unionBox(list: (Box | null)[]): Box | null {
  const real = list.filter(Boolean) as Box[];
  if (!real.length) return null;
  return {
    minX: Math.min(...real.map((b) => b.minX)), minY: Math.min(...real.map((b) => b.minY)),
    maxX: Math.max(...real.map((b) => b.maxX)), maxY: Math.max(...real.map((b) => b.maxY)),
  };
}

// WHERE THE TRAFFIC IS: the countries holding `share` of the visits, busiest
// first, framed together. Trimming the tail is the point — a bounding box of
// EVERY visited country is the whole world the day one visit arrives from New
// Zealand, which is the outlier problem the naive "fit to the data" has.
export function trafficBox(
  rows: { code: string; visits: number }[],
  boxes: Map<string, Box>,
  cities: CityPoint[],
  share = 0.85,
): Box | null {
  const total = rows.reduce((s, r) => s + r.visits, 0);
  if (total <= 0) return null;
  const picked: (Box | null)[] = [];
  let seen = 0;
  for (const r of rows) {
    if (r.visits <= 0) continue;
    const b = boxOf(r.code, boxes, cities);
    if (b) picked.push(b);
    seen += r.visits;
    if (seen / total >= share && picked.length) break;
  }
  return unionBox(picked);
}

// The camera that frames `box` in a frame of `w`x`h` pixels, where `baseS` is
// the pixels-per-unit of the whole-world fit.
//
// A MINIMUM SPAN, because the grid is coarse. Jordan is two dots; framed
// tightly it is two discs filling a wall, which shows less than the world
// view did. So a small country is framed with its NEIGHBOURHOOD (about 32
// degrees across at least), highlighted within it — the zoom gives context and
// the country card gives the numbers. Pixels are not data.
export function cameraFor(box: Box, w: number, h: number, baseS: number, minSpan = 90, pad = 0.2): Camera {
  const bw = Math.max(box.maxX - box.minX, minSpan) * (1 + pad * 2);
  const bh = Math.max(box.maxY - box.minY, minSpan / 2) * (1 + pad * 2);
  const worldW = w / baseS;   // grid units the frame shows at z = 1
  const worldH = h / baseS;
  const z = Math.max(1, Math.min(MAX_ZOOM, Math.min(worldW / bw, worldH / bh)));
  return clampCamera({ cx: (box.minX + box.maxX) / 2, cy: (box.minY + box.maxY) / 2, z }, w, h, baseS);
}

// Keep the world covering the frame: a pan cannot drag the map off into empty
// space, and at z = 1 the world sits exactly where the unzoomed map put it.
export function clampCamera(cam: Camera, w: number, h: number, baseS: number): Camera {
  const z = Math.max(1, Math.min(MAX_ZOOM, cam.z));
  const hw = w / (2 * baseS * z);
  const hh = h / (2 * baseS * z);
  const cx = WORLD_W > 2 * hw ? Math.min(WORLD_W - hw, Math.max(hw, cam.cx)) : WORLD_W / 2;
  const cy = WORLD_H > 2 * hh ? Math.min(WORLD_H - hh, Math.max(hh, cam.cy)) : WORLD_H / 2;
  return { cx, cy, z };
}

// Zoom by `factor` keeping the grid point under (px, py) — pixels from the
// frame's top-left — under the pointer. What a wheel or a pinch should do.
export function zoomAt(cam: Camera, factor: number, px: number, py: number, w: number, h: number, baseS: number): Camera {
  const s0 = baseS * cam.z;
  const gx = cam.cx + (px - w / 2) / s0;
  const gy = cam.cy + (py - h / 2) / s0;
  const z = Math.max(1, Math.min(MAX_ZOOM, cam.z * factor));
  const s1 = baseS * z;
  return clampCamera({ cx: gx - (px - w / 2) / s1, cy: gy - (py - h / 2) / s1, z }, w, h, baseS);
}

// ---- flights: an arc per NEW visit ----------------------------------------
// THE ARCS FLY WHEN SOMEBODY ARRIVES, not on a loop — the owner, 28/09/2026.
// Traffic is counters, not events, so a new visit is what the counters GAINED
// between two polls of the same range and source: that gain, per continent,
// launches that many flights. Where a city gained too, the flight leaves from
// the city (the more precise answer, as on hover); the rest leave from the
// continent. A change of range or source is a different total, not an arrival,
// so it launches nothing; nor does a fall (a day leaving the range).

type PulseData = {
  range?: string;
  source?: string;
  continents?: { name: string; visits?: number }[];
  cities?: CityPoint[];
};
export type TrafficBaseline = { key: string; cont: Map<string, number>; city: Map<string, CityPoint> };
export type Flight = { continent: string; city: CityPoint | null };

export function trafficBaseline(d: PulseData | null | undefined): TrafficBaseline | null {
  if (!d) return null;
  return {
    key: `${d.range}|${d.source}`,
    cont: new Map((d.continents || []).map((c) => [c.name, c.visits || 0])),
    city: new Map((d.cities || []).map((c) => [`${c.country}|${c.city}`, c])),
  };
}

export function newVisits(prev: TrafficBaseline | null, next: TrafficBaseline | null): Flight[] {
  if (!prev || !next || prev.key !== next.key) return [];
  const launched: Flight[] = [];
  for (const [name, visits] of next.cont) {
    let gain = visits - (prev.cont.get(name) || 0);
    if (gain <= 0) continue;
    // A city new to the top list may be a rank change rather than a visit, so
    // only a city present in BOTH polls can claim a gain.
    for (const [k, c] of next.city) {
      if (gain <= 0) break;
      const before = prev.city.get(k);
      if (!before || continentOf(c.country) !== name) continue;
      const cityGain = Math.min(gain, c.visits - before.visits);
      for (let i = 0; i < cityGain; i += 1) launched.push({ continent: name, city: c });
      gain -= Math.max(0, cityGain);
    }
    for (let i = 0; i < gain; i += 1) launched.push({ continent: name, city: null });
  }
  return launched;
}
