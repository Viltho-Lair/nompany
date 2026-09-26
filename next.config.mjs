import os from "node:os";

/** @type {import('next').NextConfig} */

// SECURITY HEADERS.
//
// Until now this file set `reactStrictMode` and nothing else: no CSP, no HSTS,
// no framing policy, no referrer policy, and the `X-Powered-By: Next.js`
// banner on every response. For a product holding invoices, salaries and
// controlled documents that is the cheapest gap in the whole audit to close.
//
// Everything below is ENFORCED, the Content-Security-Policy included since
// 26/09/2026. It shipped Report-Only first, and that was not a hedge: turning a
// CSP straight on in a codebase with an inline bootstrap script, MUI's runtime
// style injection and a dynamically injected Maps loader breaks the product in
// ways that only show up on the pages nobody clicked during review. It was
// enforced because an outside scan reads a report-only policy as NO policy —
// "neither default-src nor script-src", "missing object-src" — which was true
// of what a browser actually refused.

const isProd = process.env.NODE_ENV === "production";

// GOOGLE MAPS IS WIDER THAN ITS SCRIPT HOST. The loader (lib/googleMaps.ts)
// names maps.googleapis.com alone, but the API it pulls in fetches tiles,
// markers and imagery from gstatic, ggpht and googleusercontent hosts and
// builds workers from blob: URLs. While the policy was report-only a missing
// host only logged; enforced, it is a blank map. This is Google's own published
// list for the Maps JS API, not a guess. Its Roboto request
// (fonts.googleapis.com) is deliberately NOT allowed — the map falls back to
// the page's font, and a browser contacting Google for a font stays a
// violation worth hearing about.
const MAPS = "https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.ggpht.com https://*.googleusercontent.com";

// GOOGLE ANALYTICS, Google's published GA4 list. The policy is one header for
// every path, so the studio ALLOWS these hosts too — what keeps the tag off it
// is that only MarketingShell can load it, and only after consent
// (shared/marketing/consent.ts).
const GA_SCRIPT = "https://www.googletagmanager.com";
const GA_BEACON = "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com";

// Where the app legitimately talks to. Derived from what the code actually
// references, not from a template — anything not on this list is a finding, not
// a missing entry.
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' is required by the theme bootstrap in app/layout.js, which
  // must run before paint to avoid a flash and therefore cannot be deferred to
  // a file. The way OFF it is a per-request nonce set in the proxy; that is a
  // real change and belongs in its own commit.
  // 'unsafe-eval' is dev-only (React Refresh); production does not get it.
  // fpnpmcdn.net is Fingerprint's agent, loaded by the sign-in and sign-up
  // pages only (components/public/deviceIntel.js).
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} ${MAPS} https://fpnpmcdn.net ${GA_SCRIPT}`,
  // MUI/emotion injects styles at runtime, so this one cannot be tightened
  // without replacing the styling engine. No Google Fonts host: the marketing
  // site's fonts are self-hosted at build time and the document editor's come
  // through /api/fonts (lib/docs/fontProxy.ts), so a browser contacting Google
  // for a font is now a violation worth hearing about.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // data: and blob: cover uploaded previews and generated documents; the Google
  // hosts are map tiles; img.youtube.com is video thumbnails.
  `img-src 'self' data: blob: ${MAPS} https://img.youtube.com ${GA_BEACON}`,
  // Same-origin API plus the Maps JS API. The SSE stream is same-origin.
  // Fingerprint: the agent's script host and its EU identification API.
  `connect-src 'self' ${MAPS} https://fpnpmcdn.net https://*.fpjs.io ${GA_BEACON}`,
  // Fingerprint's agent runs its collection in a worker it builds from a
  // blob: URL, and so does the Maps API. Without this the worker falls back to
  // script-src, which does not list blob:, and is refused.
  "worker-src 'self' blob:",
  // YouTube embeds are the only third-party content frame; Maps uses a
  // google.com frame for its own bookkeeping.
  "frame-src 'self' https://www.youtube.com https://*.google.com",
  // Nothing may frame US — the modern equivalent of X-Frame-Options, kept
  // alongside it because both are still read by different agents.
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Rewrites http:// subresource requests to https://. It was a header of its
  // own while the rest was report-only, because a report-only policy ignores it.
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // Two years, subdomains included. `preload` is deliberately NOT set: it is a
  // commitment to browser vendors that is slow and painful to reverse, and it
  // should be a decision somebody makes on purpose rather than a default that
  // arrived with a config change.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Stops a browser second-guessing a Content-Type — the reason an uploaded
  // file served as image/png cannot be talked into executing as script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Send the origin cross-site, the full path same-site. Studio URLs carry the
  // tenant slug and record ids, and neither belongs in somebody else's logs.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The product asks for none of the last four; saying so stops an embedded
  // frame or a future dependency from asking on its behalf.
  //
  // GEOLOCATION IS OURS TO ASK FOR, AND ONLY OURS. It was `geolocation=()`,
  // which denies the location API to every origin INCLUDING THIS ONE — so
  // Tracking's "Share my location" was refused by the browser before the user
  // was ever asked, and "Use my location" on a Master-data location would have
  // been too. `(self)` lets our own pages ask (the browser still asks the
  // person every time) and still refuses any embedded third-party frame.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // ENFORCED. A host missing from the list above is now a refused request and
  // a console error on the page that needed it — add it here with its reason.
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig = {
  reactStrictMode: true,

  experimental: {
    // ONE WORKER PER FOUR CORES, NOT ONE PER CORE.
    //
    // Next sizes its build pool from the CPU count, which on a 20-thread
    // Windows box is nineteen workers for "Collecting page data" and nineteen
    // more for "Generating static pages". Each one reserves its own V8 heap,
    // and the machine fast-failed the pool three builds running — exit
    // 0xC0000409, with the dying worker reporting an allocation failure at
    // 22 MB while 18 GB of the machine was free. It is a spawn problem, not a
    // memory one, and it reproduced on an unmodified tree.
    //
    // Four is enough to keep the step parallel and few enough that the pool
    // comes up. The build is not the bottleneck here; a build that dies once a
    // day is.
    cpus: Math.max(1, Math.min(4, (os.cpus()?.length || 4))),
  },
  // jsPDF DRAGS THREE PACKAGES IT ONLY NEEDS FOR doc.html() AND SVG.
  //
  // They are optionalDependencies, so they are installed and therefore
  // resolvable, and Turbopack emitted them as lazy chunks: html2canvas at
  // 44 KB gz and canvg — which depends on core-js — at 48 KB. Nothing loads
  // them. lib/chatTranscript is the only jsPDF caller, and it draws with
  // text(), line(), splitTextToSize() and addImage().
  //
  // The alias target throws if anything ever does reach those paths, so this
  // is a deliberate omission rather than a silent one. See
  // src/lib/jspdfOptional.ts.
  turbopack: {
    resolveAlias: {
      html2canvas: "./src/lib/jspdfOptional.ts",
      canvg: "./src/lib/jspdfOptional.ts",
      dompurify: "./src/lib/jspdfOptional.ts",
    },
  },
  // "Which framework and version is this" is free reconnaissance and buys us
  // nothing in return.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // A STUDIO'S PUBLIC FORM MAY BE EMBEDDED ON ITS OWN WEBSITE (19/09/2026)
      // — that is what the embed code is for — so these pages, and only these,
      // may be framed by anyone. Later entries win for the same key, and an
      // enforced `frame-ancestors` makes browsers ignore X-Frame-Options.
      { source: "/f/:path*", headers: [
        { key: "Content-Security-Policy", value: CSP.replace("frame-ancestors 'none'", "frame-ancestors *") },
      ] },
    ];
  },
};

export default nextConfig;
