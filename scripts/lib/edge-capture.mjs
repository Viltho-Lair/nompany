// A HEADLESS BROWSER FOR THE SCREENSHOT PIPELINE, WITH NO DEPENDENCY.
//
// scripts/screenshots.mjs used Playwright, which this project deliberately does
// not depend on (its browser download is paid by every install for a script
// that runs when the UI changes). Chromium-family browsers already speak the
// DevTools protocol over a WebSocket, and Node has had a WebSocket client
// built in since v22 — so the pipeline drives the Edge or Chrome that is
// already on the machine, and nothing is installed.
//
// It does four things and no more: launch a browser with a throwaway profile,
// open a page at a fixed size and scale, wait until the page has stopped
// loading, and write a screenshot. Anything cleverer belongs in the caller.

import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATES = [
  process.env.SCREENSHOT_BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/microsoft-edge",
].filter(Boolean);

export function findBrowser() {
  return CANDIDATES.find((p) => existsSync(p)) || null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Launch a headless browser and return a session to drive it. */
export async function launch({ port = 9333 } = {}) {
  const exe = findBrowser();
  if (!exe) throw new Error("No Edge or Chrome found. Set SCREENSHOT_BROWSER to its executable.");
  // A THROWAWAY PROFILE: the person's own browser, sign-ins and extensions are
  // never touched, and nothing this run sets outlives it.
  const profile = mkdtempSync(join(tmpdir(), "nompany-shots-"));
  const child = spawn(exe, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
    "--disable-extensions", "--mute-audio",
    "about:blank",
  ], { stdio: "ignore" });

  let version = null;
  for (let i = 0; i < 60 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(250); }
  }
  if (!version) { stop(child, profile); throw new Error("The browser did not open its debugging port."); }

  // One page target, driven over its own socket.
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (event) => {
    const msg = JSON.parse(String(event.data));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
      else resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send("Page.enable");
  await send("Network.enable");
  await send("Runtime.enable");

  // IN-FLIGHT REQUESTS, counted, so "the page has finished" means the screen's
  // own data calls have answered — a load event fires long before a client
  // screen has fetched what it draws.
  const inflight = new Set();
  listeners.add((m) => {
    if (m.method === "Network.requestWillBeSent") inflight.add(m.params.requestId);
    if (m.method === "Network.loadingFinished" || m.method === "Network.loadingFailed") inflight.delete(m.params.requestId);
  });

  async function settle({ quietMs = 900, maxMs = 20000 } = {}) {
    const start = Date.now();
    let quietSince = 0;
    while (Date.now() - start < maxMs) {
      // A live stream (the studio's event source) never finishes loading, so
      // one long-lived request must not be read as "still busy" for ever.
      if (inflight.size <= 1) {
        if (!quietSince) quietSince = Date.now();
        if (Date.now() - quietSince >= quietMs) return;
      } else quietSince = 0;
      await sleep(100);
    }
  }

  return {
    send,
    /** Fixed size and density, and the colour scheme the page is told the device prefers. */
    async viewport({ width = 1440, height = 900, scale = 2, scheme = "light" } = {}) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: width < 768 });
      await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }, { name: "prefers-reduced-motion", value: "reduce" }] });
    },
    async cookie(name, value, url) {
      await send("Network.setCookie", { name, value, url });
    },
    /** Navigate and wait until the screen has drawn what it fetched. */
    async open(url, { extraMs = 700 } = {}) {
      inflight.clear();
      const loaded = new Promise((resolve) => {
        const fn = (m) => { if (m.method === "Page.loadEventFired") { listeners.delete(fn); resolve(); } };
        listeners.add(fn);
      });
      await send("Page.navigate", { url });
      await Promise.race([loaded, sleep(30000)]);
      await settle();
      // THE SCREEN'S OWN "STILL LOADING" FLAG. A tab that fetches after it has
      // hydrated can leave the network quiet for a moment with nothing drawn,
      // and a quiet network then reads as finished. Every studio skeleton and
      // loader carries aria-busy, so the page is done when none remains.
      for (let i = 0; i < 150; i++) {
        const busy = await send("Runtime.evaluate", { expression: "Boolean(document.querySelector('[aria-busy=\"true\"]'))", returnByValue: true });
        if (!busy?.result?.value) break;
        await sleep(100);
      }
      await settle({ quietMs: 500 });
      // FINAL STATES, NOT MID-ANIMATION ONES. Reduced motion is requested above,
      // and whatever still transitions is frozen at its end so no screenshot
      // catches a card half-faded or a chart half-drawn.
      await send("Runtime.evaluate", {
        // AND NO DEVELOPMENT OVERLAYS. The pipeline photographs a dev server, and
        // Next's badge and "is busy" toast live in a <nextjs-portal>; a visitor
        // never sees either, so neither may appear in a picture of the product.
        expression: `(() => { const s = document.createElement('style'); s.textContent = '*,*::before,*::after{transition:none!important;animation-duration:0s!important;animation-delay:0s!important;caret-color:transparent!important} nextjs-portal{display:none!important}'; document.head.appendChild(s); document.querySelectorAll('nextjs-portal').forEach((n) => n.remove()); })()`,
      });
      await sleep(extraMs);
    },
    async evaluate(expression) {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      return r?.result?.value;
    },
    /** Write the visible viewport. WebP at 82 keeps a 2x screen near 150 KB. */
    async shot(path, { format = "webp", quality = 82 } = {}) {
      const { data } = await send("Page.captureScreenshot", { format, quality, captureBeyondViewport: false });
      writeFileSync(path, Buffer.from(data, "base64"));
    },
    async close() {
      try { ws.close(); } catch { /* already closed */ }
      stop(child, profile);
    },
  };
}

// STOPS ONLY THE PROCESS THIS RUN STARTED, and its children — never a browser
// the person has open. On Windows the headless browser spawns helpers that
// outlive a plain kill, so the tree is ended by PID.
function stop(child, profile) {
  try {
    if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGKILL");
  } catch { /* already gone */ }
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked; the OS temp sweep takes it */ } }, 1500);
}
