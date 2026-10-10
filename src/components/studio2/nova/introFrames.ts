// NOVA'S INTRO: THE SITTA HEXAGON BECOMES NOVA'S HEAD. The owner chose this on
// 11/10/2026 from three studies, and rejected the first one, which drew Nova's eyes
// ONTO the logo: "it adapts nova into it, that is not what i want". So nothing is
// added on top of the mark. The logo builds, holds long enough to read as Sitta,
// bursts apart, and each of its six facets becomes one of the six parts of the head
// `NovaHead` draws: the big orange facet the skull, the big cyan one the visor, the
// big red one the antenna stem, and the three light triangles the two eyes and
// the antenna light.
//
// PURE CANVAS AND NO IMPORTS, on purpose. Two things draw from this file: the
// studio's NovaIntro card, and `scripts/nova-intro-video.mjs`, which strips the
// types with Node's own `stripTypeScriptTypes` and runs the result in a headless
// browser to record the video files. With an import, the script would need a
// bundler, and a second copy of the animation would be free to drift from this
// one. For the same reason, only erasable TypeScript is allowed here: no enums
// and no namespaces.
//
// Units: everything is drawn in the logo's own coordinates
// (public/brand/logo-icon.svg, 2471 tall), centred on the middle of its open
// inner triangle, which the mark is 120°-symmetric about. The caller's scale
// turns that into pixels.

type Pt = [number, number];
type NovaMood ="idle" | "listening" | "thinking" | "speaking";
// What the head reacts to. `lv` is three bands, low → high; `amp` is overall
// loudness. Nothing in the product feeds these from a microphone yet, so the intro
// drives them with a quiet idle. The listening, thinking and speaking looks are
// already drawn and wait for a voice feature to reach them.
interface NovaDyn { t: number; amp: number; lv: [number, number, number]; mood: NovaMood; blinkAt: number }
export type NovaBackdrop = "night" | "paper" | "clear";
export interface NovaIntroOptions {
  backdrop: NovaBackdrop;
  font: string;       // a CSS font-family list for "Nova"
  monoFont: string;   // for SITTA
  arabicFont: string; // for ستة
}

// ── Timeline, in seconds ──
export const NOVA_INTRO = {
  split: 0.4, assemble: 1.2, flash: 2.06, m0: 2.6, mDur: 1.8, burst: 4.4,
  rise: 4.45, name: 4.6, tag: 5.0, hold: 5.4, end: 7.2,
} as const;
const T = NOVA_INTRO;

// ── Easing ──
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t: number, a: number, d: number) => clamp((t - a) / d);
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const inOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const outBack = (x: number, c1 = 1.6) => { const c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number) => { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(",")})`; };

// ── The logo ──
const C = { x: (1345.37 + 793 + 671.5) / 3, y: (1164.85 + 1614.32 + 916.57) / 3 };
const UNIT = 2471;
const rel = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [x - C.x, y - C.y]);
const turn = (pts: Pt[], a: number): Pt[] => pts.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]);
const cen = (pts: Pt[]) => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return { x: x / pts.length, y: y / pts.length }; };
function toPath(pts: Pt[]) { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; }
// In the SVG each light facet is a large shape painted UNDER its dark one, and only
// this triangle of it shows. Drawing the whole shape on top swaps the logo's
// pieces, which is the first bug the study found.
const LIGHT = rel([[1345.4, 389.49], [1345.37, 1164.85], [672.6, 776.5]]);
const TAU3 = (Math.PI * 2) / 3;
interface Blade { darkPts: Pt[]; lightPts: Pt[]; dark: string; light: string; ux: number; uy: number; ang: number; dist: number; darkPath: Path2D; lightPath: Path2D; darkC: { x: number; y: number }; lightC: { x: number; y: number } }
let BLADES: Blade[] | null = null;
function blades(): Blade[] {
  // Built on first draw, not at import: Path2D is a browser global and this file
  // is imported by a component that also renders on the server.
  if (BLADES) return BLADES;
  const raw: [Pt[], Pt[], string, string][] = [
    [rel([[1346.31, 387.71], [674.84, 0], [1.64, 388.67], [0.94, 1164.46]]), LIGHT, "#48caed", "#8ee7ff"],
    [rel([[1466, 2001.07], [2137.5, 1613.41], [2137.5, 836.07], [1466, 447.57]]), turn(LIGHT, TAU3), "#fe9e04", "#ffbb4d"],
    [rel([[0.75, 1304.57], [0.72, 2079.93], [673.92, 2468.6], [1346.12, 2081.32]]), turn(LIGHT, TAU3 * 2), "#ff3333", "#ff8686"],
  ];
  BLADES = raw.map(([darkPts, lightPts, dark, light]) => {
    const c = cen([...darkPts, ...darkPts, ...lightPts]), dist = Math.hypot(c.x, c.y);
    return { darkPts, lightPts, dark, light, ux: c.x / dist, uy: c.y / dist, ang: Math.atan2(c.y, c.x), dist, darkPath: toPath(darkPts), lightPath: toPath(lightPts), darkC: cen(darkPts), lightC: cen(lightPts) };
  });
  return BLADES;
}

// ── Outlines as point lists, so any shape can become any other ──
const N = 72;
const area = (p: Pt[]) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
function resample(poly: Pt[]): Pt[] {
  const P = area(poly) < 0 ? [...poly].reverse() : poly;
  const segs: [Pt, Pt, number][] = []; let L = 0;
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, l]); L += l; }
  const out: Pt[] = []; let si = 0, acc = 0;
  for (let k = 0; k < N; k++) {
    const d = (k * L) / N;
    while (acc + segs[si][2] < d && si < segs.length - 1) { acc += segs[si][2]; si++; }
    const [a, b, l] = segs[si], t = l ? (d - acc) / l : 0;
    out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]);
  }
  return out;
}
function rrPts(x: number, y: number, w: number, h: number, r: number): Pt[] {
  const out: Pt[] = [], q = 10;
  const corners: [number, number, number][] = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= q; i++) { const a = a0 + (Math.PI / 2) * (i / q); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}
const circPts = (cx: number, cy: number, r: number): Pt[] => Array.from({ length: 64 }, (_, i) => { const a = (i / 64) * Math.PI * 2 - Math.PI / 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt; });
// The start index that lines the two outlines up best, so a morph doesn't twist through itself.
function bestShift(src: Pt[], tgt: Pt[]) {
  const a = cen(src), b = cen(tgt); let best = 0, bd = Infinity;
  for (let s = 0; s < N; s++) {
    let d = 0;
    for (let k = 0; k < N; k += 2) { const p = src[k], q = tgt[(k + s) % N]; const dx = p[0] - a.x - (q[0] - b.x), dy = p[1] - a.y - (q[1] - b.y); d += dx * dx + dy * dy; }
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
// Shape and position move separately: the centre travels an arc with a small
// overshoot while the outline tumbles and reshapes. That is what makes it read as
// a piece flying to its place rather than a blend between two pictures.
function morph(src: Pt[], tgt: Pt[], shift: number, p: number, arc: number, spin: number): Pt[] {
  const eP = outBack(p, 1.35), eS = inOutCubic(clamp((p - 0.04) / 0.86));
  const cs = cen(src), ct = cen(tgt), dx = ct.x - cs.x, dy = ct.y - cs.y;
  const kx = (cs.x + ct.x) / 2 - dy * arc, ky = (cs.y + ct.y) / 2 + dx * arc, iu = 1 - eP;
  const px = iu * iu * cs.x + 2 * iu * eP * kx + eP * eP * ct.x, py = iu * iu * cs.y + 2 * iu * eP * ky + eP * eP * ct.y;
  const sp = spin * (1 - eP), c = Math.cos(sp), sn = Math.sin(sp);
  return src.map((q0, k) => {
    const q = tgt[(k + shift) % N], sx = q0[0] - cs.x, sy = q0[1] - cs.y;
    return [px + lerp(sx * c - sy * sn, q[0] - ct.x, eS), py + lerp(sx * sn + sy * c, q[1] - ct.y, eS)];
  });
}

// ── Nova's head: components/studio2/NovaHead, in logo units ──
const HK = 17.5;
const hx = (x: number) => (x - 120) * HK, hy = (y: number) => (y - 100) * HK;
type Part = "stem" | "skull" | "visor" | "eyeL" | "eyeR" | "dot";
interface HeadPart { pts: Pt[]; color: string; z: number; path: Path2D }
interface Piece { color: string; pts: Pt[]; ex: number; ey: number; part: Part; delay: number; sign: number; shift: number }
let HEAD: Record<Part, HeadPart> | null = null;
let PIECES: Piece[] | null = null;
function model() {
  if (HEAD && PIECES) return { HEAD, PIECES };
  const rr = (x: number, y: number, w: number, h: number, r: number) => rrPts(hx(x), hy(y), w * HK, h * HK, r * HK);
  const part = (pts: Pt[], color: string, z: number): HeadPart => { const p = resample(pts); return { pts: p, color, z, path: toPath(p) }; };
  const head: Record<Part, HeadPart> = {
    stem: part(rr(118.3, 42, 3.4, 22, 1.7), "#94a3b8", 0),
    skull: part(rr(58, 62, 124, 98, 34), "#e8edfb", 1),
    visor: part(rr(72, 82, 96, 58, 26), "#161b3f", 2),
    eyeL: part(rr(91, 102, 14, 18, 7), "#22d3ee", 3),
    eyeR: part(rr(135, 102, 14, 18, 7), "#22d3ee", 3),
    dot: part(circPts(hx(120), hy(38), 7.5 * HK), "#22d3ee", 4),
  };
  // Facet order is dark, light per blade (cyan, orange, red). Big facets become the
  // big parts; the three light triangles become the three lights.
  const map: [Part, number, number][] = [["visor", 0.16, 1], ["eyeL", 0.38, -1], ["skull", 0.06, -1], ["eyeR", 0.44, 1], ["stem", 0.28, 1], ["dot", 0.52, -1]];
  const pieces: Piece[] = [];
  blades().forEach((b) => {
    for (const [pts, color] of [[b.darkPts, b.dark], [b.lightPts, b.light]] as [Pt[], string][]) {
      const [p, delay, sign] = map[pieces.length], r = resample(pts), c = cen(r), d = Math.hypot(c.x, c.y) || 1;
      pieces.push({ color, pts: r, ex: c.x / d, ey: c.y / d, part: p, delay, sign, shift: bestShift(r, head[p].pts) });
    }
  });
  HEAD = head; PIECES = pieces;
  return { HEAD, PIECES };
}
// The head's extent in logo units (antenna light to chin), for laying out the lockup.
const NOVA_HEAD_BOUNDS = { top: -1230, bot: 1060, w: 2200 } as const;

// ── Beats 1–4: the logo builds ──
function dotPos(i: number, tau: number) {
  const b = blades()[i], u = seg(tau, T.split, T.assemble - T.split);
  const rho = b.dist * outCubic(clamp(u / 0.45)) * (1 + 0.1 * Math.sin(u * Math.PI * 2) * (1 - u));
  const phi = b.ang - Math.PI * 2 * (1 - inOutCubic(u));
  return { x: Math.cos(phi) * rho, y: Math.sin(phi) * rho };
}
// It opens on Nova's antenna light: one cyan dot, which splits into the three
// colours of the mark.
function drawDots(g: CanvasRenderingContext2D, tau: number) {
  const R0 = 88;
  if (tau < T.split) {
    const k = Math.max(0, outBack(seg(tau, 0, 0.34), 2.2)), sq = Math.sin(Math.PI * seg(tau, 0.24, 0.16)) * 0.28;
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, R0 * 4);
    glow.addColorStop(0, "rgba(34,211,238,0.45)"); glow.addColorStop(1, "rgba(34,211,238,0)");
    g.globalAlpha = k * 0.9; g.fillStyle = glow; g.beginPath(); g.arc(0, 0, R0 * 4, 0, 7); g.fill();
    g.globalAlpha = 1; g.fillStyle = "#22d3ee"; g.beginPath(); g.ellipse(0, 0, R0 * k * (1 + sq), R0 * k * (1 - sq), 0, 0, 7); g.fill();
    return;
  }
  for (let i = 0; i < 3; i++) {
    const fade = 1 - seg(tau, T.assemble + i * 0.12, 0.2);
    if (fade <= 0) continue;
    const col = mix("#22d3ee", blades()[i].dark, seg(seg(tau, T.split, T.assemble - T.split), 0.1, 0.3));
    for (let k = 5; k >= 0; k--) { // echo copies trail each dot
      const tt = tau - k * 0.025; if (tt < T.split) continue;
      const p = dotPos(i, tt), q = dotPos(i, tt - 0.016), vx = p.x - q.x, vy = p.y - q.y, st = 1 + Math.min(0.9, Math.hypot(vx, vy) / 55);
      const r = R0 * (k ? 0.82 : 1) * (1 - 0.5 * (1 - fade));
      g.globalAlpha = fade * (k ? 0.32 * (1 - k / 6) : 1); g.fillStyle = col;
      g.beginPath(); g.ellipse(p.x, p.y, r * st, r / Math.sqrt(st), Math.atan2(vy, vx), 0, 7); g.fill();
    }
  }
}
function landPiece(g: CanvasRenderingContext2D, path: Path2D, c: { x: number; y: number }, color: string, b: Blade, p: number) {
  const e = Math.max(0, outBack(p, 1.5)), off = (1 - e) * 720, sc = Math.min(e, 1.25);
  g.save(); g.rotate((1 - e) * -1.1); g.translate(b.ux * off, b.uy * off);
  g.translate(c.x, c.y); g.scale(sc, sc); g.translate(-c.x, -c.y);
  g.fillStyle = color; g.fill(path); g.restore();
}
function drawLogo(g: CanvasRenderingContext2D, tau: number) {
  g.globalAlpha = 1;
  blades().forEach((b, i) => {
    const t0 = T.assemble + i * 0.12, pd = seg(tau, t0, 0.55), pl = seg(tau, t0 + 0.08, 0.55);
    if (pd > 0) landPiece(g, b.darkPath, b.darkC, b.dark, b, pd);
    if (pl > 0) landPiece(g, b.lightPath, b.lightC, b.light, b, pl);
  });
}
function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.28 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill(); g.restore();
}
// The completion accent: a ring, rays in the mark's colours, and sparkles.
function drawBurst(g: CanvasRenderingContext2D, k: number, ringR: number, from: number, tau: number, night: boolean, flashCentre: boolean) {
  if (k > 0 && k < 1) {
    if (flashCentre) {
      const inner = toPath(rel([[1345.37, 1164.85], [793, 1614.32], [671.5, 916.57]]));
      g.globalAlpha = (1 - k) * 0.95; g.fillStyle = "#ffffff"; g.fill(inner);
      const fl = g.createRadialGradient(0, 0, 0, 0, 0, 520 * (0.5 + k));
      fl.addColorStop(0, "rgba(255,255,255,0.95)"); fl.addColorStop(1, "rgba(255,255,255,0)");
      g.globalAlpha = 1 - k; g.fillStyle = fl; g.beginPath(); g.arc(0, 0, 520 * (0.5 + k), 0, 7); g.fill();
    }
    g.globalAlpha = (1 - k) * 0.7; g.strokeStyle = night ? "#8ee7ff" : "#48caed"; g.lineWidth = 34 * (1 - k);
    g.beginPath(); g.arc(0, 0, ringR * (0.75 + 0.55 * outCubic(k)), 0, 7); g.stroke();
    const cols = ["#48caed", "#fe9e04", "#ff3333"];
    g.lineCap = "round"; g.lineWidth = 38 * (1 - k * 0.6);
    for (let j = 0; j < 12; j++) {
      const a = (j * Math.PI) / 6 + Math.PI / 12, r1 = ringR * 1.08 + outCubic(k) * 760, r2 = r1 + 300 * (1 - k);
      g.globalAlpha = 1 - k; g.strokeStyle = cols[j % 3];
      g.beginPath(); g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); g.stroke();
    }
  }
  const sparks: [number, number, string][] = [[-0.95, 1.25, "#8ee7ff"], [0.35, 1.34, "#ffbb4d"], [2.45, 1.22, "#ff8686"], [3.5, 1.38, "#ffffff"], [-2.2, 1.17, "#ffbb4d"]];
  sparks.forEach(([a, r, c], j) => {
    const q = seg(tau, from + 0.1 + j * 0.12, 0.85);
    if (q <= 0 || q >= 1) return;
    g.globalAlpha = 1; g.fillStyle = night ? c : c === "#ffffff" ? "#48caed" : c;
    star(g, Math.cos(a) * r * ringR, Math.sin(a) * r * ringR, 120 * Math.sin(Math.PI * q), q * 0.8);
  });
}

// ── The head, at transformation progress m (1 = finished) ──
function headEye(g: CanvasRenderingContext2D, side: number, d: NovaDyn, px: number, det: number) {
  const blink = Math.max(0, 1 - Math.abs((d.t - d.blinkAt) / 0.07));
  const look = d.mood === "thinking" ? Math.sin(d.t * 2.6) * 6 * HK : 0;
  const big = 1 + 0.25 * d.amp + (d.mood === "listening" ? 0.08 : 0);
  const cx = hx(side < 0 ? 98 : 142) + look, cy = hy(111), w = 14 * HK, h = 18 * HK * big * (1 - blink * 0.85);
  g.save(); g.globalAlpha = 1; g.fillStyle = "#22d3ee"; g.shadowColor = "rgba(34,211,238,0.9)"; g.shadowBlur = Math.max(0, 6 * HK * px * det);
  if (d.mood === "speaking") {
    g.strokeStyle = "#22d3ee"; g.lineWidth = 4.5 * HK; g.lineCap = "round"; g.beginPath();
    g.moveTo(cx - w * 0.6, cy + 3 * HK); g.quadraticCurveTo(cx, cy - 9 * HK, cx + w * 0.6, cy + 3 * HK); g.stroke();
  } else {
    g.beginPath(); g.roundRect(cx - w / 2, cy - h / 2, w, h, w / 2); g.fill();
    g.shadowBlur = 0; g.globalAlpha = 0.85 * det; g.fillStyle = "#ffffff";
    g.beginPath(); g.arc(cx - 2.4 * HK, cy - h * 0.18, 2 * HK, 0, 7); g.fill();
  }
  g.restore();
}
function headDot(g: CanvasRenderingContext2D, d: NovaDyn, det: number) {
  const cx = hx(120), cy = hy(38), r = 7.5 * HK * (1 + 0.25 * d.amp), gr = r * (2.4 + 2.4 * d.amp);
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, gr);
  glow.addColorStop(0, `rgba(34,211,238,${(0.35 + 0.45 * d.amp) * det})`); glow.addColorStop(1, "rgba(34,211,238,0)");
  g.globalAlpha = 1; g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, gr, 0, 7); g.fill();
  g.fillStyle = "#22d3ee"; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  if (d.amp > 0.18 || d.mood === "thinking") { // rings ripple off the antenna while there is sound
    const fr = (d.t * (d.mood === "thinking" ? 2 : 1.4)) % 1, k = d.mood === "thinking" ? 0.6 : clamp((d.amp - 0.18) * 2.5);
    g.globalAlpha = (1 - fr) * k; g.strokeStyle = "#8ee7ff"; g.lineWidth = 1.2 * HK;
    g.beginPath(); g.arc(cx, cy, r * (1.4 + fr * 3), 0, 7); g.stroke();
  }
}
// The smile; while Nova speaks it becomes a small level meter.
function mouth(g: CanvasRenderingContext2D, d: NovaDyn, det: number) {
  g.save(); g.strokeStyle = "#22d3ee"; g.lineCap = "round";
  if (d.mood === "speaking" || d.amp > 0.25) {
    g.lineWidth = 2.6 * HK;
    for (let k = 0; k < 5; k++) {
      const v = d.lv[[0, 1, 2, 1, 0][k]], h = (1.5 + 9 * v * (0.7 + 0.3 * Math.sin(d.t * 9 + k))) * HK, x = hx(110 + k * 5);
      g.globalAlpha = det; g.beginPath(); g.moveTo(x, hy(131) - h / 2); g.lineTo(x, hy(131) + h / 2); g.stroke();
    }
  } else {
    g.lineWidth = 2.4 * HK; g.globalAlpha = det * 0.85;
    g.beginPath(); g.moveTo(hx(108), hy(130)); g.quadraticCurveTo(hx(120), hy(138), hx(132), hy(130)); g.stroke();
  }
  g.restore();
}
function drawHeadAt(g: CanvasRenderingContext2D, m: number, d: NovaDyn, px: number) {
  const { HEAD: head, PIECES: pieces } = model();
  const settle = seg(m, 0.92, 0.08);
  g.save(); g.translate(0, Math.sin(d.t * 1.6) * 28 * settle);
  // anticipation: the logo bursts apart before it rebuilds
  const boom = outCubic(seg(m, 0, 0.12)) * (1 - seg(m, 0.12, 0.3));
  const items = pieces.map((P) => {
    const p = seg(m, P.delay, 0.5), part = head[P.part], off = 170 * boom;
    const src: Pt[] = off ? P.pts.map(([x, y]) => [x + P.ex * off, y + P.ey * off]) : P.pts;
    const pts = p <= 0 ? src : p >= 1 ? part.pts : morph(src, part.pts, P.shift, p, 0.35 * P.sign, 2.6 * P.sign);
    return { P, p, part, pts };
  }).sort((a, b) => a.part.z - b.part.z);
  const det = seg(m, 0.86, 0.14);
  for (const { P, p, part, pts } of items) {
    g.globalAlpha = 1;
    if (p >= 1 && (P.part === "eyeL" || P.part === "eyeR")) { headEye(g, P.part === "eyeL" ? -1 : 1, d, px, det); continue; }
    if (p >= 1 && P.part === "dot") { headDot(g, d, det); continue; }
    g.fillStyle = mix(P.color, part.color, inOutCubic(p)); g.fill(toPath(pts));
    if (p >= 1 && P.part === "skull" && det > 0) {
      const body = g.createLinearGradient(hx(60), hy(50), hx(185), hy(180));
      body.addColorStop(0, "#f1f5ff"); body.addColorStop(1, "#c7d0ea");
      g.globalAlpha = det; g.fillStyle = body; g.fill(part.path);
      g.strokeStyle = "#94a3b8"; g.lineWidth = 1.5 * HK; g.stroke(part.path);
    }
    if (p >= 1 && P.part === "visor" && det > 0) {
      g.save(); g.clip(part.path); g.globalCompositeOperation = "lighter";
      const vg = g.createRadialGradient(0, hy(111), 0, 0, hy(111), 60 * HK);
      vg.addColorStop(0, `rgba(34,211,238,${0.12 + 0.55 * d.amp})`); vg.addColorStop(0.6, `rgba(139,92,246,${0.08 + 0.3 * d.amp})`); vg.addColorStop(1, "rgba(99,102,241,0)");
      g.globalAlpha = det; g.fillStyle = vg; g.fillRect(hx(72), hy(82), 96 * HK, 58 * HK);
      g.restore();
      const rim = g.createLinearGradient(hx(72), hy(82), hx(168), hy(140));
      rim.addColorStop(0, "#6366f1"); rim.addColorStop(0.55, "#8b5cf6"); rim.addColorStop(1, "#22d3ee");
      g.globalAlpha = det; g.strokeStyle = rim; g.lineWidth = 2 * HK; g.stroke(part.path);
      mouth(g, d, det);
    }
  }
  g.restore();
}

// ── The name ──
function drawName(g: CanvasRenderingContext2D, w: number, cx: number, nameY: number, size: number, tau: number, o: NovaIntroOptions) {
  if (tau < T.name) return;
  const night = o.backdrop === "night", nameCol = night ? "#ffffff" : "#12162a", tagCol = night ? "#8ee7ff" : "#1287a8";
  g.save();
  g.font = `600 ${size}px ${o.font}`; g.textBaseline = "alphabetic";
  const word = [..."Nova"], ws = word.map((ch) => g.measureText(ch).width), total = ws.reduce((a, b) => a + b, 0);
  g.beginPath(); g.rect(0, nameY - size * 1.05, w, size * 1.3); g.clip(); // the mask the letters rise from
  let x = cx - total / 2;
  word.forEach((ch, j) => {
    const p = outCubic(seg(tau, T.name + j * 0.075, 0.48));
    g.globalAlpha = clamp(p * 1.6); g.fillStyle = nameCol; g.fillText(ch, x, nameY + (1 - p) * size * 1.05); x += ws[j];
  });
  g.restore();
  const q = seg(tau, T.tag, 0.55); if (q <= 0) return;
  // Both scripts, always: this is the lockup, not running text, so it carries the
  // brand's two spellings side by side the way the logo does.
  g.save();
  const ts = Math.max(9, size * 0.24), sp = ts * lerp(0.75, 0.38, outCubic(q)), ty = nameY + size * 0.2 + ts * 1.5;
  const mono = `500 ${ts}px ${o.monoFont}`, ar = `700 ${ts * 1.15}px ${o.arabicFont}`;
  g.fillStyle = tagCol; g.globalAlpha = outCubic(q);
  g.font = mono; const latin = [..."SITTA"], lw = latin.map((c) => g.measureText(c).width);
  g.font = ar; const arW = g.measureText("ستة").width;
  const sepW = ts * 1.6, latinW = lw.reduce((a, b) => a + b, 0) + sp * (latin.length - 1);
  let tx = cx - (latinW + sepW + arW) / 2;
  g.font = mono; latin.forEach((c, j) => { g.fillText(c, tx, ty); tx += lw[j] + sp; });
  tx += sepW / 2 - sp; g.beginPath(); g.arc(tx, ty - ts * 0.33, ts * 0.1, 0, 7); g.fill(); tx += sepW / 2;
  g.font = ar; g.fillText("ستة", tx, ty);
  g.restore();
}

function drawBackdrop(g: CanvasRenderingContext2D, w: number, h: number, b: NovaBackdrop) {
  g.clearRect(0, 0, w, h);
  if (b === "clear") return;
  const grd = g.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
  if (b === "night") { grd.addColorStop(0, "#1a1838"); grd.addColorStop(0.55, "#0e0d1f"); grd.addColorStop(1, "#06060c"); }
  else { grd.addColorStop(0, "#ffffff"); grd.addColorStop(1, "#e7e9f1"); }
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
}

/**
 * One frame of the intro at time `tau` (0 → NOVA_INTRO.end), filling a w × h box
 * in CSS pixels. The caller owns the device-pixel transform; `dpr` is only used
 * to size the glow.
 */
export function drawNovaIntro(g: CanvasRenderingContext2D, w: number, h: number, tau: number, o: NovaIntroOptions, dpr = 1) {
  drawBackdrop(g, w, h, o.backdrop);
  const B = NOVA_HEAD_BOUNDS, mm = Math.min(w, h), markH = mm * 0.34, s = markH / UNIT;
  const nameSize = markH * 0.42, gap = markH * 0.16;
  const total = (B.bot - B.top) * s + gap + nameSize + nameSize * 0.55;
  const lockCy = h / 2 - total / 2 - B.top * s, nameY = lockCy + B.bot * s + gap + nameSize * 0.8;
  const cy = lerp(h / 2, lockCy, inOutCubic(seg(tau, T.rise, 0.6)));
  const night = o.backdrop === "night";
  g.save(); g.translate(w / 2, cy);
  if (tau < T.m0) {
    const pop = 1 + 0.06 * Math.sin(Math.PI * seg(tau, T.flash, 0.35));
    g.scale(s * pop, s * pop);
    if (tau < T.assemble + 0.6) drawDots(g, tau);
    drawLogo(g, tau);
    drawBurst(g, seg(tau, T.flash - 0.02, 0.55), 1280, T.flash, tau, night, true);
  } else {
    const sc = s * (1 + 0.05 * Math.sin(Math.PI * seg(tau, T.burst, 0.35)));
    const t = tau - T.m0;
    // the hold is idle: a slow bob and one blink, so the lockup is alive but quiet
    const d: NovaDyn = { t, amp: 0.05, lv: [0.06, 0.06, 0.06], mood: "idle", blinkAt: T.hold + 0.9 - T.m0 };
    g.save(); g.scale(sc, sc); drawHeadAt(g, seg(tau, T.m0, T.mDur), d, sc * dpr); g.restore();
    g.scale(s, s);
    drawBurst(g, seg(tau, T.burst - 0.02, 0.6), 1250, T.burst, tau, night, false);
  }
  g.restore();
  g.globalAlpha = 1;
  drawName(g, w, w / 2, nameY, nameSize, tau, o);
}
