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
export function pageLabelFromPath(pathname: unknown) {
  const parts = String(pathname || "/").split("/").filter(Boolean);
  const rest = parts[0] && /^[a-z]{2}$/.test(parts[0]) ? parts.slice(1) : parts;
  return (rest[0] || "home").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "home";
}

// THE STUDIO'S OWN RULE, beside the website's rather than inside the component
// that uses it — the two answer the same question for the two surfaces, and a
// pure function in a file importing next/navigation cannot be tested.
//
// IT COUNTS THE SECTION, NEVER THE TENANT. A studio path is
// `/<slug>/<section>/<id>`, so `pageLabelFromPath` would return the CUSTOMER:
// one counter field per company, which company is busy readable by anyone with
// console access, and the per-day field cap gone a few hundred studios in. The
// slug is dropped and the record id never leaves the browser.
export function studioSectionFromPath(pathname: unknown) {
  const parts = String(pathname || "/").split("/").filter(Boolean);
  // [0] is the slug; [1] is the section, when there is one — `/<slug>` alone is
  // the studio's home surface.
  const section = parts[1] || "main";
  return section.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "main";
}

// `data` may carry `site: "erp"` to count the studio rather than the public
// website; anything else lands in the website's counters, which is what every
// existing caller means and why the field is opt-in rather than required.
export function track(type: string, data: Record<string, unknown> = {}) {
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
