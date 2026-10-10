// THE NOVA INTRO AS VIDEO FILES, for social posts and decks.
//
//   node scripts/nova-intro-video.mjs
//
// Writes three files to public/brand/:
//   nova-intro.mp4         1280×720 on the night backdrop (H.264)
//   nova-intro-alpha.webm  1280×720 on a transparent background (VP9 with alpha)
//   nova-intro.gif         480×270 on the night backdrop, 12.5 fps, loops
//
// THE ANIMATION IS THE PRODUCT'S OWN FILE, NOT A COPY. The studio plays
// src/components/studio2/nova/introFrames.ts; this script strips that file's
// types with Node's own `stripTypeScriptTypes` (introFrames.ts imports nothing
// and uses only erasable TypeScript so that this works) and runs it in the
// headless Edge or Chrome already on the machine (scripts/lib/edge-capture.mjs).
// Change the intro, run this again, and the videos follow. A second copy of the
// animation for the export would be free to drift from what Nova shows.
//
// NO FFMPEG. The browser records the canvas itself, with MediaRecorder, one frame
// at a time at exact times (captureStream(0) + requestFrame), so a slow frame
// cannot make the clip stutter. The GIF is encoded in the page by the small
// encoder below: a fixed palette of the brand colours plus the commonest colours
// across the frames, and LZW. Nothing is installed for any of it.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "./lib/edge-capture.mjs";

const ROOT = new URL("..", import.meta.url);
const OUT = new URL("public/brand/", ROOT);
const engine = stripTypeScriptTypes(readFileSync(new URL("src/components/studio2/nova/introFrames.ts", ROOT), "utf8"), { mode: "strip" })
  .replace(/^export /gm, "");

const PAGE = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira:wght@600&family=Geist+Mono:wght@500&family=Tajawal:wght@700&display=block">
<body style="margin:0;background:#000"><canvas id="c"></canvas>
<script type="module">
${engine}
const FONT = { font: '"Saira", "Segoe UI", system-ui, sans-serif', monoFont: '"Geist Mono", ui-monospace, monospace', arabicFont: '"Tajawal", "Segoe UI", system-ui, sans-serif' };
const c = document.getElementById("c");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function size(w, h) { c.width = w; c.height = h; const g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); return g; }
const toB64 = (bytes) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };

window.fontsReady = async () => {
  for (const f of ["600 40px Saira", "500 12px 'Geist Mono'", "700 12px Tajawal"]) await document.fonts.load(f).catch(() => {});
  return document.fonts.check("600 40px Saira");
};

// Frame by frame at exact times; the recorder is handed each frame as it is drawn.
window.record = async ({ w, h, fps, backdrop, mimeType, hold }) => {
  const g = size(w, h);
  const stream = c.captureStream(0), track = stream.getVideoTracks()[0];
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 10_000_000 });
  const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((r) => (rec.onstop = r));
  rec.start();
  const frames = Math.round((NOVA_INTRO.end + hold) * fps);
  for (let i = 0; i <= frames; i++) {
    drawNovaIntro(g, w, h, Math.min(NOVA_INTRO.end, i / fps), { backdrop, ...FONT });
    track.requestFrame();
    await sleep(1000 / fps);
  }
  rec.stop(); await stopped;
  return toB64(new Uint8Array(await new Blob(chunks, { type: mimeType }).arrayBuffer()));
};

// ── GIF ──
const BRAND = ["#48caed","#8ee7ff","#fe9e04","#ffbb4d","#ff3333","#ff8686","#22d3ee","#ffffff","#e8edfb","#f1f5ff","#c7d0ea","#94a3b8","#161b3f","#6366f1","#8b5cf6","#06060c","#0e0d1f","#1a1838"];
function palette(frames) {
  const hist = new Uint32Array(32768);
  for (const f of frames) for (let i = 0; i < f.length; i += 12) hist[((f[i] >> 3) << 10) | ((f[i + 1] >> 3) << 5) | (f[i + 2] >> 3)]++;
  const pal = BRAND.map((x) => [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)]);
  const keys = [...hist.keys()].filter((k) => hist[k]).sort((a, b) => hist[b] - hist[a]);
  for (const k of keys) { if (pal.length >= 256) break; pal.push([((k >> 10) & 31) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4]); }
  while (pal.length < 256) pal.push([0, 0, 0]);
  const lut = new Uint8Array(32768);
  for (let k = 0; k < 32768; k++) {
    const r = ((k >> 10) & 31) * 8 + 4, gg = ((k >> 5) & 31) * 8 + 4, b = (k & 31) * 8 + 4; let best = 0, bd = Infinity;
    for (let j = 0; j < 256; j++) { const p = pal[j], d = (p[0] - r) ** 2 * 3 + (p[1] - gg) ** 2 * 4 + (p[2] - b) ** 2 * 2; if (d < bd) { bd = d; best = j; } }
    lut[k] = best;
  }
  return { pal, lut };
}
// LZW as GIF writes it, 8-bit minimum code size (the order of omggif's encoder).
function lzw(ix, out) {
  const clear = 256, eoi = 257; let size = 9, next = 258, dict = new Map(), acc = 0, bits = 0;
  const bytes = [];
  const emit = (code) => { acc |= code << bits; bits += size; while (bits >= 8) { bytes.push(acc & 255); acc >>>= 8; bits -= 8; } };
  emit(clear);
  let cur = ix[0];
  for (let i = 1; i < ix.length; i++) {
    const k = ix[i], key = (cur << 8) | k, v = dict.get(key);
    if (v !== undefined) { cur = v; continue; }
    emit(cur);
    if (next === 4096) { emit(clear); next = eoi + 1; size = 9; dict = new Map(); }
    else { if (next >= 1 << size) size++; dict.set(key, next++); }
    cur = k;
  }
  emit(cur); emit(eoi); if (bits > 0) bytes.push(acc & 255);
  out.push(8);
  for (let i = 0; i < bytes.length; i += 255) { const n = Math.min(255, bytes.length - i); out.push(n); for (let j = 0; j < n; j++) out.push(bytes[i + j]); }
  out.push(0);
}
window.gif = async ({ w, h, fps, hold }) => {
  const g = size(w, h), frames = [];
  const count = Math.round((NOVA_INTRO.end + hold) * fps);
  for (let i = 0; i <= count; i++) { drawNovaIntro(g, w, h, Math.min(NOVA_INTRO.end, i / fps), { backdrop: "night", ...FONT }); frames.push(g.getImageData(0, 0, w, h).data); }
  const { pal, lut } = palette(frames), out = [], le = (n) => out.push(n & 255, (n >> 8) & 255);
  for (const ch of "GIF89a") out.push(ch.charCodeAt(0));
  le(w); le(h); out.push(0xf7, 0, 0);
  for (const p of pal) out.push(p[0], p[1], p[2]);
  out.push(0x21, 0xff, 0x0b); for (const ch of "NETSCAPE2.0") out.push(ch.charCodeAt(0)); out.push(3, 1, 0, 0, 0);
  const delay = Math.round(100 / fps);
  for (const f of frames) {
    out.push(0x21, 0xf9, 4, 0x04); le(delay); out.push(0, 0);
    out.push(0x2c); le(0); le(0); le(w); le(h); out.push(0);
    const ix = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < f.length; i += 4, j++) ix[j] = lut[((f[i] >> 3) << 10) | ((f[i + 1] >> 3) << 5) | (f[i + 2] >> 3)];
    lzw(ix, out);
  }
  out.push(0x3b);
  return toB64(new Uint8Array(out));
};
window.ready = true;
</script>`;

const dir = mkdtempSync(join(tmpdir(), "nova-intro-"));
const page = join(dir, "intro.html");
writeFileSync(page, PAGE);
const b = await launch({ port: 9351 });
try {
  await b.viewport({ width: 1280, height: 720, scale: 1, scheme: "dark" });
  await b.open(pathToFileURL(page).href, { extraMs: 300 });
  if (!(await b.evaluate("window.ready === true"))) throw new Error("The intro page did not start — check introFrames.ts strips to plain JavaScript.");
  if (!(await b.evaluate("window.fontsReady()"))) console.warn("Saira did not load (offline?) — the name falls back to the system font.");
  const jobs = [
    ["nova-intro.mp4", "record", { w: 1280, h: 720, fps: 30, backdrop: "night", mimeType: "video/mp4;codecs=avc1.640028", hold: 0.5 }],
    ["nova-intro-alpha.webm", "record", { w: 1280, h: 720, fps: 30, backdrop: "clear", mimeType: "video/webm;codecs=vp9", hold: 0.5 }],
    ["nova-intro.gif", "gif", { w: 480, h: 270, fps: 12.5, hold: 1.2 }],
  ];
  for (const [name, fn, opts] of jobs) {
    const b64 = await b.evaluate(`window.${fn}(${JSON.stringify(opts)})`);
    if (!b64) throw new Error(`${name}: the page returned nothing`);
    const bytes = Buffer.from(b64, "base64");
    writeFileSync(new URL(name, OUT), bytes);
    console.log(`${name}  ${(bytes.length / 1024).toFixed(0)} KB`);
  }
} finally {
  await b.close();
  rmSync(dir, { recursive: true, force: true });
}
