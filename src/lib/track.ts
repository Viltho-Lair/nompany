"use client";

// Lightweight public-site traffic tracker. Sends fire-and-forget events to
// /api/track (sendBeacon, falling back to keepalive fetch). A per-browser
// visitor id in localStorage lets the server count distinct daily visitors.

const VID_KEY = "mta-vid";

function vid() {
  if (typeof window === "undefined") return "";
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v) {
      v = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `v${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(VID_KEY, v);
    }
    return v;
  } catch { return ""; }
}

// Normalise a pathname to a stable top-level page label (bounds cardinality):
// strips a /en or /ar locale prefix and keeps the first segment ("home" for /).
export function pageLabelFromPath(pathname) {
  const parts = String(pathname || "/").split("/").filter(Boolean);
  const rest = parts[0] && /^[a-z]{2}$/.test(parts[0]) ? parts.slice(1) : parts;
  return (rest[0] || "home").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "home";
}

export function track(type, data = {}) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ type, vid: vid(), ...data });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      return;
    }
  } catch { /* fall through */ }
  try { fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {}); } catch { /* ignore */ }
}
